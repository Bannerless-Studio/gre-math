'use strict';
// Validator negatives: each broken pack must produce an error that names the problem.
const { suite } = require('./lib/check.js');
const { load } = require('./lib/fixture.js');
const { validate, check } = require('../tools/validate_pack.js');
const S = suite('validate_checks');
const clone = (x) => JSON.parse(JSON.stringify(x));
const base = load();
const hasErr = (data, needle) => validate(data).some((e) => e.includes(needle));

S.eq('fixture is clean', validate(clone(base)), []);
{
  const d = clone(base); d.items[0].source = undefined; delete d.items[0].source;
  S.check('missing source is an error', hasErr(d, 'source.type'));
}
{
  const d = clone(base); d.items[1].id = d.items[0].id;
  S.check('duplicate item id is an error', hasErr(d, 'duplicate item id'));
}
{
  const d = clone(base); d.techniques[0].prereq = ['t1.quad'];
  S.check('prereq cycle is an error', hasErr(d, 'prereq cycle'));
}
{
  const d = clone(base); d.techniques[0].prereq = ['t2.trig-id'];
  S.check('prereq at a later level is an error', hasErr(d, 'later level'));
}
{
  const d = clone(base); d.techniques[1].prereq = ['t9.nope'];
  S.check('unknown prereq is an error', hasErr(d, 'is not a technique'));
}
{
  const d = clone(base); const it = d.items.find((i) => i.answer.kind === 'numeric');
  it.answer.value = 'seven';
  S.check('non-numeric numeric answer is an error', hasErr(d, 'answer.value'));
}
{
  const d = clone(base); const it = d.items.find((i) => i.answer.kind === 'numeric');
  it.answer.value = '3/0';
  S.check('zero denominator answer is an error', hasErr(d, 'answer.value'));
}
{
  const d = clone(base); const it = d.items.find((i) => i.answer.kind === 'mcq');
  it.answer.correct = 9;
  S.check('mcq correct out of range is an error', hasErr(d, 'answer.correct'));
}
{
  const d = clone(base); d.items[0].tags = ['nope.tech'];
  S.check('unknown tag is an error', hasErr(d, 'is not a technique'));
}
{
  const d = clone(base); d.items[0].difficulty = 9;
  S.check('difficulty out of range is an error', hasErr(d, 'difficulty'));
}
{
  const d = clone(base); d.items[0].level = 'T2';
  S.check('item level must match primary tag level', hasErr(d, 'differs from primary tag level'));
}
{
  const d = clone(base); const tech = d.items.find((i) => i.tier === 'b').tags[0];
  d.items = d.items.filter((i) => !(i.tags[0] === tech && i.tier === 'b'));
  S.check('technique with items but no tier b is an error', hasErr(d, 'no tier b'), tech);
}
{
  const d = clone(base); d.techniques[2].teach = '';
  S.check('empty teach card is an error', hasErr(d, 'teach is required'));
}
{
  const d = clone(base); d.items[0].critical = ['t1.quad'];
  S.check('critical must name a secondary tag', hasErr(d, 'must be a secondary tag'));
}
{
  const d = clone(base); d.pack.levels.push({ id: 'T1', label: 'again' });
  S.check('duplicate level id is an error', hasErr(d, 'duplicate level id'));
}
{
  const d = clone(base); d.pack.gate = 1.5;
  S.check('gate above 1 is an error', hasErr(d, 'gate'));
}
{
  const d = clone(base); d.items[0].answer = { kind: 'telepathy' };
  S.check('unknown answer kind is an error', hasErr(d, 'answer.kind'));
}
{
  const d = clone(base); d.items[0].prompt = 'Solve $\\frac{a$.';
  S.check('bad LaTeX in a prompt is a LaTeX error', hasErr(d, 'LaTeX error in $\\frac{a$'), validate(d));
}
{
  const d = clone(base); d.items[0].solution = 'Use $\\mathfrak{g}$ here.';
  S.check('glyph outside the core subset is an error', hasErr(d, 'outside the core subset') && hasErr(d, 'KaTeX_Fraktur'), validate(d));
}
{
  const d = clone(base); d.items[0].answer = { kind: 'mcq', options: ['$\\frac{1$', 'b'], correct: 1 };
  S.check('bad LaTeX in an option is a LaTeX error', hasErr(d, 'options[0]'), validate(d));
}
{
  const d = clone(base); d.items[0].solution = 'a\fb';
  S.check('control character from a misread escape is an error', hasErr(d, 'control character'), validate(d));
}
{
  const d = clone(base); d.techniques[0].teach = 'Use $\\neq$ carefully.';
  S.check('valid LaTeX in a teach card is clean', validate(d).length === 0, validate(d));
}
{
  const d = clone(base);
  d.items.filter((i) => i.tags[0] === 't1.lin-eq' && i.tier === 'b').forEach((i) => { i.answer = { kind: 'mcq', options: ['a', 'b'], correct: 0 }; delete i.stages; delete i.lesson; });
  S.check('technique with tier b mcq only (no numeric, expression or code) is an error', hasErr(d, 'no tier b numeric, expression or code'), validate(d));
}
{
  const d = clone(base); d.items[0].answer = { kind: 'self' };
  const w = check(d).warnings;
  S.check('unplayable answer kind is a warning, not an error', w.length === 1 && w[0].includes('cannot play yet') && w[0].includes(d.items[0].id + ' (self)') && !hasErr(d, 'cannot play'), w);
}
S.eq('fixture has no warnings', check(clone(base)).warnings, []);
{
  const numIdx = base.items.findIndex((it) => it.answer.kind === 'numeric');
  const withRel = (rel) => { const d = clone(base); d.items[numIdx].answer.rel = rel; return d; };
  S.check('numeric item found in fixture', numIdx >= 0);
  S.eq('rel 0.05 is accepted', validate(withRel(0.05)), []);
  S.eq('rel 0 is accepted', validate(withRel(0)), []);
  S.eq('rel 0.1 is accepted (upper bound)', validate(withRel(0.1)), []);
  S.check('rel 0.2 is an error', hasErr(withRel(0.2), 'answer.rel'));
  S.check('negative rel is an error', hasErr(withRel(-0.01), 'answer.rel'));
  S.check('string rel is an error', hasErr(withRel('0.05'), 'answer.rel'));
  const sci = clone(base); sci.items[numIdx].answer = { kind: 'numeric', value: '1.6e-19', form: 'decimal', tol: 0 };
  S.eq('scientific string value is accepted', validate(sci), []);
  const sciBad = clone(base); sciBad.items[numIdx].answer = { kind: 'numeric', value: '1.6e', form: 'decimal' };
  S.check('malformed scientific value is an error', hasErr(sciBad, 'answer.value'));
}
{
  const FIG = '<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10"/></svg>';
  const good = clone(base); good.items[0].figure = FIG; good.techniques[0].figure = FIG;
  S.eq('valid figures on an item and a technique are accepted', validate(good), []);
  const badItem = clone(base); badItem.items[0].figure = '<svg viewBox="0 0 1 1"><script>x</script></svg>';
  S.check('script figure on an item is an error', hasErr(badItem, 'figure'));
  const badTech = clone(base); badTech.techniques[0].figure = '<svg viewBox="0 0 1 1" onload="x"><rect/></svg>';
  S.check('onload figure on a technique is an error', hasErr(badTech, 'figure'));
}
{
  // code answers (docs/SPEC.md 3.4)
  const codeIdx = base.items.findIndex((i) => i.answer.kind === 'code');
  const mut = (fn) => { const d = clone(base); fn(d.items[codeIdx].answer, d.items[codeIdx]); return d; };
  S.check('fixture has a code item', codeIdx >= 0);
  S.check('code: missing tests is an error', hasErr(mut((a) => { delete a.tests; }), 'at least 3 tests'));
  S.check('code: two tests is an error', hasErr(mut((a) => { a.tests = a.tests.slice(0, 2); }), 'at least 3 tests'));
  S.check('code: test without expect is an error', hasErr(mut((a) => { a.tests[0] = { args: [1] }; }), 'tests[0]'));
  S.check('code: bad package is an error', hasErr(mut((a) => { a.packages = ['scipy']; }), 'answer.packages'));
  S.check('code: duplicate package is an error', hasErr(mut((a) => { a.packages = ['numpy', 'numpy']; }), 'answer.packages'));
  S.check('code: non-identifier entry is an error', hasErr(mut((a) => { a.entry = 'solve-it'; }), 'answer.entry'));
  S.check('code: keyword entry is an error', hasErr(mut((a) => { a.entry = 'class'; }), 'answer.entry'));
  S.check('code: missing starter is an error', hasErr(mut((a) => { delete a.starter; }), 'answer.starter'));
  S.check('code: starter without the entry def is an error', hasErr(mut((a) => { a.starter = 'x = 1'; }), 'must define'));
  S.check('code: wrong lang is an error', hasErr(mut((a) => { a.lang = 'ruby'; }), 'answer.lang'));
  S.check('code: bad tol is an error', hasErr(mut((a) => { a.tol = -1; }), 'answer.tol'));
  S.check('code: solution without a fenced block is an error', hasErr(mut((a, it) => { it.solution = 'Just do it.'; }), 'fenced block'));
  S.check('code: tier c is an error', hasErr(mut((a, it) => { it.tier = 'c'; it.type = 'full'; }), 'not allowed on tier c'));
  S.check('code: options are an error', hasErr(mut((a) => { a.options = ['a', 'b']; }), 'no options or value'));
  S.check('code: non-array args is an error', hasErr(mut((a) => { a.tests[0].args = 5; }), 'tests[0]'));
  S.check('code: expect undefined (key present) is an error', hasErr(mut((a) => { a.tests[0].expect = undefined; }), 'tests[0]'));
  S.check('code: setup importing os is an error', hasErr(mut((a) => { a.setup = 'import os, math\nX = 1'; }), 'imports os'));
  S.check('code: setup from subprocess import is an error', hasErr(mut((a) => { a.setup = 'from subprocess import run'; }), 'imports subprocess'));
  S.check('code: setup importing numpy and math is fine', !hasErr(mut((a) => { a.setup = 'import numpy as np\nfrom math import sqrt  # ok\n'; }), 'setup imports'));
  S.check('code: integer expect beyond 2^53 - 1 is an error', hasErr(mut((a) => { a.tests[0].expect = 2 ** 60; }), 'beyond 2^53'));
  S.check('code: integer arg beyond 2^53 - 1 is an error', hasErr(mut((a) => { a.tests[0].args = [[1, 2 ** 54]]; }), 'beyond 2^53'));
  S.check('code: big int as an exact digit tag in expect is fine', !hasErr(mut((a) => { a.tests[0].expect = { __i: '1152921504606846976' }; }), 'beyond 2^53'));
  S.check('code: package given as a URL is an error', hasErr(mut((a) => { a.packages = ['https://example.com/x.whl']; }), 'answer.packages'));
}
S.done();
