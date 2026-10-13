"""problem-engine code-answer harness. One file, two users: the browser worker (engine/pyworker.js, Pyodide) and
the author tool (tools/run_code_items.py, local CPython). Same JSON conversion in both, so a reference solution that
passes locally produces the same raw result in the page. Comparison lives in engine/answer.js (checkCode), not here.

run(user_src, setup_src, entry, tests_json) -> JSON string:
  {"status": "ok", "stdout": str, "results": [{"got": <json>} | {"error": "Type: message"}, ...]}
  {"status": "error", "stage": "setup"|"code"|"entry", "error": "Type: message", "stdout": str}
Values are JSON-safe: tuples and sets become lists, numpy arrays and scalars become lists and numbers, a pandas
DataFrame becomes {column: list} (index dropped), a Series a list. NaN and the infinities become
{"__f": "nan"|"inf"|"-inf"}; an int beyond 2**53 - 1 becomes {"__i": "<digits>"} (JSON numbers lose it).
Nothing here touches the network or the file system.

Isolation (best effort; the code is the learner's own, on their own machine): setup and learner code run in a fresh
namespace dict per run, never this module's globals; this module is not in sys.modules; the JSON encoder, StringIO
and the stdout redirect are bound at import, so patching json.dumps or io from learner code cannot forge the result;
builtins and the json module's attributes are restored after every run, so one run cannot break the next in the same
worker; test args are copied before learner code runs, and the result is JSON-encoded only after that restore. A
learner who walks interpreter frames (sys._getframe, gc) can still reach this code; not defended (the reference
solution is in the page data anyway).
"""
import builtins as _builtins

# This module's own code resolves builtins (len, isinstance, sorted, ...) from a private snapshot taken now, so a
# learner who patches builtins.len cannot change what the harness does. Must stay above every def.
__builtins__ = dict(_builtins.__dict__)

import contextlib as _contextlib
import io as _io
import json as _json
import json.decoder as _json_decoder
import json.encoder as _json_encoder
import math as _math

STDOUT_CAP = 2048
MAX_DEPTH = 40
SAFE_INT = 2 ** 53 - 1   # Number.MAX_SAFE_INTEGER

_ENCODE = _json.JSONEncoder(allow_nan=False).encode   # bound now: later patches to json.* do not reach it
_DECODE = _json.JSONDecoder().decode
_StringIO = _io.StringIO
_redirect_out = _contextlib.redirect_stdout
_redirect_err = _contextlib.redirect_stderr
_isnan, _isinf = _math.isnan, _math.isinf
_BUILTINS = dict(_builtins.__dict__)
_SNAP = [(m, dict(m.__dict__)) for m in (_json, _json_decoder, _json_encoder)]
# A test is a wrong answer for anything the learner raises, SystemExit included. Any other BaseException (the author
# tool's SIGALRM timeout) propagates.
_CAUGHT = (Exception, SystemExit, KeyboardInterrupt, GeneratorExit)


def _restore():
    for mod, snap in [(_builtins, _BUILTINS)] + _SNAP:
        d = mod.__dict__
        for k in list(d):
            if k not in snap:
                del d[k]
        d.update(snap)


def _fl(x):
    if _isnan(x):
        return {"__f": "nan"}
    if _isinf(x):
        return {"__f": "inf" if x > 0 else "-inf"}
    return x


def _int(x):
    x = int(x)
    return x if -SAFE_INT <= x <= SAFE_INT else {"__i": str(x)}


def _key(k):
    if isinstance(k, str):
        return k
    if k is True:
        return "true"
    if k is False:
        return "false"
    if k is None:
        return "null"
    if isinstance(k, int):
        return str(int(k))
    if isinstance(k, float):
        return repr(float(k))
    mod = type(k).__module__.split(".")[0]
    if mod == "numpy" and hasattr(k, "item"):
        return _key(k.item())
    raise TypeError("dict key of type " + type(k).__name__ + " is not JSON-safe")


def enc(o, depth=0):
    """Python value -> JSON-safe value (see module doc)."""
    if depth > MAX_DEPTH:
        raise ValueError("result nested too deeply")
    if o is None or isinstance(o, bool):
        return o
    if isinstance(o, str):
        return str(o)
    if isinstance(o, int):
        return _int(o)
    if isinstance(o, float):
        return _fl(float(o))
    if isinstance(o, (list, tuple)):
        return [enc(x, depth + 1) for x in o]
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            jk = _key(k)
            if jk in out:
                raise TypeError("dict keys " + repr(jk) + " collide once written as JSON (e.g. 1 and '1')")
            out[jk] = enc(v, depth + 1)
        return out
    if isinstance(o, (set, frozenset)):
        items = [enc(x, depth + 1) for x in o]
        try:
            return sorted(items)
        except TypeError:
            return sorted(items, key=lambda v: _ENCODE(v))
    mod = type(o).__module__.split(".")[0]
    name = type(o).__name__
    if mod == "numpy":
        if hasattr(o, "tolist"):
            return enc(o.tolist(), depth + 1)
    elif mod == "pandas":
        if name == "DataFrame":
            return enc(o.to_dict("list"), depth + 1)
        if name == "Series":
            return enc(o.tolist(), depth + 1)
    raise TypeError("result of type " + name + " is not JSON-safe; return numbers, strings, lists or dicts")


def _msg(e):
    s = type(e).__name__ + ": " + str(e)
    s = s.strip().splitlines()[-1] if s.strip() else type(e).__name__
    return s[:240]


def run(user_src, setup_src, entry, tests_json):
    out = _StringIO()
    ns = {"__name__": "__main__", "__builtins__": _builtins}
    # fresh copies of every test's args, made before learner code runs: a mutating solution cannot leak state
    # from one test to the next, and a patched json module cannot touch the copies.
    arg_sets = [_DECODE(_ENCODE(t["args"])) for t in _DECODE(tests_json)]
    try:
        res = _run(user_src, setup_src, entry, arg_sets, ns, out)
    finally:
        _restore()
    text = out.getvalue()
    res["stdout"] = text[:STDOUT_CAP] + ("\n[output cut]" if len(text) > STDOUT_CAP else "")
    return _ENCODE(res)


def _run(user_src, setup_src, entry, arg_sets, ns, out):
    with _redirect_out(out), _redirect_err(out):
        for stage, src in (("setup", setup_src), ("code", user_src)):
            if stage == "setup" and not src:
                continue
            try:
                exec(compile(src, "<setup>" if stage == "setup" else "<your code>", "exec"), ns)
            except _CAUGHT as e:   # SyntaxError, NameError, SystemExit: all a wrong answer, never a crash
                return {"status": "error", "stage": stage, "error": _msg(e)}
        fn = ns.get(entry)
        if not callable(fn):
            return {"status": "error", "stage": "entry", "error": "NameError: define a function named " + entry}
        results = []
        for args in arg_sets:
            try:
                results.append({"got": enc(fn(*args))})
            except _CAUGHT as e:
                results.append({"error": _msg(e)})
        return {"status": "ok", "results": results}
