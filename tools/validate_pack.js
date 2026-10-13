#!/usr/bin/env node
/* Pack gate: schema, reference, DAG and answer checks. docs/PACK_SCHEMA.md is the spec.
 * Usage: node tools/validate_pack.js <packdir>      exit 0 when clean, 1 on any error.
 * API:   validate({pack, techniques, items}) -> string[] errors (empty when clean).
 *         check({pack, techniques, items}) -> {errors, warnings}.
 * Errors: schema, references, DAG, answers, LaTeX that KaTeX rejects, math outside the core font subset,
 *         a technique with items but no tier b numeric/expression item.
 * Warnings: items whose answer kind the engine cannot play yet. */
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('../engine/core.js');
const answer = require('../engine/answer.js');
const render = require('./render.js');

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SOURCE_TYPES = ['original', 'adapted', 'public-domain'];
const TIERS = ['a', 'b', 'c'];
const TYPES = ['recall', 'micro', 'full'];
const TIER_TYPE = { a: 'recall', b: 'micro', c: 'full' };

function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
function isInt(x) { return Number.isInteger(x); }

// Code answers (docs/SPEC.md 3.4): Python run in the browser. Structural checks only; tools/run_code_items.py proves the key.
const CODE_PACKAGES = ['numpy', 'pandas'];
const PY_KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield']);
// Numeric and expression answer objects (items and typed ladder stages): field ranges, no options, and the key must
// pass its own check (DECISIONS 15).
function checkTypedAnswer(a, w, err) {
  if (a.kind === 'numeric') {
    const v = typeof a.value === 'number' ? answer.parseNumber(a.value) : typeof a.value === 'string' ? answer.parseNumber(a.value) : null;
    if (!v || (typeof a.value === 'string' && !/^\s*[+-]?\d+\s*\/\s*\d+\s*$|^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(a.value))) err(w, 'answer.value must be a number, "p/q", a decimal or a scientific string (1.6e-19)');
    if (a.tol !== undefined && !(typeof a.tol === 'number' && a.tol >= 0)) err(w, 'answer.tol must be a number >= 0');
    if (a.rel !== undefined && !(typeof a.rel === 'number' && a.rel >= 0 && a.rel <= 0.1)) err(w, 'answer.rel must be a number from 0 to 0.1 (relative tolerance)');
    if (a.form !== undefined && !answer.FORMS.includes(a.form)) err(w, 'answer.form must be exact, decimal or fraction');
  }
  if (a.kind === 'numeric' && a.options !== undefined) err(w, 'numeric answers take no options');
  // The key must pass its own check: catches bad expression specs (parse error, undeclared var, zero-width or thin
  // domain) and numeric keys no typed answer can match (form fraction with a decimal value).
  if (a.kind === 'numeric' || a.kind === 'expression') {
    [a.value].concat(a.kind === 'expression' && Array.isArray(a.also) ? a.also : []).forEach((f) => {
      const r = answer.check(a, typeof f === 'number' ? String(f) : f);
      if (!r.ok) err(w, `answer ${JSON.stringify(f)} fails its own check (${r.error}${r.detail ? ': ' + r.detail : ''})`);
    });
    const pv = a.kind === 'numeric' && typeof a.value === 'string' ? answer.parseNumber(a.value) : null;
    if (pv && pv.p !== null && (a.form || 'exact') === 'exact' && (a.rel || a.tol)) err(w, 'rel and tol have no effect on an exact rational value; write value as a JSON number or set form decimal');
  }
}

// Ladder items (docs/PACK_SCHEMA.md "ladder"). Structural checks; tools/run_ladder_examples.py proves each counterexample's examples.
const LADDER_STAGE_TYPES = ['choose', 'counterexample', 'typed'];
function nonEmpty(x) { return typeof x === 'string' && x.trim().length > 0; }
function checkLadder(it, techById, w, err) {
  if (it.tier !== 'b') err(w, 'ladder items are tier b');
  if (!nonEmpty(it.lesson)) err(w, 'ladder lesson is required (Markdown, shown after the last stage)');
  const st = it.stages;
  if (!Array.isArray(st) || st.length < 3 || st.length > 7) { err(w, 'ladder stages must be an array of 3 to 7 stages'); return; }
  const seen = {};
  st.forEach((s, k) => {
    const sw = `${w} stages[${k}]`;
    if (!isObj(s)) { err(sw, 'must be an object'); return; }
    if (typeof s.id !== 'string' || !ID_RE.test(s.id)) err(sw, 'id must match [a-z0-9][a-z0-9._-]*');
    else if (seen[s.id]) err(sw, `duplicate stage id ${s.id}`);
    else seen[s.id] = true;
    if (s.move !== undefined && !techById[s.move]) err(sw, `move ${s.move} is not a technique`);
    if (!nonEmpty(s.ask)) err(sw, 'ask is required');
    if (!nonEmpty(s.reveal)) err(sw, 'reveal is required');
    if (s.hint !== undefined && !nonEmpty(s.hint)) err(sw, 'hint must be a non-empty string when present');
    if (!LADDER_STAGE_TYPES.includes(s.type)) { err(sw, `type must be one of ${LADDER_STAGE_TYPES.join(', ')}`); return; }
    if (s.type === 'choose') {
      if (!Array.isArray(s.options) || s.options.length < 3 || s.options.length > 4) { err(sw, 'choose stage needs 3 or 4 options'); return; }
      s.options.forEach((o, j) => {
        if (!isObj(o) || !nonEmpty(o.text) || typeof o.ok !== 'boolean' || !nonEmpty(o.feedback)) err(sw, `options[${j}] must be {text, ok: true|false, feedback}`);
      });
      const nOk = s.options.filter((o) => isObj(o) && o.ok === true).length;
      if (nOk !== 1) err(sw, `choose stage needs exactly one ok option (has ${nOk})`);
    } else if (s.type === 'counterexample') {
      if (!nonEmpty(s.claim)) err(sw, 'counterexample stage needs claim');
      if (!nonEmpty(s.input_hint)) err(sw, 'counterexample stage needs input_hint (input format and size cap)');
      if (!nonEmpty(s.code) || !/^def breaks\s*\(\s*inp\b/m.test(s.code)) err(sw, 'counterexample code must define def breaks(inp)');
      if (!Array.isArray(s.examples) || s.examples.length < 2) err(sw, 'counterexample examples needs at least 2 entries');
      else {
        s.examples.forEach((e, j) => { if (!isObj(e) || typeof e.inp !== 'string' || typeof e.breaks !== 'boolean') err(sw, `examples[${j}] must be {inp: string, breaks: true|false}`); });
        const t = s.examples.filter((e) => isObj(e) && e.breaks === true).length, f = s.examples.filter((e) => isObj(e) && e.breaks === false).length;
        if (!t || !f) err(sw, 'counterexample examples needs at least one breaks true and one breaks false');
      }
    } else {
      const a = s.answer;
      if (!isObj(a) || (a.kind !== 'numeric' && a.kind !== 'expression')) { err(sw, 'typed stage answer must be a numeric or expression answer'); return; }
      checkTypedAnswer(a, sw, err);
    }
  });
}

function checkCodeAnswer(a, it, w, err) {
  if (a.lang !== 'python') err(w, 'code answer.lang must be "python"');
  const entryOk = typeof a.entry === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(a.entry) && !PY_KEYWORDS.has(a.entry);
  if (!entryOk) err(w, 'code answer.entry must be a Python identifier (the function the tests call)');
  if (a.setup !== undefined && typeof a.setup !== 'string') err(w, 'code answer.setup must be a string of Python');
  if (!Array.isArray(a.tests) || a.tests.length < 3) err(w, 'code answer.tests needs at least 3 tests');
  else a.tests.forEach((t, k) => {
    if (!isObj(t) || !Array.isArray(t.args) || !('expect' in t) || t.expect === undefined) err(w, `code answer.tests[${k}] must be {args: [...], expect: <json>}`);
  });
  if (a.tol !== undefined && !(typeof a.tol === 'number' && a.tol >= 0 && a.tol <= 1)) err(w, 'code answer.tol must be a number from 0 to 1');
  if (a.packages !== undefined) {
    if (!Array.isArray(a.packages) || a.packages.some((p) => !CODE_PACKAGES.includes(p)) || new Set(a.packages).size !== a.packages.length) {
      err(w, `code answer.packages must be a list drawn from ${CODE_PACKAGES.join(', ')}`);
    }
  }
  if (typeof a.starter !== 'string' || !a.starter.trim()) err(w, 'code answer.starter is required (the editor text)');
  else if (entryOk && !new RegExp(`def\\s+${a.entry}\\s*\\(`).test(a.starter)) err(w, `code answer.starter must define ${a.entry}(...)`);
  if (a.options !== undefined || a.value !== undefined) err(w, 'code answers take no options or value');
  if (typeof it.solution === 'string' && !/```[A-Za-z0-9_+-]*[ \t]*\n[\s\S]*?```/.test(it.solution)) {
    err(w, 'code item solution must hold the reference code in a fenced block (```python ... ```); tools/run_code_items.py runs it against the tests');
  }
  if (it.tier === 'c') err(w, 'code answers are not allowed on tier c items');
  if (Array.isArray(a.tests)) a.tests.forEach((t, k) => {
    if (!isObj(t)) return;
    const big = unsafeInt(t.args) || unsafeInt(t.expect);
    if (big !== null) err(w, `code answer.tests[${k}] has the integer ${big} beyond 2^53 - 1; JSON numbers lose it (write {"__i": "<digits>"} in expect, keep args small)`);
  });
  if (typeof a.setup === 'string') {
    const mods = setupImports(a.setup).filter((m) => !SETUP_MODULES.has(m));
    if (mods.length) err(w, `code answer.setup imports ${mods.join(', ')}; allowed: ${[...SETUP_MODULES].sort().join(', ')}`);
  }
}
// setup is author Python that runs before the learner's code. Imports are limited to the package allowlist plus
// pure standard-library modules that Pyodide ships. A line-based scan of `import x` / `from x import`: it does not
// see __import__('x'), importlib or exec of a string. The guard catches mistakes, not a hostile author (pack authors
// are trusted; the build is theirs).
const SETUP_MODULES = new Set([...CODE_PACKAGES, 'math', 'statistics', 'random', 'collections', 'itertools', 'functools',
  'fractions', 'decimal', 're', 'string', 'heapq', 'bisect', 'operator', 'dataclasses', 'typing']);
function setupImports(src) {
  const out = [];
  src.split('\n').forEach((line) => {
    const l = line.replace(/#.*/, '');
    let m = /^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/.exec(l);
    if (m) { out.push(m[1].split('.')[0]); return; }
    m = /^\s*import\s+(.+)$/.exec(l);
    if (m) m[1].split(',').forEach((part) => { const n = part.trim().split(/\s+/)[0]; if (n) out.push(n.split('.')[0]); });
  });
  return out;
}
// First integer in a JSON value that a JS number cannot hold exactly, or null.
function unsafeInt(v) {
  if (typeof v === 'number') return Number.isInteger(v) && !Number.isSafeInteger(v) ? v : null;
  if (Array.isArray(v)) { for (const x of v) { const r = unsafeInt(x); if (r !== null) return r; } return null; }
  if (isObj(v)) { for (const k of Object.keys(v)) { const r = unsafeInt(v[k]); if (r !== null) return r; } }
  return null;
}

function validate(data) { return check(data).errors; }

function check(data) {
  const errs = [];
  const warnings = [];
  const err = (where, msg) => errs.push(`${where}: ${msg}`);
  const pack = data && data.pack, techs = data && data.techniques, items = data && data.items;

  // pack.json
  if (!isObj(pack)) { err('pack.json', 'must be an object'); return errs; }
  if (typeof pack.key !== 'string' || !ID_RE.test(pack.key)) err('pack.json', 'key must match [a-z0-9][a-z0-9._-]*');
  if (typeof pack.name !== 'string' || !pack.name) err('pack.json', 'name is required');
  if (!Array.isArray(pack.levels) || pack.levels.length === 0) { err('pack.json', 'levels must be a non-empty array'); return errs; }
  const levelIndex = {};
  pack.levels.forEach((l, i) => {
    const w = `pack.json levels[${i}]`;
    if (!isObj(l) || typeof l.id !== 'string' || !l.id) { err(w, 'id is required'); return; }
    if (levelIndex[l.id] !== undefined) err(w, `duplicate level id ${l.id}`);
    if (typeof l.label !== 'string' || !l.label) err(w, 'label is required');
    levelIndex[l.id] = i;
  });
  if (pack.gate !== undefined && !(typeof pack.gate === 'number' && pack.gate > 0 && pack.gate <= 1)) err('pack.json', 'gate must be in (0, 1]');
  if (pack.mastered !== undefined && !(isInt(pack.mastered) && pack.mastered >= 1)) err('pack.json', 'mastered must be an integer >= 1');
  if (pack.session !== undefined) {
    if (!isObj(pack.session)) err('pack.json', 'session must be an object');
    else for (const k of ['review', 'learn', 'micro', 'full']) {
      if (pack.session[k] !== undefined && !(isInt(pack.session[k]) && pack.session[k] >= 0)) err('pack.json', `session.${k} must be an integer >= 0`);
    }
  }
  if (pack.full !== undefined) {
    const b = isObj(pack.full) ? pack.full.budgetSec : undefined;
    if (!isObj(b)) err('pack.json', 'full.budgetSec must be an object with easy, mid and hard (seconds)');
    else for (const k of ['easy', 'mid', 'hard']) {
      if (!(isInt(b[k]) && b[k] > 0)) err('pack.json', `full.budgetSec.${k} must be an integer > 0`);
    }
  }
  if (pack.weights !== undefined) {
    const sum = Object.values(pack.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) err('pack.json', `weights must sum to 1 (got ${sum.toFixed(3)})`);
  }

  // techniques.json
  if (!Array.isArray(techs)) { err('techniques.json', 'must be an array'); return errs; }
  const techById = {};
  techs.forEach((t, i) => {
    const w = `techniques[${i}]${isObj(t) && t.id ? ' ' + t.id : ''}`;
    if (!isObj(t)) { err(w, 'must be an object'); return; }
    if (typeof t.id !== 'string' || !ID_RE.test(t.id)) { err(w, 'id must match [a-z0-9][a-z0-9._-]*'); return; }
    if (techById[t.id]) err(w, 'duplicate technique id');
    techById[t.id] = t;
    if (typeof t.name !== 'string' || !t.name) err(w, 'name is required');
    if (levelIndex[t.level] === undefined) err(w, `level ${t.level} is not in pack.levels`);
    if (typeof t.area !== 'string' || !t.area) err(w, 'area is required');
    if (typeof t.teach !== 'string' || !t.teach) err(w, 'teach is required');
    if (!isInt(t.order)) err(w, 'order must be an integer');
    if (t.exam !== undefined && typeof t.exam !== 'boolean') err(w, 'exam must be a boolean');
    if (!Array.isArray(t.prereq)) err(w, 'prereq must be an array (use [] for none)');
  });
  techs.forEach((t) => {
    if (!isObj(t) || !techById[t.id] || !Array.isArray(t.prereq)) return;
    const w = `techniques ${t.id}`;
    t.prereq.forEach((p) => {
      if (!techById[p]) { err(w, `prereq ${p} is not a technique`); return; }
      if (p === t.id) err(w, 'technique is its own prereq');
      else if (levelIndex[techById[p].level] > levelIndex[t.level]) err(w, `prereq ${p} sits at a later level`);
    });
  });
  // cycle check (DFS with colours)
  const colour = {};
  const visit = (id, stack) => {
    if (colour[id] === 2) return;
    if (colour[id] === 1) { err(`techniques ${id}`, `prereq cycle through ${stack.concat(id).join(' -> ')}`); return; }
    colour[id] = 1;
    const t = techById[id];
    if (t && Array.isArray(t.prereq)) t.prereq.forEach((p) => { if (techById[p]) visit(p, stack.concat(id)); });
    colour[id] = 2;
  };
  Object.keys(techById).forEach((id) => visit(id, []));

  // items.json
  if (!Array.isArray(items)) { err('items.json', 'must be an array'); return errs; }
  const itemIds = {};
  items.forEach((it, i) => {
    const w = `items[${i}]${isObj(it) && it.id ? ' ' + it.id : ''}`;
    if (!isObj(it)) { err(w, 'must be an object'); return; }
    if (typeof it.id !== 'string' || !ID_RE.test(it.id)) { err(w, 'id must match [a-z0-9][a-z0-9._-]*'); return; }
    if (itemIds[it.id]) err(w, 'duplicate item id');
    itemIds[it.id] = true;
    if (!TIERS.includes(it.tier)) err(w, 'tier must be a, b or c');
    if (it.type !== undefined && !TYPES.includes(it.type)) err(w, 'type must be recall, micro or full');
    if (TIERS.includes(it.tier) && it.type !== undefined && it.type !== TIER_TYPE[it.tier]) err(w, `type ${it.type} does not match tier ${it.tier}`);
    if (typeof it.prompt !== 'string' || !it.prompt.trim()) err(w, 'prompt is required');
    if (typeof it.solution !== 'string' || !it.solution.trim()) err(w, 'solution is required');
    if (!isInt(it.difficulty) || it.difficulty < 1 || it.difficulty > 5) err(w, 'difficulty must be an integer 1-5');
    if (!isObj(it.source) || !SOURCE_TYPES.includes(it.source.type)) err(w, `source.type must be one of ${SOURCE_TYPES.join(', ')}`);
    if (!Array.isArray(it.tags) || it.tags.length === 0) { err(w, 'tags must be a non-empty array'); return; }
    it.tags.forEach((tag) => { if (!techById[tag]) err(w, `tag ${tag} is not a technique`); });
    const primary = techById[it.tags[0]];
    if (primary && it.level !== primary.level) err(w, `level ${it.level} differs from primary tag level ${primary.level}`);
    if (levelIndex[it.level] === undefined) err(w, `level ${it.level} is not in pack.levels`);
    if (it.probe !== undefined) {
      if (typeof it.probe !== 'boolean') err(w, 'probe must be true or false');
      else if (it.probe && (it.tier !== 'b' || !it.answer || !['numeric', 'mcq', 'expression', 'multi', 'code'].includes(it.answer.kind))) {
        err(w, 'probe must be a tier b item with a playable answer kind');
      }
    }
    if (it.critical !== undefined) {
      if (!Array.isArray(it.critical)) err(w, 'critical must be an array');
      else it.critical.forEach((c) => { if (!it.tags.slice(1).includes(c)) err(w, `critical ${c} must be a secondary tag`); });
    }
    const a = it.answer;
    if (!isObj(a)) { err(w, 'answer is required'); return; }
    if (!core.ANSWER_KINDS.includes(a.kind)) { err(w, `answer.kind must be one of ${core.ANSWER_KINDS.join(', ')}`); return; }
    if (a.kind === 'numeric' || a.kind === 'expression') checkTypedAnswer(a, w, err);
    if (Array.isArray(a.options) || a.kind === 'mcq' || a.kind === 'multi') {
      if (!Array.isArray(a.options) || a.options.length < 2) err(w, 'answer.options needs at least 2 entries');
      else if (a.kind === 'multi') {
        const ok = Array.isArray(a.correct) && a.correct.length > 0 && a.correct.every((c) => isInt(c) && c >= 0 && c < a.options.length) && new Set(a.correct).size === a.correct.length;
        if (!ok) err(w, 'answer.correct must be a non-empty list of distinct indexes into answer.options');
      }
      else if (!isInt(a.correct) || a.correct < 0 || a.correct >= a.options.length) err(w, 'answer.correct must index answer.options');
    }
    if (a.kind === 'code') checkCodeAnswer(a, it, w, err);
    if (a.kind === 'ladder') checkLadder(it, techById, w, err);
    else if (it.stages !== undefined) err(w, 'stages are only for ladder items (answer.kind ladder)');
  });

  // M5: tier c (full) items. Commit kind mcq (5 options) or numeric; rubric and pass live at the top level.
  items.forEach((it, i) => {
    if (!isObj(it) || typeof it.id !== 'string') return;
    const w = `items[${i}] ${it.id}`;
    const hasRubric = it.rubric !== undefined || it.pass !== undefined;
    if (it.tier !== 'c') {
      if (hasRubric) err(w, 'rubric and pass are only for tier c items');
      return;
    }
    if (it.type !== undefined && it.type !== 'full') err(w, 'tier c items have type full');
    const a = it.answer;
    if (isObj(a) && a.kind !== 'mcq' && a.kind !== 'numeric') err(w, 'tier c answer.kind must be mcq (5 options) or numeric; the self-grade is the top-level rubric');
    if (isObj(a) && a.kind === 'mcq' && !(Array.isArray(a.options) && a.options.length === 5)) err(w, 'tier c mcq needs exactly 5 options');
    if (!Array.isArray(it.rubric) || it.rubric.length === 0) { err(w, 'rubric must be a non-empty array'); return; }
    let total = 0;
    it.rubric.forEach((r, k) => {
      if (!isObj(r) || typeof r.text !== 'string' || !r.text.trim()) err(w, `rubric[${k}].text is required`);
      if (!isObj(r) || typeof r.weight !== 'number' || !(r.weight > 0)) err(w, `rubric[${k}].weight must be a number > 0`);
      else total += r.weight;
    });
    if (typeof it.pass !== 'number' || !(it.pass > 0)) err(w, 'pass must be a number > 0');
    else if (it.pass > total + 1e-9) err(w, `pass ${it.pass} exceeds total rubric weight ${total}`);
  });

  // F4: a technique with items needs a tier b numeric or expression item, or the production gate deadlocks
  techs.forEach((t) => {
    if (!isObj(t) || !techById[t.id]) return;
    const own = items.filter((it) => isObj(it) && Array.isArray(it.tags) && it.tags[0] === t.id);
    if (own.length && !own.some((it) => it.tier === 'b' && isObj(it.answer) && (it.answer.kind === 'numeric' || it.answer.kind === 'expression' || it.answer.kind === 'code' || (it.answer.kind === 'ladder' && core.ladderProd(it))))) {
      err(`techniques ${t.id}`, 'has items but no tier b numeric, expression or code item (production gate needs one; a ladder counts when it has a counterexample or typed stage)');
    }
  });

  // A technique with no playable tier b item is never taught, so its level never finishes and every later level waits.
  techs.forEach((t) => {
    if (!isObj(t) || !techById[t.id] || levelIndex[t.level] === pack.levels.length - 1) return;
    const own = items.filter((it) => isObj(it) && Array.isArray(it.tags) && it.tags[0] === t.id);
    if (!own.some((it) => it.tier === 'b' && core.itemKind(it))) err(`techniques ${t.id}`, 'has no playable tier b item: it can never be taught and holds every later level');
  });

  // Control characters mean a JSON escape was misread: "\frac" with one backslash decodes to a form feed,
  // "\neq" to a newline, "\beta" to a backspace. Any such character in a string is an error, wherever it sits.
  const CTRL = /[\x00-\x08\x09\x0b-\x1f\x7f]/;
  const scanStrings = (v, where) => {
    if (typeof v === 'string') {
      const m = CTRL.exec(v);
      if (m) err(where, `control character U+${m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} in text; a single backslash before a letter is read as a JSON escape (write \\\\frac, not \\frac)`);
    } else if (Array.isArray(v)) v.forEach((x, k) => scanStrings(x, `${where}[${k}]`));
    else if (isObj(v)) Object.keys(v).forEach((k) => scanStrings(v[k], `${where}.${k}`));
  };
  techs.forEach((t, i) => scanStrings(t, `techniques[${i}] ${isObj(t) ? t.id : ''}`));
  items.forEach((it, i) => scanStrings(it, `items[${i}] ${isObj(it) ? it.id : ''}`));

  // M2: LaTeX and glyph checks on every rendered field (same renderer the build uses)
  techs.forEach((t, i) => {
    if (!isObj(t) || typeof t.id !== 'string' || typeof t.teach !== 'string' || !t.teach) return;
    render.renderTechnique(t, `techniques ${t.id}`).errors.forEach((e) => errs.push(e));
  });
  items.forEach((it, i) => {
    if (!isObj(it) || typeof it.id !== 'string' || typeof it.prompt !== 'string') return;
    render.renderItem(it, `items[${i}] ${it.id}`).errors.forEach((e) => errs.push(e));
  });

  // F5: warn on answer kinds the engine cannot play yet. expression and multi are playable (M4); self waits for M5.
  const unplayable = items.filter((it) => isObj(it) && isObj(it.answer) && it.answer.kind === 'self' && core.itemKind(it) === null);
  if (unplayable.length) {
    warnings.push(`${unplayable.length} item(s) use answer kinds the engine cannot play yet (self, until M5): ` +
      unplayable.map((it) => `${it.id} (${it.answer.kind})`).join(', '));
  }
  return { errors: errs, warnings };
}

function loadDir(dir) {
  const read = (f) => {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  };
  return { pack: read('pack.json'), techniques: read('techniques.json'), items: read('items.json') };
}

module.exports = { validate, check, loadDir };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node tools/validate_pack.js <packdir>'); process.exit(2); }
  let data;
  try { data = loadDir(dir); } catch (e) { console.error(`FAIL ${dir}: ${e.message}`); process.exit(1); }
  const res = check(data);
  res.warnings.forEach((w) => console.warn(`WARN ${dir}: ${w}`));
  if (res.errors.length) { console.error(`FAIL ${dir}: ${res.errors.length} error(s)\n  ` + res.errors.join('\n  ')); process.exit(1); }
  const nItems = data.items.length;
  console.log(`OK ${data.pack.key}: ${data.pack.levels.length} levels, ${data.techniques.length} techniques, ${nItems} items`);
}
