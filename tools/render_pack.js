#!/usr/bin/env node
/* Build-time math gate for a pack. The page renders math at run time from the source (docs/SPEC.md section 4),
 * so this writes no rendered HTML. It renders every prose field with the page's own span code (throwOnError on)
 * and exits 1 on any LaTeX error, KaTeX strict warning, or glyph outside the core font subset.
 * Writes katex.css (KaTeX CSS with the core font subset inlined as base64 woff2) into outdir.
 * Usage: node tools/render_pack.js <packdir> <outdir>
 * build.sh runs the validator first, so this is a second gate. */
'use strict';
const fs = require('fs');
const path = require('path');
const render = require('./render.js');
const { loadDir } = require('./validate_pack.js');

const packDir = process.argv[2], outDir = process.argv[3];
if (!packDir || !outDir) { console.error('usage: node tools/render_pack.js <packdir> <outdir>'); process.exit(2); }
const data = loadDir(packDir);
const errors = [];

data.items.forEach((it, i) => errors.push(...render.renderItem(it, `items[${i}] ${it.id}`).errors));
data.techniques.forEach((t, i) => errors.push(...render.renderTechnique(t, `techniques[${i}] ${t.id}`).errors));
if (errors.length) { console.error(`FAIL render ${packDir}: ${errors.length} error(s)\n  ` + errors.join('\n  ')); process.exit(1); }

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'katex.css'), render.inlineCss());
console.log(`math ok: ${data.items.length} items, ${data.techniques.length} techniques (validation only) -> ${outDir}/katex.css`);
