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
      else if (it.probe && (it.tier !== 'b' || !it.answer || !['numeric', 'mcq', 'expression', 'multi'].includes(it.answer.kind))) {
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
    if (a.kind === 'numeric') {
      const v = typeof a.value === 'number' ? answer.parseNumber(a.value) : typeof a.value === 'string' ? answer.parseNumber(a.value) : null;
      if (!v || (typeof a.value === 'string' && !/^\s*[+-]?\d+\s*\/\s*\d+\s*$|^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/.test(a.value))) err(w, 'answer.value must be a number, "p/q" or a decimal string');
      if (a.tol !== undefined && !(typeof a.tol === 'number' && a.tol >= 0)) err(w, 'answer.tol must be a number >= 0');
      if (a.form !== undefined && !answer.FORMS.includes(a.form)) err(w, 'answer.form must be exact, decimal or fraction');
    }
    if (Array.isArray(a.options) || a.kind === 'mcq' || a.kind === 'multi') {
      if (!Array.isArray(a.options) || a.options.length < 2) err(w, 'answer.options needs at least 2 entries');
      else if (a.kind === 'multi') {
        const ok = Array.isArray(a.correct) && a.correct.length > 0 && a.correct.every((c) => isInt(c) && c >= 0 && c < a.options.length) && new Set(a.correct).size === a.correct.length;
        if (!ok) err(w, 'answer.correct must be a non-empty list of distinct indexes into answer.options');
      }
      else if (!isInt(a.correct) || a.correct < 0 || a.correct >= a.options.length) err(w, 'answer.correct must index answer.options');
    }
    if (a.kind === 'numeric' && a.options !== undefined) err(w, 'numeric answers take no options');
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
    if (own.length && !own.some((it) => it.tier === 'b' && isObj(it.answer) && (it.answer.kind === 'numeric' || it.answer.kind === 'expression'))) {
      err(`techniques ${t.id}`, 'has items but no tier b numeric or expression item (production gate needs one)');
    }
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
