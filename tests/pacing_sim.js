'use strict';
// Pacing study: seeded sims of a learner on the gre-math pack under alternative pacing rules.
// base = the engine as shipped (rec_n2 rules, since 2026-10-12). Every other config reverts the 2026-10-12 changes in
// memory (pre_study = the engine before the pacing study), then patches a copy of engine/core.js source (asserted).
// So configs=pre_study reproduces the pre-study table, and configs=base reproduces the rec_n2 row.
// Usage: node tests/pacing_sim.js [configs=base,full2,...|all] [acc=95,90,80] [seeds=5] [max=200] [pack=packs/gre-math]
//        [custom=full=2,fpprod=1,reset=verdict,learn=3,newEarly=3,gate=m,secm=2]   (one extra ad-hoc config)
// Env equivalents: PACING_CONFIGS, PACING_ACC, PACING_SEEDS, PACING_MAX, PACING_PACK, PACING_CUSTOM.
// Config keys: full (full problems per session), fpprod (right typed tier b at streak>=2 also sets fp),
//   reset: zero|dec|verdict, learn (pack.session.learn ceiling), newEarly (NEW_EARLY), gate: mfp|m|s2,
//   prereq: m|s1|s2 (a prerequisite counts when mastered | streak >= 1 | streak >= 2), micro: all|unm (Micro skips mastered
//   techniques; they still return through the Review refresh slots), gate=ever: known = ever mastered (a later miss
//   does not un-know it for the gate; it is still relearned), always with fp.
//   newLater (NEW_LATER, new per session once 20 are started).
//   secm: Full needs a secondary tag with streak >= secm instead of mastered (default 3 = mastered).
// clone=N: replaces the pack by N copies of its first level (levels T1..TN, ids prefixed) to measure the whole-pack
//   schedule (items exist only for T1 today). Then G is replaced by L2 (first technique of level 2 taught),
//   L5, LN (same for level 5 and N), A (every technique taught) and K (every level at the gate share known).
// Output: Markdown tables. G = first session where T1 is fully taught and the T1 to T2 gate is open (the learner can
// start T2). M = first session where all T1 techniques are mastered. Sessions are counted from 1 and capped at max.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { correctResponse, wrongResponse } = require('./lib/fixture.js');

const ROOT = path.join(__dirname, '..');
const arg = (k, env, d) => {
  const a = process.argv.slice(2).find((x) => x.startsWith(k + '='));
  return a ? a.slice(k.length + 1) : (process.env[env] !== undefined ? process.env[env] : d);
};
const PACK = path.resolve(ROOT, arg('pack', 'PACING_PACK', 'packs/gre-math'));
const ACCS = arg('acc', 'PACING_ACC', '95,90,80').split(',').map(Number);
const NSEEDS = Number(arg('seeds', 'PACING_SEEDS', '5'));
const MAX = Number(arg('max', 'PACING_MAX', '200'));
const SEEDS = [20261012, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, NSEEDS);

// Pre-study engine (what every non-base config starts from) and the shipped engine (base).
const PRE = { full: 1, fpprod: 0, reset: 'zero', learn: 2, newEarly: 2, gate: 'mfp', secm: 3, prereq: 'm', micro: 'all', newLater: 1 };
const NOW = { full: 1, fpprod: 1, reset: 'dec', learn: 2, newEarly: 2, gate: 'mfp', secm: 3, prereq: 's1', micro: 'all', newLater: 2 };
function cfgFor(name, over) {
  return name === 'base' ? Object.assign({ legacy: false }, NOW, over) : Object.assign({ legacy: true }, PRE, over);
}
const PRESETS = {
  base: {},
  pre_study: {},
  full2: { full: 2 }, full3: { full: 3 }, fpprod: { fpprod: 1 }, full2_fpprod: { full: 2, fpprod: 1 },
  reset_dec: { reset: 'dec' }, reset_verdict: { reset: 'verdict' },
  new3: { learn: 3, newEarly: 3 }, new_wip: { learn: 99, newEarly: 99 },
  gate_m: { gate: 'm' }, gate_s2: { gate: 's2' },
  secm2: { secm: 2 },
  gate_ever: { gate: 'ever' }, prereq_s1: { prereq: 's1' }, prereq_s2: { prereq: 's2' }, micro_unm: { micro: 'unm' },
  gate_ever_fpprod: { gate: 'ever', fpprod: 1 }, gate_ever_fpprod_prereq_s1: { gate: 'ever', fpprod: 1, prereq: 's1' },
  gate_ever_fpprod_prereq_s1_unm: { gate: 'ever', fpprod: 1, prereq: 's1', micro: 'unm' },
  c_dec_fpprod_prereq_s1: { reset: 'dec', fpprod: 1, prereq: 's1' },
  c_dec_fpprod_prereq_s1_ever: { reset: 'dec', fpprod: 1, prereq: 's1', gate: 'ever' },
  c_verdict_fpprod_prereq_s1_ever: { reset: 'verdict', fpprod: 1, prereq: 's1', gate: 'ever' },
  // combinations
  c_fpprod_dec: { fpprod: 1, reset: 'dec' },
  c_fpprod_verdict: { fpprod: 1, reset: 'verdict' },
  c_fpprod_dec_new3: { fpprod: 1, reset: 'dec', learn: 3, newEarly: 3 },
  c_fpprod_verdict_new3: { fpprod: 1, reset: 'verdict', learn: 3, newEarly: 3 },
  c_fpprod_dec_s2: { fpprod: 1, reset: 'dec', gate: 's2' },
  c_fpprod_verdict_s2: { fpprod: 1, reset: 'verdict', gate: 's2' },
  c_all: { full: 2, fpprod: 1, reset: 'verdict', learn: 3, newEarly: 3, gate: 's2' },
  c_all_mfp: { full: 2, fpprod: 1, reset: 'verdict', learn: 3, newEarly: 3 },
  rec_cons: { fpprod: 1, reset: 'dec' },
  rec: { fpprod: 1, reset: 'dec', prereq: 's1' },
  rec_n2: { fpprod: 1, reset: 'dec', prereq: 's1', newLater: 2 },
  rec_fast: { fpprod: 1, reset: 'dec', prereq: 's1', learn: 3, newEarly: 3, newLater: 2 },
  c_fpprod_dec_new3_secm2: { fpprod: 1, reset: 'dec', learn: 3, newEarly: 3, secm: 2 },
  c_fpprod_verdict_new3_secm2: { fpprod: 1, reset: 'verdict', learn: 3, newEarly: 3, secm: 2 }
};

function parseCustom(s) {
  const o = {};
  s.split(',').forEach((kv) => { const [k, v] = kv.split('='); o[k] = /^-?\d+$/.test(v) ? Number(v) : v; });
  return o;
}

// ---- patched engine loader
function rep(src, from, to) {
  if (src.indexOf(from) < 0) throw new Error('pacing patch target not found: ' + from.slice(0, 60));
  return src.replace(from, to);
}
// Undoes the 2026-10-12 pacing changes so the pre-study patches below apply to the text they were written for.
function revertStudy(src) {
  src = rep(src, /var NEW_LATER = 2;[^\n]*\n/.exec(src)[0], 'var NEW_LATER = 1;\n');
  src = rep(src, '(prog.tech[p].s >= 1 || prog.tech[p].m === 1 || prog.tech[p].prov === 1)', '(prog.tech[p].m === 1 || prog.tech[p].prov === 1)');
  src = rep(src, 'function resetTech(r, mastered) { r.s = Math.max(0, r.s - 1); r.m = r.s >= mastered ? 1 : 0; r.prov = 0; }',
    'function resetTech(r) { r.s = 0; r.m = 0; r.prov = 0; }');
  src = rep(src, 'resetTech(r, ix.cfg.mastered)', 'resetTech(r)');
  src = rep(src, "      if (item.tier === 'b' && isProduction(card.type) && r.s >= PRODUCTION_STREAK) r.fp = 1;\n", '');
  return src;
}
function loadCore(cfg) {
  let src = fs.readFileSync(path.join(ROOT, 'engine', 'core.js'), 'utf8');
  if (cfg.legacy) {
    src = revertStudy(src);
  src = rep(src, 'var NEW_EARLY = 2;', 'var NEW_EARLY = ' + cfg.newEarly + ';');
  src = rep(src, 'var NEW_LATER = 1;', 'var NEW_LATER = ' + cfg.newLater + ';');
  // fp from a right typed tier b answer at streak >= 2
  if (cfg.fpprod) src = rep(src, "if (item.tier === 'b') r.wk = 0;",
    "if (item.tier === 'b') r.wk = 0; if (item.tier === 'b' && isProduction(card.type) && r.s >= PRODUCTION_STREAK) r.fp = 1;");
  // gate definition of known
  const known = 'return r.m === 1 && (!EXAM_RULE || (tech && tech.exam === false) || r.fp === 1);';
  if (cfg.gate === 'ever') {
    src = rep(src, known, 'return (r.m === 1 || r.ev === 1) && (!EXAM_RULE || (tech && tech.exam === false) || r.fp === 1);');
  } else if (cfg.gate === 'm') src = rep(src, known, 'return r.m === 1;');
  else if (cfg.gate === 's2') src = rep(src, known, 'return r.s >= 2;');
  else if (cfg.gate !== 'mfp') throw new Error('gate ' + cfg.gate);
  // reset severity
  if (cfg.reset === 'dec') src = rep(src, 'function resetTech(r) { r.s = 0; r.m = 0; r.prov = 0; }',
    'function resetTech(r) { r.s = Math.max(0, r.s - 1); r.m = r.s >= 3 ? 1 : 0; r.prov = 0; }');
  if (cfg.reset === 'verdict') {
    src = rep(src, '    var r = rec(prog, primary);\n    if (ok) {\n      r.r += 1;\n      if (item.tier',
      '    var r = rec(prog, primary);\n' +
      '    var tl = sess.tally = sess.tally || {}, e = tl[primary] = tl[primary] || { r: 0, w: 0, prod: 0 };\n' +
      '    if (ok) { r.r += 1; e.r += 1; if (isProduction(card.type)) e.prod += 1; if (item.tier === \'b\') r.wk = 0; return out; }\n' +
      '    r.w += 1; e.w += 1;\n' +
      '    if (!card.requeued && !sess.requeued[item.id]) { sess.requeued[item.id] = true; out.requeue = true; }\n' +
      '    return out;\n    if (ok) {\n      r.r += 1;\n      if (item.tier');
    src = rep(src, '  function finishSession(prog, ix, sess) {',
      '  function settleVerdict(prog, ix, sess) {\n' +
      '    var tl = sess.tally || {};\n' +
      '    Object.keys(tl).forEach(function (id) {\n' +
      '      var e = tl[id], r = rec(prog, id);\n' +
      '      if (e.w >= e.r) { resetTech(r); sess.credited[id] = true; return; }\n' +
      '      if (e.r >= 2 * e.w && !sess.credited[id]) {\n' +
      '        if (r.s >= PRODUCTION_STREAK && e.prod === 0) return;\n' +
      '        r.s += 1; r.l = sess.n; sess.credited[id] = true;\n' +
      '        if (r.m !== 1 && r.s >= ix.cfg.mastered) { r.m = 1; r.prov = 0; }\n' +
      '      }\n    });\n  }\n  function finishSession(prog, ix, sess) {');
    src = rep(src, 'finishSession: finishSession,', 'finishSession: finishSession, settleVerdict: settleVerdict,');
  } else if (cfg.reset !== 'zero' && cfg.reset !== 'dec') throw new Error('reset ' + cfg.reset);
  if (cfg.gate === 'ever') src = rep(src, 'function resetTech(r) {', 'function resetTech(r) { if (r.m === 1) r.ev = 1;');
  if (cfg.prereq !== 'm') src = rep(src, '(prog.tech[p].m === 1 || prog.tech[p].prov === 1)',
    '(prog.tech[p].s >= ' + (cfg.prereq === 's1' ? 1 : 2) + ' || prog.tech[p].m === 1 || prog.tech[p].prov === 1)');
  if (cfg.micro === 'unm') src = rep(src, "planStage(ctx, 'micro', 'b', cfg.micro,\n      introduced.slice()", "planStage(ctx, 'micro', 'b', cfg.micro,\n      notMastered.slice()");
  if (cfg.secm !== 3) {
    // first occurrence is planFull's secondary-tag test (startExam's comes later in the file)
    src = rep(src, 'prog.tech[g] && prog.tech[g].m === 1; })', 'prog.tech[g] && prog.tech[g].s >= ' + cfg.secm + '; })');
  }
  }
  const m = { exports: {} };
  const req = (p) => (p === './answer.js' ? require(path.join(ROOT, 'engine', 'answer.js')) : require(p));
  new Function('module', 'exports', 'require', 'globalThis', src)(m, m.exports, req, globalThis);
  return m.exports;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function drive(core, prog, ix, day, p, rng, stat) {
  const sess = core.startSession(prog, ix, day);
  if (!sess) return null;
  for (;;) {
    const c = core.currentCard(sess);
    if (!c) break;
    if (c.type === 'teach') stat.teach += 1;
    else if (c.type === 'full') stat.full += 1;
    if (c.type !== 'teach') stat.cards += 1;
    const ok = rng() < p;
    if (c.type === 'full') {
      core.fullCommit(prog, ix, sess, ok ? correctResponse(c) : wrongResponse(c), 60);
      core.fullGrade(prog, ix, sess, ok ? c.item.rubric.map((_, i) => i) : []);
    } else if (c.type !== 'teach') {
      core.answerCard(prog, ix, sess, ok ? correctResponse(c) : wrongResponse(c), 5);
    }
    if (!core.advance(sess, prog)) break;
  }
  if (core.settleVerdict) core.settleVerdict(prog, ix, sess);
  return sess;
}

function runOne(core, data, p, seed) {
  const ix = core.index(data);
  const prog = core.newProg();
  const rng = mulberry(seed);
  const t1 = ix.techsByLevel[ix.levels[0].id];
  const stat = { cards: 0, full: 0, teach: 0 };
  let G = null, M = null, k = 0;
  for (k = 1; k <= MAX && (G === null || M === null); k++) {
    drive(core, prog, ix, 'D' + k, p, rng, stat);
    const gs = core.gateState(prog, ix);
    if (G === null && gs.F >= 1 && !gs.held) G = k;
    if (M === null && t1.every((t) => prog.tech[t.id] && prog.tech[t.id].m === 1)) M = k;
  }
  const n = k - 1;
  return { G, M, cards: stat.cards / n, full: stat.full / n };
}

function cloneData(d, n) {
  const l0 = d.pack.levels[0].id;
  const out = { pack: JSON.parse(JSON.stringify(d.pack)), techniques: [], items: [] };
  out.pack.levels = [];
  for (let i = 1; i <= n; i++) {
    out.pack.levels.push({ id: 'T' + i, label: 'Tier ' + i, short: 'T' + i });
    d.techniques.filter((t) => t.level === l0).forEach((t) => {
      out.techniques.push(Object.assign({}, t, { id: 'c' + i + '.' + t.id, level: 'T' + i, prereq: (t.prereq || []).map((x) => 'c' + i + '.' + x) }));
    });
    d.items.filter((it) => it.tags.every((g) => d.techniques.some((t) => t.id === g && t.level === l0))).forEach((it) => {
      out.items.push(Object.assign(JSON.parse(JSON.stringify(it)), { id: 'c' + i + '.' + it.id, tags: it.tags.map((g) => 'c' + i + '.' + g),
        critical: (it.critical || []).map((g) => 'c' + i + '.' + g) }));
    });
  }
  return out;
}
function runClone(core, data, p, seed, n) {
  const ix = core.index(data);
  const prog = core.newProg();
  const rng = mulberry(seed);
  const stat = { cards: 0, full: 0, teach: 0 };
  const res = { L2: null, L5: null, LN: null, A: null, K: null };
  const taughtIn = (lv) => (ix.techsByLevel[lv] || []).some((t) => core.isIntro(prog, t.id));
  let k;
  for (k = 1; k <= MAX && res.K === null; k++) {
    drive(core, prog, ix, 'D' + k, p, rng, stat);
    if (res.L2 === null && taughtIn('T2')) res.L2 = k;
    if (res.L5 === null && n >= 5 && taughtIn('T5')) res.L5 = k;
    if (res.LN === null && taughtIn('T' + n)) res.LN = k;
    const gs = core.gateState(prog, ix);
    if (res.A === null && gs.F === -1) res.A = k;
    if (res.K === null && gs.levels.every((l) => l.pct >= ix.cfg.gate)) res.K = k;
  }
  const m = k - 1;
  return Object.assign(res, { cards: stat.cards / m, full: stat.full / m });
}

function loadData() {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(PACK, f), 'utf8'));
  return { pack: rd('pack.json'), techniques: rd('techniques.json'), items: rd('items.json') };
}
function med(a) {
  const s = a.map((x) => (x === null ? Infinity : x)).sort((x, y) => x - y);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  return m;
}
function cell(a) {
  const hit = a.filter((x) => x !== null);
  if (!hit.length) return '>' + MAX + ' (0/' + a.length + ')';
  const m = med(a);
  const lo = Math.min.apply(null, hit), hi = Math.max.apply(null, hit);
  return (m === Infinity ? '>' + MAX : String(m)) + ' (' + lo + '-' + hi + (hit.length < a.length ? '; ' + hit.length + '/' + a.length : '') + ')';
}

function main() {
  const names = arg('configs', 'PACING_CONFIGS', 'all');
  const list = [];
  (names === 'all' ? Object.keys(PRESETS) : names.split(',')).forEach((n) => {
    if (!PRESETS[n]) throw new Error('unknown config ' + n);
    list.push([n, cfgFor(n, PRESETS[n])]);
  });
  const custom = arg('custom', 'PACING_CUSTOM', '');
  if (custom) list.push(['custom', cfgFor('custom', parseCustom(custom))]);
  const CLONE = Number(arg('clone', 'PACING_CLONE', '0'));
  const base = CLONE ? cloneData(loadData(), CLONE) : loadData();
  console.log('Pacing sim: ' + path.relative(ROOT, PACK) + ', seeds ' + SEEDS.join(',') + ', cap ' + MAX + ' sessions, accuracy ' + ACCS.join('/') + '%.');
  console.log('Cells: median (min-max) sessions; "k/n" when only k of n seeds reached it. G = T2 can start, M = all T1 mastered. cards = answered cards per session, fulls = full problems per session, both averaged to the stop point.\n');
  const rows = [];
  const cfgStr = (c) => { const ref = c.legacy ? PRE : NOW; return Object.keys(ref).filter((k) => c[k] !== ref[k]).map((k) => k + '=' + c[k]).join(' ') || 'defaults'; };
  list.forEach(([name, cfg]) => {
    const core = loadCore(cfg);
    const data = JSON.parse(JSON.stringify(base));
    data.pack.session = Object.assign({}, data.pack.session, { full: cfg.full, learn: cfg.learn });
    const row = { name, cfg, acc: {} };
    if (CLONE) {
      ACCS.forEach((a) => {
        const rs = SEEDS.map((sd) => runClone(core, data, a / 100, sd, CLONE));
        const o = { cards: rs.reduce((s, r) => s + r.cards, 0) / rs.length, full: rs.reduce((s, r) => s + r.full, 0) / rs.length };
        ['L2', 'L5', 'LN', 'A', 'K'].forEach((f) => { o[f] = rs.map((r) => r[f]); });
        row.acc[a] = o;
      });
      rows.push(row);
      process.stderr.write('done ' + name + '\n');
      return;
    }
    ACCS.forEach((a) => {
      const rs = SEEDS.map((sd) => runOne(core, data, a / 100, sd));
      row.acc[a] = { G: rs.map((r) => r.G), M: rs.map((r) => r.M), cards: rs.reduce((s, r) => s + r.cards, 0) / rs.length, full: rs.reduce((s, r) => s + r.full, 0) / rs.length };
    });
    rows.push(row);
    process.stderr.write('done ' + name + '\n');
  });
  if (CLONE) {
    console.log('Clone mode: ' + CLONE + ' copies of level 1 (' + base.techniques.length + ' techniques). L2/L5/LN = first technique of that level taught, A = all taught, K = every level at the gate share known.\n');
    ACCS.forEach((a) => {
      console.log('### ' + a + '% right\n');
      console.log('| config | changes | L2 | L5 | L' + CLONE + ' | A | K | cards | fulls |');
      console.log('|---|---|---|---|---|---|---|---|---|');
      rows.forEach((r) => {
        const x = r.acc[a];
        console.log('| ' + r.name + ' | ' + cfgStr(r.cfg) + ' | ' + ['L2', 'L5', 'LN', 'A', 'K'].map((f) => cell(x[f])).join(' | ') + ' | ' + x.cards.toFixed(1) + ' | ' + x.full.toFixed(2) + ' |');
      });
      console.log('');
    });
    return;
  }
  if (arg('wide', 'PACING_WIDE', '')) {
    // one table: per accuracy "G median / M median" (">" = fewer than half the seeds reached it within the cap)
    const mc = (a) => { const m = med(a); return m === Infinity ? '>' + MAX : String(m); };
    console.log('| config | changes | ' + ACCS.map((a) => a + '% G / M').join(' | ') + ' | fulls/session |');
    console.log('|---|---|' + ACCS.map(() => '---').join('|') + '|---|');
    rows.forEach((r) => {
      console.log('| ' + r.name + ' | ' + cfgStr(r.cfg) + ' | ' + ACCS.map((a) => mc(r.acc[a].G) + ' / ' + mc(r.acc[a].M)).join(' | ') + ' | ' + r.acc[ACCS[0]].full.toFixed(2) + ' |');
    });
    return;
  }
  ACCS.forEach((a) => {
    console.log('### ' + a + '% right\n');
    console.log('| config | changes | G | M | cards | fulls |');
    console.log('|---|---|---|---|---|---|');
    rows.forEach((r) => {
      const x = r.acc[a];
      console.log('| ' + r.name + ' | ' + cfgStr(r.cfg) + ' | ' + cell(x.G) + ' | ' + cell(x.M) + ' | ' + x.cards.toFixed(1) + ' | ' + x.full.toFixed(2) + ' |');
    });
    console.log('');
  });
}
main();
