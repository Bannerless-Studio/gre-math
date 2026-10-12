#!/usr/bin/env node
/* Renders a pack's math for the build. Source JSON stays the truth; this writes copies.
 * Usage: node tools/render_pack.js <packdir> <outdir>
 * Writes into outdir: items.json and techniques.json (each record gains `html`, tag-packed), tags.json (the dictionary), katex.css (core subset inlined).
 * Exits 1 on any LaTeX or font-subset error. build.sh runs the validator first, so this is a second gate. */
'use strict';
const fs = require('fs');
const path = require('path');
const render = require('./render.js');
const { loadDir } = require('./validate_pack.js');

const packDir = process.argv[2], outDir = process.argv[3];
if (!packDir || !outDir) { console.error('usage: node tools/render_pack.js <packdir> <outdir>'); process.exit(2); }
const data = loadDir(packDir);
const errors = [];

const items = data.items.map((it, i) => {
  const r = render.renderItem(it, `items[${i}] ${it.id}`);
  errors.push(...r.errors);
  return Object.assign({}, it, { html: r.html });
});
const techniques = data.techniques.map((t, i) => {
  const r = render.renderTechnique(t, `techniques[${i}] ${t.id}`);
  errors.push(...r.errors);
  return Object.assign({}, t, { html: r.html });
});
if (errors.length) { console.error(`FAIL render ${packDir}: ${errors.length} error(s)\n  ` + errors.join('\n  ')); process.exit(1); }

const tags = render.packHtml(items.concat(techniques));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'items.json'), JSON.stringify(items));
fs.writeFileSync(path.join(outDir, 'techniques.json'), JSON.stringify(techniques));
fs.writeFileSync(path.join(outDir, 'tags.json'), JSON.stringify(tags));
fs.writeFileSync(path.join(outDir, 'katex.css'), render.inlineCss());
console.log(`rendered ${items.length} items, ${techniques.length} techniques -> ${outDir}`);
