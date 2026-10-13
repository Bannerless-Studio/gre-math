#!/usr/bin/env python3
"""Check gre-math pack items. Stdlib only. Run: python3 -I tools/check_items.py [pack_dir]

Numeric items: the `check` expression is evaluated independently and must equal
`answer.value` within max(`answer.tol`, `answer.rel` * |value|); rel is 0 to 0.1. mcq items: 4 distinct options, valid index.
Code items (answer.kind code, Python in the browser): structure only here; tools/run_code_items.py proves the key.
Also cross-checks tags/level against techniques.json and prints per-technique counts.
"""
import json
import math
import os
import re
import shutil
import sys
from collections import Counter, defaultdict
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PACK = os.path.join(HERE, "..", "packs", "gre-math")
ENV = {
    "Fraction": Fraction, "math": math, "range": range, "sum": sum, "abs": abs,
    "min": min, "max": max, "set": set, "int": int, "len": len, "round": round,
}
FORMS = {"exact", "decimal", "fraction"}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def parse_value(v):
    if isinstance(v, bool):
        raise ValueError("bool is not a value")
    if isinstance(v, (int, float)):
        return Fraction(str(v))
    if isinstance(v, str):
        s = v.strip()
        if "/" in s:
            p, q = s.split("/", 1)
            if not (p.lstrip("-").isdigit() and q.isdigit()) or int(q) == 0:
                raise ValueError(f"bad p/q string {v!r}")
            return Fraction(int(p), int(q))
        return Fraction(s)
    raise ValueError(f"unsupported value {v!r}")


def check_numeric(item, errors):
    ans = item["answer"]
    expr = item.get("check")
    if not expr:
        errors.append("numeric item has no check field")
        return None
    if ans.get("form") not in FORMS:
        errors.append(f"bad form {ans.get('form')!r}")
    try:
        value = parse_value(ans["value"])
    except (ValueError, KeyError) as e:
        errors.append(f"value unparsable: {e}")
        return None
    if ans.get("form") == "fraction":
        if not (isinstance(ans["value"], str) and "/" in ans["value"]):
            errors.append("form fraction needs a p/q string value")
        elif Fraction(value.numerator, value.denominator) != value or str(value) != ans["value"]:
            errors.append(f"fraction value {ans['value']!r} not in lowest terms")
    tol = Fraction(str(ans.get("tol", 0)))
    rel = ans.get("rel", 0)
    if isinstance(rel, bool) or not isinstance(rel, (int, float)) or not 0 <= rel <= 0.1:
        errors.append(f"rel {rel!r} must be a number from 0 to 0.1")
        rel = 0
    # Tolerance is max(tol, rel*|value|), as in engine/answer.js checkNumeric.
    eff_tol = max(tol, Fraction(str(rel)) * abs(value))
    try:
        scope = {"__builtins__": {}}
        scope.update(ENV)  # globals, so generator expressions and lambdas can see names
        got = eval(expr, scope)
    except Exception as e:  # noqa: BLE001 - report any evaluation failure
        errors.append(f"check raised {type(e).__name__}: {e}")
        return None
    if isinstance(got, float):
        if abs(got - float(value)) > float(eff_tol) + 1e-9 * abs(float(value)):
            errors.append(f"check gives {got!r}, value {ans['value']!r}, tol {ans.get('tol', 0)}, rel {rel}")
    elif isinstance(got, (int, Fraction)):
        if abs(Fraction(got) - value) > eff_tol:
            errors.append(f"check gives {got!r}, value {ans['value']!r}, tol {ans.get('tol', 0)}, rel {rel}")
    else:
        errors.append(f"check returned {type(got).__name__}, expected number")
    return got


def option_value(opt):
    """Parse a plain number or p/q option (LaTeX \\frac allowed); None if not plain."""
    s = str(opt).strip().strip("$").strip()
    m = re.fullmatch(r"(-?)\\d?frac\{(\d+)\}\{(\d+)\}", s)
    try:
        if m:
            v = Fraction(int(m.group(2)), int(m.group(3)))
            return -v if m.group(1) else v
        return Fraction(s.replace(" ", ""))
    except (ValueError, ZeroDivisionError):
        return None


def check_mcq(item, errors):
    ans = item["answer"]
    opts = ans.get("options")
    want = 5 if item.get("tier") == "c" else 4
    if not isinstance(opts, list) or len(opts) != want:
        errors.append(f"mcq needs exactly {want} options")
        return
    norm = [" ".join(str(o).split()) for o in opts]
    if len(set(norm)) != len(norm):
        errors.append("mcq options not distinct")
    c = ans.get("correct")
    if not isinstance(c, int) or not 0 <= c < len(opts):
        errors.append(f"correct index {c!r} out of range")
    why = ans.get("why")
    if why is not None and len(why) != len(opts):
        errors.append("why must align with options")
    if item.get("tier") == "c":
        check_full_mcq(item, errors)


def check_full_mcq(item, errors):
    rub = item.get("rubric")
    if not isinstance(rub, list) or not 3 <= len(rub) <= 4:
        errors.append("full needs 3-4 rubric lines")
    else:
        total = sum(r.get("weight", 0) for r in rub)
        if not 4 <= total <= 6:
            errors.append(f"rubric weights sum {total}, want 4-6")
        if not isinstance(item.get("pass"), (int, float)) or not 0 < item["pass"] <= total:
            errors.append("pass must be in (0, total weight]")
    if len(item.get("tags", [])) < 2:
        errors.append("full needs 2+ tags")
    expr = item.get("check")
    if expr is None:
        return
    try:
        scope = {"__builtins__": {}}
        scope.update(ENV)
        got = eval(expr, scope)
    except Exception as e:  # noqa: BLE001
        errors.append(f"check raised {type(e).__name__}: {e}")
        return
    val = option_value(item["answer"]["options"][item["answer"]["correct"]])
    if val is None:
        print(f"  note {item['id']}: correct option not plain number; check ran ({got!r}), value not compared")
        return
    ok = abs(float(got) - float(val)) <= 1e-9 if isinstance(got, float) else Fraction(got) == val
    if not ok:
        errors.append(f"check gives {got!r}, correct option is {val}")


NODE = os.environ.get("NODE") or shutil.which("node") or "node"   # set NODE to pin a binary
_EXPR_QUEUE = []


def check_expression(item, errors):
    """Queue for a single node run: value and every `also` form must pass engine/answer.js check."""
    ans = item["answer"]
    if not isinstance(ans.get("value"), str) or not ans["value"].strip():
        errors.append("expression value must be a non-empty string")
        return
    if not isinstance(ans.get("vars"), list) or not ans["vars"]:
        errors.append("expression needs vars")
        return
    forms = [ans["value"]] + list(ans.get("also") or [])
    _EXPR_QUEUE.append((item["id"], ans, forms))


def run_expression_queue(failures):
    if not _EXPR_QUEUE:
        return
    import subprocess, tempfile
    script = (
        "const A=require(process.argv[1]);const q=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));"
        "const out=[];for(const [id,spec,forms] of q){for(const f of forms){const r=A.check(spec,f);"
        "if(!r.ok)out.push([id,f,r.error||'not ok']);}}console.log(JSON.stringify(out));"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(_EXPR_QUEUE, fh)
        qpath = fh.name
    answer_js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "engine", "answer.js")
    r = subprocess.run([NODE, "-e", script, os.path.abspath(answer_js), qpath], capture_output=True, text=True)
    os.unlink(qpath)
    if r.returncode != 0:
        failures.append(("<expression-check>", [f"node failed: {r.stderr.strip()[:200]}"]))
        return
    for iid, form, err in json.loads(r.stdout or "[]"):
        failures.append((iid, [f"expression form {form!r} rejected by engine: {err}"]))


def check_multi(item, errors):
    ans = item["answer"]
    opts = ans.get("options")
    cor = ans.get("correct")
    if not isinstance(opts, list) or len(opts) < 3:
        errors.append("multi needs >= 3 options")
        return
    if len(set(map(str, opts))) != len(opts):
        errors.append("multi options not distinct")
    if not isinstance(cor, list) or not cor or not all(isinstance(i, int) and 0 <= i < len(opts) for i in cor):
        errors.append("multi correct must be a non-empty list of valid indices")
    elif len(set(cor)) != len(cor):
        errors.append("multi correct has duplicates")
    elif len(cor) == len(opts):
        errors.append("multi correct selects every option")


def check_code(item, errors):
    """Structure only. The key itself is proven by tools/run_code_items.py (runs the reference code against the tests)."""
    ans = item["answer"]
    tests = ans.get("tests")
    if ans.get("lang") != "python":
        errors.append("code lang must be python")
    if not isinstance(ans.get("entry"), str) or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", ans["entry"]):
        errors.append("code entry must be an identifier")
    if not isinstance(tests, list) or len(tests) < 3:
        errors.append("code needs >= 3 tests")
    elif not all(isinstance(t, dict) and isinstance(t.get("args"), list) and "expect" in t for t in tests):
        errors.append("every code test needs args (list) and expect")
    if any(p not in ("numpy", "pandas") for p in ans.get("packages", [])):
        errors.append("code packages must be numpy and/or pandas")
    if not isinstance(ans.get("starter"), str) or not ans.get("starter", "").strip():
        errors.append("code needs a starter")
    elif isinstance(ans.get("entry"), str) and not re.search(r"def\s+" + re.escape(ans["entry"]) + r"\s*\(", ans["starter"]):
        errors.append("starter must define the entry function")
    if not re.search(r"```[A-Za-z0-9_+-]*[ \t]*\n.*?```", item.get("solution", ""), re.S):
        errors.append("code solution must hold the reference code in a fenced block")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--batch=")]
    batch = next((a[len("--batch="):] for a in sys.argv[1:] if a.startswith("--batch=")), None)
    pack = args[0] if args else DEFAULT_PACK
    items = load(batch) if batch else load(os.path.join(pack, "items.json"))
    techs = {t["id"]: t for t in load(os.path.join(pack, "techniques.json"))}
    failures = []
    seen_ids = set()
    counts = defaultdict(Counter)
    for item in items:
        iid = item.get("id", "<no id>")
        errors = []
        if iid in seen_ids:
            errors.append("duplicate id")
        seen_ids.add(iid)
        for field in ("id", "tier", "type", "level", "tags", "difficulty", "prompt",
                      "answer", "solution", "hints", "source"):
            if field not in item:
                errors.append(f"missing {field}")
        if item.get("source", {}).get("type") != "original":
            errors.append("source.type must be original in this batch")
        if item.get("tier") not in ("a", "b", "c"):
            errors.append("bad tier")
        if item.get("type") not in ("recall", "micro", "full"):
            errors.append("bad type")
        if not isinstance(item.get("difficulty"), int) or not 1 <= item["difficulty"] <= 5:
            errors.append("difficulty must be 1-5")
        tags = item.get("tags", [])
        if not tags:
            errors.append("no tags")
        for tg in tags:
            if tg not in techs:
                errors.append(f"tag {tg} not in techniques.json")
        if tags and tags[0] in techs and techs[tags[0]]["level"] != item.get("level"):
            errors.append(f"level {item.get('level')} != technique level {techs[tags[0]]['level']}")
        ans = item.get("answer", {})
        kind = ans.get("kind")
        if kind == "numeric":
            check_numeric(item, errors)
        elif kind == "mcq":
            check_mcq(item, errors)
        elif kind == "expression":
            check_expression(item, errors)
        elif kind == "multi":
            check_multi(item, errors)
        elif kind == "code":
            check_code(item, errors)
        else:
            errors.append(f"unsupported answer kind {kind!r} in this batch")
        # Category guards found in T4 review: options are shuffled at play time, so text must never cite a position;
        # "an antiderivative" prompts admit any +C, so expression answers must pin the constant.
        pos = re.compile(r"\b(option|choice|answer)\s*[1-5A-E]\b|\b(first|second|third|fourth|last) (option|choice)\b", re.I)
        for fld in ("solution", "prompt"):
            if pos.search(str(item.get(fld, ""))):
                errors.append(f"{fld} cites an option by position (options are shuffled)")
        if kind == "expression" and re.search(r"\ban antiderivative\b|\bindefinite integral\b", item.get("prompt", ""), re.I) \
                and not re.search(r"C\s*=\s*0|constant|tends to|\bF\(|such that", item.get("prompt", ""), re.I):
            errors.append("expression antiderivative prompt must pin the constant of integration")
        if not item.get("hints") or not isinstance(item.get("hints"), list):
            errors.append("hints must be a non-empty list")
        if errors:
            failures.append((iid, errors))
        if tags:
            counts[tags[0]][f"{item.get('type')}/{kind}"] += 1

    print(f"{'technique':<20}{'recall/mcq':>12}{'micro/num':>12}{'micro/mcq':>12}")
    for tid in sorted(counts):
        c = counts[tid]
        print(f"{tid:<20}{c['recall/mcq']:>12}{c['micro/numeric']:>12}{c['micro/mcq']:>12}")
    run_expression_queue(failures)
    total_items = len(items)
    if failures:
        print(f"FAIL {len(failures)} of {total_items} items")
        for iid, errs in failures:
            for e in errs:
                print(f"  {iid}: {e}")
        return 1
    print(f"OK {total_items} items")
    return 0


if __name__ == "__main__":
    sys.exit(main())
