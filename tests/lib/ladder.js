'use strict';
// Test helper: plays a whole ladder card through the engine API (the page drives the same calls stage by stage).
// mode 'good': every stage right first try (item grade 2). 'bad': the first stage takes two wrong picks (grade 0).
// 'hint': first stage with a hint used (grade 1). Returns the last stage result ({fin} on the last stage).
const core = require('../../engine/core.js');

const BREAKS = (v) => ({ status: 'ok', results: [{ got: v }], stdout: '' });

function rightResponse(card, st) {
  if (st.type === 'choose') return card.orders[card.lad ? card.lad.i : 0].indexOf(st.options.findIndex((o) => o.ok));
  if (st.type === 'counterexample') return BREAKS(true);
  return String(st.answer.value);
}
function wrongResponses(card, st) {
  if (st.type === 'choose') {
    const ord = card.orders[card.lad.i];
    return st.options.map((o, i) => (o.ok ? -1 : ord.indexOf(i))).filter((d) => d >= 0);
  }
  if (st.type === 'counterexample') return [BREAKS(false), BREAKS(false)];
  return ['123456', '654321'];
}
function playLadder(prog, ix, sess, card, mode, secs) {
  let last = null;
  while (!(card.lad && card.lad.fin)) {
    const l = core.ladderOf(card), st = core.ladderStage(card);
    if (l.i === 0 && mode === 'bad') {
      wrongResponses(card, st).slice(0, 2).forEach((r) => core.ladderAttempt(prog, ix, sess, card, r, secs));
    }
    if (l.i === 0 && mode === 'hint' && st.hint) core.ladderHint(card);
    last = core.ladderAttempt(prog, ix, sess, card, rightResponse(card, st), secs);
  }
  return last;
}
// What core.answerCard returns for a micro card, for a ladder.
function asAnswer(card, fin) {
  return { unparsable: false, ok: fin.ok, credited: fin.credited, mastered: fin.mastered, requeue: false, answer: fin.answer, solution: card.item.solution };
}
module.exports = { playLadder, asAnswer, BREAKS, rightResponse, wrongResponses };
