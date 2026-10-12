#!/usr/bin/env python3
"""Check gre-math pack items. Stdlib only. Run: python3 -I tools/check_items.py [pack_dir]

Numeric items: the `check` expression is evaluated independently and must equal
`answer.value` within `answer.tol`. mcq items: 4 distinct options, valid index.
Also cross-checks tags/level against techniques.json and prints per-technique counts.
"""
import json
import math
import os
import re
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
    try:
        scope = {"__builtins__": {}}
        scope.update(ENV)  # globals, so generator expressions and lambdas can see names
        got = eval(expr, scope)
    except Exception as e:  # noqa: BLE001 - report any evaluation failure
        errors.append(f"check raised {type(e).__name__}: {e}")
        return None
    if isinstance(got, float):
        if abs(got - float(value)) > float(tol) + 1e-9:
            errors.append(f"check gives {got!r}, value {ans['value']!r}")
    elif isinstance(got, (int, Fraction)):
        if abs(Fraction(got) - value) > tol:
            errors.append(f"check gives {got!r}, value {ans['value']!r}, tol {ans.get('tol', 0)}")
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


def main():
    pack = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PACK
    items = load(os.path.join(pack, "items.json"))
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
        else:
            errors.append(f"unsupported answer kind {kind!r} in this batch")
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
