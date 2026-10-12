'use strict';
// M6: exam rule, placement walk, level exam, Learn cap, Review production share, pauseNew, Progress pv rules,
// and a seeded sim that prints the session at which the T1 to T2 gate opens on the gre-math pack.
const fs = require('fs');
const path = require('path');
const { suite } = require('./lib/check.js');
const { fresh, load, correctResponse, wrongResponse } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const S = suite('m6_checks');
const { check, eq } = S;
const DAY = '2026-10-12';
const GRE = path.join(__dirname, '..', 'packs', 'gre-math');

function loadGre() {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(GRE, f), 'utf8'));
  return { pack: rd('pack.json'), techniques: rd('techniques.json'), items: rd('items.json') };
}
// Synthetic pack: `perLevel` techniques per level, each with 10 tier a mcq, 10 tier a numeric, 10 tier b numeric and
// 3 tier c mcq items. Lets Review, Learn and placement run at sizes the fixture cannot reach.
function synth(nLevels, perLevel, opts) {
  opts = opts || {};
  const levels = [];
  for (let l = 0; l < nLevels; l++) levels.push({ id: 'T' + (l + 1), label: 'Level ' + (l + 1), short: 'L' + (l + 1) });
  const techniques = [], items = [];
  for (let l = 0; l < nLevels; l++) {
    for (let k = 0; k < perLevel; k++) {
      const id = 'T' + (l + 1) + '.t' + k;
      techniques.push({ id, name: 'Tech ' + id, level: 'T' + (l + 1), area: 'alg', prereq: [], order: l * 100 + k,
        exam: true, teach: 'Teach ' + id });
      const mk = (tier, type, kind, j) => {
        const base = { id: id + '-' + tier + kind[0] + j, tier, type, level: 'T' + (l + 1), tags: [id], critical: [],
          difficulty: 1 + (j % 3), prompt: 'p', solution: 's', source: { type: 'original' } };
        if (kind === 'mcq') base.answer = { kind: 'mcq', options: ['x', 'y', 'z'], correct: 0 };
        else base.answer = { kind: 'numeric', value: j + 1, tol: 0, form: 'exact' };
        return Object.assign(base, opts.probe && tier === 'b' && j === 0 ? { probe: true } : {});
      };
      for (let j = 0; j < 10; j++) { items.push(mk('a', 'recall', 'mcq', j)); items.push(mk('a', 'recall', 'numeric', j)); }
      for (let j = 0; j < 10; j++) items.push(mk('b', 'micro', 'numeric', j));
      for (let j = 0; j < 3; j++) {
        const c = mk('c', 'full', 'mcq', j);
        c.tags = [id, id];
        items.push(c);
      }
    }
  }
  const pack = { key: 'synth', name: 'Synth', levels, gate: 0.7, mastered: 3,
    session: { review: 12, learn: opts.learn === undefined ? 2 : opts.learn, micro: 8, full: 1 },
    full: { budgetSec: { easy: 300, mid: 600, hard: 1080 } } };
  return { pack, techniques, items };
}
function prog0() { return core.newProg(); }
function sessStub(n) {
  return { n, today: DAY, queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: [] };
}
// Plays one session with a right-probability and a seeded rng. Full problems are committed and self-graded.
function drive(prog, ix, day, p, rng) {
  const sess = core.startSession(prog, ix, day);
  if (!sess) return null;
  for (;;) {
    const c = core.currentCard(sess);
    if (!c) break;
    const ok = rng() < p;
    if (c.type === 'full') {
      core.fullCommit(prog, ix, sess, ok ? correctResponse(c) : wrongResponse(c), 60);
      core.fullGrade(prog, ix, sess, ok ? c.item.rubric.map((_, i) => i) : []);
    } else if (c.type !== 'teach') {
      core.answerCard(prog, ix, sess, ok ? correctResponse(c) : wrongResponse(c), 5);
    }
    if (!core.advance(sess, prog)) break;
  }
  return sess;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 1. placement: pure walk over bucket counts (SPEC 6 stop rules are checked in the driven walk below)
function walkOf(counts, levelCount) {
  const levelIds = [], levelIndex = {};
  for (let i = 0; i < (levelCount || 9); i++) { levelIds.push('T' + (i + 1)); levelIndex[levelIds[i]] = i; }
  const buckets = counts.map((c, i) => ({ tier: 'T' + (i + 1), status: 'ready', reason: null, total: 5, asked: 5, right: c }));
  return { levelIds, levelIndex, buckets, walked: buckets.map((_, i) => i), stop: null };
}
const res = (counts) => core.placementResult(walkOf(counts));
eq('placement: all buckets right places the whole walk', res([5, 5, 5]).prefixEnd, 2);
eq('placement: landing is the level after the prefix', res([5, 5, 5]).pl, 'T4');
eq('placement: early stop zero run keeps the first bucket', res([5, 0, 0, 0]).prefixEnd, 0);
eq('placement: landing after an early stop is T2', res([5, 0, 0, 0]).pl, 'T2');
eq('placement: two low buckets stop, cumulative 70 percent keeps two', res([5, 2, 2]).prefixEnd, 1);
eq('placement: landing after two low buckets is T3', res([5, 2, 2]).pl, 'T3');
eq('placement: isolated zero bucket is tolerated', res([5, 0, 5, 5]).prefixEnd, 3);
eq('placement: isolated zero landing is T5', res([5, 0, 5, 5]).pl, 'T5');
eq('placement: zero at the edge is not isolated', res([0, 5, 5]).prefixEnd, -1);
eq('placement: edge zero places nothing and lands on T1', res([0, 5, 5]).pl, 'T1');
eq('placement: one unlucky bucket inside a strong walk keeps the prefix', res([5, 4, 3]).prefixEnd, 2);
eq('placement: a 3 of 5 bucket is kept while the cumulative holds', res([5, 3, 4]).prefixEnd, 2);
eq('placement: stop reason is end when nothing stopped early', res([5, 5]).stop, 'end');

// ---- 2. placement: driven walk, probes, I don't know, stop rules
const synthP = synth(9, 5, { probe: true, learn: 2 });
const ixP = core.index({ pack: synthP.pack, techniques: synthP.techniques, items: synthP.items });
{
  const plan = core.placementPlan(ixP, 1);
  eq('placement plan: nine buckets, one per tier', plan.length, 9);
  eq('placement plan: five probes per bucket', plan[0].cards.length, 5);
  check("placement plan: every probe offers I don't know", plan[0].cards.every((c) => c.dk === true));
  eq('placement plan: probes are tier b', plan[0].cards.every((c) => c.item.tier === 'b'), true);
}
// Drive a walk where every answer is right until T3, then all wrong. The walk should stop after T5 at most.
{
  const sess = core.startPlacement(prog0(), ixP);
  let asked = 0;
  while (!sess.done) {
    const c = core.currentCard(sess);
    const bucketTier = Number(c.bucket);
    const right = bucketTier < 2;  // T1 and T2 right, the rest wrong
    core.placementAnswer(sess, right ? correctResponse(c) : wrongResponse(c), false);
    asked += 1;
    if (asked > 200) break;
  }
  eq('driven walk stops after two low buckets in a row (T3 T4)', sess.walked.length, 4);
  eq('driven walk stop kind is low', sess.stop, 'low');
  eq('driven walk asked 20 probes, not 45', asked, 20);
  eq('driven result places T1 and T2', sess.result.placed, ['T1', 'T2']);
  eq('driven result lands on T3', sess.result.pl, 'T3');
  // Three empty buckets in a row (T2 T3 T4 right = 0) hit the zero run before any low run can finish.
  const sz = core.startPlacement(prog0(), ixP);
  let na = 0;
  while (!sz.done) {
    const c = core.currentCard(sz);
    core.placementAnswer(sz, c.bucket === 0 ? correctResponse(c) : wrongResponse(c), false);
    na += 1;
    if (na > 200) break;
  }
  eq('two empty buckets after a right one end the walk at T3 as a low run', sz.walked.length, 3);
  eq('zero run with two lows reports low', sz.stop, 'low');
}
// I don't know scores 0 and costs no grading.
{
  const sess = core.startPlacement(prog0(), ixP);
  for (let i = 0; i < 5; i++) core.placementAnswer(sess, null, true);
  eq('I dont know: bucket asked 5 right 0', [sess.buckets[0].asked, sess.buckets[0].right], [5, 0]);
  eq('I dont know: one empty bucket is not a stop run', sess.done, false);
}
// Probe rule: a typed unparsable answer counts no attempt and keeps the probe open.
{
  const sess = core.startPlacement(prog0(), ixP);
  const c = core.currentCard(sess);
  const r = core.placementAnswer(sess, '', false);
  eq('placement: empty typed answer is unparsable, no attempt', [r.unparsable, sess.buckets[0].asked, core.currentCard(sess) === c], [true, 0, true]);
}
// Placement writes no items or full records, seeds prov, sets placedOnce and pl.
{
  const prog = prog0();
  const sess = core.startPlacement(prog, ixP);
  while (!sess.done) {
    const c = core.currentCard(sess);
    core.placementAnswer(sess, c.bucket < 1 ? correctResponse(c) : wrongResponse(c), false);
  }
  const ap = core.applyPlacement(prog, ixP, sess.result);
  check('placement applies', ap.applied === true && prog.placedOnce === true, ap);
  eq('placement sets pl to the landing level', prog.pl, 'T2');
  eq('placement seeds s 1 prov 1 on every technique in the prefix', ['T1.t0', 'T1.t4'].map((id) => [prog.tech[id].s, prog.tech[id].prov]), [[1, 1], [1, 1]]);
  eq('placement seeds nothing above the prefix', prog.tech['T2.t0'], undefined);
  eq('placement writes no items', Object.keys(prog.items).length, 0);
  eq('placement writes no full records', Object.keys(prog.full).length, 0);
}
// Retake never lowers: a lower result changes nothing; a higher one only seeds the new levels.
{
  const prog = prog0();
  core.applyPlacement(prog, ixP, { prefixEnd: 2, pl: 'T4' });
  const before = JSON.stringify(prog.tech);
  const low = core.applyPlacement(prog, ixP, { prefixEnd: 0, pl: 'T2' });
  eq('retake to a lower landing applies nothing', low.applied, false);
  eq('retake to a lower landing leaves techniques alone', JSON.stringify(prog.tech), before);
  eq('retake to the same landing applies nothing', core.applyPlacement(prog, ixP, { prefixEnd: 2, pl: 'T4' }).applied, false);
  const up = core.applyPlacement(prog, ixP, { prefixEnd: 3, pl: 'T5' });
  eq('retake forward applies', up.applied, true);
  eq('retake forward seeds the new level T4', prog.tech['T4.t0'].prov, 1);
  eq('retake forward keeps earlier seeds', prog.tech['T1.t0'].s, 1);
  eq('retake forward moves pl', prog.pl, 'T5');
}
// A technique with answers is not re-seeded by a retake (no loophole after a miss).
{
  const prog = prog0();
  core.applyPlacement(prog, ixP, { prefixEnd: 0, pl: 'T2' });
  prog.tech['T1.t0'].s = 0; prog.tech['T1.t0'].prov = 0; prog.tech['T1.t0'].w = 1;
  core.applyPlacement(prog, ixP, { prefixEnd: 1, pl: 'T3' });
  eq('retake does not re-seed a technique with a recorded miss', [prog.tech['T1.t0'].s, prog.tech['T1.t0'].prov], [0, 0]);
}
// Probe sets on the real pack: five flagged T1 probes, nothing above T1, skip reasons say so.
{
  const g = loadGre();
  const ixG = core.index(g);
  const probes = core.placeProbes(ixG, 'T1');
  eq('gre-math T1 has five flagged probes', probes.length, 5);
  check('gre-math probes are the flagged items', probes.every((p) => p.probe === true && p.tier === 'b'), probes.map((p) => p.id));
  eq('gre-math probes cover the five listed techniques', probes.map((p) => p.tags[0]).sort(),
    ['t1.abs-ineq', 't1.compose', 't1.lin-eq', 't1.poly-div', 't1.quad']);
  // Content-adaptive: every tier with flagged probes is ready with 5; tiers without are skipped with the short reason.
  const plan = core.placementPlan(ixG, 1);
  const flagged = (lvl) => g.items.filter((it) => it.probe === true && it.level === lvl).length;
  const ready = plan.filter((b) => b.status === 'ready');
  check('gre-math every ready bucket has exactly five flagged probes', ready.every((b) => flagged(b.tier) === 5), ready.map((b) => [b.tier, flagged(b.tier)]));
  check('gre-math buckets without probes are skipped with "no probes yet"',
    plan.filter((b) => b.status === 'skip').every((b) => flagged(b.tier) === 0 && /no probes yet/.test(b.reason)), plan.map((b) => [b.tier, b.status]));
  const sg = core.startPlacement(prog0(), ixG);
  eq('gre-math placement queues 5 per ready bucket', sg.queue.length, 5 * ready.length);
}
// Fallback without flags: the fixture has no probe flag, so each technique's first tier b item is the probe.
{
  const ixF = fresh().ix;
  eq('fixture probes fall back to tier b items, one per technique', core.placeProbes(ixF, 'T1').length, 3);
}

// ---- 3. exam rule and the gate
{
  const { ix } = fresh();
  const p = prog0();
  ['t1.lin-eq', 't1.quad', 't1.factor'].forEach((id) => { p.tech[id] = { s: 3, l: 1, r: 3, w: 0, m: 1, wk: 0, prov: 0, fp: 0, in: 1 }; });
  const g1 = core.gateState(p, ix);
  eq('exam rule: mastered without fp keeps the gate shut', g1.held, true);
  eq('exam rule: sentence reads 0 percent known', g1.sentence, 'T2 waits: T1 at 0% known.');
  ['t1.lin-eq', 't1.quad', 't1.factor'].forEach((id) => { p.tech[id].fp = 1; });
  eq('exam rule: mastered with fp opens the gate', core.gateState(p, ix).held, false);
  // Exempt techniques count on mastery alone.
  const ixX = core.index(Object.assign(load(), {
    techniques: load().techniques.map((t) => (t.id === 't1.lin-eq' ? Object.assign({}, t, { exam: false }) : t)) }));
  const pX = prog0();
  ['t1.lin-eq', 't1.quad', 't1.factor'].forEach((id) => { pX.tech[id] = { s: 3, l: 1, r: 3, w: 0, m: 1, wk: 0, prov: 0, fp: 0, in: 1 }; });
  eq('exam rule: exam:false technique counts on mastery', core.levelStatus(pX, ixX)[0].known, 1);
}

// ---- 4. level exam: offered within 5 points, pass sets fp, fail does not
{
  const { ix } = fresh();
  // T1 has three techniques. Two known (mastered with fp): 2 of 3 = 66.7 percent, within 5 points of 70.
  const p = prog0();
  ['t1.lin-eq', 't1.quad'].forEach((id) => { p.tech[id] = { s: 3, l: 1, r: 3, w: 0, m: 1, wk: 0, prov: 0, fp: 1, in: 1 }; });
  p.tech['t1.factor'] = { s: 1, l: 1, r: 1, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  check('level exam offered at 66.7 percent', core.examLevel(p, ix) !== null, core.examLevel(p, ix));
  const p0 = prog0();
  check('level exam not offered at 0 percent', core.examLevel(p0, ix) === null);
  // Far from the gate: 1 of 3 is 33 percent.
  const pFar = prog0();
  pFar.tech['t1.lin-eq'] = { s: 3, l: 1, r: 3, w: 0, m: 1, wk: 0, prov: 0, fp: 1, in: 1 };
  check('level exam not offered at 33 percent', core.examLevel(pFar, ix) === null);
}
{
  // Pass: every answer right. Fail: every answer wrong. Both with the same starting progress.
  const build = () => {
    const p = prog0();
    ['t1.lin-eq', 't1.quad'].forEach((id) => { p.tech[id] = { s: 3, l: 1, r: 3, w: 0, m: 1, wk: 0, prov: 0, fp: 1, in: 1 }; });
    p.tech['t1.factor'] = { s: 1, l: 1, r: 1, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
    return p;
  };
  const runExam = (p, right) => {
    const { ix } = fresh();
    const sess = core.startExam(p, ix, DAY);
    for (;;) {
      const c = core.currentCard(sess);
      if (!c) break;
      if (c.type === 'full') {
        core.fullCommit(p, ix, sess, right ? correctResponse(c) : wrongResponse(c), 60);
        core.fullGrade(p, ix, sess, right ? c.item.rubric.map((_, i) => i) : []);
      } else core.answerCard(p, ix, sess, right ? correctResponse(c) : wrongResponse(c), 5);
      if (!core.advance(sess, p)) break;
    }
    return { sess, result: core.finishExam(p, ix, sess) };
  };
  const pass = build();
  const rp = runExam(pass, true);
  eq('exam pass: all answers right passes', rp.result.pass, true);
  eq('exam pass: total is 10 problems', rp.result.total, 10);
  eq('exam pass: sets fp on the technique answered right', pass.tech['t1.factor'].fp, 1);
  eq('exam pass: does not double count a session number', pass.sessions, 0);
  const fail = build();
  const rf = runExam(fail, false);
  eq('exam fail: all answers wrong fails', rf.result.pass, false);
  eq('exam fail: sets no fp', fail.tech['t1.factor'].fp, 0);
  // Exactly 7 of 10 right is a pass at 0.7.
  const { ix } = fresh();
  const p7 = build();
  const sess7 = core.startExam(p7, ix, DAY);
  let i = 0;
  for (;;) {
    const c = core.currentCard(sess7);
    if (!c) break;
    const right = i < 7;
    i += 1;
    if (c.type === 'full') {
      core.fullCommit(p7, ix, sess7, right ? correctResponse(c) : wrongResponse(c), 60);
      core.fullGrade(p7, ix, sess7, right ? c.item.rubric.map((_, k) => k) : []);
    } else core.answerCard(p7, ix, sess7, right ? correctResponse(c) : wrongResponse(c), 5);
    if (!core.advance(sess7, p7)) break;
  }
  const r7 = core.finishExam(p7, ix, sess7);
  eq('exam: 7 of 10 passes at 0.7', [r7.right, r7.total, r7.pass], [7, 10, true]);
  eq('exam: exam micro answers do not requeue', sess7.queue.length, 10);
}

// ---- 5. Learn: two new techniques per session while fewer than 20 are started, then one; pauseNew
{
  const d = synth(1, 25, { learn: 2 });
  const ix = core.index({ pack: d.pack, techniques: d.techniques, items: d.items });
  eq('new cap is 2 with nothing started', core.newCap(prog0(), ix), 2);
  const p = prog0();
  const plan = core.buildPlan(p, ix, DAY);
  eq('fresh plan teaches two new techniques', plan.cards.filter((c) => c.type === 'teach').length, 2);
  eq('fresh plan learn count is micro cards only', plan.learn.count, 8);
  for (let k = 0; k < 19; k++) p.tech['T1.t' + k] = { s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  eq('cap is still 2 at 19 started', core.newCap(p, ix), 2);
  p.tech['T1.t19'] = { s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  eq('cap stays 2 at 20 started (NEW_LATER 2, changed 2026-10-12)', core.newCap(p, ix), 2);
  eq('plan at 20 started teaches two', core.buildPlan(p, ix, DAY).cards.filter((c) => c.type === 'teach').length, 2);
  // pack learn ceiling of 1 wins over the 2-per-session rule
  const d1 = synth(1, 5, { learn: 1 });
  const ix1 = core.index({ pack: d1.pack, techniques: d1.techniques, items: d1.items });
  eq('pack learn ceiling caps the cap', core.newCap(prog0(), ix1), 1);
}
{
  const d = synth(1, 5, { learn: 2 });
  const ix = core.index({ pack: d.pack, techniques: d.techniques, items: d.items });
  const p = prog0();
  core.setPauseNew(p, true);
  const plan = core.buildPlan(p, ix, DAY);
  eq('pauseNew stops Learn', [plan.learn.status, plan.cards.filter((c) => c.type === 'teach').length], ['paused', 0]);
  const rt = core.normalizeProg(JSON.parse(JSON.stringify(p)));
  eq('pauseNew survives a save and load', rt.pauseNew, true);
  core.setPauseNew(p, false);
  eq('pauseNew off restores Learn', core.buildPlan(p, ix, DAY).learn.status, 'ready');
}

// ---- 6. Review production share: once streak allows, about 40 percent of Review cards are typed
{
  const d = synth(1, 4, { learn: 2 });
  const ix = core.index({ pack: d.pack, techniques: d.techniques, items: d.items });
  const p = prog0();
  for (let k = 0; k < 4; k++) p.tech['T1.t' + k] = { s: 2, l: 1, r: 2, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  const plan = core.buildPlan(p, ix, DAY);
  const rev = plan.cards.filter((c) => c.stage === 'review');
  const typed = rev.filter((c) => c.type === 'numeric').length;
  check('review has twelve cards', rev.length === 12, rev.length);
  check('review typed share is at least 40 percent', typed / rev.length >= 0.4, { typed, n: rev.length });
  check('review typed share is not everything', typed < rev.length, { typed, n: rev.length });
}
// Below streak 2 the quota does not apply: no typed push.
{
  const d = synth(1, 4, { learn: 2 });
  const ix = core.index({ pack: d.pack, techniques: d.techniques, items: d.items });
  const p = prog0();
  for (let k = 0; k < 4; k++) p.tech['T1.t' + k] = { s: 1, l: 1, r: 1, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  const rev = core.buildPlan(p, ix, DAY).cards.filter((c) => c.stage === 'review');
  eq('streak 1 review is not held to a typed share', rev.length, 12);
}

// ---- 7. session cap, introduced list, WIP ignores placement-provisional
{
  const d = synth(1, 4, { learn: 2 });
  const ix = core.index({ pack: d.pack, techniques: d.techniques, items: d.items });
  const p = prog0();
  for (let k = 0; k < 4; k++) p.tech['T1.t' + k] = { s: 1, l: 1, r: 1, w: 0, m: 0, wk: 0, prov: 1, fp: 0, in: 1 };
  const plan = core.buildPlan(p, ix, DAY);
  eq('provisional techniques do not block Learn as work in progress', plan.learn.status, 'skip');
  check('provisional techniques are not taught again', !plan.cards.some((c) => c.type === 'teach'), plan.learn);
  eq('provisional techniques are not work in progress', /in progress/.test(plan.learn.reason || ''), false);
  const sess = sessStub(1);
  sess.introduced = ['T1.t0', 'T1.t1'];
  const fin = core.finishSession(p, ix, sess);
  eq('finish lists both introduced names', fin.introduced, ['Tech T1.t0', 'Tech T1.t1']);
}

// ---- 8. provisional flag: dropped at first miss, dropped at mastered
{
  const { ix } = fresh();
  const p = prog0();
  p.tech['t1.lin-eq'] = { s: 1, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 1, fp: 0, in: 1 };
  const card = core.makeCard(ix, ix.itemById['f003'], 'review', 1);
  const sess = sessStub(1);
  core.applyAnswer(p, ix, sess, card, false, 3);
  eq('prov drops at the first miss and the streak resets', [p.tech['t1.lin-eq'].prov, p.tech['t1.lin-eq'].s], [0, 0]);
  check('after a miss the technique is no longer known', core.knownTech(p.tech['t1.lin-eq'], { exam: true }) === false);
}
{
  const { ix } = fresh();
  const p = prog0();
  p.tech['t1.lin-eq'] = { s: 1, l: 0, r: 1, w: 0, m: 0, wk: 0, prov: 1, fp: 0, in: 1 };
  const card = core.makeCard(ix, ix.itemById['f003'], 'review', 1);
  core.applyAnswer(p, ix, sessStub(2), card, true, 3);
  eq('a right answer keeps prov and raises the streak', [p.tech['t1.lin-eq'].prov, p.tech['t1.lin-eq'].s], [1, 2]);
  core.applyAnswer(p, ix, sessStub(3), card, true, 3);
  eq('mastery at the third credit drops prov', [p.tech['t1.lin-eq'].m, p.tech['t1.lin-eq'].prov], [1, 0]);
}

// ---- 9. seeded sim: session at which the T1 to T2 gate opens on gre-math (printed, not promised)
function gateOpenSession(p, seed, maxSessions) {
  const g = loadGre();
  const ix = core.index(g);
  const prog = prog0();
  const rng = mulberry(seed);
  for (let k = 1; k <= maxSessions; k++) {
    drive(prog, ix, 'D' + k, p, rng);
    const gs = core.gateState(prog, ix);
    if (gs.F >= 1 && !gs.held) return { session: k, known: gs.levels[0].known, total: gs.levels[0].total };
  }
  return null;
}
{
  // Measured, not promised: a grid of accuracies and seeds, printed as a table.
  const seeds = [20261012, 1, 2, 3, 4];
  const accs = [0.8, 0.9, 0.95];
  const table = accs.map((p) => ({ p, row: seeds.map((sd) => { const o = gateOpenSession(p, sd, 200); return o ? o.session : null; }) }));
  table.forEach((r) => console.log('SIM gre-math T1 to T2 gate: right=' + r.p + ' seeds=' + seeds.join(',') + ' sessions=' +
    r.row.map((x) => (x === null ? 'none<=200' : String(x))).join(',')));
  const seeded = gateOpenSession(0.95, 20261012, 200);
  check('seeded learner at 95 percent opens the gate within 200 sessions', !!seeded, table);
  check('gate opens with at least 70 percent of T1 known', !!seeded && seeded.known / seeded.total >= 0.7, seeded);
}

S.done();
