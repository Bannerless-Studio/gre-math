#!/usr/bin/env python3
"""Author-side key check for code answers (the `check` of numeric items, for Python).
Run: python3 -I tools/run_code_items.py [--allow-skip] <packdir>     (NODE=/path/to/node when node is not on PATH)

For every item with answer.kind == "code":
  - the reference code (first fenced block of `solution`) runs against answer.tests in local CPython through
    engine/pyharness.py, the same harness the browser runs in Pyodide, and every test must pass;
  - the `starter` must NOT already pass all tests (an exercise that starts solved is a bug);
  - grading uses engine/answer.js checkCode through tools/code_verdict.js, the browser's own comparison.
An item that needs numpy or pandas when the package is not installed locally is a failure (exit 1): the key is not
proven. --allow-skip turns that into a counted SKIP line instead. Exit 1 on any mismatch. Each item gets a 10 s limit (Unix SIGALRM), the same wall as the page.
"""
import importlib.util
import json
import os
import re
import shutil
import signal
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FENCE = re.compile(r"```[A-Za-z0-9_+-]*[ \t]*\n(.*?)\n?```", re.S)
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


def run_one(harness, src, a):
    tests = json.dumps([{"args": t["args"]} for t in a["tests"]])
    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(WALL)
    try:
        return json.loads(harness.run(src, a.get("setup") or "", a["entry"], tests))
    except Timeout:
        return {"status": "timeout"}
    finally:
        signal.alarm(0)


def user_site():
    # -I hides the user site, where numpy and pandas usually live; add it back for the package lookup only.
    import site
    try:
        path = site.getusersitepackages()
    except Exception:
        return
    if os.path.isdir(path) and path not in sys.path:
        sys.path.append(path)


def have(pkg):
    return importlib.util.find_spec(pkg) is not None


def find_node():
    n = os.environ.get("NODE") or shutil.which("node")
    if not n or not os.access(n, os.X_OK):
        sys.exit("run_code_items: node not found; set NODE=/path/to/node")
    return n


def main():
    args = [a for a in sys.argv[1:] if a != "--allow-skip"]
    allow_skip = len(args) != len(sys.argv) - 1
    if len(args) != 1 or args[0].startswith("-"):
        sys.exit("usage: python3 -I tools/run_code_items.py [--allow-skip] <packdir>")
    with open(os.path.join(args[0], "items.json"), encoding="utf-8") as f:
        items = json.load(f)
    code = [it for it in items if isinstance(it.get("answer"), dict) and it["answer"].get("kind") == "code"]
    user_site()
    harness = load_harness()
    jobs, skipped, failures = [], [], []
    for it in code:
        a = it["answer"]
        missing = [p for p in a.get("packages", []) if not have(p)]
        if missing:
            if allow_skip:
                skipped.append((it["id"], missing))
            else:
                failures.append(f"{it['id']}: needs {', '.join(missing)}, not installed for this python3 "
                                f"(pip install it, or pass --allow-skip to leave the key unproven)")
            continue
        m = FENCE.search(it.get("solution", ""))
        if not m:
            failures.append(f"{it['id']}: solution has no fenced reference code")
            continue
        jobs.append({"id": it["id"] + ":solution", "spec": a, "result": run_one(harness, m.group(1), a), "want": True})
        jobs.append({"id": it["id"] + ":starter", "spec": a, "result": run_one(harness, a.get("starter", ""), a), "want": False})
    if jobs:
        proc = subprocess.run([find_node(), os.path.join(HERE, "code_verdict.js")], input=json.dumps(
            [{"id": j["id"], "spec": j["spec"], "result": j["result"]} for j in jobs]), capture_output=True, text=True)
        if proc.returncode != 0:
            sys.exit("code_verdict.js failed:\n" + proc.stderr)
        for j, v in zip(jobs, json.loads(proc.stdout)):
            if j["want"] and not v["ok"]:
                why = v["line"] or v.get("detail") or v.get("error") or "no result"
                failures.append(f"{v['id']}: reference code fails: {why}")
            if not j["want"] and v["ok"]:
                failures.append(f"{v['id']}: the starter already passes every test")
    for f in failures:
        print("FAIL", f)
    for i, pk in skipped:
        print(f"SKIP {i}: needs {', '.join(pk)}, not installed locally (key not proven here)")
    ok = len(code) - len(skipped) - len({x.split(":")[0] for x in failures})
    print(f"RESULT run_code_items code_items={len(code)} proven={ok} skipped={len(skipped)} failed={len(failures)}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
