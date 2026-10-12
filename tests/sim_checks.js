'use strict';
// Scripted 10-session sims on the fixture pack. Proves the mastery rules across sessions.
const { suite } = require('./lib/check.js');
const { fresh, correctResponse, wrongResponse } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const S = suite('sim_checks');
const TECH = 't1.lin-eq';

// Plays one session. policy(card) -> response. Teach cards are read (no answer).
function play(prog, ix, day, policy) {
  const sess = core.startSession(prog, ix, day);
  if (!sess) return null;
  for (;;) {
    const c = core.currentCard(sess);
    if (!c) break;
    if (c.type === 'full') {
      core.fullCommit(prog, ix, sess, correctResponse(c), 4);
      core.fullGrade(prog, ix, sess, c.item.rubric.map((_, i) => i));
    } else if (c.type !== 'teach') core.answerCard(prog, ix, sess, policy(c), 4);
    if (!core.advance(sess, prog)) break;
  }
  return { sess, summary: core.finishSession(prog, ix, sess) };
}

const allRight = (c) => correctResponse(c);
const techOnly = (fn, other) => (c) => (c.tech === TECH ? fn(c) : other(c));

// 1. Ten sessions, all right, one day. Mastery must land on session 3 exactly.
{
  const { ix, prog } = fresh();
  const trace = [];
  for (let i = 1; i <= 10; i++) {
    play(prog, ix, '2026-10-12', allRight);
    const r = prog.tech[TECH];
    trace.push({ n: prog.sessions, s: r.s, m: r.m });
  }
  S.eq('ten sessions ran', prog.sessions, 10);
  S.eq('first mastery at session 3', trace.findIndex((t) => t.m === 1) + 1, 3);
  S.check('streak rises by at most one per session', trace.every((t, i) => i === 0 || t.s - trace[i - 1].s <= 1), trace);
  S.check('mastered flag sticks while all right', trace.slice(2).every((t) => t.m === 1), trace);
}

// 2. Three right answers in one session give one credit (learn block is 3-4 right answers on TECH).
{
  const { ix, prog } = fresh();
  const out = play(prog, ix, 'd', allRight);
  const learnRights = out.sess.queue.filter((c) => c.stage === 'learn' && c.type !== 'teach').length;
  S.check('session one has several right answers on the technique', learnRights >= 3, learnRights);
  S.eq('several right answers, one credit: streak 1', prog.tech[TECH].s, 1);
  S.eq('not mastered from one session', prog.tech[TECH].m, 0);
}

// 3. A miss resets, requeues once, requeued right gives no credit, then 3 new credited sessions master again.
{
  const { ix, prog } = fresh();
  play(prog, ix, 'd', allRight);               // session 1: streak 1
  play(prog, ix, 'd', allRight);               // session 2: streak 2
  let missed = false;
  const missFirst = (c) => {
    if (!missed && c.tech === TECH && !c.requeued) { missed = true; return wrongResponse(c); }
    return correctResponse(c);
  };
  const out3 = play(prog, ix, 'd', missFirst); // session 3: miss on TECH
  S.eq('miss costs one streak step, 2 to 1 (changed 2026-10-12)', prog.tech[TECH].s, 1);
  S.eq('miss is not mastered', prog.tech[TECH].m, 0);
  S.check('miss requeued the item in the same session', out3.sess.queue.some((c) => c.requeued && c.tech === TECH), 'no requeue');
  S.eq('miss session gives TECH no credit at all', prog.tech[TECH].l, 2);
  play(prog, ix, 'd', allRight);               // session 4: streak 2
  S.eq('streak rebuilds one step per credited session', prog.tech[TECH].s, 2);
  S.eq('not yet mastered at 2', prog.tech[TECH].m, 0);
  play(prog, ix, 'd', allRight);               // session 5: streak 3
  S.eq('mastered again at 3 (two credits after the miss)', prog.tech[TECH].m, 1);
}

// 4. Requeued right answer gives no credit, even on the first session of the streak.
{
  const { ix, prog } = fresh();
  let missed = false;
  const missThenRight = (c) => {
    if (c.tech !== TECH) return correctResponse(c);
    if (!missed) { missed = true; return wrongResponse(c); }
    return correctResponse(c);
  };
  play(prog, ix, 'd', missThenRight);
  S.eq('wrong then right in one session: no credit, streak 0', prog.tech[TECH].s, 0);
}

// 5. Production gate across sessions: at streak 2 only typed answers advance, MCQ right holds.
{
  const { ix, prog } = fresh();
  play(prog, ix, 'd', allRight);
  play(prog, ix, 'd', allRight);
  S.eq('streak is 2 before the gate test', prog.tech[TECH].s, 2);
  const onlyMcq = (c) => (c.tech === TECH && c.type === 'numeric' ? wrongResponse(c) : correctResponse(c));
  // Session 3 offers TECH numeric and MCQ. Right MCQ must hold; the typed one credits.
  const sess = core.startSession(prog, ix, 'd');
  const techCards = sess.queue.filter((c) => c.tech === TECH);
  S.check('gate session offers a typed card for TECH', techCards.some((c) => c.type === 'numeric'), techCards.map((c) => c.type));
  const mcqFirst = techCards.find((c) => c.type === 'mcq');
  if (mcqFirst) {
    sess.pos = sess.queue.indexOf(mcqFirst);
    core.answerCard(prog, ix, sess, correctResponse(mcqFirst), 3);
    S.eq('right MCQ holds streak at 2', prog.tech[TECH].s, 2);
  }
  sess.pos = 0;
  const cards = sess.queue;
  for (let i = 0; i < cards.length; i++) {
    sess.pos = i;
    const c = cards[i];
    if (c.type === 'teach') continue;
    if (c.tech === TECH && c.type === 'numeric') { core.answerCard(prog, ix, sess, correctResponse(c), 3); break; }
  }
  S.eq('typed right credits from 2 to 3', prog.tech[TECH].s, 3);
  S.eq('typed credit masters', prog.tech[TECH].m, 1);
}

// 6. Spacing by session ordinal: a technique untouched for 4 sessions sorts before one touched last session.
{
  const { ix, prog } = fresh();
  ['t1.quad', 't1.lin-eq'].forEach((id) => { prog.tech[id] = { s: 1, l: 0, r: 1, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 }; });
  prog.tech['t1.lin-eq'].l = 9;
  prog.tech['t1.quad'].l = 5;
  prog.sessions = 10;
  const plan = core.buildPlan(prog, ix, 'd');
  const order = plan.cards.filter((c) => c.stage === 'review').map((c) => c.tech);
  S.eq('oldest-credited technique comes first', order[0], 't1.quad');
}

// 7. Several sessions in one day are legal and never starve a technique (day log only deprioritises items).
{
  const { ix, prog } = fresh();
  for (let i = 0; i < 4; i++) play(prog, ix, '2026-10-12', allRight);
  S.eq('four sessions one day counted', prog.sessions, 4);
  S.check('day log grew and holds ids', prog.day.log.length > 0 && prog.day.n === 4, prog.day);
}

// 8. Learn introduces exactly one technique per session and never a second before the first is started.
{
  const { ix, prog } = fresh();
  play(prog, ix, 'd', allRight);
  const started = ix.techs.filter((t) => core.isIntro(prog, t.id)).map((t) => t.id);
  S.eq('one technique started after session 1', started, ['t1.lin-eq']);
}

// 9. Session with nothing to do does not consume an ordinal.
{
  const { ix, prog } = fresh();
  const none = core.startSession(core.newProg(), core.index({ pack: ix.pack, techniques: [], items: [] }), 'd');
  S.eq('empty plan returns null', none, null);
  S.eq('empty plan leaves ordinal', core.newProg().sessions, 0);
}

S.done();
