#!/usr/bin/env python3
"""Author-side proof for ladder counterexample stages (docs/PACK_SCHEMA.md "ladder").
Run: python3 -I tools/run_ladder_examples.py <packdir>

For every ladder item and every counterexample stage, each of the stage's `examples` ({inp, breaks}) runs against the
stage's `code` through engine/pyharness.py (the harness the browser runs in Pyodide): `breaks(inp)` must return exactly
the listed boolean, without raising. Each example gets a 10 s limit (Unix SIGALRM), the same wall as the page.
Exit 1 on any mismatch, error or timeout.
"""
import importlib.util
import json
import os
import signal
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WALL = 10


def load_harness():
    spec = importlib.util.spec_from_file_location("pyharness", os.path.join(ROOT, "engine", "pyharness.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Timeout(BaseException):   # not an Exception: the harness turns those into per-test errors
    pass


def _alarm(signum, frame):
    raise Timeout()


def run_one(harness, code, inp):
    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(WALL)
    try:
        return json.loads(harness.run(code, "", "breaks", json.dumps([{"args": [inp]}])))
    except Timeout:
        return {"status": "timeout"}
    finally:
        signal.alarm(0)


def main(argv):
    if len(argv) != 1:
        print("usage: python3 -I tools/run_ladder_examples.py <packdir>", file=sys.stderr)
        return 2
    with open(os.path.join(argv[0], "items.json"), encoding="utf8") as f:
        items = json.load(f)
    harness = load_harness()
    n = bad = 0
    for it in items:
        if (it.get("answer") or {}).get("kind") != "ladder":
            continue
        for st in it.get("stages", []):
            if st.get("type") != "counterexample":
                continue
            for ex in st.get("examples", []):
                n += 1
                res = run_one(harness, st["code"], ex["inp"])
                if res.get("status") != "ok":
                    got = f"{res.get('status')}: {res.get('error', '')}"
                else:
                    r = res["results"][0]
                    got = r["error"] if "error" in r else r["got"]
                if got is not ex["breaks"]:
                    bad += 1
                    print(f"FAIL {it['id']} {st['id']} breaks({ex['inp']!r}): expected {ex['breaks']}, got {got!r}")
    print(f"{'OK' if not bad else 'FAIL'} ladder examples: {n} run, {bad} mismatched")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
