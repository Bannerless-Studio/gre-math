#!/usr/bin/env python3
"""Merge packs/<pack>/batches/*.json into items.json and techniques.json (idempotent by id).
   <Tn>.ab.json / <Tn>.c.json: item lists.  <Tn>.teach.json: {techniqueId: teachMarkdown}.
   usage: python3 -I tools/merge_batches.py packs/gre-math [--only=T4,T5]"""
import glob, json, os, sys
only = [a[len("--only="):].split(",") for a in sys.argv[1:] if a.startswith("--only=")]
only = set(only[0]) if only else None
args = [a for a in sys.argv[1:] if not a.startswith("--only=")]
pack = args[0] if args else "packs/gre-math"
ip, tp = os.path.join(pack, "items.json"), os.path.join(pack, "techniques.json")
items = json.load(open(ip)); techs = json.load(open(tp))
by_id = {it["id"]: i for i, it in enumerate(items)}
tech_by = {t["id"]: t for t in techs}
added = replaced = teach = 0
seen_run = {}
for f in sorted(glob.glob(os.path.join(pack, "batches", "*.json"))):
    if only is not None and os.path.basename(f).split(".")[0] not in only: continue
    data = json.load(open(f))
    if f.endswith(".teach.json"):
        for tid, md in data.items():
            if tid not in tech_by: sys.exit(f"{f}: unknown technique {tid}")
            tech_by[tid]["teach"] = md; teach += 1
        continue
    for it in data:
        if it["id"] in seen_run: sys.exit(f"{f}: item id {it['id']} already appears in {seen_run[it['id']]} in this run")
        seen_run[it["id"]] = os.path.basename(f)
        if it["id"] in by_id: items[by_id[it["id"]]] = it; replaced += 1
        else: by_id[it["id"]] = len(items); items.append(it); added += 1
json.dump(items, open(ip, "w"), indent=1, ensure_ascii=False)
json.dump(techs, open(tp, "w"), indent=1, ensure_ascii=False)
print(f"merged: +{added} items, {replaced} replaced, {teach} teach cards; total {len(items)} items")
