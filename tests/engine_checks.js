'use strict';
const { suite } = require('./lib/check.js');
const { fresh, load, correctResponse, wrongResponse } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const answer = require('../engine/answer.js');
const S = suite('engine_checks');
const { check, eq } = S;

// --- numbers
eq('parse integer', answer.parseNumber('7').v, 7);
eq('parse decimal', answer.parseNumber('0.5').v, 0.5);
eq('parse negative decimal', answer.parseNumber('-2.25').v, -2.25);
eq('parse p/q reduces', [answer.parseNumber('6/8').p, answer.parseNumber('6/8').q], [3, 4]);
check('parse rejects sign on denominator', answer.parseNumber('1/-2') === null);
check('parse rejects letters', answer.parseNumber('abc') === null);
check('parse rejects zero denominator', answer.parseNumber('1/0') === null);
check('parse rejects lone dot', answer.parseNumber('.') === null);
check('parse rejects empty', answer.parseNumber('') === null);
check('parse rejects digits split by space', answer.parseNumber('1 2') === null);
check('parse keeps spaces around slash', answer.parseNumber(' 1 / 2 ').v === 0.5);
eq('lowest-terms flag false for 2/4', answer.parseNumber('2/4').lowest, false);

// --- numeric checker (answer.js is the only checker since M4; core keeps no copy)
const num = (spec, typed) => answer.check(Object.assign({ kind: 'numeric' }, spec), typed);
eq('exact int right', num({ value: 5 }, '5').ok, true);
eq('exact int wrong', num({ value: 5 }, '6').ok, false);
eq('exact rational equals decimal', num({ value: '9/2' }, '4.5').ok, true);
eq('exact rational rejects near', num({ value: '9/2' }, '4.49').ok, false);
eq('decimal form uses tol', num({ value: 1, form: 'decimal', tol: 0.01 }, '1.005').ok, true);
eq('decimal form rejects beyond tol', num({ value: 1, form: 'decimal', tol: 0.01 }, '1.02').ok, false);
eq('fraction form accepts lowest terms', num({ value: '1/2', form: 'fraction' }, '1/2').ok, true);
eq('fraction form rejects unreduced as a counted wrong answer', [num({ value: '1/2', form: 'fraction' }, '2/4').ok, num({ value: '1/2', form: 'fraction' }, '2/4').attempt, num({ value: '1/2', form: 'fraction' }, '2/4').error], [false, true, 'lowest-terms']);
eq('unparsable does not count an attempt', [num({ value: 1 }, 'x').ok, num({ value: 1 }, 'x').attempt], [false, false]);
eq('bad form does not count an attempt', num({ value: 1, form: 'nope' }, '1').attempt, false);
check('core keeps no numeric copy', core.checkNumeric === undefined && core.parseNumber === undefined);

// --- item kind
eq('kind numeric', core.itemKind({ answer: { kind: 'numeric', value: 1 } }), 'numeric');
eq('kind mcq', core.itemKind({ answer: { kind: 'mcq', options: ['a', 'b'], correct: 0 } }), 'mcq');
eq('kind multi with options', core.itemKind({ answer: { kind: 'multi', options: ['a', 'b'], correct: [0] } }), 'multi');
eq('mcq without options is skipped', core.itemKind({ answer: { kind: 'mcq', correct: 0 } }), null);
eq('kind expression', core.itemKind({ answer: { kind: 'expression', value: 'x', vars: ['x'] } }), 'expression');
eq('self is skipped until M5', core.itemKind({ answer: { kind: 'self', rubric: [] } }), null);

// --- option order and grading
const { ix: ixA } = fresh();
const mcqItem = { id: 'm1', tags: ['t'], answer: { kind: 'mcq', options: ['a', 'b', 'c', 'd'], correct: 2 } };
const card = core.makeCard(ixA, mcqItem, 'review', 4);
eq('shuffle is a permutation', card.order.slice().sort(), [0, 1, 2, 3]);
eq('shuffle is deterministic', core.makeCard(ixA, mcqItem, 'review', 4).order, card.order);
const fixedItem = Object.assign({}, mcqItem, { answer: Object.assign({}, mcqItem.answer, { shuffle: false }) });
eq('shuffle false keeps order', core.makeCard(ixA, fixedItem, 'review', 4).order, [0, 1, 2, 3]);
eq('grade mcq correct via display index', core.gradeCard(card, card.order.indexOf(2)).ok, true);
eq('grade mcq wrong', core.gradeCard(card, (card.order.indexOf(2) + 1) % 4).ok, false);
eq('grade mcq out of range unparsable', core.gradeCard(card, 9).unparsable, true);

// --- M4: expression and multi cards (grading goes through answer.js)
const exprItem = { id: 'e1', tier: 'b', tags: ['t1.quad'], critical: [], difficulty: 1, prompt: 'p', solution: 's',
  answer: { kind: 'expression', value: 'x^2/2', vars: ['x'] } };
const cardE = core.makeCard(ixA, exprItem, 'review', 4);
eq('expression item plays as expression', cardE.type, 'expression');
eq('expression equal form is right', core.gradeCard(cardE, 'x*x/2').ok, true);
eq('expression wrong form is wrong', core.gradeCard(cardE, 'x^2').ok, false);
eq('expression parse error is unparsable', core.gradeCard(cardE, 'x^^2').unparsable, true);
check('expression parse error carries the reason', typeof core.gradeCard(cardE, 'x^^2').detail === 'string');
eq('expression answer text is the authored value', core.answerText(cardE), 'x^2/2');
const multiItem = { id: 'mu1', tier: 'b', tags: ['t1.quad'], critical: [], difficulty: 1, prompt: 'p', solution: 's',
  answer: { kind: 'multi', options: ['a', 'b', 'c', 'd'], correct: [0, 2], shuffle: false } };
const cardMu = core.makeCard(ixA, multiItem, 'review', 4);
eq('multi item plays as multi', cardMu.type, 'multi');
eq('multi exact set is right', core.gradeCard(cardMu, [2, 0]).ok, true);
eq('multi subset is wrong (no partial credit)', core.gradeCard(cardMu, [0]).ok, false);
eq('multi out of range is unparsable', core.gradeCard(cardMu, [9]).unparsable, true);
eq('multi picks map to authored order', core.gradeCard(cardMu, [1]).chosen, [1]);
eq('multi answer text lists the correct options', core.answerText(cardMu), 'a; c');
eq('only typed kinds are production', [core.isProduction('expression'), core.isProduction('numeric'), core.isProduction('mcq'), core.isProduction('multi')], [true, true, false, false]);
const pExpr = core.newProg();
pExpr.tech['t1.quad'] = { s: 2, l: 1, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
const sExpr = { n: 6, today: 'd', queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: null };
core.applyAnswer(pExpr, ixA, sExpr, cardE, true, 2);
eq('expression right at streak 2 credits to 3', pExpr.tech['t1.quad'].s, 3);
const pMu = core.newProg();
pMu.tech['t1.quad'] = { s: 2, l: 1, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
core.applyAnswer(pMu, ixA, Object.assign({}, sExpr, { credited: {} }), cardMu, true, 2);
eq('multi right at streak 2 is held (choice kinds do not earn production credit)', pMu.tech['t1.quad'].s, 2);
eq('permutation deterministic', core.permutation(5, 'seed'), core.permutation(5, 'seed'));

// --- config and progress normalisation
eq('config reads session counts', core.config({ session: { review: 12, learn: 1, micro: 8, full: 0 } }).micro, 8);
eq('config default gate', core.config({}).gate, 0.7);
eq('config default mastered', core.config({}).mastered, 3);
let threw = null;
try { core.normalizeProg({ v: 2 }); } catch (e) { threw = e; }
eq('newer version refused with code', threw && threw.code, 'newer');
threw = null;
try { core.normalizeProg({ v: 1, tech: 5 }); } catch (e) { threw = e; }
check('tech must be an object', threw !== null);
threw = null;
try { core.normalizeProg([]); } catch (e) { threw = e; }
check('array is not progress', threw !== null);
const np = core.normalizeProg({ v: 1, sessions: 3, tech: { 'future.tech': { s: 2, extra: 'kept' } }, items: { zz: { r: 1 } } });
eq('unknown tech ids kept', np.tech['future.tech'].extra, 'kept');
eq('missing tech fields default', np.tech['future.tech'].m, 0);
eq('unknown item ids kept', np.items.zz.r, 1);
eq('day defaults', np.day.log, []);

// --- index and gate
const { ix, prog } = fresh();
eq('index orders by level then order', ix.techs.map((t) => t.id), ['t1.lin-eq', 't1.quad', 't1.factor', 't2.unit-circle', 't2.exp-log', 't2.trig-id']);
eq('gate open before any teaching', core.gateState(prog, ix).held, false);
const p2 = core.newProg();
const st = core.levelStatus(p2, ix);
eq('untaught level has 0 taught', st[1].taught, 0);
// Algebra fully taught, none mastered: Trig is held.
['t1.lin-eq', 't1.quad', 't1.factor'].forEach((id) => { p2.tech[id] = { s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 }; });
const g = core.gateState(p2, ix);
eq('gate holds next level under 70%', g.held, true);
eq('gate sentence names both levels, one line', g.sentence, 'T2 waits: T1 at 0% known.');

// --- planning
const plan0 = core.buildPlan(prog, ix, '2026-10-12');
eq('fresh learn is first untaught tech', plan0.learn.tech.id, 't1.lin-eq');
eq('fresh review empty', plan0.review.count, 0);
eq('fresh micro empty', plan0.micro.count, 0);
eq('learn block is teach then the tier b micro items by difficulty', plan0.cards.map((c) => c.type), ['teach', 'numeric', 'numeric', 'mcq']);
check('plan does not consume an ordinal', prog.sessions === 0);
const sess0 = core.startSession(prog, ix, '2026-10-12');
eq('start consumes ordinal', prog.sessions, 1);
eq('start does not start learn tech (F1)', prog.tech['t1.lin-eq'], undefined);
eq('start records no introduced tech', sess0.introduced, []);
core.advance(sess0, prog);   // pass the teach card
eq('passing teach card introduces tech', prog.tech['t1.lin-eq'].in, 1);
eq('session records introduced tech after teach', sess0.introduced, ['t1.lin-eq']);
eq('advance past teach card needs the progress record', (() => { try { core.advance(core.startSession(core.newProg(), fresh().ix, 'd'), undefined); return 'no-throw'; } catch (e) { return 'threw'; } })(), 'threw');
eq('start with nothing to do is null', core.startSession(core.newProg(), core.index({ pack: load().pack, techniques: [], items: [] }), "d"), null);

// --- credit rules on a fresh technique
const pr = core.newProg();
const ixF = fresh().ix;
const s1 = core.startSession(pr, ixF, 'day');
const first = core.currentCard(s1);
core.advance(s1, pr); // skip past teach card
const lin = (c) => c.tech === 't1.lin-eq';
let cardA = core.currentCard(s1);
const rA = core.answerCard(pr, ixF, s1, correctResponse(cardA), 3);
eq('right answer credits streak 1', pr.tech['t1.lin-eq'].s, 1);
eq('credit reported', rA.credited, true);
core.advance(s1, pr);
let cardB = core.currentCard(s1);
core.answerCard(pr, ixF, s1, correctResponse(cardB), 3);
eq('second right same session no extra credit', pr.tech['t1.lin-eq'].s, 1);
core.advance(s1, pr);
let cardC = core.currentCard(s1);
core.answerCard(pr, ixF, s1, correctResponse(cardC), 3);
eq('third right same session still streak 1', pr.tech['t1.lin-eq'].s, 1);
eq('not mastered from one session', pr.tech['t1.lin-eq'].m, 0);
check('first card was from learn', first.stage === 'learn');

// miss resets and requeues once, requeued right gives no credit
const pm = core.newProg();
const ixM = fresh().ix;
const sm = core.startSession(pm, ixM, 'day');
core.advance(sm, pm);
const qLen0 = sm.queue.length;
const miss = core.answerCard(pm, ixM, sm, wrongResponse(core.currentCard(sm)), 3);
eq('miss reports no credit', miss.ok, false);
eq('miss requeues', miss.requeue, true);
eq('requeue lengthens queue', sm.queue.length, qLen0 + 1);
eq('miss resets streak', pm.tech['t1.lin-eq'].s, 0);
// move to the requeued copy
while (core.currentCard(sm) && !core.currentCard(sm).requeued) core.advance(sm, pm);
const rq = core.answerCard(pm, ixM, sm, correctResponse(core.currentCard(sm)), 3);
eq('requeued right gives no credit', rq.credited, false);
eq('streak still 0 after requeued right', pm.tech['t1.lin-eq'].s, 0);
const rqCard = core.currentCard(sm);
eq('requeued item not requeued again', rq.requeue, false);
check('requeued card flagged', rqCard.requeued === true);

// production gate: at streak 2 an MCQ right holds, a numeric right credits
const pg = core.newProg();
const ixP = fresh().ix;
pg.tech['t1.lin-eq'] = { s: 2, l: 2, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
pg.sessions = 2;
const sp = { n: 3, today: 'd', queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: null };
const itemMcq = ixP.itemsByTech['t1.lin-eq'].find((i) => i.answer.kind === 'mcq');
const itemNum = ixP.itemsByTech['t1.lin-eq'].find((i) => i.answer.kind === 'numeric');
const cardMcq = core.makeCard(ixP, itemMcq, 'review', 3);
const cardNum = core.makeCard(ixP, itemNum, 'review', 3);
core.applyAnswer(pg, ixP, sp, cardMcq, true, 2);
eq('mcq right holds streak at 2', pg.tech['t1.lin-eq'].s, 2);
core.applyAnswer(pg, ixP, sp, cardNum, true, 2);
eq('numeric right credits from 2 to 3', pg.tech['t1.lin-eq'].s, 3);
eq('reaching 3 masters', pg.tech['t1.lin-eq'].m, 1);

// secondary tags: practice only on right, reset on wrong only when critical
const pt = core.newProg();
const ixT = fresh().ix;
const multi = { id: 'x1', tier: 'b', level: 'T1', tags: ['t1.quad', 't1.lin-eq'], critical: [], difficulty: 1,
  prompt: 'x', solution: 'x', answer: { kind: 'numeric', value: 1 }, source: { type: 'original' } };
pt.tech['t1.lin-eq'] = { s: 2, l: 2, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
const spt = { n: 4, today: 'd', queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: null };
core.applyAnswer(pt, ixT, spt, core.makeCard(ixT, multi, 'micro', 4), false, 2);
eq('non-critical secondary wrong keeps streak', pt.tech['t1.lin-eq'].s, 2);
eq('secondary wrong counted', pt.tech['t1.lin-eq'].w, 1);
const multiCrit = Object.assign({}, multi, { critical: ['t1.lin-eq'] });
core.applyAnswer(pt, ixT, { n: 5, today: 'd', queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: null },
  core.makeCard(ixT, multiCrit, 'micro', 5), false, 2);
eq('critical secondary wrong costs one streak step (changed 2026-10-12)', pt.tech['t1.lin-eq'].s, 1);
core.applyAnswer(pt, ixT, { n: 6, today: 'd', queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: null },
  core.makeCard(ixT, multiCrit, 'micro', 6), false, 2);
eq('second critical secondary wrong takes the streak to 0', pt.tech['t1.lin-eq'].s, 0);
eq('primary tag of wrong item resets too', pt.tech['t1.quad'] ? pt.tech['t1.quad'].s : 0, 0);

// unparsable answer: no mutation, no session change
const pu = core.newProg();
const su = core.startSession(pu, fresh().ix, 'day');
const beforeCount = su.queue.length;
const ixU = fresh().ix;
const numCard = su.queue.find((c) => c.type === 'numeric');
const posBefore = su.pos;
const scoredBefore = su.scored;
const ru = (() => { su.pos = su.queue.indexOf(numCard); return core.answerCard(pu, ixU, su, 'abc', 1); })();
eq('unparsable reports unparsable', ru.unparsable, true);
eq('unparsable not scored', su.scored, scoredBefore);
check('unparsable keeps queue length', su.queue.length === beforeCount);
su.pos = posBefore;

// F4: an unused item beats the numeric preference; numeric items used today are passed over
{
  const pf = core.newProg(), ixF4 = fresh().ix;
  pf.tech['t1.lin-eq'] = { s: 2, l: 2, r: 2, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  pf.sessions = 2;
  core.touchDay(pf, 'd', 'f003'); core.touchDay(pf, 'd', 'f004');
  // M6: Review at streak 2 draws a typed card when the recall pool has none (tier b fallback), and that card uses
  // the same per-technique cap as Micro. The cap of 3 holds across Review and Micro together.
  const cards = core.buildPlan(pf, ixF4, 'd').cards.filter((c) => c.item && c.item.tags[0] === 't1.lin-eq');
  eq('per technique cap holds across Review and Micro at streak 2', cards.length, 3);
}

// knownTech and levelStatus
eq('known needs mastered', core.knownTech({ m: 0 }, { exam: true }), false);
eq('known needs fp under the exam rule (M6)', core.knownTech({ m: 1, fp: 0 }, { exam: true }), false);
eq('known when mastered and fp', core.knownTech({ m: 1, fp: 1 }, { exam: true }), true);
eq('exam:false technique is known when mastered', core.knownTech({ m: 1, fp: 0 }, { exam: false }), true);
eq('placement-provisional counts as known (SPEC 6)', core.knownTech({ m: 0, prov: 1, s: 1 }, { exam: true }), true);

// finish summary
const fs1 = core.finishSession(prog, ix, sess0);
eq('finish summary counts scored zero', fs1.scored, 0);
{
  // F1: session ends on the teach card (never passed): the technique is taught again next session
  const pe = core.newProg(), ixE = fresh().ix;
  core.startSession(pe, ixE, 'd1');
  const again = core.buildPlan(pe, ixE, 'd2');
  eq('unpassed teach card is offered again', again.learn.tech && again.learn.tech.id, 't1.lin-eq');
  // F1: taught once but nothing answered: teach comes again, and no Review/Micro card for it precedes the teach card
  const pu = core.newProg(), ixU = fresh().ix;
  pu.tech['t1.lin-eq'] = { s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  pu.sessions = 1;
  const planU = core.buildPlan(pu, ixU, 'd');
  eq('started but unanswered technique is re-taught', planU.learn.tech && planU.learn.tech.id, 't1.lin-eq');
  eq('no card for it before its teach card', planU.cards.findIndex((c) => c.tech === 't1.lin-eq') === planU.cards.findIndex((c) => c.type === 'teach'), true);
  // F1: a started technique that has answers is not offered for teaching again
  const pa = core.newProg(), ixA = fresh().ix;
  pa.tech['t1.lin-eq'] = { s: 0, l: 0, r: 1, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  const learnPa = core.buildPlan(pa, ixA, 'd').learn;
  eq('answered started technique is not re-taught', !!(learnPa.tech && learnPa.tech.id === 't1.lin-eq'), false);
}
eq('finish names introduced tech', fs1.introduced, ['Linear equations']);

// per-technique cap: after mastering a whole level's worth, a session never gives one tech >3 cards
const pc = core.newProg();
const ixC = fresh().ix;
ixC.techs.forEach((t) => { pc.tech[t.id] = { s: 3, l: 1, r: 3, w: 0, m: 1, wk: 0, prov: 0, fp: 0, in: 1 }; });
pc.sessions = 5;
const planC = core.buildPlan(pc, ixC, 'day');
const perTech = {};
planC.cards.filter((c) => c.stage !== 'full').forEach((c) => { perTech[c.tech] = (perTech[c.tech] || 0) + 1; });   // SPEC 5: the cap covers stages 1-3
check('per-technique cap holds', Object.values(perTech).every((v) => v <= core.PER_TECH_CAP), perTech);
check('review fills up to config size', planC.review.count > 0 && planC.review.count <= 12, planC.review.count);
check('mastered techs are revisited', planC.cards.some((c) => c.stage === 'review'));

// WIP cap blocks Learn
const pw = core.newProg();
const ixW = fresh().ix;
['t1.lin-eq', 't1.quad', 't1.factor', 't2.unit-circle', 't2.exp-log', 't2.trig-id'].slice(0, 6).forEach((id) => {
  pw.tech[id] = { s: 1, l: 1, r: 1, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
});
eq('learn skipped when all techs started', core.buildPlan(pw, ixW, 'day').learn.status, 'skip');

// day log: same-day repeats are deprioritised, not forbidden
const pd = core.newProg();
core.touchDay(pd, 'd1', 'f001');
eq('usedToday true on same day', core.usedToday(pd, 'd1', 'f001'), true);
eq('usedToday false next day', core.usedToday(pd, 'd2', 'f001'), false);

// level status percentages
const pls = core.newProg();
const lsx = core.levelStatus(pls, fresh().ix);
eq('empty level status pct 0', lsx[0].pct, 0);

// item pool sanity from the fixture
const fixture = load();
check('every fixture item has a kind', fixture.items.every((it) => core.itemKind(it) !== null));
check('fixture has tier a and b per technique', fixture.techniques.every((t) => ['a', 'b'].every((tier) => fixture.items.some((it) => it.tags[0] === t.id && it.tier === tier))));

const res = S.done();
process.exitCode = res.failed ? 1 : 0;
