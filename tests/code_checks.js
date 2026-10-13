'use strict';
// Code answers: checkCode equality (pure JS), the Python harness and tools/run_code_items.py (local CPython),
// text.js fenced blocks. Pyodide itself is proven in a browser (.cache/code/browser.js), not here.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { suite } = require('./lib/check.js');
const A = require('../engine/answer.js');
const T = require('../engine/text.js');
const core = require('../engine/core.js');
const S = suite('code_checks');
const ROOT = path.join(__dirname, '..');
const NODE = process.env.NODE || process.execPath;

const ok = (got, want, spec) => A.checkCode(Object.assign({ entry: 'f', tests: [{ args: [], expect: want }] }, spec || {}),
  { status: 'ok', results: [{ got }] }).ok;
S.check('int equals int', ok(3, 3));
S.check('int differs', !ok(3, 4));
S.check('float within default tol', ok(0.1 + 0.2, 0.3));
S.check('float outside tol', !ok(0.31, 0.3));
S.check('float within explicit tol', ok(3.14159, 3.14159265, { tol: 1e-5 }));
S.check('float outside explicit tol', !ok(3.14, 3.14159265, { tol: 1e-5 }));
S.check('tol is relative for large values', ok(1e9 + 1, 1e9, { tol: 1e-6 }));
S.check('nested lists compare elementwise with tol', ok([[1, 2.0000001], [3]], [[1, 2], [3]], { tol: 1e-6 }));
S.check('list order matters', !ok([2, 1], [1, 2]));
S.check('list length matters', !ok([1, 2], [1, 2, 3]));
S.check('dict key order does not matter', ok({ b: 2, a: 1 }, { a: 1, b: 2 }));
S.check('dict values use tol', ok({ a: 1.0000001 }, { a: 1 }, { tol: 1e-6 }));
S.check('dict extra key fails', !ok({ a: 1, b: 2 }, { a: 1 }));
S.check('dict missing key fails', !ok({ a: 1 }, { a: 1, b: 2 }));
S.check('numpy-converted list equals plain list', ok([1.5, 2.5], [1.5, 2.5]));
S.check('strings are exact', ok('abc', 'abc') && !ok('abc', 'abd') && !ok('abc', 'ABC'));
S.check('true is not 1', !ok(true, 1) && !ok(1, true));
S.check('false is not 0', !ok(false, 0) && !ok(0, false));
S.check('true equals true', ok(true, true));
S.check('None equals None only', ok(null, null) && !ok(0, null) && !ok(null, 0) && !ok('', null) && !ok([], null));
S.check('string is not number', !ok('3', 3) && !ok(3, '3'));
S.check('nan equals nan via tag', ok({ __f: 'nan' }, { __f: 'nan' }));
S.check('inf equals inf, not -inf', ok({ __f: 'inf' }, { __f: 'inf' }) && !ok({ __f: 'inf' }, { __f: '-inf' }));
S.check('nan is not a number', !ok({ __f: 'nan' }, 1) && !ok(1, { __f: 'nan' }));
// review 2026-10-13: grading soundness (false accepts first)
S.check('int 1 and float 1.0 are equal (JSON cannot tell them apart)', ok(1, 1) && ok([1, 2], [1.0, 2.0]));
S.check('integer expect, no tol: large integer result off by 500 is wrong', !ok(1e12 + 500, 1e12) && !ok(1e12 + 1, 1e12));
S.check('integer expect, no tol: fractional result must round to it', ok(3.0000000000000004, 3) && !ok(2.5, 3) && !ok(1e12 + 0.5, 1e12));
S.check('integer expect with explicit tol: tolerance applies', ok(101, 100, { tol: 0.02 }) && !ok(103, 100, { tol: 0.02 }));
S.check('integer exact rule reaches nested values', !ok([1e12 + 7], [1e12]) && !ok({ a: 1e12 + 7 }, { a: 1e12 }));
S.check('float expect near zero: absolute floor of tol', ok(1e-12, 0) && !ok(1e-6, 0));
S.check('negative zero equals zero', ok(-0, 0));
S.check('big int tag compares exact digits', ok({ __i: '9007199254740993' }, { __i: '9007199254740993' }) && !ok({ __i: '9007199254740993' }, { __i: '9007199254740992' }));
S.check('big int tag never equals a rounded JS number', !ok({ __i: '9007199254740993' }, 9007199254740992) && !ok(9007199254740992, { __i: '9007199254740993' }));
S.check('big int tag normalises leading zeros only', ok({ __i: '-0009007199254740993' }, { __i: '-9007199254740993' }) && !ok({ __i: '12x' }, { __i: '12x' }));
S.check('nan tag is not inf, inf is not a big finite number', !ok({ __f: 'nan' }, { __f: 'inf' }) && !ok(1e308, { __f: 'inf' }));
S.check('nan nested in a list', ok([1, { __f: 'nan' }], [1, { __f: 'nan' }]) && !ok([1, 2], [1, { __f: 'nan' }]));
S.check('strings: whitespace counts', !ok('a ', 'a') && !ok('a\n', 'a') && ok('a b', 'a b'));
S.check('null vs missing value vs empty', !ok(undefined, null) && !ok(null, []) && !ok({}, null) && ok([], []) && ok({}, {}));
S.check('list vs dict, dict vs list', !ok({ 0: 1 }, [1]) && !ok([1], { 0: 1 }));
S.check('tuple and list both arrive as lists: equal', ok([1, 2], [1, 2]));
S.check('bool inside lists stays strict', !ok([1, 0], [true, false]) && !ok([true], [1]));
S.check('DataFrame column order is ignored (dict of columns)', ok({ b: [3, 4], a: [1, 2] }, { a: [1, 2], b: [3, 4] }));
S.check('a dict with extra keys beside a tag is a plain dict', ok({ __f: 'nan', x: 1 }, { __f: 'nan', x: 1 }) && !ok({ __f: 'nan', x: 1 }, { __f: 'nan' }));
S.check('nested tolerance uses the spec tol at every depth', ok({ a: [[1.001]] }, { a: [[1]] }, { tol: 0.01 }) && !ok({ a: [[1.1]] }, { a: [[1]] }, { tol: 0.01 }));

const spec = { kind: 'code', lang: 'python', entry: 'f', tests: [{ args: [1], expect: 2 }, { args: [2], expect: 4 }, { args: [3], expect: 6 }] };
let r = A.checkCode(spec, { status: 'ok', results: [{ got: 2 }, { got: 4 }, { got: 6 }], stdout: '' });
S.check('all pass: ok and attempt', r.ok === true && r.attempt === true && r.parsed === '3/3' && r.first === null, r);
r = A.checkCode(spec, { status: 'ok', results: [{ got: 2 }, { got: 5 }, { got: 6 }] });
S.check('one fail: not ok, still an attempt, first failing index', r.ok === false && r.attempt === true && r.first === 1 && r.parsed === '2/3', r);
S.eq('fail line reads input, expected, got', A.codeFailLine(spec, r), 'f(2) -> expected 4, got 5');
r = A.checkCode(spec, { status: 'ok', results: [{ got: 2 }, { error: 'ZeroDivisionError: division by zero' }, { got: 6 }] });
S.check('a raising test fails and names the error', r.ok === false && A.codeFailLine(spec, r).includes('raised ZeroDivisionError'), r);
r = A.checkCode(spec, { status: 'error', stage: 'code', error: 'SyntaxError: invalid syntax' });
S.check('syntax error: wrong answer, an attempt', r.ok === false && r.attempt === true && r.error === 'runtime-error' && r.detail.includes('SyntaxError'), r);
r = A.checkCode(spec, { status: 'timeout' });
S.check('timeout: wrong answer, an attempt', r.ok === false && r.attempt === true && r.error === 'timeout', r);
r = A.checkCode(spec, { status: 'unavailable', error: 'offline' });
S.check('runtime unavailable: no attempt', r.ok === false && r.attempt === false && r.error === 'no-runtime', r);
S.check('missing or malformed result: no attempt', A.checkCode(spec, null).attempt === false && A.checkCode(spec, { status: 'ok', results: [] }).attempt === false);
S.check('spec without tests: no attempt', A.checkCode({ kind: 'code' }, { status: 'ok', results: [] }).attempt === false);
S.check('check() dispatches code', A.check(spec, { status: 'ok', results: [{ got: 2 }, { got: 4 }, { got: 6 }] }).ok === true);

// engine side: code is playable, production, and graded from the runner result
S.check('code is playable and production', core.PLAYABLE.includes('code') && core.isProduction('code') && core.ANSWER_KINDS.includes('code'));
{
  const { fresh } = require('./lib/fixture.js');
  const { ix } = fresh();
  const item = ix.itemById.f035;
  S.check('fixture code item has kind code', core.itemKind(item) === 'code');
  const card = core.makeCard(ix, item, 'micro', 1);
  S.check('code card type is code', card.type === 'code');
  const good = core.gradeCard(card, { status: 'ok', results: item.answer.tests.map((t) => ({ got: t.expect })) });
  const bad = core.gradeCard(card, { status: 'ok', results: item.answer.tests.map(() => ({ got: 0 })) });
  const un = core.gradeCard(card, { status: 'unavailable', error: 'x' });
  S.check('gradeCard: right, wrong, unparsable', good.ok === true && bad.ok === false && un.unparsable === true, { good, bad, un });
  S.eq('answerText for code points at the solution', core.answerText(card), 'Reference solution below.');
}

// text.js: fenced blocks are literal, math still works outside them
{
  const h = T.md('Use:\n\n```python\nx = "$5" + `a`\n\nif a < b:\n    pass\n```\n\nThen $y$.', false, (t) => '[' + t + ']');
  S.check('fence renders pre/code with escaped text and a blank line inside', h.includes('<pre><code>x = &quot;$5&quot; + `a`\n\nif a &lt; b:\n    pass</code></pre>'), h);
  S.check('math outside the fence still renders', h.includes('[y]') && !h.includes('[5'), h);
  S.check('code span keeps $ literal', T.md('see `$x$` and $y$', true, (t) => '[' + t + ']') === 'see <code>$x$</code> and [y]');

  const inj = T.md('```\n<script>alert(1)</script> $x$ \uE0000\uE001\n```', false, () => '<MATH>');
  S.check('fence: <script> renders as text, $ literal, a forged math placeholder stays inert', inj.includes('&lt;script&gt;alert(1)&lt;/script&gt; $x$ 0') && !inj.includes('<script>') && !inj.includes('<MATH>'), inj);
  const fph = T.md('a \uE0100\uE011 b', true, null);
  S.check('fence: a forged fence placeholder in prose is stripped', fph === 'a 0 b', fph);
}

// Python harness and the author tool, local CPython
const py = spawnSync('python3', ['-c', 'import sys; print(sys.version_info[:2] >= (3, 8))'], { encoding: 'utf8' });
if (py.status !== 0 || py.stdout.trim() !== 'True') {
  console.log('code_checks: python3 not found, harness checks skipped');
} else {
  const harness = (user, setup, entry, tests) => {
    const prog = 'import importlib.util,json,sys\n' +
      's=importlib.util.spec_from_file_location("h",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n' +
      'a=json.loads(sys.stdin.read());print(m.run(a["u"],a["s"],a["e"],json.dumps(a["t"])))';
    const p = spawnSync('python3', ['-I', '-c', prog, path.join(ROOT, 'engine', 'pyharness.py')],
      { input: JSON.stringify({ u: user, s: setup, e: entry, t: tests }), encoding: 'utf8' });
    return p.status === 0 ? JSON.parse(p.stdout) : { crash: p.stderr };
  };
  const t1 = [{ args: [2] }, { args: [3] }];
  let h = harness('def f(x):\n    print("hi")\n    return x * 2', '', 'f', t1);
  S.check('harness: results and stdout', h.status === 'ok' && h.results[0].got === 4 && h.results[1].got === 6 && h.stdout.startsWith('hi'), h);
  h = harness('def f(x):\n    return (x, {1, 3, 2}, {"k": (1, 2)}, float("nan"), float("inf"))', '', 'f', [{ args: [1] }]);
  S.eq('harness: tuples, sets, dict, nan, inf', h.results[0].got, [1, [1, 2, 3], { k: [1, 2] }, { __f: 'nan' }, { __f: 'inf' }]);
  h = harness('def f(x):\n    return x == 1', '', 'f', [{ args: [1] }]);
  S.check('harness: bool stays bool', h.results[0].got === true, h);
  h = harness('def f(x:\n    return 1', '', 'f', t1);
  S.check('harness: syntax error is a status error', h.status === 'error' && h.stage === 'code' && /SyntaxError/.test(h.error), h);
  h = harness('x = 1', '', 'f', t1);
  S.check('harness: missing entry is a status error', h.status === 'error' && h.stage === 'entry', h);
  h = harness('def f(x):\n    return 1 / (x - 2)', '', 'f', t1);
  S.check('harness: a raising test is a per-test error', h.status === 'ok' && /ZeroDivisionError/.test(h.results[0].error) && h.results[1].got === 1, h);
  h = harness('def f(x):\n    return object()', '', 'f', [{ args: [1] }]);
  S.check('harness: unserializable result is a per-test error', /not JSON-safe/.test(h.results[0].error), h);
  h = harness('def f(x):\n    return BASE + x', 'BASE = 10', 'f', [{ args: [1] }]);
  S.check('harness: setup runs first and is visible', h.results[0].got === 11, h);
  h = harness('def f(x):\n    print("z" * 5000)\n    return 1', '', 'f', [{ args: [1] }]);
  S.check('harness: stdout cut at 2 KB', h.stdout.length < 2100 && h.stdout.includes('[output cut]'), h.stdout.length);
  h = harness('def f(l):\n    l.append(9)\n    return len(l)', '', 'f', [{ args: [[1]] }, { args: [[1]] }]);
  S.check('harness: each test gets fresh args', h.results[0].got === 2 && h.results[1].got === 2, h);
  h = harness('def f(x):\n    raise SystemExit(1)', '', 'f', [{ args: [1] }]);
  S.check('harness: SystemExit in a test does not crash the harness', h.status === 'ok' && /SystemExit/.test(h.results[0].error), h);

  // review 2026-10-13: isolation and encoding
  h = harness('import json\njson.dumps = lambda *a, **k: \'{"status": "ok", "results": [{"got": 99}], "stdout": ""}\'\ndef f(x):\n    return 0', '', 'f', [{ args: [1] }]);
  S.check('harness: patching json.dumps cannot forge the result', h.status === 'ok' && h.results[0].got === 0, h);
  h = harness('import __main__, sys\ndef f(x):\n    return [hasattr(__main__, "enc"), "pyharness" in sys.modules, "run" in globals()]', '', 'f', [{ args: [1] }]);
  S.eq('harness: learner code cannot see harness names', h.results[0].got, [false, false, false]);
  h = harness('import builtins\nbuiltins.len = lambda x: 42\ndef f(x):\n    return len([1])', '', 'f', [{ args: [1] }]);
  S.check('harness: a builtins patch acts inside its own run', h.results[0].got === 42, h);
  {
    const prog = 'import importlib.util,json,sys\n' +
      's=importlib.util.spec_from_file_location("h",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n' +
      'm.run("import builtins, json\\nbuiltins.len = lambda x: 42\\njson.loads = None\\ndef f(x):\\n    return 0", "", "f", json.dumps([{"args": [1]}]))\n' +
      'print(m.run("def f(x):\\n    return len([1, 2])", "", "f", json.dumps([{"args": [1]}])), json.loads("1"))';
    const p2 = spawnSync('python3', ['-I', '-c', prog, path.join(ROOT, 'engine', 'pyharness.py')], { encoding: 'utf8' });
    S.check('harness: builtins and json are restored before the next run', p2.status === 0 && /"got": 2/.test(p2.stdout) && /\} 1$/.test(p2.stdout.trim()), p2.stdout + p2.stderr);
    const p3 = spawnSync('python3', ['-I', '-c', 'import importlib.util,json,sys,signal\n' +
      's=importlib.util.spec_from_file_location("h",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n' +
      'class TO(BaseException): pass\n' +
      'def al(*a): raise TO()\n' +
      'signal.signal(signal.SIGALRM, al); signal.alarm(1)\n' +
      'try:\n    m.run("def f(x):\\n    while True: pass", "", "f", json.dumps([{"args": [1]}, {"args": [2]}])); print("swallowed")\n' +
      'except TO:\n    print("propagated")', path.join(ROOT, 'engine', 'pyharness.py')], { encoding: 'utf8', timeout: 20000 });
    S.check('harness: an outside BaseException (the author tool timeout) is not swallowed as a test error', p3.stdout.trim() === 'propagated', p3.stdout + p3.stderr);
  }
  h = harness('def f(x):\n    return [2**53 - 1, 2**53, -(2**60), 10**30]', '', 'f', [{ args: [1] }]);
  S.eq('harness: ints beyond 2^53 - 1 become exact digit tags', h.results[0].got, [9007199254740991, { __i: '9007199254740992' }, { __i: '-1152921504606846976' }, { __i: '1' + '0'.repeat(30) }]);
  h = harness('def f(x):\n    return {1: "a", "1": "b"}', '', 'f', [{ args: [1] }]);
  S.check('harness: dict keys that collide in JSON are an error, not a silent merge', /collide/.test(h.results[0].error || ''), h);
  h = harness('def f(x):\n    print(99)\n    return None', '', 'f', [{ args: [1] }]);
  S.check('harness: printing the answer is not returning it', h.results[0].got === null && /99/.test(h.stdout) && !A.checkCode({ entry: 'f', tests: [{ args: [1], expect: 99 }, { args: [1], expect: 99 }, { args: [1], expect: 99 }] }, { status: 'ok', results: [h.results[0], h.results[0], h.results[0]] }).ok, h);
  h = harness('def f(x):\n    return x', 'def f(x):\n    return 99', 'f', [{ args: [1] }]);
  S.check('harness: learner code overrides a setup name of the same name', h.results[0].got === 1, h);
  h = harness('def g(x):\n    return x', 'BASE = g(1)', 'g', [{ args: [1] }]);
  S.check('harness: setup cannot use learner names (runs first): a setup-stage error', h.status === 'error' && h.stage === 'setup', h);
  h = harness('def f(x):\n    raise KeyboardInterrupt()', '', 'f', [{ args: [1] }]);
  S.check('harness: KeyboardInterrupt in a test is a per-test error', h.status === 'ok' && /KeyboardInterrupt/.test(h.results[0].error), h);
  h = harness('import sys\nsys.exit(0)', '', 'f', [{ args: [1] }]);
  S.check('harness: sys.exit at module level is a code-stage error', h.status === 'error' && h.stage === 'code', h);
  const np = spawnSync('python3', ['-c', 'import numpy, pandas'], { encoding: 'utf8' });
  if (np.status === 0) {
    // -I hides the user site; tools/run_code_items.py adds it back, the harness test does too
    const harnessNp = (user) => {
      const prog = 'import importlib.util,json,sys,site\nsys.path.append(site.getusersitepackages())\n' +
        's=importlib.util.spec_from_file_location("h",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n' +
        'print(m.run(sys.stdin.read(),"","f",json.dumps([{"args":[1]}])))';
      const p = spawnSync('python3', ['-I', '-c', prog, path.join(ROOT, 'engine', 'pyharness.py')], { input: user, encoding: 'utf8' });
      return p.status === 0 ? JSON.parse(p.stdout) : { crash: p.stderr };
    };
    h = harnessNp('import numpy as np\ndef f(x):\n    return [np.int64(7), np.float32(0.5), np.bool_(True), np.array([[1, 2]]), np.float64("nan"), {np.int64(3): 1}]');
    S.eq('harness: numpy scalars, bool_, arrays, nan and int64 keys', h.results && h.results[0].got, [7, 0.5, true, [[1, 2]], { __f: 'nan' }, { 3: 1 }]);
    h = harnessNp('import pandas as pd\ndef f(x):\n    df = pd.DataFrame({"b": [3, 4], "a": [1.5, 2.5]})\n    return [df, df["b"], df["a"].mean()]');
    S.eq('harness: DataFrame becomes {column: list}, Series a list', h.results && h.results[0].got, [{ b: [3, 4], a: [1.5, 2.5] }, [3, 4], 2]);
  } else console.log('code_checks: numpy/pandas not installed, numpy harness checks skipped');

  // author tool on the fixture and on a broken copy
  const tool = (dir) => spawnSync('python3', ['-I', path.join(ROOT, 'tools', 'run_code_items.py'), dir],
    { encoding: 'utf8', env: Object.assign({}, process.env, { NODE }) });
  let t = tool(path.join(ROOT, 'packs', '_fixture'));
  S.check('run_code_items passes on the fixture', t.status === 0 && /RESULT run_code_items code_items=3 .*failed=0/.test(t.stdout), t.stdout + t.stderr);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-items-'));
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'packs', '_fixture', 'items.json'), 'utf8'));
  items.find((i) => i.id === 'f035').answer.tests[0].expect = 99;
  items.find((i) => i.id === 'f036').answer.starter = 'import numpy as np\n\ndef quad_roots(a, b, c):\n    return np.sort(np.roots([a, b, c]).real)';
  fs.writeFileSync(path.join(tmp, 'items.json'), JSON.stringify(items));
  t = tool(tmp);
  S.check('run_code_items fails on a wrong key and on a starter that already passes', t.status === 1 && /f035:solution: reference code fails/.test(t.stdout) &&
    (/f036:starter: the starter already passes/.test(t.stdout) || /SKIP f036/.test(t.stdout)), t.stdout + t.stderr);
  fs.rmSync(tmp, { recursive: true, force: true });
  // a pack that needs numpy where python3 cannot import it: fail loudly, unless --allow-skip
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'code-home-'));
  const toolNoNp = (extra) => spawnSync('python3', ['-I', '-S', path.join(ROOT, 'tools', 'run_code_items.py')].concat(extra, [path.join(ROOT, 'packs', '_fixture')]),
    { encoding: 'utf8', env: Object.assign({}, process.env, { NODE, HOME: fakeHome }) });
  const probe = spawnSync('python3', ['-I', '-S', '-c', 'import site,sys; sys.path.append(site.getusersitepackages()); import numpy'], { encoding: 'utf8', env: Object.assign({}, process.env, { HOME: fakeHome }) });
  if (probe.status !== 0) {
    t = toolNoNp([]);
    S.check('run_code_items: missing numpy is a failure by default', t.status === 1 && /needs numpy/.test(t.stdout), t.stdout + t.stderr);
    t = toolNoNp(['--allow-skip']);
    S.check('run_code_items --allow-skip: missing numpy is a counted skip, exit 0', t.status === 0 && /SKIP f036/.test(t.stdout) && /skipped=[1-9]/.test(t.stdout), t.stdout + t.stderr);
  } else console.log('code_checks: numpy importable without the user site; missing-package check skipped');
  fs.rmSync(fakeHome, { recursive: true, force: true });
  // a solution that loops forever is a timeout failure; the next item still runs
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'code-items-'));
  const items2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'packs', '_fixture', 'items.json'), 'utf8')).filter((i) => i.answer.kind === 'code' && !(i.answer.packages || []).length);
  items2[0].solution = items2[0].solution.replace(/```python\n[\s\S]*?```/, '```python\ndef ' + items2[0].answer.entry + '(*a):\n    while True:\n        pass\n```');
  fs.writeFileSync(path.join(tmp2, 'items.json'), JSON.stringify(items2));
  t = spawnSync('python3', ['-I', path.join(ROOT, 'tools', 'run_code_items.py'), tmp2], { encoding: 'utf8', timeout: 60000, env: Object.assign({}, process.env, { NODE }) });
  S.check('run_code_items: an endless reference solution is a failure, not a hang', t.status === 1 && new RegExp(items2[0].id + ':solution: reference code fails').test(t.stdout), t.stdout + t.stderr);
  fs.rmSync(tmp2, { recursive: true, force: true });
}
S.done();
