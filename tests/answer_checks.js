'use strict';
// Answer checker suite (M3). Spec: docs/SPEC.md 3.4. Module: engine/answer.js.
const { suite } = require('./lib/check.js');
const A = require('../engine/answer.js');
const S = suite('answer_checks');
const { check, eq } = S;

const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const ex = (value, vars, extra) => Object.assign({ kind: 'expression', value, vars }, extra || {});
const ev = (src, vars, env) => {
  const r = A.parseExpr(src, vars || []);
  if (r.error) throw new Error(r.error);
  return A.evalExpr(r.ast, env || {});
};
const isErr = (src, vars) => typeof A.parseExpr(src, vars || []).error === 'string';
const okCase = (label, spec, typed) => {
  const r = A.check(spec, typed);
  check(label, r.ok === true && r.attempt === true, r);
};
const noCase = (label, spec, typed) => {
  const r = A.check(spec, typed);
  check(label, r.ok === false && r.attempt === true, r);
};
const parseFail = (label, spec, typed) => {
  const r = A.check(spec, typed);
  check(label, r.ok === false && r.attempt === false && typeof r.error === 'string', r);
};

// ---- 1. parser values and precedence
const values = [
  ['2+3*4', [], {}, 14], ['(2+3)*4', [], {}, 20], ['2^3^2', [], {}, 512],
  ['-x^2', ['x'], { x: 2 }, -4], ['(-x)^2', ['x'], { x: 2 }, 4],
  ['-2*3', [], {}, -6], ['2*-3', [], {}, -6], ['1-2-3', [], {}, -4],
  ['8/4/2', [], {}, 1], ['x^-1', ['x'], { x: 4 }, 0.25], ['2x^2', ['x'], { x: 3 }, 18],
  ['1/2x', ['x'], { x: 4 }, 2], ['2(3)', [], {}, 6], ['x(x+1)', ['x'], { x: 2 }, 6],
  ['xy', ['x', 'y'], { x: 2, y: 3 }, 6], ['xe', ['x'], { x: 2 }, 2 * Math.E],
  ['2pi', [], {}, 2 * Math.PI], ['pi/4', [], {}, Math.PI / 4], ['e^1', [], {}, Math.E], ['e', [], {}, Math.E],
  ['sin(0)', [], {}, 0], ['cos(0)', [], {}, 1], ['tan(0)', [], {}, 0],
  ['asin(1)', [], {}, Math.PI / 2], ['acos(1)', [], {}, 0], ['atan(1)*4', [], {}, Math.PI],
  ['sinh(0)', [], {}, 0], ['cosh(0)', [], {}, 1], ['tanh(0)', [], {}, 0],
  ['exp(1)', [], {}, Math.E], ['ln(e)', [], {}, 1], ['log(1000)', [], {}, 3],
  ['sqrt(16)', [], {}, 4], ['abs(-3)', [], {}, 3], ['sin(x)^2', ['x'], { x: 0 }, 0],
  ['sqrt(1-x^2)', ['x'], { x: 0.6 }, 0.8], ['2sin(0)+3', [], {}, 3],
  ['x^2+2x+1', ['x'], { x: 1 }, 4], ['-(2+3)', [], {}, -5], ['+3', [], {}, 3],
  ['3 - -2', [], {}, 5], ['2^-1', [], {}, 0.5], ['2^-x', ['x'], { x: 1 }, 0.5],
  ['2x+y', ['x', 'y'], { x: 1, y: 1 }, 3], ['theta*2', ['theta'], { theta: 1.5 }, 3],
  ['sqrt(2)*sqrt(2)', [], {}, 2], ['x*x*x', ['x'], { x: 2 }, 8], ['-x*2', ['x'], { x: 3 }, -6],
  ['2*x^3', ['x'], { x: 2 }, 16], ['(1+x)^-2', ['x'], { x: 1 }, 0.25], ['1/x', ['x'], { x: 8 }, 0.125]
];
values.forEach(([src, vars, env, want]) => {
  let got;
  try { got = ev(src, vars, env); } catch (e) { got = e.message; }
  check('value ' + src, typeof got === 'number' && near(got, want), { got, want });
});
eq('div by zero is Infinity not an error', ev('1/0'), Infinity);
eq('ln of negative is NaN', Number.isNaN(ev('ln(x)', ['x'], { x: -1 })), true);
eq('unknown identifier at eval throws', (() => { try { ev('y', ['y'], {}); return 'no'; } catch (e) { return 'threw'; } })(), 'threw');

// ---- 2. parse errors return {error}, never throw
const badParse = [
  ['', []], ['   ', []], ['2+', []], ['(1+2', []], ['1+2)', []], ['()', []], ['2***3', []],
  ['*2', []], ['3,000', []], ['1 2', []], ['1e5', []], ['1E+3', []], ['2 3', []], ['y', []],
  ['x', []], ['sin x', []], ['sin', []], ['2x', []], ['ab', []], ['x y', ['x']], ['1/', []],
  ['#', []], ['x^', ['x']], ['sqrt()', []], ['.', []], ['2..3', []], ['x+z', ['x']], ['xy', ['x']],
  ['2x+', ['x']], ['(x', ['x']], ['x)', ['x']]
];
badParse.forEach(([src, vars]) => {
  check('parse error: ' + JSON.stringify(src), isErr(src, vars), A.parseExpr(src, vars));
});
eq('parse ok returns ast not error', typeof A.parseExpr('x+1', ['x']).ast, 'object');

// ---- 3. toLatex
const tex = (src, vars) => A.toLatex(A.parseExpr(src, vars || []).ast);
eq('tex power', tex('x^2+1', ['x']), '{x}^{2} + 1');
eq('tex neg power', tex('-x^2', ['x']), '-{x}^{2}');
eq('tex fraction', tex('1/(x-1)', ['x']), '\\frac{1}{x - 1}');
eq('tex sqrt', tex('sqrt(1-x^2)', ['x']), '\\sqrt{1 - {x}^{2}}');
eq('tex implicit mult uses cdot', tex('2x', ['x']), '2 \\cdot x');
eq('tex sin', tex('sin(x)', ['x']), '\\sin\\left(x\\right)');
eq('tex pi/4', tex('pi/4'), '\\frac{\\pi}{4}');
eq('tex abs', tex('abs(x)', ['x']), '\\left|x\\right|');
eq('tex log base 10', tex('log(x)', ['x']), '\\log_{10}\\left(x\\right)');
eq('tex nested minus', tex('a-(b-c)', ['a', 'b', 'c']), 'a - (b - c)');
eq('tex multi-letter var', tex('theta', ['theta']), '\\mathrm{theta}');
eq('tex accepts wrapped ast', A.toLatex(A.parseExpr('x', ['x'])), 'x');
[['e^x', ['x']], ['asin(x)', ['x']], ['exp(x*y)', ['x', 'y']], ['cosh(x)/2', ['x']], ['x^(1/2)', ['x']]]
  .forEach(([s, v]) => check('tex string ' + s, typeof tex(s, v) === 'string' && !tex(s, v).includes('undefined'), tex(s, v)));

// ---- 4. numeric: literals and form rules
okCase('numeric 0.5 vs 1/2 (float target)', { kind: 'numeric', value: 0.5, form: 'exact' }, '1/2');
okCase('numeric 1/2 vs 0.5 (rational target)', { kind: 'numeric', value: '1/2', form: 'exact' }, '0.5');
noCase('numeric 1/2 vs 2/3', { kind: 'numeric', value: '1/2', form: 'exact' }, '2/3');
okCase('numeric exact accepts unreduced 2/4', { kind: 'numeric', value: '1/2', form: 'exact' }, '2/4');
okCase('numeric exact 4/6 vs 2/3', { kind: 'numeric', value: '2/3', form: 'exact' }, '4/6');
okCase('numeric fraction 1/2 accepts 1/2', { kind: 'numeric', value: '1/2', form: 'fraction' }, '1/2');
noCase('numeric fraction rejects 2/4 (not lowest terms)', { kind: 'numeric', value: '1/2', form: 'fraction' }, '2/4');
noCase('numeric fraction rejects 0.5 (not fraction form)', { kind: 'numeric', value: '1/2', form: 'fraction' }, '0.5');
okCase('numeric fraction accepts integer 3', { kind: 'numeric', value: 3, form: 'fraction' }, '3');
noCase('numeric fraction rejects JS 0.5', { kind: 'numeric', value: '1/2', form: 'fraction' }, 0.5);
okCase('numeric fraction accepts JS integer 2', { kind: 'numeric', value: 2, form: 'fraction' }, 2);
okCase('numeric -3 vs -3', { kind: 'numeric', value: -3, form: 'exact' }, '-3');
okCase('numeric -3 vs -6/2', { kind: 'numeric', value: -3, form: 'exact' }, '-6/2');
okCase('numeric 1/4 vs 0.25', { kind: 'numeric', value: '1/4', form: 'exact' }, '0.25');
okCase('numeric whitespace stripped', { kind: 'numeric', value: 7 }, '  7  ');
okCase('numeric 0.5 vs JS number 0.5 typed', { kind: 'numeric', value: 0.5 }, 0.5);
noCase('numeric 2 vs 3', { kind: 'numeric', value: 2 }, '3');
noCase('numeric 1/2 vs 1/3', { kind: 'numeric', value: '1/2', form: 'exact' }, '1/3');
okCase('numeric decimal tol accepts 1/3 vs 0.333333333', { kind: 'numeric', value: '1/3', form: 'decimal', tol: 1e-9 }, '0.333333333');
okCase('numeric decimal tol 1e-6 accepts 1/3 vs 0.333333333', { kind: 'numeric', value: 0.333333333, form: 'decimal', tol: 1e-6 }, '1/3');
noCase('numeric decimal tol 1e-6 rejects 1/3 vs 0.333', { kind: 'numeric', value: 0.333, form: 'decimal', tol: 1e-6 }, '1/3');
okCase('numeric decimal rel accepts 101 vs 100 at 1pc', { kind: 'numeric', value: 100, form: 'decimal', rel: 0.01 }, '101');
noCase('numeric decimal rel rejects 101 vs 100 at 0.1pc', { kind: 'numeric', value: 100, form: 'decimal', rel: 0.001 }, '101');
noCase('numeric decimal without tol rejects 2.0001', { kind: 'numeric', value: 2, form: 'decimal' }, '2.0001');
okCase('numeric decimal sqrt(0.25) vs 1/2', { kind: 'numeric', value: '1/2', form: 'decimal' }, 'sqrt(0.25)');

// ---- 5. numeric: expression typed (sqrt(2), pi/4)
okCase('numeric sqrt(2) vs 1.41421356237 at decimal tol 1e-9', { kind: 'numeric', value: 1.41421356237, form: 'decimal', tol: 1e-9 }, 'sqrt(2)');
noCase('numeric sqrt(2) vs 1.4142 at decimal (too far)', { kind: 'numeric', value: 1.4142, form: 'decimal' }, 'sqrt(2)');
noCase('numeric sqrt(2) vs 1.41421356237 exact form needs literal', { kind: 'numeric', value: '1.41421356237', form: 'exact' }, 'sqrt(2)');
noCase('numeric sqrt(4)/2 vs 1/2 form exact needs literal', { kind: 'numeric', value: '1/2', form: 'exact' }, 'sqrt(4)/4');
noCase('numeric fraction form needs literal for pi/4', { kind: 'numeric', value: '1/4', form: 'fraction' }, 'pi/4');
okCase('numeric pi/4 vs pi/4 float decimal tol 1e-9', { kind: 'numeric', value: Math.PI / 4, form: 'decimal', tol: 1e-9 }, 'pi/4');
noCase('numeric pi/4 vs 0.8', { kind: 'numeric', value: 0.8, form: 'decimal', tol: 1e-9 }, 'pi/4');
okCase('numeric 2pi expression float target', { kind: 'numeric', value: 2 * Math.PI, form: 'decimal', tol: 1e-9 }, '2pi');
noCase('numeric expression float-form target with wrong value', { kind: 'numeric', value: 3, form: 'decimal' }, 'sqrt(2)+1');
okCase('numeric expression pi-based integer-valued 2*pi/pi', { kind: 'numeric', value: 2, form: 'decimal' }, '2*pi/pi');

// ---- 6. numeric: parse errors (attempt:false)
parseFail('numeric "1 2" unparsable', { kind: 'numeric', value: '12' }, '1 2');
parseFail('numeric "3,000" unparsable', { kind: 'numeric', value: 3000 }, '3,000');
okCase('numeric "1e5" is a scientific literal (typed numeric answers only)', { kind: 'numeric', value: 100000, form: 'exact' }, '1e5');
parseFail('numeric empty unparsable', { kind: 'numeric', value: 1 }, '');
parseFail('numeric whitespace-only unparsable', { kind: 'numeric', value: 1 }, '   ');
parseFail('numeric undeclared letter unparsable', { kind: 'numeric', value: 1 }, 'x');
parseFail('numeric sqrt(-1) not finite', { kind: 'numeric', value: 1, form: 'decimal' }, 'sqrt(-1)');
parseFail('numeric 1/0 unparsable', { kind: 'numeric', value: 1, form: 'decimal' }, '1/0');
parseFail('numeric bad trailing op', { kind: 'numeric', value: 1 }, '2+');
parseFail('numeric null typed', { kind: 'numeric', value: 1 }, null);
parseFail('numeric undefined typed', { kind: 'numeric', value: 1 }, undefined);
parseFail('numeric JS NaN typed', { kind: 'numeric', value: 1 }, NaN);
parseFail('numeric "1/0" literal form', { kind: 'numeric', value: '1/2' }, '1/0');
noCase('numeric bad value still checks typed as wrong', { kind: 'numeric', value: '1/2' }, '1/3');
check('numeric bad form is bad-spec attempt:false',
  A.check({ kind: 'numeric', value: 1, form: 'nope' }, '1').attempt === false);
check('numeric bad target is bad-spec attempt:false',
  A.check({ kind: 'numeric', value: 'abc' }, '1').error === 'bad-spec');
eq('numeric parsed is canonical literal', A.check({ kind: 'numeric', value: '1/2' }, '2/4').parsed, '1/2');
eq('numeric parsed shows expression', A.check({ kind: 'numeric', value: 1.41421356237, form: 'decimal', tol: 1e-9 }, 'sqrt(2)').parsed, 'sqrt(2)');

// ---- 7. expression: adversarial pairs from SPEC
okCase('sin^2+cos^2 equals 1', ex('sin(x)^2+cos(x)^2', ['x']), '1');
okCase('(x^2-1)/(x-1) equals x+1 excluding 1 (domain 1.2..2.7)', ex('(x^2-1)/(x-1)', ['x'], { domain: { x: [1.2, 2.7] } }), 'x+1');
okCase('(x^2-1)/(x-1) equals x+1 on 0.3..0.9', ex('(x^2-1)/(x-1)', ['x'], { domain: { x: [0.3, 0.9] } }), 'x+1');
noCase('(x^2-1)/(x-1) vs x+2 unequal', ex('(x^2-1)/(x-1)', ['x'], { domain: { x: [1.2, 2.7] } }), 'x+2');
okCase('ln(x^2) equals 2ln(x) on positive domain', ex('ln(x^2)', ['x'], { domain: { x: [0.3, 2.7] } }), '2ln(x)');
noCase('ln(x^2) vs 2ln(x) on negative domain: wrong answer, counted', ex('ln(x^2)', ['x'], { domain: { x: [-2, -0.3] } }), '2ln(x)');
eq('ln negative domain: typed side undefined is wrong, counted', [A.check(ex('ln(x^2)', ['x'], { domain: { x: [-2, -0.3] } }), '2ln(x)').ok, A.check(ex('ln(x^2)', ['x'], { domain: { x: [-2, -0.3] } }), '2ln(x)').attempt, A.check(ex('ln(x^2)', ['x'], { domain: { x: [-2, -0.3] } }), '2ln(x)').error], [false, true, 'no-valid-points']);
okCase('x^2 equals x*x', ex('x^2', ['x']), 'x*x');
okCase('2x equals x+x', ex('2x', ['x']), 'x+x');
okCase('e^x equals exp(x)', ex('e^x', ['x']), 'exp(x)');
okCase('sqrt(x^2) equals x on positive domain', ex('sqrt(x^2)', ['x'], { domain: { x: [0.3, 2.7] } }), 'x');
noCase('sqrt(x^2) vs x on signed domain -2..2 unequal', ex('sqrt(x^2)', ['x'], { domain: { x: [-2, 2] } }), 'x');
noCase('sqrt(x^2) vs x on negative domain unequal', ex('sqrt(x^2)', ['x'], { domain: { x: [-2, -0.3] } }), 'x');
okCase('1/x equals x^-1', ex('1/x', ['x']), 'x^-1');
noCase('-x^2 vs (-x)^2 unequal', ex('-x^2', ['x']), '(-x)^2');
noCase('x^3 vs x^2 unequal', ex('x^3', ['x']), 'x^2');
okCase('1/(x-1) equals itself with default domain (1 never sampled)', ex('1/(x-1)', ['x']), '1/(x-1)');
parseFail('1/(x-1) on degenerate domain [1,1]: no valid points', ex('1/(x-1)', ['x'], { domain: { x: [1, 1] } }), '1/(x-1)');
okCase('2pi equals 6.283185307179586', ex('2pi', []), '6.283185307179586');
noCase('2pi vs 6.28 unequal', ex('2pi', []), '6.28');
okCase('sqrt(2)*sqrt(2) equals 2 (no vars)', ex('sqrt(2)*sqrt(2)', []), '2');
okCase('1/3 equals 0.3333333333333333 (no vars)', ex('1/3', []), '0.3333333333333333');
okCase('pi equals pi', ex('pi', []), 'pi');
noCase('pi vs e unequal', ex('pi', []), 'e');

// ---- 8. expression: identities and rewrites
okCase('x^2+1 equals 1+x^2', ex('x^2+1', ['x']), '1+x^2');
okCase('x^2+1 equals x*x+1', ex('x^2+1', ['x']), 'x*x+1');
okCase('x^2+1 equals x^2+1+0*x', ex('x^2+1', ['x']), 'x^2+1+0*x');
noCase('x^2+1 vs x^2-1', ex('x^2+1', ['x']), 'x^2-1');
okCase('sin(2x) equals 2sin(x)cos(x)', ex('sin(2x)', ['x']), '2sin(x)cos(x)');
okCase('cos(2x) equals cos^2-sin^2', ex('cos(2x)', ['x']), 'cos(x)^2-sin(x)^2');
okCase('cos(2x) equals 1-2sin^2', ex('cos(2x)', ['x']), '1-2sin(x)^2');
okCase('exp(x+y) equals exp(x)exp(y)', ex('exp(x+y)', ['x', 'y']), 'exp(x)exp(y)');
okCase('xy equals yx', ex('xy', ['x', 'y']), 'yx');
noCase('xy vs x+y', ex('xy', ['x', 'y']), 'x+y');
okCase('x*y equals xy', ex('x*y', ['x', 'y']), 'xy');
okCase('ln(xy) equals ln(x)+ln(y)', ex('ln(x*y)', ['x', 'y']), 'ln(x)+ln(y)');
okCase('sqrt(x) equals x^(1/2)', ex('sqrt(x)', ['x']), 'x^(1/2)');
okCase('abs(x) equals sqrt(x^2) on signed domain', ex('abs(x)', ['x'], { domain: { x: [-2, 2] } }), 'sqrt(x^2)');
noCase('abs(x) vs x on signed domain unequal', ex('abs(x)', ['x'], { domain: { x: [-2, 2] } }), 'x');
okCase('x equals (x^2)/x', ex('x', ['x']), '(x^2)/x');
okCase('2^x equals e^(x*ln(2))', ex('2^x', ['x']), 'e^(x*ln(2))');
okCase('log10(x) equals ln(x)/ln(10)', ex('log(x)', ['x'], { domain: { x: [0.3, 2.7] } }), 'ln(x)/ln(10)');
noCase('log10(x) vs ln(x) unequal', ex('log(x)', ['x'], { domain: { x: [0.3, 2.7] } }), 'ln(x)');
okCase('tan(x) equals sin/cos', ex('tan(x)', ['x'], { domain: { x: [0.3, 1.2] } }), 'sin(x)/cos(x)');
okCase('sinh(x) equals (e^x-e^-x)/2', ex('sinh(x)', ['x']), '(e^x-e^(-x))/2');
okCase('x^2+x^2 equals 2x^2', ex('2x^2', ['x']), '2*x^2');
okCase('multi-var x*y+1 equals y*x+1', ex('x*y+1', ['x', 'y']), 'y*x+1');
noCase('multi-var x*y+1 vs x*y-1', ex('x*y+1', ['x', 'y']), 'x*y-1');
noCase('expression x^2 vs x^3 on positive domain', ex('x^2', ['x'], { domain: { x: [0.3, 2.7] } }), 'x^3');

// ---- 9. expression: also, points, domain
okCase('also accepts alternative form', ex('x^2', ['x'], { also: ['x*x'] }), 'x*x');
okCase('also accepts second accepted form', ex('x^2', ['x'], { also: ['x^2+x-x'] }), 'x^2+x-x');
noCase('also does not accept wrong form', ex('x^2', ['x'], { also: ['x^2+x'] }), 'x^3');
parseFail('also with parse error is bad-spec', ex('x', ['x'], { also: ['x+'] }), 'x');
check('also parse error reports bad-spec', A.check(ex('x', ['x'], { also: ['x+'] }), 'x').error === 'bad-spec');
okCase('points below 8 still uses 8 points', ex('x', ['x'], { points: 3 }), 'x');
noCase('points 30 still distinguishes x and x+1e-7', ex('x', ['x'], { points: 30 }), 'x+0.0000001');
okCase('domain as single interval array', ex('x^2', ['x'], { domain: [0.3, 2.7] }), 'x*x');
okCase('domain interval with extreme values', ex('x', ['x'], { domain: { x: [1e6, 1e6 + 1] } }), 'x');
parseFail('domain reversed is bad-spec', ex('x', ['x'], { domain: { x: [2, 1] } }), 'x');
parseFail('domain undeclared var is bad-spec', ex('x', ['x'], { domain: { y: [0, 1] } }), 'x');
parseFail('domain not an interval is bad-spec', ex('x', ['x'], { domain: { x: [0] } }), 'x');
check('domain reversed reports bad-spec', A.check(ex('x', ['x'], { domain: { x: [2, 1] } }), 'x').error === 'bad-spec');
parseFail('expression spec missing value', { kind: 'expression', vars: ['x'] }, 'x');
parseFail('expression spec value not string', { kind: 'expression', value: 5, vars: [] }, '5');
parseFail('expression spec empty value', ex('  ', ['x']), 'x');
parseFail('expression spec value parse error', ex('x+', ['x']), 'x');
parseFail('expression target NaN everywhere: too few points', ex('sqrt(x)', ['x'], { domain: { x: [-2, -1] } }), 'sqrt(x)');
check('expression target NaN reports too-few-points',
  A.check(ex('sqrt(x)', ['x'], { domain: { x: [-2, -1] } }), 'sqrt(x)').error === 'too-few-points');

// ---- 10. expression: typed parse errors (attempt:false) and mismatches (attempt:true)
parseFail('expression typed empty', ex('x', ['x']), '');
parseFail('expression typed whitespace', ex('x', ['x']), '   ');
parseFail('expression typed undeclared var', ex('x', ['x']), 'z');
parseFail('expression typed trailing op', ex('x', ['x']), 'x+');
parseFail('expression typed sin without parens', ex('sin(x)', ['x']), 'sin x');
parseFail('expression typed 2 3', ex('x', ['x']), '2 3');
parseFail('expression typed scientific', ex('x', ['x']), '1e3*x');
parseFail('expression typed non-string', ex('x', ['x']), 7);
parseFail('expression typed missing paren', ex('x', ['x']), '(x+1');
parseFail('expression typed comma number', ex('x', ['x']), '3,000*x');
okCase('expression typed with spaces parses', ex('x+1', ['x']), '  x + 1  ');
noCase('expression typed undefined is wrong not unparsable', ex('x+1', ['x']), 'x+2');
eq('expression parsed field is canonical', A.check(ex('x+1', ['x']), 'x + 1').parsed, '(x+1)');
eq('expression wrong answer attempt true', A.check(ex('x+1', ['x']), 'x+2').attempt, true);

// ---- 11. mcq
const mcq = { kind: 'mcq', correct: 2, options: ['a', 'b', 'c', 'd', 'e'] };
okCase('mcq index 2 correct', mcq, 2);
okCase('mcq string "2" correct', mcq, '2');
noCase('mcq index 3 wrong', mcq, 3);
noCase('mcq index 0 wrong', mcq, '0');
parseFail('mcq out-of-range is attempt:false', mcq, 7);
check('mcq out-of-range error code', A.check(mcq, 7).error === 'out-of-range');
parseFail('mcq letter unparsable', mcq, 'c');
parseFail('mcq negative unparsable', mcq, -1);
parseFail('mcq fraction unparsable', mcq, 1.5);
parseFail('mcq empty unparsable', mcq, '');
parseFail('mcq correct out of range is bad-spec', { kind: 'mcq', correct: 9, options: ['a', 'b'] }, 1);
okCase('mcq without options accepts index', { kind: 'mcq', correct: 1 }, 1);
noCase('mcq without options wrong index', { kind: 'mcq', correct: 1 }, 0);
eq('mcq parsed is index string', A.check(mcq, 3).parsed, '3');

// ---- 12. multi: set equality, no partial credit
const multi = { kind: 'multi', correct: [0, 2], options: ['a', 'b', 'c', 'd'] };
okCase('multi [0,2] correct', multi, [0, 2]);
okCase('multi order variance ["2","0"]', multi, ['2', '0']);
okCase('multi order variance [2,0]', multi, [2, 0]);
okCase('multi comma string "0,2"', multi, '0,2');
okCase('multi space string "2 0"', multi, '2 0');
okCase('multi duplicates collapse [0,0,2]', multi, [0, 0, 2]);
noCase('multi partial [0] no credit', multi, [0]);
noCase('multi superset [0,2,3] no credit', multi, [0, 2, 3]);
noCase('multi empty set no credit', multi, []);
noCase('multi empty string no credit', multi, '');
noCase('multi wrong [1,3]', multi, [1, 3]);
noCase('multi partial [0,1,2] no credit', multi, [0, 1, 2]);
parseFail('multi out-of-range is attempt:false', multi, [0, 4]);
parseFail('multi letters unparsable', multi, ['a']);
parseFail('multi object unparsable', multi, { 0: 1 });
parseFail('multi number unparsable', multi, 2);
parseFail('multi bad correct is bad-spec', { kind: 'multi', correct: 'x' }, [0]);
parseFail('multi correct out of options is bad-spec', { kind: 'multi', correct: [9], options: ['a'] }, [0]);
okCase('multi without options accepts any index', { kind: 'multi', correct: [3] }, ['3']);

// ---- 13. unknown kind, bad spec, determinism
parseFail('unsupported kind self', { kind: 'self', rubric: [] }, 'x');
parseFail('null spec', null, 'x');
parseFail('spec without kind', { value: 1 }, '1');
const twice = [ex('sqrt(x^2)', ['x'], { domain: { x: [-2, 2] } }), 'x'];
eq('same spec and input give same result twice', A.check(...twice), A.check(...twice));
eq('same spec gives same parsed text', A.check(ex('x+1', ['x']), 'x+1').parsed, A.check(ex('x+1', ['x']), 'x+1').parsed);


// ---- review additions (M2/M3 review)
okCase('exact rational: (1/2) in parens', { kind: 'numeric', value: '1/2' }, '(1/2)');
okCase('exact rational: 1/3+1/6', { kind: 'numeric', value: '1/2' }, '1/3+1/6');
okCase('exact rational: -(1/2)', { kind: 'numeric', value: '-1/2' }, '-(1/2)');
noCase('exact rational: 333/1000 is not 1/3', { kind: 'numeric', value: '1/3' }, '(333/1000)');
noCase('exact rational: sqrt(4) still needs literal', { kind: 'numeric', value: '2' }, 'sqrt(4)');
okCase('unicode minus and times', ex('x-2*y', ['x', 'y']), 'x\u2212 2\u00d7y');
okCase('pi as the greek letter', { kind: 'numeric', value: 3.141592653589793, form: 'decimal', tol: 1e-9 }, '\u03c0');
okCase('** as power', ex('x^2', ['x']), 'x**2');
check('x2 is rejected, not x*2', isErr('x2', ['x']));
check('(x+1)2 is rejected', isErr('(x+1)2', ['x']));
check('2x still works', !isErr('2x', ['x']));
check('2(3) still works', ev('2(3)') === 6);
check('2e-1 is a parse error, not 0.2', isErr('2e-1'));
okCase('mcq string correct', { kind: 'mcq', options: ['a', 'b', 'c'], correct: '2' }, 2);
okCase('multi string correct', { kind: 'multi', options: ['a', 'b', 'c'], correct: ['0', '2'] }, [2, 0]);
noCase('typed side NaN almost everywhere is a wrong answer', ex('ln(x)', ['x']), 'ln(1-x)');

// ---- 14. physics variables (multi-letter names, e as a variable), rel, scientific literals, magnitudes
okCase('e declared as a variable: e^2 equals e*e', ex('e^2', ['e']), 'e*e');
okCase('e not declared: e is Euler number', ex('e', ['x']), '2.718281828459045');
check('e declared as a variable: value is the variable, not 2.718', (() => {
  const r = A.parseExpr('e', ['e']); return r.ast && r.ast.type === 'var' && r.ast.name === 'e';
})());
check('e not declared: parses as the constant', (() => {
  const r = A.parseExpr('e', ['x']); return r.ast && r.ast.type === 'const' && r.ast.name === 'e';
})());
okCase('hbar*omega matches omega*hbar', ex('hbar*omega', ['hbar', 'omega']), 'omega*hbar');
noCase('hbar*omega rejects 2*hbar*omega', ex('hbar*omega', ['hbar', 'omega']), '2*hbar*omega');
okCase('1/(4*pi*eps0)*q/r^2 matches q/(4*pi*eps0*r^2)', ex('1/(4*pi*eps0)*q/r^2', ['eps0', 'q', 'r']), 'q/(4*pi*eps0*r^2)');
noCase('1/(4*pi*eps0)*q/r^2 rejects q/(2*pi*eps0*r^2)', ex('1/(4*pi*eps0)*q/r^2', ['eps0', 'q', 'r']), 'q/(2*pi*eps0*r^2)');
okCase('underscore name declared as a variable: k_B*T', ex('k_B*T', ['k_B', 'T']), 'T*k_B');
parseFail('undeclared underscore name is unparsable', ex('k*T', ['k', 'T']), 'k_B*T');
okCase('omega as a variable with a multi-letter name and implicit 2omega', ex('omega*2', ['omega']), '2omega');
noCase('tiny magnitude: 1.05e-34*omega rejects 2.1e-34*omega (no absolute floor)', ex('1.05*10^-34*omega', ['omega']), '2.1*10^-34*omega');
okCase('tiny magnitude: 1.05e-34*omega accepts the same value', ex('1.05*10^-34*omega', ['omega']), '1.05*10^-34*omega');
noCase('tiny literal: target 1e-20 is not 0', { kind: 'numeric', value: 1e-20, form: 'decimal', tol: 0 }, '0');
noCase('tiny literal: target 1.6e-19 is not 1.5e-19 (exact form, float target)', { kind: 'numeric', value: 1.6e-19, form: 'exact' }, '1.5e-19');
okCase('negative exponent: 2^-1 equals 1/2', ex('2^-1', ['x']), '1/2');
okCase('fractional exponent: x^(1/2) equals sqrt(x)', ex('x^(1/2)', ['x']), 'sqrt(x)');
okCase('exp(-x) equals 1/exp(x)', ex('exp(-x)', ['x']), '1/exp(x)');
okCase('pi constant in a multi-letter product', ex('2*pi*f', ['f']), '2*\u03c0*f');

// numeric rel: tolerance max(tol, rel*|value|). Applies to decimal and float targets; exact rationals compare exactly.
okCase('rel 0.05: 3.14e8 is within 5% of 3.0e8 (exact form, float target)', { kind: 'numeric', value: 3.0e8, form: 'exact', rel: 0.05 }, '3.14e8');
okCase('rel 0.05: 3.14e8 is within 5% of 3.0e8 (decimal)', { kind: 'numeric', value: 3.0e8, form: 'decimal', rel: 0.05 }, '3.14e8');
noCase('rel 0.02: 3.14e8 is outside 2% of 3.0e8 (decimal)', { kind: 'numeric', value: 3.0e8, form: 'decimal', rel: 0.02 }, '3.14e8');
noCase('rel 0.02: 3.14e8 is outside 2% of 3.0e8 (exact form, float target)', { kind: 'numeric', value: 3.0e8, form: 'exact', rel: 0.02 }, '3.14e8');
okCase('rel applies to typed expressions too (decimal, pi-based typed)', { kind: 'numeric', value: 3.0e8, form: 'decimal', rel: 0.05 }, '3.14*10^8');
noCase('rel with exact rational target ignores rel (exact compare)', { kind: 'numeric', value: '3/1', form: 'exact', rel: 0.5 }, '3.1');

// scientific literals: typed numeric answers only
okCase('sci literal 3e8 equals 300000000 (exact)', { kind: 'numeric', value: 300000000, form: 'exact' }, '3e8');
okCase('sci literal 1.6e-19 equals 1.6e-19 (decimal)', { kind: 'numeric', value: '1.6e-19', form: 'decimal', tol: 0 }, '1.6e-19');
okCase('sci literal 1.6E-19 uppercase E', { kind: 'numeric', value: '1.6e-19', form: 'decimal', tol: 0 }, '1.6E-19');
okCase('sci literal -2.5e3 equals -2500', { kind: 'numeric', value: -2500, form: 'exact' }, '-2.5e3');
noCase('sci literal 1.6e-19 is not 1.7e-19', { kind: 'numeric', value: '1.6e-19', form: 'decimal', tol: 0 }, '1.7e-19');
check('parseNumber reads 3e8 as an integer literal', (() => { const n = A.parseNumber('3e8'); return n && n.p === 300000000 && n.q === 1 && n.isFrac === true; })());
check('parseNumber reads 1.6e-19 as a float literal (no safe p/q)', (() => { const n = A.parseNumber('1.6e-19'); return n && n.v === 1.6e-19 && n.p === null; })());
check('parseNumber rejects a bare exponent', A.parseNumber('e5') === null && A.parseNumber('.e5') === null);
check('expression tokenizer still rejects 3e8 (2e-1 is ambiguous there)', isErr('3e8', []) && isErr('1.6e-19*x', ['x']));

// Exact-zero targets: cancellation noise must not fail a correct equivalent (relative-only tolerance has no scale at 0).
okCase('zero target: sin^2+cos^2-1 equals 0', ex('0', ['x']), 'sin(x)^2+cos(x)^2-1');
okCase('zero target: spec sin^2+cos^2-1 accepts typed 0', ex('sin(x)^2+cos(x)^2-1', ['x']), '0');
okCase('zero target: double-angle identity difference', ex('0', ['x']), 'sin(2*x)-2*sin(x)*cos(x)');
okCase('zero target: expanded (x+1)^5 difference', ex('0', ['x']), '(x+1)^5-(x^5+5*x^4+10*x^3+10*x^2+5*x+1)');
noCase('zero target: x is not 0', ex('0', ['x']), 'x');
noCase('zero target: 1e-6 offset is not 0', ex('0', ['x']), 'x*0+0.000001');
okCase('numeric zero target accepts cos(pi/2)', { kind: 'numeric', value: 0, form: 'decimal', tol: 0 }, 'cos(pi/2)');
okCase('numeric zero target accepts 0.1+0.2-0.3', { kind: 'numeric', value: 0, form: 'decimal', tol: 0 }, '0.1+0.2-0.3');
noCase('numeric zero target rejects 0.001', { kind: 'numeric', value: 0, form: 'decimal', tol: 0 }, '0.001');

// Variable spelling aliases: X_1 and X1 are the same declared variable (content audit).
okCase('alias: declared X1 accepts X_1', ex('X1^2+1', ['X1']), 'X_1^2+1');
okCase('alias: declared X_1 accepts X1', ex('X_1^2+1', ['X_1']), 'X1^2+1');
okCase('alias: declared X1 still accepts X1', ex('2*X1', ['X1']), '2X1');
okCase('alias: case preserved, two vars', ex('x_1+x_2', ['x1', 'x2']), 'x1+x_2');
check('alias: wrong case is not an alias', isErr('x_1', ['X1']));
check('alias: different index is not an alias', isErr('X_2', ['X1']));
check('alias: canon uses the declared spelling', A.canon(A.parseExpr('X_1+1', ['X1']).ast).indexOf('X1') >= 0);

S.done();
