#!/usr/bin/env python3
"""Merge packs/<pack>/batches/*.json into items.json and techniques.json (idempotent by id).
   <Tn>.ab.json / <Tn>.c.json: item lists.  <Tn>.teach.json: {techniqueId: teachMarkdown}.
   usage: python3 -I tools/merge_batches.py packs/gre-math"""
import glob, json, os, sys
pack = sys.argv[1] if len(sys.argv) > 1 else "packs/gre-math"
ip, tp = os.path.join(pack, "items.json"), os.path.join(pack, "techniques.json")
items = json.load(open(ip)); techs = json.load(open(tp))
by_id = {it["id"]: i for i, it in enumerate(items)}
tech_by = {t["id"]: t for t in techs}
added = replaced = teach = 0
for f in sorted(glob.glob(os.path.join(pack, "batches", "*.json"))):
    data = json.load(open(f))
    if f.endswith(".teach.json"):
        for tid, md in data.items():
            if tid not in tech_by: sys.exit(f"{f}: unknown technique {tid}")
            tech_by[tid]["teach"] = md; teach += 1
        continue
    for it in data:
        if it["id"] in by_id: items[by_id[it["id"]]] = it; replaced += 1
        else: by_id[it["id"]] = len(items); items.append(it); added += 1
json.dump(items, open(ip, "w"), indent=1, ensure_ascii=False)
json.dump(techs, open(tp, "w"), indent=1, ensure_ascii=False)
print(f"merged: +{added} items, {replaced} replaced, {teach} teach cards; total {len(items)} items")
