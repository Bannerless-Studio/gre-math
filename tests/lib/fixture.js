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
  const a = card.item.answer;
  if ((card.kind || card.type) === 'mcq') return card.order.indexOf(a.correct);
  return String(a.value);
}
function wrongResponse(card) {
  const a = card.item.answer;
  if ((card.kind || card.type) === 'mcq') return (card.order.indexOf(a.correct) + 1) % card.order.length;
  return '123456';
}
module.exports = { load, fresh, correctResponse, wrongResponse, DIR };
