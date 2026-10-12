'use strict';
// M5 suites: full problems. Grade table (SPEC 2.4, 3.4), timer from timestamps, wk/fp flags, weak-first Micro,
// Full gating, validator rules for tier c items, and a sim where a failed full problem leads the next Micro.
const { suite } = require('./lib/check.js');
const { fresh, correctResponse, wrongResponse, load } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const { check: validateData, loadDir } = require('../tools/validate_pack.js');
const { DIR } = require('./lib/fixture.js');
const S = suite('full_checks');
const DAY = '2026-10-12';

const base = (over) => Object.assign({ s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 }, over || {});
// A progress record where four techniques hold a streak, t1.quad and t1.lin-eq are mastered,
// so the Full stage is ready with f031 (t1.quad, secondary t1.lin-eq).
function readyProg(ix) {
  const p = core.newProg();
  p.sessions = 6;
  p.tech['t1.lin-eq'] = base({ s: 3, m: 1, r: 3, l: 4 });
  p.tech['t1.quad'] = base({ s: 3, m: 1, r: 3, l: 5 });
  p.tech['t2.exp-log'] = base({ s: 1, r: 1, l: 5 });
  p.tech['t1.factor'] = base({ s: 1, r: 1, l: 5 });
  p.tech['t2.unit-circle'] = base({ s: 1, r: 1, l: 5 });
  return p;
}
// Starts a session and answers every card before the first full problem. Returns that card's session.
function toFull(prog, ix) {
  const sess = core.startSession(prog, ix, DAY);
  if (!sess) return null;
  for (;;) {
    const c = core.currentCard(sess);
    if (!c) return { sess, card: null };
    if (c.type === 'full') return { sess, card: c };
    if (c.type !== 'teach') core.answerCard(prog, ix, sess, correctResponse(c), 4);
    if (!core.advance(sess, prog)) return { sess, card: null };
  }
}
function fullCard(ix, id) {
  const item = ix.itemById[id];
  return core.makeCard(ix, item, 'full', 1);
}

// ---- 1. grade table: every grade x right/wrong commit x in/over budget x rubric outcome
const BUDGET = 300, PASS = 3, TOTAL = 4;
const rubricCases = [['at pass', 3, 2], ['between half and pass', 1.5, 1], ['far below', 1, 0]];
for (const [mcqOk, label] of [[true, 'right'], [false, 'wrong']]) {
  for (const [secs, when] of [[120, 'in budget'], [BUDGET, 'over budget']]) {
    for (const [rl, score, rubGrade] of rubricCases) {
      const want = !mcqOk ? 0 : Math.min(rubGrade, secs < BUDGET ? 2 : 1);
      S.eq(`grade ${label} commit, ${when}, rubric ${rl} -> ${want}`,
        core.gradeFullRule({ mcqOk, score, pass: PASS, seconds: secs, budget: BUDGET }), want);
    }
  }
}

// ---- 2. timer from timestamps with an injected clock (a hidden tab keeps counting)
{
  let now = 1000000;
  const read = core.clockFor(now, 300, () => now);
  S.eq('timer starts at zero', read().elapsed, 0);
  now += 900 * 1000;                       // tab hidden for 15 minutes, no ticks in between
  const hidden = read();
  S.eq('hidden tab time counts', hidden.elapsed, 900);
  S.check('hidden time past budget is over', hidden.over === true && hidden.left === -600, hidden);
  now = 1000000 + 299999;
  S.check('just inside budget is not over', read().over === false && read().left === 1, read());
  now = 1000000 + 300000;
  S.check('budget reached turns over at 0', read().over === true && read().left === 0, read());
}
S.eq('budget by difficulty: 1-2 easy', [1, 2].map((d) => core.budgetFor({ fullBudget: { easy: 300, mid: 600, hard: 1080 } }, d)), [300, 300]);
S.eq('budget by difficulty: 3 mid, 4-5 hard', [3, 4, 5].map((d) => core.budgetFor({ fullBudget: { easy: 300, mid: 600, hard: 1080 } }, d)), [600, 1080, 1080]);

// ---- 3. commit and grade through the engine
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const got = toFull(prog, ix);
  S.check('full stage is planned when four techniques hold a streak', !!got && !!got.card, got && got.card);
  S.eq('the full card is f031 on t1.quad', [got.card.id, got.card.tech], ['f031', 't1.quad']);
  S.eq('full card carries its budget', got.card.budgetSec, 300);
  const sess = got.sess, card = got.card;
  // review and micro cards before the full problem may already have credited t1.quad this session (once per session)
  const credited0 = !!sess.credited['t1.quad'], s0 = prog.tech['t1.quad'].s;
  // a rubric-complete, right commit at 120 s grades 2 and credits like a right micro
  const cm = core.fullCommit(prog, ix, sess, card.order.indexOf(card.item.answer.correct), 120);
  S.check('right commit is recorded', cm.ok === true && card.commit.ok === true, cm);
  const g = core.fullGrade(prog, ix, sess, [0, 1, 2]);
  S.eq('clean in-budget self-grade is grade 2', g.grade, 2);
  S.check('grade 2 credits the primary once per session', g.effects.credited === !credited0 && prog.tech['t1.quad'].s === s0 + (credited0 ? 0 : 1),
    { credited0, s0, s: prog.tech['t1.quad'].s });
  S.check('grade 2 sets fp on the primary and each secondary', prog.tech['t1.quad'].fp === 1 && prog.tech['t1.lin-eq'].fp === 1, [prog.tech['t1.quad'].fp, prog.tech['t1.lin-eq'].fp]);
  S.eq('full record keeps the last two grades and the best time', [prog.full.f031.g, prog.full.f031.best], [[2], 120]);
  S.check('graded card cannot be graded twice', (() => { try { core.fullGrade(prog, ix, sess, []); return false; } catch (e) { return true; } })());
}
// grade 1: right commit, over budget, rubric complete. Holds: no credit, no fp.
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const got = toFull(prog, ix);
  const card = got.card;
  const s0 = prog.tech['t1.quad'].s, fp0 = prog.tech['t1.quad'].fp;
  core.fullCommit(prog, ix, got.sess, card.order.indexOf(card.item.answer.correct), 400);
  const g = core.fullGrade(prog, ix, got.sess, [0, 1, 2]);
  S.check('over-budget right commit grades 1', g.grade === 1 && card.commit.over === true, g);
  S.check('grade 1 holds the streak and leaves fp as it was', prog.tech['t1.quad'].s === s0 && prog.tech['t1.quad'].fp === fp0, prog.tech['t1.quad']);
  S.eq('grade 1 is recorded', prog.full.f031.g, [1]);
}
// grade 0: wrong commit. Resets the primary, marks primary and secondaries weak, no fp.
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const got = toFull(prog, ix);
  const card = got.card;
  const lin0 = prog.tech['t1.lin-eq'].s, quad0 = prog.tech['t1.quad'].s, fp0 = prog.tech['t1.quad'].fp;
  const cm = core.fullCommit(prog, ix, got.sess, wrongResponse(card), 100);
  S.check('wrong commit is recorded as wrong', cm.ok === false && card.commit.ok === false, cm);
  const g = core.fullGrade(prog, ix, got.sess, [0, 1, 2]);
  S.eq('wrong commit grades 0 even with full rubric', g.grade, 0);
  S.check('grade 0 costs the primary one streak step and un-masters it below mastered (changed 2026-10-12)',
    prog.tech['t1.quad'].s === Math.max(0, quad0 - 1) && prog.tech['t1.quad'].m === (prog.tech['t1.quad'].s >= 3 ? 1 : 0), { quad0, q: prog.tech['t1.quad'] });
  S.check('grade 0 sets wk on the primary and each secondary', prog.tech['t1.quad'].wk === 1 && prog.tech['t1.lin-eq'].wk === 1,
    [prog.tech['t1.quad'].wk, prog.tech['t1.lin-eq'].wk]);
  S.eq('grade 0 does not set fp', prog.tech['t1.quad'].fp, fp0);
  S.eq('grade 0 keeps the secondary streak', prog.tech['t1.lin-eq'].s, lin0);
}
// self-grade can only lower: rubric far below on a right commit grades 0
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const got = toFull(prog, ix);
  core.fullCommit(prog, ix, got.sess, got.card.order.indexOf(got.card.item.answer.correct), 60);
  S.eq('right commit with rubric far below grades 0', core.fullGrade(prog, ix, got.sess, [0]).grade, 0);
}
// a numeric commit: parse errors do not commit, a number does
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const sess = core.startSession(prog, ix, DAY);
  // reach f032 by building a card directly; its session position is not needed for the commit check
  const card = fullCard(ix, 'f032');
  S.eq('numeric full card kind', card.kind, 'numeric');
  sess.queue.splice(sess.pos, 0, card);
  const bad = core.fullCommit(prog, ix, sess, 'abc', 5);
  S.check('unparsable numeric commit counts no attempt', bad.unparsable === true && !card.commit, bad);
  const good = core.fullCommit(prog, ix, sess, '8', 5);
  S.check('typed 8 commits right for f032', good.ok === true && card.commit.ok === true, good);
}
S.check('answerCard refuses a full card', (() => {
  const { ix } = fresh(); const prog = readyProg(ix);
  const got = toFull(prog, ix);
  try { core.answerCard(prog, ix, got.sess, '0', 1); return false; } catch (e) { return /fullCommit/.test(e.message); }
})());

// ---- 4. wk set and clear: a right micro of the weak technique clears it; a wrong one does not
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  prog.tech['t1.quad'].wk = 1;
  const sess = core.startSession(prog, ix, DAY);
  const micro = ix.itemById['f008'];                      // t1.quad micro, numeric
  const card = core.makeCard(ix, micro, 'micro', sess.n);
  core.applyAnswer(prog, ix, sess, card, false, 3);
  S.eq('a wrong micro leaves wk set', prog.tech['t1.quad'].wk, 1);
  core.applyAnswer(prog, ix, sess, card, true, 3);
  S.eq('a right micro of the technique clears wk', prog.tech['t1.quad'].wk, 0);
}

// ---- 5. weak-first Micro ordering and the Full stage gate
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const firstMicroTech = (p) => core.buildPlan(p, ix, DAY).cards.filter((c) => c.stage === 'micro')[0].tech;
  const before = firstMicroTech(prog);
  prog.tech['t2.exp-log'].wk = 1;
  S.eq('weak technique takes the first Micro slot', firstMicroTech(prog), 't2.exp-log');
  S.check('without the flag the first slot is not forced', before !== undefined, before);
}
{
  const { ix } = fresh();
  const p = core.newProg(); p.sessions = 3;
  p.tech['t1.lin-eq'] = base({ s: 2, r: 2, m: 0, in: 1 });
  p.tech['t1.quad'] = base({ s: 1, r: 1, in: 1 });
  p.tech['t2.exp-log'] = base({ s: 1, r: 1, in: 1 });
  const plan = core.buildPlan(p, ix, DAY);
  S.check('Full is skipped below four techniques with a streak', plan.full.status === 'skip' && /needs 4/.test(plan.full.reason), plan.full);
  S.check('no full card in that plan', plan.cards.every((c) => c.stage !== 'full'));
}

// ---- 6. fp is not set by a micro, and normalizeProg keeps the full record shape
{
  const { ix } = fresh();
  const prog = readyProg(ix);
  const sess = core.startSession(prog, ix, DAY);
  // a right typed tier b micro sets fp only from streak PRODUCTION_STREAK (2), changed 2026-10-12
  prog.tech['t1.quad'].s = 1; prog.tech['t1.quad'].fp = 0;
  core.applyAnswer(prog, ix, sess, core.makeCard(ix, ix.itemById['f008'], 'micro', sess.n), true, 3);
  S.eq('a right typed micro below streak 2 does not set fp', prog.tech['t1.quad'].fp, 0);
  prog.tech['t1.quad'].s = 2; prog.tech['t1.quad'].fp = 0;
  core.applyAnswer(prog, ix, sess, core.makeCard(ix, ix.itemById['f008'], 'micro', sess.n + 1), true, 3);
  S.eq('a right typed tier b micro at streak 2 sets fp', prog.tech['t1.quad'].fp, 1);
  const mcqB = Object.values(ix.itemById).find((it) => it.tier === 'b' && it.answer && it.answer.kind === 'mcq');
  S.check('fixture has a tier b mcq', !!mcqB);
  const mt = mcqB.tags[0];
  prog.tech[mt].s = 2; prog.tech[mt].fp = 0;
  core.applyAnswer(prog, ix, sess, core.makeCard(ix, mcqB, 'micro', sess.n + 2), true, 3);
  S.eq('a right choice micro at streak 2 does not set fp', prog.tech[mt].fp, 0);
  const norm = core.normalizeProg({ v: 1, full: { x1: { g: [0, 1, 2], l: 3, best: 90 } } });
  S.eq('full record keeps the last two grades', norm.full.x1, { g: [1, 2], l: 3, best: 90 });
}

// ---- 7. sim: a failed full problem moves its technique into the next session's Micro first slot
{
  // Gate open (pack gate 0): the 3-technique fixture level would otherwise hold Trig and starve the Full stage of
  // streaks, since the exam rule needs fp from Full problems (M6). This block checks Full wiring, not the gate.
  const base = load();
  const ix = core.index(Object.assign({}, base, { pack: Object.assign({}, base.pack, { gate: 0 }) }));
  const prog = core.newProg();
  const pl = (p, fail) => {
    const sess = core.startSession(p, ix, DAY);
    if (!sess) return { sess: null, failed: null };
    let failed = null, sBefore = null;
    for (;;) {
      const c = core.currentCard(sess);
      if (!c) break;
      if (c.type === 'full') {
        if (fail) { sBefore = p.tech[c.tech].s; core.fullCommit(p, ix, sess, wrongResponse(c), 10); failed = c.tech; core.fullGrade(p, ix, sess, []); }
        else { core.fullCommit(p, ix, sess, correctResponse(c), 10); core.fullGrade(p, ix, sess, c.item.rubric.map((_, i) => i)); }
      } else if (c.type !== 'teach') core.answerCard(p, ix, sess, correctResponse(c), 4);
      if (!core.advance(sess, p)) break;
    }
    return { sess, failed, sBefore };
  };
  let failedTech = null, failedAt = 0, failedS = 0;
  for (let k = 0; k < 40 && !failedTech; k++) {
    const hasFull = core.buildPlan(prog, ix, DAY).cards.some((c) => c.stage === 'full');
    const r = pl(prog, hasFull);
    if (hasFull) { failedTech = r.failed; failedAt = r.sess.n; failedS = r.sBefore; }
  }
  S.check('a full problem came up and was failed within 40 sessions', !!failedTech, { failedTech, failedAt });
  if (failedTech) {
    const micro = core.buildPlan(prog, ix, DAY).cards.filter((c) => c.stage === 'micro');
    S.check('the failed technique has micro items to lead with', micro.length > 0, micro.length);
    S.eq('the failed technique leads the next Micro stage', micro[0] && micro[0].tech, failedTech);
    S.eq('the failed technique is weak and costs one streak step', [prog.tech[failedTech].wk, prog.tech[failedTech].s], [1, Math.max(0, failedS - 1)]);
  }
}

// ---- 8. validator: tier c shape (SPEC 3.3, PACK_SCHEMA "Full items")
function errsFor(mut) {
  const d = JSON.parse(JSON.stringify(loadDir(DIR)));
  mut(d);
  return validateData(d).errors;
}
const fullIx = (d, id) => d.items.findIndex((it) => it.id === id);
S.eq('fixture passes the validator', errsFor(() => {}).length, 0);
S.check('full item without a solution is an error', errsFor((d) => { d.items[fullIx(d, 'f031')].solution = ''; }).some((e) => /solution is required/.test(e)));
S.check('empty rubric is an error', errsFor((d) => { d.items[fullIx(d, 'f031')].rubric = []; }).some((e) => /rubric must be a non-empty array/.test(e)));
S.check('pass above total weight is an error', errsFor((d) => { d.items[fullIx(d, 'f031')].pass = 9; }).some((e) => /exceeds total rubric weight/.test(e)));
S.check('a rubric weight of zero is an error', errsFor((d) => { d.items[fullIx(d, 'f031')].rubric[0].weight = 0; }).some((e) => /weight must be a number > 0/.test(e)));
S.check('a full mcq needs exactly five options', errsFor((d) => { d.items[fullIx(d, 'f031')].answer.options = d.items[fullIx(d, 'f031')].answer.options.slice(0, 4); d.items[fullIx(d, 'f031')].answer.correct = 0; }).some((e) => /exactly 5 options/.test(e)));
S.check('a full item with answer kind self is an error', errsFor((d) => { d.items[fullIx(d, 'f031')].answer = { kind: 'self' }; }).some((e) => /must be mcq \(5 options\) or numeric/.test(e)));
S.check('rubric on a micro item is an error', errsFor((d) => { d.items[fullIx(d, 'f008')].rubric = [{ text: 'x', weight: 1 }]; d.items[fullIx(d, 'f008')].pass = 1; }).some((e) => /only for tier c/.test(e)));
S.check('a full budget without a hard entry is an error', errsFor((d) => { d.pack.full = { budgetSec: { easy: 300, mid: 600 } }; }).some((e) => /full\.budgetSec\.hard/.test(e)));
S.check('a LaTeX error in a rubric line is an error', errsFor((d) => { d.items[fullIx(d, 'f031')].rubric[0].text = 'Use $\\frac{1$.'; }).some((e) => /rubric\[0\]/.test(e)));

S.done();
