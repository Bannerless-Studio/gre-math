/* Build-time math validation for problem packs (M2). Pure Node: no DOM, no network.
 * Used by tools/validate_pack.js and tools/render_pack.js (errors + inlined CSS). The page renders math itself at run
 * time (engine/text.js mathSpan); this file only proves every field renders, so the build fails before the page does.
 *
 * - renderText / renderItem / renderTechnique: Markdown-lite + $...$ / $$...$$ via text.mathSpan with throwOnError;
 *   KaTeX strict warnings are collected as errors, not printed. renderItem and renderTechnique return errors only.
 * - glyphIssues(html): flags math spans whose requested font face is not in the vendored core subset.
 *   The face is worked out from KaTeX's own katex.min.css (font-family/style/weight per class rule).
 *   Rules whose selector ends in a child combinator (`.delim-size1>span`) are skipped; they are Size faces, which are core.
 * - inlineCss(): katex.min.css with @font-face rules for non-core faces removed and core faces as base64 woff2. */
'use strict';
const fs = require('fs');
const path = require('path');
const text = require('../engine/text.js');

const VENDOR = path.join(__dirname, '..', 'vendor', 'katex');
const katex = require(path.join(VENDOR, 'katex.min.js'));
const CSS_RAW = fs.readFileSync(path.join(VENDOR, 'katex.min.css'), 'utf8');
const CORE_FONTS = [
  'KaTeX_Main-Regular', 'KaTeX_Main-Bold', 'KaTeX_Main-Italic', 'KaTeX_Math-Italic', 'KaTeX_AMS-Regular',
  'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular', 'KaTeX_Size4-Regular',
  'KaTeX_Caligraphic-Regular'
];

function normWeight(w) {
  if (w === undefined) return undefined;
  if (w === 'bold') return 700;
  if (w === 'normal') return 400;
  return Number(w);
}
function faceKey(family, style, weight) { return family + '|' + style + '|' + weight; }

// @font-face: family, style, weight, and the woff2 file each face points at.
const FACES = [];
(function parseFaces() {
  const re = /@font-face\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(CSS_RAW))) {
    const d = m[1];
    const family = /font-family:\s*"?([^";]+?)"?\s*(?:;|$)/.exec(d)[1];
    const style = /font-style:\s*(\w+)/.exec(d)[1];
    const weight = normWeight(/font-weight:\s*(\w+)/.exec(d)[1]);
    const file = /url\((?:fonts\/)?([^)]+?)\.woff2\)/.exec(d);
    FACES.push({ family, style, weight, file: file ? file[1] : null, key: faceKey(family, style, weight), decl: d });
  }
})();
const CORE_FACE_KEYS = new Set(FACES.filter((f) => f.file && CORE_FONTS.indexOf(f.file) >= 0).map((f) => f.key));

// Class rules: `.a.b` or `.katex .a.b` with font-family / font-style / font-weight declarations.
const CLASS_RULES = [];
(function parseClassRules() {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(CSS_RAW))) {
    const sel = m[1].trim(), decl = m[2];
    if (sel.indexOf('@') >= 0) continue;
    if (!/font-(family|style|weight)/.test(decl)) continue;
    const fam = /font-family:\s*"?([^";]+?)"?\s*(?:;|$)/.exec(decl);
    const sty = /font-style:\s*(\w+)/.exec(decl);
    const wgt = /font-weight:\s*(\w+)/.exec(decl);
    sel.split(',').forEach((s) => {
      const last = s.trim().split(/\s+/).pop();
      if (!/^(\.[\w-]+)+$/.test(last)) return;   // child-combinator or tag selectors: Size faces only
      CLASS_RULES.push({ classes: last.split('.').filter(Boolean),
        family: fam ? fam[1] : undefined, style: sty ? sty[1] : undefined, weight: wgt ? normWeight(wgt[1]) : undefined });
    });
  }
})();

// Face a glyph span requests from its class list, or null when no font rule applies.
function faceForClasses(classes) {
  let hit = false, family = 'KaTeX_Main', style = 'normal', weight = 400;
  CLASS_RULES.forEach((r) => {
    if (!r.classes.every((c) => classes.indexOf(c) >= 0)) return;
    hit = true;
    if (r.family !== undefined) family = r.family;
    if (r.style !== undefined) style = r.style;
    if (r.weight !== undefined) weight = r.weight;
  });
  return hit ? { family, style, weight, key: faceKey(family, style, weight) } : null;
}

// Returns [{family, style, weight}] for every requested face that is not in the core subset.
function glyphIssues(html) {
  const seen = {}, out = [];
  const re = /class="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const f = faceForClasses(m[1].split(/\s+/).filter(Boolean));
    if (!f || CORE_FACE_KEYS.has(f.key) || seen[f.key]) continue;
    seen[f.key] = true;
    out.push({ family: f.family, style: f.style, weight: f.weight });
  }
  return out;
}

// Same span the page renders (text.mathSpan), with errors collected instead of drawn.
function katexOne(tex, display, errs, where) {
  return text.mathSpan(katex, tex, display, (msg) => errs.push(where + ': ' + msg));
}

// Renders one Markdown-lite field. Returns {html, errors}. Errors name `where` and the field.
function renderText(src, inline, where) {
  const errs = [];
  const html = text.md(src, inline, function (tex, display) { return katexOne(tex, display, errs, where); });
  glyphIssues(html).forEach((g) => {
    errs.push(where + ': math uses font ' + g.family + ' (' + g.style + ', ' + g.weight + '), outside the core subset');
  });
  return { html: html, errors: errs };
}

// Every prose field of an item, validated. Returns {errors}; the rendered HTML is not kept (the page renders it).
function renderItem(item, where) {
  const errors = [];
  const check = (src, inline, name) => { if (src !== undefined && src !== null) errors.push(...renderText(String(src), inline, where + ' ' + name).errors); };
  check(item.prompt, false, 'prompt');
  check(item.solution, false, 'solution');
  if (Array.isArray(item.hints)) item.hints.forEach((h, i) => check(h, false, 'hints[' + i + ']'));
  const a = item.answer || {};
  if (Array.isArray(a.options)) a.options.forEach((o, i) => check(o, true, 'options[' + i + ']'));
  if (a.display !== undefined) check(a.display, true, 'display');
  if (Array.isArray(item.rubric)) item.rubric.forEach((r, i) => check(r && r.text != null ? r.text : '', true, 'rubric[' + i + ']'));
  return { errors: errors };
}

function renderTechnique(tech, where) {
  return { errors: renderText(String(tech.teach == null ? '' : tech.teach), false, where + ' teach').errors };
}

// Core subset @font-face rules with the woff2 inlined as base64. Non-core faces are dropped.
function inlineCss() {
  const out = CSS_RAW.replace(/@font-face\{([^}]*)\}/g, function (all, decl) {
    const f = FACES.find((x) => x.decl === decl);
    if (!f || !f.file || CORE_FONTS.indexOf(f.file) < 0) return '';
    const file = path.join(VENDOR, 'fonts', f.file + '.woff2');
    if (!fs.existsSync(file)) throw new Error('missing vendored font ' + file);
    const b64 = fs.readFileSync(file).toString('base64');
    return '@font-face{' + decl.replace(/src:.*$/, 'src:url(data:font/woff2;base64,' + b64 + ') format("woff2")') + '}';
  });
  return out;
}

module.exports = { renderText, renderItem, renderTechnique, glyphIssues, inlineCss, CORE_FONTS, FACES, CORE_FACE_KEYS, katex };
