'use strict';
const fs = require('fs');
const path = require('path');
const core = require('../../engine/core.js');
const DIR = path.join(__dirname, '..', '..', 'packs', '_fixture');
function load() {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  return { pack: rd('pack.json'), techniques: rd('techniques.json'), items: rd('items.json') };
}
function fresh() {
  const ix = core.index(load());
  return { ix, prog: core.newProg() };
}
// Correct response for a card: display index for mcq, typed string for numeric.
// Full cards keep the answer kind in `kind` (their type is 'full').
function correctResponse(card) {
  if (card.type === 'ladder') return { ladder: 'good' };
  const a = card.item.answer;
  if ((card.kind || card.type) === 'mcq') return card.order.indexOf(a.correct);
  return String(a.value);
}
function wrongResponse(card) {
  if (card.type === 'ladder') return { ladder: 'bad' };
  const a = card.item.answer;
  if ((card.kind || card.type) === 'mcq') return (card.order.indexOf(a.correct) + 1) % card.order.length;
  return '123456';
}
// Generic suites drive every card through core.answerCard. A ladder takes many calls, so a {ladder: mode} response
// plays the whole item (tests/lib/ladder.js) and returns the micro-card result shape.
const rawAnswerCard = core.answerCard;
core.answerCard = function (prog, ix, sess, response, seconds) {
  const card = core.currentCard(sess);
  if (card && card.type === 'ladder' && response && response.ladder) {
    const L = require('./ladder.js');
    return L.asAnswer(card, L.playLadder(prog, ix, sess, card, response.ladder, seconds).fin);
  }
  return rawAnswerCard.apply(core, arguments);
};
module.exports = { load, fresh, correctResponse, wrongResponse, DIR };
