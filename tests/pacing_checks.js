'use strict';
// Pacing rules changed 2026-10-12 after the pacing study (rec_n2, TODO "Pacing study 2026-10-12"):
// (a) a miss costs one streak step, mastered flag kept only at streak >= 3; (b) fp also from a right typed tier b
// answer at streak >= 2; (c) a Learn prerequisite counts at streak >= 1; (d) NEW_LATER 2; plus planFull honours
// pack.session.full. The mastery invariants (3 distinct sessions, one credit per session) stay in sim_checks.js.
const { suite } = require('./lib/check.js');
const { fresh, load, correctResponse, wrongResponse } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const S = suite('pacing_checks');
const DAY = '2026-10-12';

const base = (over) => Object.assign({ s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 }, over || {});
const sessFor = (n) => ({ n, today: DAY, queue: [], pos: 0, credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: [] });
const itemOf = (ix, id) => ix.itemById[id];
const micro = (ix, id, n) => core.makeCard(ix, itemOf(ix, id), 'micro', n);

// ---- (a) miss costs one streak step
{
  const cases = [
    // [start s, start m, start prov, expect s, expect m, expect prov]
    [3, 1, 1, 2, 0, 0],   // mastered at 3, one miss: 2 and un-mastered, placement flag dropped
    [4, 1, 0, 3, 1, 0],   // above 3 stays mastered after one miss
    [1, 0, 0, 0, 0, 0],   // one step to 0
    [0, 0, 0, 0, 0, 0],   // never below 0
    [2, 0, 1, 1, 0, 0]
  ];
  cases.forEach(([s, m, prov, es, em, ep], i) => {
    const { ix, prog } = fresh();
    prog.tech['t1.quad'] = base({ s, m, prov });
    core.applyAnswer(prog, ix, sessFor(5), micro(ix, 'f008', 5), false, 3);
    const r = prog.tech['t1.quad'];
    S.eq(`miss from s=${s} m=${m} prov=${prov} -> s,m,prov ${es},${em},${ep} (case ${i})`, [r.s, r.m, r.prov], [es, em, ep]);
  });
}

// ---- (a2) re-master: a drop to 2 needs one more credited typed session, not three
{
  const { ix, prog } = fresh();
  prog.tech['t1.quad'] = base({ s: 3, m: 1 });
  core.applyAnswer(prog, ix, sessFor(5), micro(ix, 'f008', 5), false, 3);
  S.eq('drop to s=2 un-masters', [prog.tech['t1.quad'].s, prog.tech['t1.quad'].m], [2, 0]);
  const out = core.applyAnswer(prog, ix, sessFor(6), micro(ix, 'f008', 6), true, 3);
  S.eq('one credited typed answer re-masters', [prog.tech['t1.quad'].s, prog.tech['t1.quad'].m, out.mastered], [3, 1, true]);
}

// ---- (b) fp from a right typed tier b answer at streak >= 2
{
  const typedB = 'f008';      // tier b numeric on t1.quad
  const mcqB = 'f005';        // tier b mcq on t1.lin-eq
  const typedA = 'f007';      // tier a numeric on t1.quad
  const run = (id, s, ok) => {
    const { ix, prog } = fresh();
    prog.tech['t1.quad'] = base({ s });
    prog.tech['t1.lin-eq'] = base({ s });
    const tech = itemOf(ix, id).tags[0];
    prog.tech[tech] = prog.tech[tech] || base({ s });
    prog.tech[tech].s = s;
    core.applyAnswer(prog, ix, sessFor(5), micro(ix, id, 5), ok, 3);
    return prog.tech[tech].fp;
  };
  S.eq('right typed tier b at streak 1 does not set fp', run(typedB, 1, true), 0);
  S.eq('right typed tier b at streak 2 sets fp', run(typedB, 2, true), 1);
  S.eq('right typed tier b at streak 3 sets fp', run(typedB, 3, true), 1);
  S.eq('wrong typed tier b at streak 2 does not set fp', run(typedB, 2, false), 0);
  S.eq('right typed tier a at streak 2 does not set fp (tier b only)', run(typedA, 2, true), 0);
  S.eq('right choice tier b at streak 2 does not set fp (typed only)', run(mcqB, 2, true), 0);
  // fp is set by the production answer itself, so it lands at the credit that raises the streak to 3 too
  const { ix, prog } = fresh();
  prog.tech['t1.quad'] = base({ s: 2 });
  core.applyAnswer(prog, ix, sessFor(5), micro(ix, typedB, 5), true, 3);
  S.eq('the streak-2 typed answer credits to 3 and sets fp', [prog.tech['t1.quad'].s, prog.tech['t1.quad'].fp], [3, 1]);
}

// ---- (c) Learn prerequisite satisfied at streak >= 1
{
  const { ix, prog } = fresh();
  prog.sessions = 3;
  prog.tech['t1.lin-eq'] = base({ s: 0, in: 1, l: 1, r: 1 });
  const none = core.buildPlan(prog, ix, DAY);
  S.eq('prereq at streak 0 blocks the dependent technique', none.learn.status, 'skip');
  prog.tech['t1.lin-eq'].s = 1;
  const one = core.buildPlan(prog, ix, DAY);
  S.eq('prereq at streak 1 teaches the dependent technique', one.learn.tech && one.learn.tech.id, 't1.quad');
  S.eq('prereq at streak 1 is not mastered', prog.tech['t1.lin-eq'].m, 0);
}

// ---- (d) two new per session once 20 are started (NEW_LATER 2), with learn ceiling 3
{
  const d = load();
  d.pack.session.learn = 3;
  const ix = core.index(d);
  const p = core.newProg();
  for (let k = 0; k < 19; k++) p.tech['x' + k] = base({ in: 1 });
  S.eq('cap is 2 with 19 started', core.newCap(p, ix), 2);
  p.tech.x19 = base({ in: 1 });
  S.eq('cap stays 2 with 20 started (NEW_LATER 2)', core.newCap(p, ix), 2);
  p.tech.x20 = base({ in: 1 });
  S.eq('cap stays 2 with 21 started', core.newCap(p, ix), 2);
}

// ---- planFull honours pack.session.full, one distinct technique per full problem
function readyProg() {
  const p = core.newProg();
  p.sessions = 6;
  p.tech['t1.lin-eq'] = base({ s: 3, m: 1, r: 3, l: 4 });
  p.tech['t1.quad'] = base({ s: 3, m: 1, r: 3, l: 5 });
  p.tech['t2.exp-log'] = base({ s: 1, r: 1, l: 5 });
  p.tech['t1.factor'] = base({ s: 1, r: 1, l: 5 });
  p.tech['t2.unit-circle'] = base({ s: 1, r: 1, l: 5 });
  return p;
}
function planWithFull(n) {
  const d = load();
  d.pack.session.full = n;
  const ix = core.index(d);
  return { ix, plan: core.buildPlan(readyProg(), ix, DAY) };
}
{
  const one = planWithFull(1);
  S.eq('full 1 plans one full problem', one.plan.full.count, 1);
  const two = planWithFull(2);
  const fulls = two.plan.cards.filter((c) => c.stage === 'full');
  S.eq('full 2 plans two full problems', fulls.length, 2);
  S.eq('the two full problems are on different techniques', new Set(fulls.map((c) => c.tech)).size, 2);
  const zero = planWithFull(0);
  S.eq('full 0 plans none', zero.plan.full.status, 'skip');
  const three = planWithFull(3);
  S.eq('full 3 with only two eligible techniques plans two', three.plan.full.count, 2);
}

// two full problems in one session are both committed and graded, each credited once
{
  const d = load();
  d.pack.session.full = 2;
  const ix = core.index(d);
  const prog = readyProg();
  const sess = core.startSession(prog, ix, DAY);
  const fullTechs = sess.queue.filter((c) => c.type === 'full').map((c) => c.tech);
  for (;;) {
    const c = core.currentCard(sess);
    if (!c) break;
    if (c.type === 'full') {
      core.fullCommit(prog, ix, sess, correctResponse(c), 60);
      core.fullGrade(prog, ix, sess, c.item.rubric.map((_, i) => i));
    } else if (c.type !== 'teach') core.answerCard(prog, ix, sess, correctResponse(c), 4);
    if (!core.advance(sess, prog)) break;
  }
  S.eq('two full records written', Object.keys(prog.full).length, 2);
  S.eq('each full technique is credited at most once this session',
    fullTechs.every((t) => sess.credited[t] === true), true);
}

S.done();
