/* problem-engine answer checker. Pure logic: no DOM, no clock.
 * Rules: docs/SPEC.md section 3.4 (answer specs, expression equality).
 * Numeric parsing and checking are copied from engine/core.js (parseNumber, checkNumeric)
 * so both agree. Expression input is ASCII: tokenizer + shunting-yard to an AST.
 * Schema notes: docs/PACK_SCHEMA.md "Answer checker (M3)". */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PEAnswer = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var FORMS = ['exact', 'decimal', 'fraction'];
  var FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log,
    log: Math.log10, sqrt: Math.sqrt, abs: Math.abs
  };
  var CONST = { pi: Math.PI, e: Math.E };
  var BIN = {
    '+': { p: 1, right: false }, '-': { p: 1, right: false },
    '*': { p: 2, right: false }, '/': { p: 2, right: false },
    '^': { p: 4, right: true }
  };
  var NEG_PREC = 3;               // unary minus: looser than ^, tighter than * and /
  var DEFAULT_DOMAIN = [0.3, 2.7];
  var DEFAULT_POINTS = 12;
  var MIN_VALID = 8;
  var REL_TOL = 1e-9;
  var ZERO_FLOOR = 1e-12;   // absolute slack where relative tolerance has no scale: exact-zero targets, cancelling expressions

  // ---- numbers: integers, decimals, p/q. Copied from engine/core.js.
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function makeRat(p, q) {
    if (q < 0) { p = -p; q = -q; }
    var g = gcd(p, q) || 1;
    return { p: p / g, q: q / g, v: p / q };
  }
  var RAT_RE = /^([+-]?)(\d+)\/(\d+)$/;
  var DEC_RE = /^([+-]?)(\d*)(?:\.(\d*))?$/;
  var SCI_RE = /^([+-]?)(\d*)(?:\.(\d*))?[eE]([+-]?\d+)$/;
  var SAFE_INT = 9007199254740991;
  function parseNumber(input) {
    if (typeof input === 'number') return isFinite(input) ? { p: null, q: null, v: input, isFrac: false, lowest: false } : null;
    if (typeof input !== 'string') return null;
    if (/\d\s+\d/.test(input)) return null;           // "1 2" is not 12
    var t = input.replace(/\s+/g, '');
    var m = RAT_RE.exec(t);
    if (m) {
      var p0 = Number(m[1] + m[2]), q0 = Number(m[3]);
      if (!q0) return null;
      var r0 = makeRat(p0, q0);
      return { p: r0.p, q: r0.q, v: r0.v, isFrac: true, lowest: gcd(p0, q0) === 1 };
    }
    // Scientific literal (3e8, 1.6e-19): a typed numeric answer only. The expression tokenizer still rejects it,
    // because 2e-1 is ambiguous there (2*e-1 or 0.2). Exact p/q when both sides fit a safe integer, else float only.
    m = SCI_RE.exec(t);
    if (m) {
      var mant = (m[2] || '') + (m[3] || '');
      if (!/\d/.test(mant)) return null;
      var v10 = Number(t);
      if (!isFinite(v10)) return null;
      var e10 = Number(m[4]) - (m[3] || '').length;
      var digits = Number(mant), pN = null, qN = null;
      if (e10 >= 0 && e10 <= 15) { pN = digits * Math.pow(10, e10); qN = 1; }
      else if (e10 < 0 && e10 >= -15) { pN = digits; qN = Math.pow(10, -e10); }
      if (pN === null || pN > SAFE_INT || qN > SAFE_INT) return { p: null, q: null, v: v10, isFrac: false, lowest: false };
      var rs = makeRat(m[1] === '-' ? -pN : pN, qN);
      return { p: rs.p, q: rs.q, v: v10, isFrac: rs.q === 1, lowest: true };
    }
    m = DEC_RE.exec(t);
    if (!m) return null;
    var frac = m[3] || '';
    var digits = (m[2] || '') + frac;
    if (!digits || frac.length > 12) return null;
    if (digits.replace(/^0+/, '').length > 15) return null;   // A5: past 15 significant digits the rational compare would round
    var p1 = Number(m[1] + (m[2] || '0') + frac);
    var q1 = Math.pow(10, frac.length);
    var r1 = makeRat(p1, q1);
    var intlike = /^[+-]?\d+$/.test(t);
    return { p: r1.p, q: r1.q, v: r1.v, isFrac: intlike, lowest: true };
  }
  // Typed input: strings go through parseNumber; JS numbers are literals too.
  function literalNumber(typed) {
    if (typeof typed === 'number') {
      if (!isFinite(typed)) return null;
      var isInt = Number.isInteger(typed);
      return { p: null, q: null, v: typed, isFrac: isInt, lowest: isInt };
    }
    if (typeof typed !== 'string') return null;
    return parseNumber(typed);
  }

  // Exact value of an AST built only from numbers, + - * / and integer powers, as {p,q}; null otherwise or on overflow.
  function exactRat(n) {
    var SAFE = 9007199254740991;
    var chk = function (r) { return r && isFinite(r.p) && isFinite(r.q) && Math.abs(r.p) <= SAFE && Math.abs(r.q) <= SAFE ? r : null; };
    switch (n.type) {
      case 'num': { var m = parseNumber(n.text); return m && m.p !== null ? { p: m.p, q: m.q } : null; }
      case 'neg': { var x = exactRat(n.x); return x && { p: -x.p, q: x.q }; }
      case 'bin': {
        var a = exactRat(n.l), b = exactRat(n.r);
        if (!a || !b) return null;
        if (n.op === '+') return chk(makeRat(a.p * b.q + b.p * a.q, a.q * b.q));
        if (n.op === '-') return chk(makeRat(a.p * b.q - b.p * a.q, a.q * b.q));
        if (n.op === '*') return chk(makeRat(a.p * b.p, a.q * b.q));
        if (n.op === '/') return b.p === 0 ? null : chk(makeRat(a.p * b.q, a.q * b.p));
        if (n.op === '^') {
          if (b.q !== 1 || Math.abs(b.p) > 30) return null;
          var e = Math.abs(b.p), p = Math.pow(a.p, e), q = Math.pow(a.q, e);
          if (!isFinite(p) || !isFinite(q) || (b.p < 0 && p === 0)) return null;
          return chk(b.p < 0 ? makeRat(q, p) : makeRat(p, q));
        }
      }
    }
    return null;
  }

  // ---- expression tokenizer
  function fail(msg) { throw new Error(msg); }
  function isFuncName(w) { return Object.prototype.hasOwnProperty.call(FN, w); }
  function tokenize(src, vars) {
    // Phone keyboards and pasted text: real minus, times, divide, pi, and ** for powers.
    var s = String(src).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[\u00d7\u00b7\u22c5]/g, '*')
      .replace(/\u00f7/g, '/').replace(/\u03c0/g, 'pi').replace(/\*\*/g, '^'), i = 0, toks = [];
    // X_1 and X1 name the same declared variable, whichever spelling the pack declares; case is preserved.
    var alias = {};
    vars.forEach(function (v) {
      var m1 = /^([A-Za-z]+)(\d+)$/.exec(v), m2 = /^([A-Za-z]+)_(\d+)$/.exec(v);
      var other = m1 ? m1[1] + '_' + m1[2] : m2 ? m2[1] + m2[2] : null;
      if (other && vars.indexOf(other) < 0) alias[other] = v;
    });
    var words = Object.keys(FN).concat(Object.keys(CONST), vars, Object.keys(alias))
      .filter(function (w) { return w.length > 0; })
      .sort(function (a, b) { return b.length - a.length; });
    while (i < s.length) {
      var c = s.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^(?:\d+\.?\d*|\.\d+)/.exec(s.slice(i));
        if (!m) fail('bad number at ' + (i + 1));
        i += m[0].length;
        if (/^[eE][+-]?\d/.test(s.slice(i))) fail('scientific notation is not supported; write 2*e-1 or 2*10^-3 with explicit *');
        toks.push({ t: 'num', text: m[0], v: Number(m[0]) });
        continue;
      }
      if (/[A-Za-z]/.test(c)) {
        var w = null;
        for (var k = 0; k < words.length; k++) {
          if (s.substr(i, words[k].length) === words[k]) { w = words[k]; break; }
        }
        if (w === null) { toks.push({ t: 'id', name: c }); i++; continue; }
        i += w.length;
        if (alias[w] !== undefined) w = alias[w];
        if (vars.indexOf(w) >= 0) toks.push({ t: 'var', name: w });
        else if (isFuncName(w)) toks.push({ t: 'fn', name: w });
        else toks.push({ t: 'const', name: w });
        continue;
      }
      if ('+-*/^'.indexOf(c) >= 0) { toks.push({ t: 'op', op: c }); i++; continue; }
      if (c === '(') { toks.push({ t: 'lp' }); i++; continue; }
      if (c === ')') { toks.push({ t: 'rp' }); i++; continue; }
      fail('unexpected character ' + c);
    }
    return toks;
  }

  // ---- parser: shunting-yard. Returns {ast} or {error}.
  // vars: declared variable names. Any other letter is an error.
  function parseExpr(src, vars) {
    vars = Array.isArray(vars) ? vars : [];
    try {
      var toks = tokenize(String(src), vars);
      var ops = [], out = [], pendingFn = null, expectOperand = true, prev = null;
      if (!toks.length) fail('empty expression');

      var pop = function () { if (!out.length) fail('missing operand'); return out.pop(); };
      var apply = function (op) {
        if (op.t === 'neg') { out.push({ type: 'neg', x: pop() }); return; }
        var r = pop(), l = pop();
        out.push({ type: 'bin', op: op.op, l: l, r: r });
      };
      var pushBin = function (op) {
        var info = BIN[op];
        while (ops.length && ops[ops.length - 1].t !== 'lp') {
          var top = ops[ops.length - 1];
          if (top.prec > info.p || (top.prec === info.p && !info.right)) apply(ops.pop());
          else break;
        }
        ops.push({ t: 'bin', op: op, prec: info.p });
      };
      var describe = function (tk) {
        if (tk.t === 'num') return tk.text;
        if (tk.t === 'op') return tk.op;
        if (tk.t === 'lp') return '(';
        if (tk.t === 'rp') return ')';
        return tk.name;
      };
      var checkImplicit = function (a, b) {
        if (a.t === 'num' && b.t === 'num') fail('two numbers in a row');
        if (b.t === 'num') fail('a number after ' + (a.t === 'rp' ? ')' : a.name) + ' needs an explicit * or ^ (x2 is not 2x)');
        if (a.t === 'var' && b.t === 'var' && (a.name.length > 1 || b.name.length > 1)) {
          fail('adjacent variables ' + a.name + ' ' + b.name + ' need an explicit *');
        }
      };
      // Token in operand position.
      var operand = function (tk) {
        if (tk.t === 'num') out.push({ type: 'num', v: tk.v, text: tk.text });
        else if (tk.t === 'var') out.push({ type: 'var', name: tk.name });
        else if (tk.t === 'const') out.push({ type: 'const', name: tk.name });
        else if (tk.t === 'lp') { ops.push({ t: 'lp', fn: pendingFn }); pendingFn = null; return; }
        else if (tk.t === 'op' && tk.op === '-') { ops.push({ t: 'neg', prec: NEG_PREC }); return; }
        else if (tk.t === 'op' && tk.op === '+') return;
        else fail('unexpected ' + describe(tk));
        expectOperand = false;
      };

      for (var k = 0; k < toks.length; k++) {
        var tk = toks[k];
        if (tk.t === 'id') fail('unknown identifier ' + tk.name);
        if (tk.t === 'fn') {
          var nx = toks[k + 1];
          if (!nx || nx.t !== 'lp') fail('function ' + tk.name + ' needs parentheses');
          if (!expectOperand) { pushBin('*'); expectOperand = true; }
          pendingFn = tk.name;
          prev = tk;
          continue;
        }
        if (expectOperand) {
          operand(tk);
        } else if (tk.t === 'op') {
          pushBin(tk.op);
          expectOperand = true;
        } else if (tk.t === 'rp') {
          while (ops.length && ops[ops.length - 1].t !== 'lp') apply(ops.pop());
          if (!ops.length) fail('unbalanced )');
          var g = ops.pop();
          if (g.fn) out.push({ type: 'call', fn: g.fn, x: pop() });
        } else {
          // value-start token after a value: implicit multiplication
          checkImplicit(prev, tk);
          pushBin('*');
          expectOperand = true;
          operand(tk);
        }
        prev = tk;
      }
      if (expectOperand) fail('missing operand at end');
      while (ops.length) {
        var t = ops.pop();
        if (t.t === 'lp') fail('unbalanced (');
        apply(t);
      }
      if (out.length !== 1) fail('malformed expression');
      return { ast: out[0] };
    } catch (err) {
      return { error: err.message };
    }
  }

  function evalExpr(ast, env) {
    env = env || {};
    switch (ast.type) {
      case 'num': return ast.v;
      case 'var':
        if (!Object.prototype.hasOwnProperty.call(env, ast.name) || typeof env[ast.name] !== 'number') {
          fail('unknown identifier ' + ast.name);
        }
        return env[ast.name];
      case 'const': return CONST[ast.name];
      case 'neg': return -evalExpr(ast.x, env);
      case 'call': return FN[ast.fn](evalExpr(ast.x, env));
      case 'bin': {
        var a = evalExpr(ast.l, env), b = evalExpr(ast.r, env);
        switch (ast.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '^': return Math.pow(a, b);
        }
      }
    }
    fail('bad node');
  }

  // Fully parenthesised ASCII. Shown to the learner as "what was understood".
  function canon(n) {
    switch (n.type) {
      case 'num': return n.text;
      case 'var': case 'const': return n.name;
      case 'neg': return '(-' + canon(n.x) + ')';
      case 'call': return n.fn + '(' + canon(n.x) + ')';
      default: return '(' + canon(n.l) + n.op + canon(n.r) + ')';
    }
  }

  // LaTeX for the live KaTeX preview. Parenthesises by precedence; ties on the right are wrapped.
  var TEX_FN = {
    sin: '\\sin', cos: '\\cos', tan: '\\tan', sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh',
    asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan', exp: '\\exp', ln: '\\ln', log: '\\log_{10}'
  };
  function texPrec(n) {
    if (n.type === 'neg') return 3;
    if (n.type !== 'bin') return 9;                 // atoms, calls
    if (n.op === '/') return 9;                     // rendered as \frac, self-delimiting
    if (n.op === '^') return 5;
    if (n.op === '*') return 2;
    return 1;                                       // + and -
  }
  function texChild(n, parentPrec, right) {
    var p = texPrec(n);
    var wrap = right ? p <= parentPrec : p < parentPrec;
    return wrap ? '(' + tex(n) + ')' : tex(n);
  }
  function tex(n) {
    switch (n.type) {
      case 'num': return n.text;
      case 'var': return n.name.length > 1 ? '\\mathrm{' + n.name + '}' : n.name;
      case 'const': return n.name === 'pi' ? '\\pi' : 'e';
      case 'neg': return '-' + texChild(n.x, 3, false);
      case 'call':
        if (n.fn === 'sqrt') return '\\sqrt{' + tex(n.x) + '}';
        if (n.fn === 'abs') return '\\left|' + tex(n.x) + '\\right|';
        return TEX_FN[n.fn] + '\\left(' + tex(n.x) + '\\right)';
      default:
        if (n.op === '/') return '\\frac{' + tex(n.l) + '}{' + tex(n.r) + '}';
        if (n.op === '^') return '{' + texChild(n.l, 9, false) + '}^{' + tex(n.r) + '}';
        if (n.op === '*') return texChild(n.l, 2, false) + ' \\cdot ' + texChild(n.r, 2, true);
        return texChild(n.l, 1, false) + ' ' + n.op + ' ' + texChild(n.r, 1, true);
    }
  }
  function toLatex(ast) { return tex(ast && ast.ast ? ast.ast : ast); }

  // ---- sampling: seeded so results are deterministic for a given spec
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function normDomain(raw, vars) {
    var out = {};
    vars.forEach(function (v) { out[v] = DEFAULT_DOMAIN; });
    if (raw === undefined || raw === null) return out;
    var okPair = function (p) { return Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]) && p[0] < p[1]; };
    if (Array.isArray(raw)) {                       // one interval for every var
      if (!okPair(raw)) return null;
      vars.forEach(function (v) { out[v] = raw; });
      return out;
    }
    if (typeof raw !== 'object') return null;
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i++) {
      if (vars.indexOf(keys[i]) < 0 || !okPair(raw[keys[i]])) return null;
      out[keys[i]] = raw[keys[i]];
    }
    return out;
  }
  function samplePoints(vars, domain, n, seed) {
    var rnd = mulberry32(seed), pts = [];
    for (var i = 0; i < n; i++) {
      var env = {};
      for (var j = 0; j < vars.length; j++) {
        var d = domain[vars[j]];
        env[vars[j]] = d[0] + (d[1] - d[0]) * rnd();
      }
      pts.push(env);
    }
    return pts;
  }
  // undefined when the node throws; NaN/Infinity pass through and are filtered by the caller.
  function tryEval(ast, env) {
    try { return evalExpr(ast, env); } catch (e) { return undefined; }
  }
  // Sum of |summands| through + and -: the scale float cancellation noise is relative to.
  function absSum(ast, env) {
    if (ast.type === 'bin' && (ast.op === '+' || ast.op === '-')) return absSum(ast.l, env) + absSum(ast.r, env);
    if (ast.type === 'neg') return absSum(ast.x, env);
    return Math.abs(tryEval(ast, env));
  }
  function evalAll(ast, pts) { return pts.map(function (env) { return tryEval(ast, env); }); }
  function finite(x) { return typeof x === 'number' && isFinite(x); }

  // ---- result helpers
  // attempt:false means the answer did not parse or could not be evaluated: no attempt counted.
  function bad(error, detail) {
    var r = { ok: false, parsed: null, error: error, attempt: false };
    if (detail) r.detail = detail;
    return r;
  }
  function verdict(ok, parsed, error) {
    var r = { ok: ok, parsed: parsed, attempt: true };
    if (error) r.error = error;
    return r;
  }

  // ---- kinds
  function checkNumeric(spec, typed) {
    var target = parseNumber(spec.value);
    if (!target) return bad('bad-spec');
    var form = spec.form || 'exact';
    if (FORMS.indexOf(form) < 0) return bad('bad-spec');
    var tol = isNum(spec.tol) ? spec.tol : 0;
    var rel = isNum(spec.rel) ? spec.rel : 0;

    var lit = literalNumber(typed);
    if (lit) {
      var parsed = lit.isFrac ? (lit.q === 1 ? String(lit.p) : lit.p + '/' + lit.q) : String(lit.v);
      if (form === 'fraction') {
        if (!lit.lowest) return verdict(false, parsed, 'lowest-terms');
        if (!lit.isFrac) return verdict(false, parsed, 'fraction-form');
      }
      var ok;
      var tv = Math.abs(target.v);
      if (form === 'decimal') {
        ok = Math.abs(lit.v - target.v) <= Math.max(tol, rel * tv) + 4 * Number.EPSILON * tv;
      } else if (target.p !== null && lit.p !== null) {
        ok = lit.p * target.q === target.p * lit.q;      // exact rational equality; tol and rel do not apply
      } else {
        ok = Math.abs(lit.v - target.v) <= Math.max(tol, rel * tv) + REL_TOL * tv;
      }
      return verdict(ok, parsed);
    }

    // Not a literal: expression input (sqrt(2), pi/4). Evaluated with no variables.
    if (typeof typed !== 'string' || !typed.trim()) return bad('unparsable', 'empty');
    var pr = parseExpr(typed, []);
    if (pr.error) return bad('unparsable', pr.error);
    var val = tryEval(pr.ast, {});
    if (!finite(val)) return bad('unparsable', 'not a finite number');
    var canonText; try { canonText = canon(pr.ast); } catch (e) { return bad('unparsable', 'expression too deep'); }
    // Exact form with a rational target: arithmetic on typed numbers, like (1/2) or 1/2+1/3, is compared as rationals.
    if (form === 'exact' && target.p !== null) {
      var er = exactRat(pr.ast);
      if (er) return verdict(er.p * target.q === target.p * er.q, canonText);
    }
    // Otherwise exactness cannot be proven from a float: the learner must type the literal.
    if (form === 'fraction' || (form === 'exact' && target.p !== null)) {
      return verdict(false, canonText, 'literal-required');
    }
    var t = target.v;
    // Relative tolerance; an exact-zero target gets a tiny absolute floor, since float cancellation (cos(pi/2), 0.1+0.2-0.3) never lands on 0.
    var same = Math.abs(val - t) <= Math.max(tol, rel * Math.abs(t)) + REL_TOL * Math.abs(t) + (t === 0 ? ZERO_FLOOR : 0);
    return verdict(same, canonText);
  }

  function checkExpression(spec, typed) {
    if (typeof spec.value !== 'string' || !spec.value.trim()) return bad('bad-spec');
    var vars = Array.isArray(spec.vars) ? spec.vars : [];
    var domain = normDomain(spec.domain, vars);
    if (!domain) return bad('bad-spec', 'domain');
    var n = Math.max(MIN_VALID, isNum(spec.points) ? Math.floor(spec.points) : DEFAULT_POINTS);
    var forms = [spec.value].concat(Array.isArray(spec.also) ? spec.also : []);
    var targets = [];
    for (var i = 0; i < forms.length; i++) {
      if (typeof forms[i] !== 'string') return bad('bad-spec');
      var tr = parseExpr(forms[i], vars);
      if (tr.error) return bad('bad-spec', tr.error);
      targets.push(tr.ast);
    }
    if (typeof typed !== 'string' || !typed.trim()) return bad('unparsable', 'empty');
    var tp = parseExpr(typed, vars);
    if (tp.error) return bad('unparsable', tp.error);

    var parsed; try { parsed = canon(tp.ast); } catch (e) { return bad('unparsable', 'expression too deep'); }
    var pts = samplePoints(vars, domain, n, fnv(spec.value + '|' + vars.join(',')));
    var typedVals = evalAll(tp.ast, pts);
    if (typedVals.every(function (v) { return v === undefined; })) return bad('unparsable', 'evaluates nowhere');

    var typedThin = false;
    for (var j = 0; j < targets.length; j++) {
      var tvals = evalAll(targets[j], pts);
      var valid = 0, match = true;
      // Cancellation noise (sin(x)^2+cos(x)^2-1 against 0) never lands on exactly 0 and has no relative scale. When one
      // side is exactly 0 at every valid point, allow a tiny absolute slack on the other. Two non-zero tiny sides
      // (1.05e-34*w vs 2.1e-34*w) stay under the relative rule only.
      var scale = 0, aZero = true, bZero = true;
      for (var k0 = 0; k0 < pts.length; k0++) {
        if (!finite(tvals[k0]) || !finite(typedVals[k0])) continue;
        scale = Math.max(scale, Math.abs(tvals[k0]), Math.abs(typedVals[k0]));
        if (tvals[k0] !== 0) aZero = false;
        if (typedVals[k0] !== 0) bZero = false;
      }
      var slack = 0;
      for (var k = 0; k < pts.length; k++) {
        var a = tvals[k], b = typedVals[k];
        if (finite(a) && !finite(b)) { match = false; continue; }   // A2: typed undefined where the target is defined
        if (!finite(a) || !finite(b)) continue;
        valid += 1;
        var sl = aZero ? ZERO_FLOOR * Math.max(absSum(tp.ast, pts[k]), 0) : bZero ? ZERO_FLOOR * absSum(targets[j], pts[k]) : 0;
        if (Math.abs(a - b) > REL_TOL * Math.max(Math.abs(a), Math.abs(b)) + sl) match = false;
      }
      if (valid < MIN_VALID) {
        if (j === 0) {
          // The target itself is thin: a spec problem, no attempt. Only the typed side thin: a wrong answer.
          var tfin = tvals.filter(finite).length;
          if (tfin < MIN_VALID) return bad('too-few-points', tfin + ' valid of ' + pts.length);
          typedThin = true;
        }
        continue;
      }
      if (match) return { ok: true, parsed: parsed, attempt: true };
    }
    return verdict(false, parsed, typedThin ? 'no-valid-points' : undefined);
  }

  function toIndex(x) {
    if (typeof x === 'number' && Number.isInteger(x) && x >= 0) return x;
    if (typeof x === 'string' && /^\d+$/.test(x)) return Number(x);
    return null;
  }
  function uniqSorted(list) {
    var seen = {}, out = [];
    list.forEach(function (v) { if (!seen[v]) { seen[v] = true; out.push(v); } });
    return out.sort(function (a, b) { return a - b; });
  }

  function checkMcq(spec, typed) {
    var n = Array.isArray(spec.options) ? spec.options.length : null;
    if (toIndex(spec.correct) === null || (n !== null && toIndex(spec.correct) >= n)) return bad('bad-spec');
    var idx = toIndex(typed);
    if (idx === null) return bad('unparsable', 'not an option index');
    if (n !== null && idx >= n) return bad('out-of-range');
    return verdict(idx === toIndex(spec.correct), String(idx));
  }

  function checkMulti(spec, typed) {
    var n = Array.isArray(spec.options) ? spec.options.length : null;
    if (!Array.isArray(spec.correct) || spec.correct.some(function (c) { return toIndex(c) === null; })) return bad('bad-spec');
    if (n !== null && spec.correct.some(function (c) { return toIndex(c) >= n; })) return bad('bad-spec');
    var list;
    if (Array.isArray(typed)) list = typed;
    else if (typeof typed === 'string') list = typed.trim() === '' ? [] : typed.trim().split(/[\s,]+/);
    else return bad('unparsable', 'not a selection');
    var picked = [];
    for (var i = 0; i < list.length; i++) {
      var idx = toIndex(list[i]);
      if (idx === null) return bad('unparsable', 'not an option index: ' + String(list[i]));
      if (n !== null && idx >= n) return bad('out-of-range');
      picked.push(idx);
    }
    var got = uniqSorted(picked), want = uniqSorted(spec.correct.map(toIndex));
    var same = got.length === want.length && got.every(function (v, k) { return v === want[k]; });
    return verdict(same, got.join(','));
  }


  // ---- code (Python run in the page; engine/pyworker.js + engine/pyharness.py produce the raw result)
  // checkCode(spec, result): result is the harness object {status, stdout, results|error, stage}. Pure JS, no Python.
  // Equality (docs/SPEC.md 3.4):
  // - numbers: |a-b| <= tol * max(1, |b|), tol = spec.tol or CODE_TOL. Python int 1 and float 1.0 are equal (JSON
  //   cannot tell them apart). When spec.tol is absent and `expect` is an integer, an integer-valued result must match
  //   exactly and a fractional one must round to it (1e12 + 500 is not 1e12); set tol to opt out.
  // - true/false never equal 1/0; strings exact (whitespace counts); null equals null only.
  // - lists in order, same length; dict keys unordered, same key set (a DataFrame's column order is ignored).
  // - tags from the harness: {"__f": "nan"|"inf"|"-inf"} non-finite floats (nan equals nan), {"__i": "<digits>"} an
  //   int beyond 2^53 - 1, compared as exact digits. The same tags are accepted in `expect`. A dict that is exactly
  //   one of these one-key shapes is read as the tag.
  var CODE_TOL = 1e-9;
  function tagOf(v, key) {
    return v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 &&
      typeof v[key] === 'string' ? v[key] : null;
  }
  function fTag(v) { return tagOf(v, '__f'); }
  function fVal(tag) { return tag === 'nan' ? NaN : tag === 'inf' ? Infinity : tag === '-inf' ? -Infinity : null; }
  function bigDigits(v) {
    var t = tagOf(v, '__i');
    if (t !== null) return /^-?\d+$/.test(t) ? t.replace(/^(-?)0+(?=\d)/, '$1') : null;
    return typeof v === 'number' && Number.isSafeInteger(v) ? String(v) : null;
  }
  function numEq(got, want, tol, exactInt) {
    if (typeof got !== 'number' || typeof want !== 'number') return false;
    if (isNaN(got) || isNaN(want)) return isNaN(got) && isNaN(want);
    if (!isFinite(got) || !isFinite(want)) return got === want;
    if (exactInt && Number.isSafeInteger(want)) {
      if (Number.isInteger(got)) return got === want;
      if (Math.abs(got - want) >= 0.5) return false;
    }
    return Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  }
  function codeEq(got, want, tol, exactInt) {
    if (tagOf(got, '__i') !== null || tagOf(want, '__i') !== null) {
      var gd = bigDigits(got), wd = bigDigits(want);
      return gd !== null && gd === wd;
    }
    var gt = fTag(got), wt = fTag(want);
    if (gt !== null || wt !== null) {
      return numEq(gt !== null ? fVal(gt) : got, wt !== null ? fVal(wt) : want, tol, false);
    }
    if (typeof want === 'number') return numEq(got, want, tol, exactInt);
    if (want === null || typeof want === 'string' || typeof want === 'boolean') return got === want;
    if (Array.isArray(want)) {
      if (!Array.isArray(got) || got.length !== want.length) return false;
      for (var i = 0; i < want.length; i++) if (!codeEq(got[i], want[i], tol, exactInt)) return false;
      return true;
    }
    if (typeof want === 'object') {
      if (got === null || typeof got !== 'object' || Array.isArray(got)) return false;
      var wk = Object.keys(want), gk = Object.keys(got);
      if (wk.length !== gk.length) return false;
      for (var j = 0; j < wk.length; j++) {
        if (!Object.prototype.hasOwnProperty.call(got, wk[j]) || !codeEq(got[wk[j]], want[wk[j]], tol, exactInt)) return false;
      }
      return true;
    }
    return false;
  }
  // Short text of a JSON value for the "input -> expected / got" line.
  function showVal(v) {
    var t = fTag(v);
    if (t !== null) return t === 'nan' ? 'nan' : t === 'inf' ? 'inf' : '-inf';
    var bi = tagOf(v, '__i');
    if (bi !== null) return bi;
    var s = JSON.stringify(v);
    if (s === undefined) s = String(v);
    return s.length > 160 ? s.slice(0, 157) + '...' : s;
  }
  function showArgs(args) { return (args || []).map(showVal).join(', '); }
  function checkCode(spec, result) {
    var tests = spec && Array.isArray(spec.tests) ? spec.tests : null;
    if (!tests || !tests.length) return bad('bad-spec', 'no tests');
    if (!result || typeof result !== 'object') return bad('no-runtime', 'no result from the Python runner');
    if (result.status === 'timeout') {
      return { ok: false, parsed: 'timed out', attempt: true, error: 'timeout', detail: 'timed out', tests: [], first: null, stdout: result.stdout || '' };
    }
    if (result.status === 'unavailable') return bad('no-runtime', result.error ? String(result.error) : 'Python did not load');
    if (result.status === 'error') {
      return { ok: false, parsed: 'error', attempt: true, error: 'runtime-error', detail: String(result.error || 'error'),
        tests: [], first: null, stdout: result.stdout || '' };
    }
    if (result.status !== 'ok' || !Array.isArray(result.results) || result.results.length !== tests.length) {
      return bad('no-runtime', 'malformed runner result');
    }
    var hasTol = typeof spec.tol === 'number' && spec.tol >= 0, tol = hasTol ? spec.tol : CODE_TOL;
    var rows = [], first = null, passed = 0;
    for (var i = 0; i < tests.length; i++) {
      var r = result.results[i] || {}, t = tests[i];
      var row = { args: t.args, expect: t.expect };
      if (typeof r.error === 'string') { row.pass = false; row.error = r.error; }
      else { row.got = r.got; row.pass = codeEq(r.got, t.expect, tol, !hasTol); }
      if (row.pass) passed += 1; else if (first === null) first = i;
      rows.push(row);
    }
    var ok = passed === tests.length;
    return { ok: ok, parsed: passed + '/' + tests.length, attempt: true, tests: rows, first: first, stdout: result.stdout || '' };
  }
  // One line for the first failing test: "f(args) -> expected E, got G" (or the error it raised).
  function codeFailLine(spec, report) {
    if (!report || report.first === null || report.first === undefined) return '';
    var row = report.tests[report.first], call = (spec.entry || 'f') + '(' + showArgs(row.args) + ')';
    if (row.error) return call + ' raised ' + row.error;
    return call + ' -> expected ' + showVal(row.expect) + ', got ' + showVal(row.got);
  }

  // Ladder stage (docs/PACK_SCHEMA.md "ladder"). response: authored option index (choose), typed string (typed), or the
  // pyharness result of running the stage's `breaks` on the learner's input (counterexample). Same result shape as check.
  // A counterexample whose runner raised, timed out or is unavailable is no attempt (the message is shown).
  function checkLadderStage(stage, response) {
    if (!stage || typeof stage !== 'object') return bad('bad-spec');
    if (stage.type === 'choose') {
      var i = toIndex(response), opts = stage.options || [];
      if (i === null || i >= opts.length) return bad('unparsable', 'option');
      return { ok: opts[i].ok === true, parsed: i, attempt: true };
    }
    if (stage.type === 'typed') return check(stage.answer, response == null ? '' : String(response));
    if (stage.type === 'counterexample') {
      var r = response;
      if (!r || typeof r !== 'object') return bad('no-runtime', 'no runner result');
      if (r.status === 'timeout') return bad('timeout');
      if (r.status === 'unavailable') return bad('no-runtime', r.error || 'unavailable');
      if (r.status === 'error') return bad('runtime-error', r.error || 'error');
      if (r.status !== 'ok' || !Array.isArray(r.results) || r.results.length !== 1) return bad('no-runtime', 'malformed runner result');
      var row = r.results[0] || {};
      if (typeof row.error === 'string') return bad('runtime-error', row.error);
      if (row.got !== true && row.got !== false) return bad('runtime-error', 'breaks must return True or False');
      return { ok: row.got === true, parsed: row.got, attempt: true };
    }
    return bad('bad-spec', 'stage type');
  }

  // check(spec, typed) -> {ok, parsed, attempt, error?, detail?}
  function check(spec, typed) {
    if (!spec || typeof spec !== 'object') return bad('bad-spec');
    switch (spec.kind) {
      case 'numeric': return checkNumeric(spec, typed);
      case 'expression': return checkExpression(spec, typed);
      case 'mcq': return checkMcq(spec, typed);
      case 'multi': return checkMulti(spec, typed);
      case 'code': return checkCode(spec, typed);
      case 'ladder': return checkLadderStage(spec.stage, typed);   // spec = {kind:'ladder', stage}
      default: return bad('unsupported-kind', String(spec.kind));
    }
  }

  return {
    parseExpr: parseExpr,
    evalExpr: evalExpr,
    check: check,
    checkCode: checkCode,
    checkLadderStage: checkLadderStage,
    codeEq: codeEq,
    codeFailLine: codeFailLine,
    codeShow: showVal,
    codeArgs: showArgs,
    CODE_TOL: CODE_TOL,
    toLatex: toLatex,
    canon: canon,
    parseNumber: parseNumber,
    toIndex: toIndex,
    FORMS: FORMS
  };
});
