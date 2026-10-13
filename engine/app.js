/* problem-engine page: Today, Test (placement, level exam), drill, summary, Progress. All rules live in core.js;
 * checking in answer.js; persistence in store.js. */
(function () {
  'use strict';

  var PE = window.PE, A = window.PEAnswer, ST = window.PEStore, T = window.PEText, DATA = window.PE_DATA;
  var KEY = 'pe_' + DATA.pack.key;
  var IX = PE.index(DATA);
  var root = document.getElementById('root');
  var S = { tab: 'today', prog: null, readonly: false, notice: '', sess: null, reveal: null, summary: null,
    hint: '', msg: '', cardStart: 0, draft: '', ask: null, codeReport: null, placeResult: null, examResult: null, delta: null, showAll: false, lastView: '' };

  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  var esc = T.esc;
  // Math renders in the page, once per distinct field string (the cache lasts for the page). The KaTeX global is
  // inlined ahead of this script by the build. If it is missing, the TeX shows as typed.
  var mathCache = Object.create(null);
  function mathFn(tex, display) { return window.katex ? T.mathSpan(window.katex, tex, display) : esc(tex); }
  function md(s, inline) {
    var key = (inline ? 'i' : 'b') + (s == null ? '' : String(s));
    if (!(key in mathCache)) mathCache[key] = T.md(s, inline, mathFn);
    return mathCache[key];
  }
  function field(item, name, inline) { return md(item ? item[name] : '', inline); }
  // i is the authored (original) option index.
  function optHtml(item, i) { return md(item.answer.options[i], true); }
  // Mirrors core answerText: display, else the correct option(s) for mcq and multi, else the typed value.
  // The typed value is shown as typed (escaped, no math), so a learner's text never reaches KaTeX.
  function ansHtml(item, text) {
    var a = item.answer;
    if (a.display != null) return md(a.display, true);
    var kind = PE.itemKind(item);
    if (kind === 'mcq') return optHtml(item, a.correct);
    if (kind === 'multi') return a.correct.map(function (i) { return optHtml(item, i); }).join(', ');
    return T.md(text, true);
  }
  function techHtml(card) { return md(card.markdown); }
  function techName(id) { return IX.techById[id] ? IX.techById[id].name : id; }
  function levelLabel(id) {
    var lv = IX.levels.filter(function (l) { return l.id === id; })[0];
    return lv ? lv.id + ' · ' + lv.label : id;
  }
  function knownCount(prog) { return IX.techs.filter(function (x) { return PE.knownTech(prog.tech[x.id], x); }).length; }
  function masteredCount(prog) { return IX.techs.filter(function (x) { return prog.tech[x.id] && prog.tech[x.id].m === 1; }).length; }

  // ---- storage: core rules in store.js. A null storage (access throws) means read-only.
  function storageOrNull() { try { return window.localStorage || null; } catch (e) { return null; } }
  var store = ST.make(storageOrNull(), KEY, window.PE_BUILD);
  function save() { return store.save(S); }
  // D1: another tab wrote the progress key; this tab stops writing so it cannot overwrite that work.
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== null) return;
    S.readonly = true; S.notice = ST.MSG.otherTab;
    var b = document.getElementById('banner'); if (b) { b.hidden = false; b.textContent = S.notice; }
  });

  // M7 session resume: a Today session in progress is parked after every change (render, and each draft edit).
  // Any other state (finished, quit, placement or exam, no session) drops the parked record.
  var draftTimer = null;
  function syncSession() {
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }
    if (S.sess && !S.sess.kind) {
      if (!S.readonly) store.saveSession({ sess: PE.snapshotSession(S.sess), reveal: S.reveal, draft: S.draft, cs: S.cardStart }, Date.now());
    } else store.dropSession();
  }
  // Reopens the parked session at boot: same item and option order, the timer from its stamp. A record that does
  // not rebuild is dropped and the page opens on Today.
  function resumeParked() {
    var rec = store.readSession(Date.now());
    if (!rec) return false;
    try {
      S.sess = PE.restoreSession(IX, rec.sess);
      S.reveal = rec.reveal || null;
      S.draft = typeof rec.draft === 'string' ? rec.draft : '';
      S.cardStart = typeof rec.cs === 'number' ? rec.cs : Date.now();
      S.hint = ''; S.summary = null; S.ask = null;
      return true;
    } catch (e) {
      S.sess = null; S.reveal = null; store.dropSession();
      return false;
    }
  }

  // Explains why a typed answer was counted wrong, when the checker says so (no-valid-points and friends).
  var WHY = {
    'lowest-terms': 'Write the fraction in lowest terms.',
    'fraction-form': 'Write it as a fraction, like 1/2.',
    'literal-required': 'Type it as a number or a fraction, like 9/2.',
    'no-valid-points': 'Could not evaluate this expression at enough points.'
  };

  // ---- views
  function row(name, dev) {
    return '<li class="tst"><span>' + name + '</span>' + (dev ? '<span class="tsd">' + esc(dev) + '</span>' : '') + '</li>';
  }
  function pctInt(x) { return Math.floor(x * 100 + 1e-9); }
  // Hook for the sessions-to-go estimate (no model yet, SPEC 5): returns '' until one exists.
  function etaLine(level) { return ''; }   // non-empty results start with a space
  // "T3 opens at 70% of T2 known. Now 50%." while the gate holds; '' otherwise.
  function gateLine(gate) {
    if (!gate.held) return '';
    var next = gate.levels[gate.F], prev = gate.levels[gate.F - 1];
    return next.id + ' opens at ' + pctInt(IX.cfg.gate) + '% of ' + prev.id + ' known. Now ' + pctInt(prev.pct) + '%.' + etaLine(next.id);
  }
  // Learn row: the techniques coming, the gate sentence while it holds, else the reason.
  function learnNote(l, gate) {
    if (l.status === 'ready') {
      var list = l.techs && l.techs.length ? l.techs : (l.tech ? [l.tech] : []);
      return 'New: ' + list.map(function (t) { return techName(t.id); }).join(', ');
    }
    if (l.status === 'paused') return 'Paused';
    if (l.status === 'held') return gateLine(gate) || l.reason || '';
    return l.reason || '';
  }
  // A stage row is its name and count; a skipped or unusual stage says why instead.
  function stageNote(st) { return st.status === 'ready' ? String(st.count) : (st.reason || '0'); }
  // First level that is not fully known (the last one when all are).
  function currentLevel(prog) {
    var st = PE.levelStatus(prog, IX), i;
    for (i = 0; i < st.length; i++) if (st[i].total && st[i].known < st[i].total) return st[i];
    return st[st.length - 1];
  }
  function masteredIn(p, ts) { return ts.filter(function (x) { return p.tech[x.id] && p.tech[x.id].m === 1; }).length; }
  // 6px two-tone bar: known (mid tone) under mastered (ink).
  function bar(known, mastered, total) {
    var w = function (n) { return total ? Math.min(100, Math.round(n / total * 100)) : 0; };
    return '<div class="pvb" aria-hidden="true"><i class="pvk2" style="width:' + w(known) + '%"></i><i class="pvm" style="width:' + w(mastered) + '%"></i></div>';
  }
  function goalHtml(p, tap) {
    var l = currentLevel(p), ts = IX.techsByLevel[l.id] || [];
    var inner = '<span class="pvt"><span>' + esc(l.id) + '</span><span class="pvn">' + l.known + ' of ' + l.total + ' known</span></span>' + bar(l.known, masteredIn(p, ts), l.total);
    return tap ? '<button type="button" class="goalc" data-act="to-progress">' + inner + '</button>' : '<div class="goalc">' + inner + '</div>';
  }
  function viewToday() {
    var t = today(), plan = PE.buildPlan(S.prog, IX, t), gate = PE.gateState(S.prog, IX);
    var rows = row('Review', stageNote(plan.review)) + row('Learn', learnNote(plan.learn, gate)) +
      row('Micro', stageNote(plan.micro)) + row('Full', stageNote(plan.full));
    var action = plan.cards.length
      ? '<button type="button" class="primary" data-act="start">Start</button>'
      : '<p class="empty">Nothing due today.</p>';
    var pause = '<button type="button" class="ghost pause" data-act="pause-new"' + (S.readonly ? ' disabled' : '') + '>' +
      (S.prog.pauseNew ? 'Resume new techniques' : 'Pause new techniques') + '</button>';
    return '<section class="tdv card"><p class="anchor">Session ' + plan.n + '</p>' + goalHtml(S.prog, true) +
      '<ul class="tsts">' + rows + '</ul><div>' + action + '</div><p class="pause-row">' + pause + '</p></section>';
  }

  function stageLabel(card, sess) {
    if (sess && sess.kind === 'exam') return 'Exam';
    if (sess && sess.kind === 'place') return 'Placement';
    return card.stage === 'review' ? 'Review' : card.stage === 'learn' ? 'Learn' : card.stage === 'full' ? 'Full' : 'Micro';
  }

  // ---- code cards: Python in a Web Worker (Pyodide from the CDN, cached by sw.js after the first load)
  // The worker source and the harness arrive as inert text blocks inlined by build.sh. A run has a hard wall-clock
  // limit; past it the worker is terminated and the next run starts a fresh one (Pyodide files come from the cache).
  var PY_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  var PY_WALL_MS = 10000;
  var PY_LOAD_MS = 120000;   // Pyodide or a package still not loaded after this: the runtime counts as unavailable
  var PY_PACKAGES = ['numpy', 'pandas'];   // same allowlist as engine/pyworker.js and tools/validate_pack.js
  var PY_LOADING = 'Loading Python (one-time, ~10 MB)';
  var py = { worker: null, ready: null, run: null, seq: 0, loadedOnce: false };
  var C = { key: '', busy: false, msg: '', report: null, spec: null, down: false };
  function blockText(id) { var el = document.getElementById(id); return el ? el.textContent : ''; }
  function pyKill() { if (py.worker) py.worker.terminate(); py.worker = null; py.ready = null; }
  function pyFinish(res) {
    var r = py.run; if (!r) return;
    py.run = null; clearTimeout(r.timer); clearTimeout(r.loadTimer); r.resolve(res);
  }
  function pyStart() {
    if (py.ready) return py.ready;
    py.ready = new Promise(function (resolve, reject) {
      var w;
      try { w = new Worker(URL.createObjectURL(new Blob([blockText('pe-pyworker')], { type: 'text/javascript' }))); }
      catch (e) { reject(e); return; }
      py.worker = w;
      // A first visit offline, or a CDN that never answers: give up after PY_LOAD_MS instead of spinning forever.
      var loadTimer = setTimeout(function () { if (py.worker === w) pyKill(); reject(new Error('Python took too long to load')); }, PY_LOAD_MS);
      w.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'status') { if (!py.loadedOnce || /^Loading /.test(m.msg)) setCodeMsg(m.msg === 'Loading Python' ? PY_LOADING : m.msg + '...'); }
        else if (m.type === 'ready') { clearTimeout(loadTimer); py.loadedOnce = true; resolve(w); }
        else if (m.type === 'fatal') { clearTimeout(loadTimer); reject(new Error(m.error)); }
        else if (m.type === 'started') {
          if (py.run && py.run.id === m.id) { clearTimeout(py.run.loadTimer); py.run.timer = setTimeout(function () { pyKill(); pyFinish({ status: 'timeout' }); }, PY_WALL_MS); }
        }
        else if (m.type === 'done') { if (py.run && py.run.id === m.id) { var res; try { res = JSON.parse(m.json); } catch (er) { res = { status: 'unavailable', error: 'bad runner output' }; } pyFinish(res); } }
        // fail = packages did not load or Pyodide itself broke: start a fresh worker next time.
        else if (m.type === 'fail') { if (py.run && py.run.id === m.id) { pyKill(); pyFinish({ status: 'unavailable', error: m.error }); } }
      };
      w.onerror = function (e) { var msg = e && e.message ? e.message : 'worker error'; clearTimeout(loadTimer); pyKill(); reject(new Error(msg)); pyFinish({ status: 'unavailable', error: msg }); };
      w.postMessage({ type: 'init', base: PY_BASE, harness: blockText('pe-pyharness') });
    });
    py.ready.catch(function () { pyKill(); });
    return py.ready;
  }
  // Resolves to the harness result object ({status:'ok'|'error'|'timeout'|'unavailable', ...}); never rejects.
  function pyRun(spec, src) {
    return pyStart().then(function (w) {
      return new Promise(function (resolve) {
        var id = ++py.seq;
        var pk = (spec.packages || []).filter(function (p) { return PY_PACKAGES.indexOf(p) >= 0; });
        py.run = { id: id, resolve: resolve, timer: null,
          loadTimer: setTimeout(function () { pyKill(); pyFinish({ status: 'unavailable', error: 'packages took too long to load' }); }, PY_LOAD_MS) };
        w.postMessage({ type: 'run', id: id, user: src, setup: spec.setup || '', entry: spec.entry,
          tests: JSON.stringify(spec.tests.map(function (t) { return { args: t.args }; })), packages: pk });
      });
    }).catch(function (err) { return { status: 'unavailable', error: String(err && err.message || err) }; });
  }
  function codeKey() { var c = S.sess && PE.currentCard(S.sess); return c && c.type === 'code' ? S.sess.pos + '|' + c.id : ''; }
  function setCodeMsg(msg) { C.msg = msg; paintCode(); }
  function resultLine(rep, spec) {
    if (rep.error === 'timeout') return 'Timed out after ' + (PY_WALL_MS / 1000) + ' s. Look for a loop that never ends.';
    if (rep.error === 'runtime-error') return 'Error: ' + rep.detail;
    if (rep.error) return 'Python is not available: ' + String(rep.detail || rep.error).replace(/[.\s]+$/, '') + '. Check your connection and try again.';
    return '';
  }
  // One row per test: pass/fail, the call, and for a fail what was expected and what came back.
  function testsHtml(entry, tests) {
    if (!tests || !tests.length) return '';
    return '<ul class="tests">' + tests.map(function (t) {
      var detail = t.pass ? '' : t.error ? ' raised ' + t.error
        : ' expected ' + A.codeShow(t.expect) + ', got ' + A.codeShow(t.got);
      return '<li class="' + (t.pass ? 'pass' : 'fail') + '"><b>' + (t.pass ? 'pass' : 'fail') + '</b> ' +
        esc(entry + '(' + A.codeArgs(t.args) + ')' + detail) + '</li>';
    }).join('') + '</ul>';
  }
  // The area under the editor: loading line, per-test results after Run, program output. When Python cannot load,
  // a Skip button moves on without counting an attempt (no credit either). Placement has its own I don't know.
  function codeOutHtml() {
    var spec = C.spec, rep = C.report, h = '';
    if (C.msg) h += '<p class="note">' + esc(C.msg) + '</p>';
    if (rep) {
      var line = resultLine(rep, spec);
      if (line) h += '<p class="bad-line">' + esc(line) + '</p>';
      h += testsHtml(spec.entry, rep.tests);
      if (rep.stdout) h += '<pre class="stdout">' + esc(rep.stdout) + '</pre>';
    }
    if (C.down && !C.busy && S.sess && S.sess.kind !== 'place') {
      h += '<button type="button" class="ghost" data-act="code-skip">Skip this card (no credit, not counted)</button>';
    }
    return h;
  }
  // Python is unavailable: leave the card unanswered and move on (nothing recorded for the item).
  function skipCode() {
    var card = S.sess && PE.currentCard(S.sess);
    if (!card || card.type !== 'code' || S.reveal || C.busy || !C.down || S.sess.kind === 'place') return;
    S.codeReport = null;
    step();
  }
  // A new card clears the previous card's report and message. Call before setting C.msg for the card.
  function syncCodeKey() {
    var key = codeKey();
    if (C.key !== key) { C.key = key; C.report = null; C.busy = false; C.msg = ''; C.down = false; }
  }
  function paintCode() {
    var el = document.getElementById('code-out');
    if (!el) return;
    syncCodeKey();
    el.innerHTML = codeOutHtml();
    var btns = document.querySelectorAll('#codeform button');
    Array.prototype.forEach.call(btns, function (b) { b.disabled = C.busy; });
  }
  // Starts loading Python when a code card first shows. Silent once ready.
  function warmCode() {
    var card = S.sess && PE.currentCard(S.sess);
    if (!card || card.type !== 'code' || S.reveal) return;
    syncCodeKey(); C.spec = card.item.answer;
    if (py.ready || py.loadedOnce) { paintCode(); return; }
    C.msg = PY_LOADING; paintCode();
    pyStart().then(function () { if (C.msg === PY_LOADING) { C.msg = ''; C.down = false; paintCode(); } },
      function (err) { C.down = true; C.msg = 'Python did not load (' + String(err && err.message || 'offline').replace(/[.\s]+$/, '') + '). Check your connection; it retries when you press Run.'; paintCode(); });
  }
  // mode 'run': show the per-test results and nothing else. mode 'check': grade, count the attempt, reveal.
  function runCode(mode) {
    var card = S.sess && PE.currentCard(S.sess), ta = document.getElementById('ans');
    if (!card || card.type !== 'code' || !ta || C.busy) return;
    var src = ta.value;
    if (!src.trim()) { S.hint = 'Write some code first.'; var h0 = root.querySelector('.hint'); if (h0) h0.textContent = S.hint; return; }
    S.draft = src; S.hint = ''; var h1 = root.querySelector('.hint'); if (h1) h1.textContent = '';
    syncCodeKey(); C.spec = card.item.answer; C.busy = true; C.report = null;
    C.msg = py.ready || py.loadedOnce ? 'Running...' : PY_LOADING;
    paintCode();
    pyRun(C.spec, src).then(function (res) {
      var cur = S.sess && PE.currentCard(S.sess);
      if (cur !== card || S.reveal) return;   // the card moved on while Python ran
      C.busy = false; C.msg = '';
      var rep = A.checkCode(C.spec, res);
      C.report = rep; C.down = rep.attempt === false && rep.error === 'no-runtime';
      if (mode === 'run' || rep.attempt === false) { paintCode(); return; }
      S.codeReport = rep;
      answer(res);
    });
  }

  // Reveal: a rule under the answer, growing down. Verdict, the answer when wrong, the solution, the facts that are
  // not routine, then Next last. The option or field carries the right/wrong state (answeredBody).
  function revealHtml(card, r) {
    var notes = [], name = techName(card.tech);
    if (!r.ok && WHY[r.error]) notes.push(WHY[r.error]);
    if (r.mastered) notes.push('Mastered: ' + name + '.');
    if (r.requeue) notes.push('Back later in this session. No credit.');
    else if (card.requeued) notes.push('Practice only. No credit.');
    else if (r.choiceNote) notes.push('Choice cards hold the streak here. Type an answer to earn credit.');
    var ans = r.ok || card.type === 'code' ? '' : '<p class="answer">Answer: ' + ansHtml(card.item, r.answer) + '</p>';
    if (card.type === 'code' && r.code) {
      var cl = r.code.err || '';
      if (!r.ok && cl) ans = '<p class="answer">' + esc(cl) + '</p>';
      if (!r.ok && r.code.tests) ans += testsHtml(card.item.answer.entry, r.code.tests);
      if (r.code.stdout) ans += '<pre class="stdout">' + esc(r.code.stdout) + '</pre>';
      if (!r.ok && r.code.parsed && /^\d+\/\d+$/.test(r.code.parsed)) notes.unshift(r.code.parsed.split('/')[0] + ' of ' + r.code.parsed.split('/')[1] + ' tests pass.');
    }
    return '<div class="reveal ' + (r.ok ? 'ok' : 'bad') + '">' +
      '<p class="verdict">' + (r.ok ? 'Right.' : 'Not quite.') + '</p>' + ans +
      (card.type === 'code' && r.code && r.code.src ? '<h3 class="mine-h">Your code</h3><pre class="mine">' + esc(r.code.src) + '</pre>' : '') +
      '<div class="prose">' + field(card.item, 'solution') + '</div>' +
      (notes.length ? '<p class="note">' + esc(notes.join(' ')) + '</p>' : '') +
      '<button type="button" class="primary" data-act="continue">Next</button></div>';
  }

  // The answered card's body: the options (or the typed field) stay in place with the verdict on them.
  function answeredBody(card, r) {
    var a = card.item.answer;
    if (card.type === 'mcq') {
      return '<div class="opts">' + card.order.map(function (orig) {
        var cls = orig === a.correct ? ' ok' : (orig === r.chosen ? ' bad' : '');
        return '<button type="button" class="opt' + cls + '" disabled>' + optHtml(card.item, orig) + '</button>';
      }).join('') + '</div>';
    }
    if (card.type === 'multi') {
      var picked = Array.isArray(r.chosen) ? r.chosen : [];
      return '<div class="multi"><div class="checks">' + card.order.map(function (orig) {
        var right = a.correct.indexOf(orig) >= 0, on = picked.indexOf(orig) >= 0;
        var cls = right ? ' ok' : (on ? ' bad' : '');
        return '<label class="check' + cls + '"><input type="checkbox" disabled' + (on ? ' checked' : '') + '><span>' + optHtml(card.item, orig) + '</span></label>';
      }).join('') + '</div></div>';
    }
    if (card.type === 'code') return '';
    return r.typed != null && String(r.typed) !== '' ? '<div class="field ' + (r.ok ? 'ok' : 'bad') + '">' + esc(String(r.typed)) + '</div>' : '';
  }

  // The problem body for a playable card: options, multi checks, or the typed box.
  function cardBody(card) {
    var body;
    if (card.type === 'mcq') {
      body = '<div class="opts">' + card.order.map(function (orig, i) {
        return '<button type="button" class="opt" data-act="opt" data-i="' + i + '">' + optHtml(card.item, orig) + '</button>';
      }).join('') + '</div>';
    } else if (card.type === 'multi') {
      body = '<form class="multi" id="multi" autocomplete="off"><fieldset class="checks"><legend class="sr">Select all that apply</legend>' +
        card.order.map(function (orig, i) {
          return '<label class="check"><input type="checkbox" name="pick" value="' + i + '"><span>' + optHtml(card.item, orig) + '</span></label>';
        }).join('') + '</fieldset>' +
        '<button type="submit" class="primary">Check</button></form>';
    } else if (card.type === 'code') {
      var a0 = card.item.answer, pk = (a0.packages || []).length ? ' Uses ' + a0.packages.join(' and ') + '.' : '';
      body = '<form class="code" id="codeform" autocomplete="off">' +
        '<textarea id="ans" class="editor" rows="10" spellcheck="false" autocapitalize="off" autocorrect="off" wrap="off" aria-label="Your Python code"></textarea>' +
        '<p class="note">Define <code>' + esc(a0.entry) + '</code>.' + esc(pk) + ' Run tests shows each test; Check counts.</p>' +
        '<div class="code-actions"><button type="button" class="ghost" data-act="run">Run tests</button>' +
        '<button type="submit" class="primary">Check</button></div></form><div id="code-out" class="code-out" aria-live="polite"></div>';
    } else {
      var ph = card.type === 'expression' ? 'e.g. x^2/2 or sqrt(1-x^2)' : 'e.g. 7, 0.5 or 9/2';
      body = '<form class="typed" id="typed" autocomplete="off"><input id="ans" inputmode="text" autocapitalize="off" ' +
        'autocorrect="off" spellcheck="false" placeholder="' + ph + '" aria-label="Your answer">' +
        '<button type="submit" class="primary">Check</button></form>';
      if (card.type === 'expression') {
        body += '<p class="echo" id="echo" aria-live="polite"></p>';
        var dv = card.item.answer.vars || [];
        if (dv.length) body += '<p class="note vars">Variables: ' + dv.map(esc).join(', ') + '</p>';
      }
    }
    return body;
  }

  // Header: the step names the card; the right side counts what is left and offers End during a drill.
  function stepTitle() {
    if (S.summary) return 'Done';
    if (S.sess) { var c = PE.currentCard(S.sess); return c ? (c.type === 'teach' ? 'Learn' : stageLabel(c, S.sess)) : DATA.pack.name; }
    return S.tab === 'progress' ? 'Progress' : S.tab === 'test' ? 'Test' : 'Today';
  }
  // Planned cards still unanswered: requeued copies, lessons and the answered current card do not count.
  function cardsLeft() {
    var sess = S.sess, n = 0, i, c, cur = PE.currentCard(sess);
    for (i = sess.pos; i < sess.queue.length; i++) {
      c = sess.queue[i];
      if (c.requeued || c.type === 'teach') continue;
      if (c === cur && (c.type === 'full' ? c.graded : (S.reveal && sess.kind !== 'place'))) continue;
      n++;
    }
    return n;
  }
  function headRight() {
    if (!S.sess) return !S.summary && S.tab === 'today' ? '<span class="pk">' + esc(DATA.pack.name) + '</span>' : '';
    return '<span class="score">' + cardsLeft() + ' left</span>' +
      (S.ask === 'quit' ? '' : '<button type="button" class="end" data-act="quit">End</button>');
  }
  function viewDrill() {
    var sess = S.sess, card = PE.currentCard(sess);
    var quitText = sess.kind === 'place' ? 'End the test? Nothing is saved.' : 'End this session? Answers so far are saved.';
    var head = '';
    if (S.ask === 'quit') {
      head += '<div class="confirm"><p>' + quitText + '</p>' +
        '<button type="button" class="danger" data-act="quit-yes">End</button> ' +
        '<button type="button" class="ghost" data-act="cancel">Keep going</button></div>';
    }
    if (card.type === 'teach') {
      var tc = IX.techById[card.tech];
      return head + '<p class="anchor">' + esc((tc ? tc.level + ', ' : '') + card.name) + '</p><article class="card" style="margin-top:12px">' +
        T.figure(card.figure) + '<div class="prose teach">' + techHtml(card) + '</div>' +
        '<button type="button" class="primary" data-act="continue">Start problems</button></article>';
    }
    if (card.type === 'full') return head + viewFull(card);
    var body = '<div class="card"><div class="drill-body">' + T.figure(card.item && card.item.figure) + '<div class="prose">' + field(card.item, 'prompt') + '</div>';
    if (sess.kind === 'place') {
      // Placement gives no feedback: the probe is answered and the next one opens.
      body += cardBody(card) + '<button type="button" class="ghost dk" data-act="dk">I don\'t know</button>';
    } else if (S.reveal) {
      body += answeredBody(card, S.reveal);
    } else {
      body += cardBody(card);
    }
    body += '<p class="hint">' + esc(S.hint) + '</p></div>';
    if (sess.kind !== 'place' && S.reveal) body += revealHtml(card, S.reveal);
    return head + body + '</div>';
  }

  // ---- full problem (timed commit, reveal, rubric self-grade, grade)
  function mmss(sec) { var s = Math.max(0, Math.floor(sec)); return Math.floor(s / 60) + ':' + p2(s % 60); }
  var GRADE_WORD = { 2: 'clean', 1: 'holds', 0: 'missed' };
  // Live clock for a full card that is not yet committed. Reads Date.now on every call, so a hidden tab catches up.
  function clockRead() {
    var card = S.sess && PE.currentCard(S.sess);
    if (!card || card.type !== 'full' || card.commit) return null;
    return PE.clockFor(S.cardStart, card.budgetSec, Date.now)();
  }
  function clockLabel(c, budget) { return c.over ? '+' + mmss(c.elapsed - budget) + ' over' : mmss(c.left) + ' left'; }
  var clockHandle = null;
  function tickClock() {
    var el = document.getElementById('clock'), card = S.sess && PE.currentCard(S.sess), c = clockRead();
    if (!el || !c) return stopClock();
    el.textContent = clockLabel(c, card.budgetSec);
    el.className = 'clock' + (c.over ? ' over' : '');
  }
  function startClock() { if (!clockHandle) clockHandle = setInterval(tickClock, 1000); tickClock(); }
  function stopClock() { if (clockHandle) { clearInterval(clockHandle); clockHandle = null; } }
  document.addEventListener('visibilitychange', tickClock);
  document.addEventListener('visibilitychange', function () { if (document.hidden && draftTimer) syncSession(); });
  window.addEventListener('pagehide', function () { if (draftTimer) syncSession(); });
  function rubricHtml(item, i) { return md(item.rubric[i].text, true); }
  function viewFull(card) {
    var item = card.item, c = card.commit, g = card.graded, budget = card.budgetSec;
    var numeric = card.kind !== 'mcq';
    var meta = '<p class="kicker">Timed problem · budget ' + mmss(budget) + '</p>';
    var prompt = T.figure(item.figure) + '<div class="prose">' + field(item, 'prompt') + '</div>';
    if (!c) {
      var live = clockRead();
      var clock = '<p class="clock" id="clock">' + (live ? clockLabel(live, budget) : '') + '</p>';
      var body;
      if (card.kind === 'mcq') {
        body = '<div class="opts">' + card.order.map(function (orig, i) {
          return '<button type="button" class="opt" data-act="opt" data-i="' + i + '">' + optHtml(item, orig) + '</button>';
        }).join('') + '</div>';
      } else {
        body = '<form class="typed" id="typed" autocomplete="off"><input id="ans" inputmode="text" autocapitalize="off" ' +
          'autocorrect="off" spellcheck="false" placeholder="e.g. 7, 0.5 or 9/2" aria-label="Your answer">' +
          '<button type="submit" class="primary">Commit</button></form>';
      }
      return '<div class="card full"><div class="drill-body">' + meta + clock + prompt + body + '<p class="hint">' + esc(S.hint) + '</p></div></div>';
    }
    var committed = '<p class="kicker">Committed at ' + mmss(c.seconds) + ' of ' + mmss(budget) + (c.over ? ' · over budget' : '') + '</p>';
    if (!g) {
      var list = '<fieldset class="checks rubric"><legend class="note">Self-grade the method. Check each step you did.</legend>' +
        item.rubric.map(function (r, i) {
          return '<label class="check"><input type="checkbox" name="tick" value="' + i + '"><span>' + rubricHtml(item, i) +
            ' <small class="weight">(' + esc(String(r.weight)) + ')</small></span></label>';
        }).join('') + '</fieldset>';
      return '<div class="card full"><div class="drill-body">' + meta + committed + '</div>' +
        '<div class="reveal ' + (c.ok ? 'ok' : 'bad') + '"><p class="verdict">' + (c.ok ? 'Committed right' : 'Committed wrong') + '</p>' +
        (c.ok ? '' : '<p class="answer">Answer: ' + ansHtml(item, String(item.answer.value)) + '</p>') +
        '<div class="prose">' + field(item, 'solution') + '</div>' +
        '<form id="rubric" class="rubric-form" autocomplete="off">' + list +
        '<button type="submit" class="primary">Grade</button></form></div></div>';
    }
    // Grade screen: one grade line, then only the facts that are not routine. The solution was shown at the reveal.
    var name = techName(card.tech), fx = g.effects, facts = [];
    if (g.grade < 2 && g.score < g.pass) facts.push('Rubric ' + g.score + ' of ' + g.total + ', pass at ' + g.pass + '.');
    if (c.over) facts.push('Over budget: ' + mmss(c.seconds) + ' of ' + mmss(budget) + '.');
    if (fx.mastered) facts.push('Mastered: ' + name + '.');
    if (fx.reset) facts.push('Streak reset: ' + name + '.');
    if (fx.weak.length) facts.push('Weak, next Micro starts with: ' + fx.weak.map(techName).join(', ') + '.');
    var why = facts.length ? '<ul class="why">' + facts.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '';
    return '<div class="card full"><div class="drill-body">' + meta + committed + '</div>' +
      '<div class="reveal grade g' + g.grade + '"><p class="verdict">Grade ' + g.grade + ' of 2, ' + GRADE_WORD[g.grade] + '.</p>' + why +
      '<button type="button" class="primary" data-act="continue">Next</button></div></div>';
  }

  // A 44px row: technique name and the prompt's first line; a tap shows the answer and the solution in place.
  function missRowHtml(id, prompt, answer, solution) {
    var it = IX.itemById[id], tid = it && it.tags ? it.tags[0] : '';
    var first = String(it ? it.prompt : prompt || '').split('\n')[0];
    var ans = it ? ansHtml(it, answer) : T.md(answer, true);
    var sol = it ? field(it, 'solution') : md(solution);
    return '<div class="mrow"><button type="button" class="mtap" data-act="miss" aria-expanded="false">' +
      (tid ? '<span class="mn">' + esc(techName(tid)) + '</span>' : '') + '<span class="mg">' + md(first, true) + '</span></button>' +
      '<div class="mfull" hidden>' + (ans ? '<p class="answer">Answer: ' + ans + '</p>' : '') + '<div class="prose">' + sol + '</div></div></div>';
  }
  function missesHtml(rows, title) {
    return '<div><h3>' + (title || 'Missed') + '</h3><div class="mlist">' + rows.join('') + '</div></div>';
  }
  // One signed delta line in hero style: "+3 mastered  +2 started". Nothing moved: no line.
  function heroLine(parts) {
    if (!parts.length) return '';
    return '<p class="pvds pvin">' + parts.map(function (d) { return '<span class="pvd"><b>+' + d[0] + '</b> ' + d[1] + '</span>'; }).join('') + '</p>';
  }
  // Session done: the count, what moved, what was missed (expand in place), back to Today.
  function viewSummary() {
    var s = S.summary, deltas = [];
    if (s.mastered.length) deltas.push([s.mastered.length, 'mastered']);
    if (s.introduced.length) deltas.push([s.introduced.length, 'started']);
    var miss = s.missed.map(function (m) { return missRowHtml(m.id, m.prompt, m.answer, m.solution); });
    return '<section class="pv done card"><p class="anchor">Session ' + s.n + ' done</p>' +
      (s.scored ? '<p class="big">' + s.right + ' of ' + s.scored + '</p>' : '') + heroLine(deltas) +
      (s.scored ? (miss.length ? missesHtml(miss) : '<p class="pvk">No misses.</p>') : '') +
      '<button type="button" class="primary" data-act="home">Back to Today</button></section>';
  }

  // ---- Test tab: placement (SPEC 6) and the level exam (SPEC 2.6)
  function placeResultHtml(r) {
    // A level with nothing asked is hidden. Skipped buckets fold into one row per run; skips after the last asked tier are dropped.
    var ent = [], run = [];
    function flush() {
      if (!run.length) return;
      var lbl = run.length > 1 ? run[0].tier + ' to ' + run[run.length - 1].tier : run[0].tier;
      ent.push({ skip: true, h: '<tr><td>' + esc(lbl) + '</td><td>skipped: ' + esc(run[0].reason) + '</td></tr>' });
      run = [];
    }
    r.buckets.forEach(function (b) {
      if (b.status === 'skip') { if (run.length && run[0].reason.replace(/^\S+ /, '') !== b.reason.replace(/^\S+ /, '')) flush(); run.push(b); return; }
      flush();
      if (!b.asked) return;
      ent.push({ skip: false, h: '<tr><td>' + esc(b.tier) + '</td><td>' + b.right + ' of ' + b.asked + '</td></tr>' });
    });
    flush();
    while (ent.length && ent[ent.length - 1].skip) ent.pop();
    var rows = ent.map(function (e) { return e.h; }).join('');
    var through = r.placed && r.placed.length ? 'Placed through ' + esc(r.placed[r.placed.length - 1]) + '.' : 'Placed at the start.';
    return (rows ? '<table class="ptab"><thead><tr><th>Tier</th><th>Right</th></tr></thead><tbody>' + rows + '</tbody></table>' : '') +
      '<p class="note">' + through + '</p>';
  }
  function examResultHtml(x) {
    var need = Math.ceil(PE.EXAM_PASS * x.total);
    return '<div><h3>Level exam</h3><p class="med">' + esc(x.level) + ': ' + x.right + ' of ' + x.total + '</p>' +
      '<p class="note">' + (x.pass ? 'Passed. ' + x.fp.length + ' techniques marked known.' : 'Not passed. Need ' + need + '.') + '</p></div>';
  }
  function viewTest() {
    var p = S.prog, ro = S.readonly ? ' disabled' : '', html = '<section class="pv card">';
    if (p.placedOnce) {
      html += '<div><p class="med">Next: ' + esc(p.pl || 'none') + '</p>' + (S.placeResult ? placeResultHtml(S.placeResult) : '') + '</div>';
    } else {
      html += '<div><p class="med">Not placed yet.</p>' +
        '<p class="note">About 5 problems per level. No feedback until the end. "I don\'t know" scores 0.</p>' +
        '<button type="button" class="primary" data-act="place"' + ro + '>Place me</button></div>';
    }
    var lx = PE.examLevel(p, IX);
    if (lx) {
      html += '<div><h3>Level exam</h3><p class="note">' + esc(lx.id + ' · ' + lx.label) + '. 8 micro and 2 full problems. ' +
        'Pass at 70% marks the techniques you got right as known.</p>' +
        '<button type="button" class="primary" data-act="exam"' + ro + '>Start exam</button></div>';
    }
    if (S.placeResult && !p.placedOnce) html += '<div>' + placeResultHtml(S.placeResult) + '</div>';
    if (S.examResult) html += examResultHtml(S.examResult);
    if (S.readonly) html += '<p class="note">Read-only: nothing is saved.</p>';
    html += '<p class="data-msg">' + esc(S.msg) + '</p></section>';
    return html;
  }
  function startPlacement() {
    if (S.readonly) return;
    var sess = PE.startPlacement(S.prog, IX);
    if (!sess) { S.msg = 'Nothing to test yet.'; render(); return; }
    S.sess = sess; S.reveal = null; S.hint = ''; S.draft = ''; S.summary = null; S.ask = null;
    S.placeResult = null; S.examResult = null; S.msg = ''; S.cardStart = Date.now();
    render();
  }
  function startExam() {
    if (S.readonly) return;
    var sess = PE.startExam(S.prog, IX, today());
    if (!sess) { S.msg = 'No exam ready.'; render(); return; }
    S.sess = sess; S.reveal = null; S.hint = ''; S.draft = ''; S.summary = null; S.ask = null;
    S.placeResult = null; S.examResult = null; S.msg = ''; S.cardStart = Date.now();
    save(); render();
  }
  function finishPlacement() {
    var res = S.sess.result;
    S.placeResult = res; S.sess = null;
    if (!S.readonly) { PE.applyPlacement(S.prog, IX, res); save(); }
    render();
  }
  function finishExam() {
    S.examResult = PE.finishExam(S.prog, IX, S.sess); S.sess = null; S.tab = 'test';
    save(); render();
  }

  // ---- Progress v2: hero, goal bar, level blocks (settled and far levels behind Show all), recent misses, settings
  function techsHtml(p, ts) {
    if (!ts.length) return '';
    return '<details class="pvtech"><summary>Techniques</summary>' + ts.map(function (x) {
      var r = p.tech[x.id] || {};
      var st = r.m ? 'mastered' : (r.s > 0 ? 'streak ' + r.s : 'new');
      return '<p class="pvt"><span>' + esc(x.name) + '</span><span class="pvn">' + st + '</span></p>';
    }).join('') + '</details>';
  }
  function levelBlock(p, l, gate) {
    var ts = IX.techsByLevel[l.id] || [];
    var mastered = masteredIn(p, ts);
    var started = ts.filter(function (x) { return PE.isIntro(p, x.id); }).length;
    var waiting = gate.held && gate.levels[gate.F].id === l.id;
    var detail = waiting ? gateLine(gate) : (started ? mastered + ' mastered · ' + started + ' started' : '');
    return '<div class="pvl' + (waiting ? ' pvo' : '') + '"><p class="pvt"><span>' + esc(l.id + ' · ' + l.label) + '</span>' +
      '<span class="pvn">' + l.known + ' of ' + l.total + ' known</span></p>' + bar(l.known, mastered, l.total) +
      (detail ? '<p class="pvs">' + esc(detail) + '</p>' : '') + techsHtml(p, ts) + '</div>';
  }
  function recentMisses(p) {
    var rm = Array.isArray(p.rm) ? p.rm : [];
    return rm.filter(function (x) { return x && typeof x.id === 'string' && IX.itemById[x.id]; }).slice(0, 5);
  }
  // Theme: its own key (pe_<key>_theme); unset follows the system.
  var THEME_KEY = KEY + '_theme';
  function applyTheme(v) {
    if (v) document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme');
  }
  function isDark() {
    var a = document.documentElement.getAttribute('data-theme');
    if (a) return a === 'dark';
    try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; }
  }
  function loadTheme() {
    try { var ls = storageOrNull(), v = ls && ls.getItem(THEME_KEY); if (v === 'dark' || v === 'light') applyTheme(v); } catch (e) { /* unreadable: follow the system */ }
  }
  function toggleTheme() {
    var v = isDark() ? 'light' : 'dark';
    applyTheme(v);
    try { var ls = storageOrNull(); if (ls) ls.setItem(THEME_KEY, v); } catch (e) { /* theme lasts this visit */ }
    render();
  }
  function viewProgress() {
    var p = S.prog, st = PE.levelStatus(p, IX), gate = PE.gateState(p, IX), n = p.sessions;
    var html = '<section class="pv card"><p class="anchor">' + n + (n === 1 ? ' session' : ' sessions') + '</p>' +
      '<p class="pvds"><span class="pvd"><b>' + masteredCount(p) + '</b> mastered</span></p>';
    if (S.delta) html += '<p class="pvk">' + esc(S.delta) + '</p>';
    var lo;
    var firstOpen = -1;
    st.forEach(function (l, i) { if (firstOpen < 0 && l.total && l.known < l.total) firstOpen = i; });
    lo = firstOpen < 0 ? st.length - 1 : firstOpen;
    var hi = Math.min(st.length - 1, Math.max(lo + 1, gate.held ? gate.F : 0));
    var shown = S.showAll ? st : st.slice(lo, hi + 1);
    html += '<div class="pvls">' + shown.map(function (l) { return levelBlock(p, l, gate); }).join('') + '</div>';
    if (st.length > hi - lo + 1) html += '<button type="button" class="chip pvall" data-act="show-all">' + (S.showAll ? 'Show less' : 'Show all') + '</button>';
    var misses = recentMisses(p);
    if (misses.length) html += missesHtml(misses.map(function (x) { return missRowHtml(x.id, '', x.a, ''); }), 'Recent misses');
    var resetPart = S.ask === 'reset'
      ? '<div class="confirm"><p>Reset all progress? A backup is kept in this browser.</p>' +
        '<button type="button" class="danger" data-act="reset-yes">Reset progress</button> ' +
        '<button type="button" class="ghost" data-act="cancel">Keep progress</button></div>'
      : '';
    html += '<div><h3>Settings</h3><div class="chips" style="margin-top:8px">' +
      '<button type="button" class="chip' + (isDark() ? ' on' : '') + '" data-act="theme" aria-pressed="' + isDark() + '">Dark theme</button>' +
      '<button type="button" class="chip" data-act="export">Export</button>' +
      '<label class="chip">Import<input type="file" id="import" accept="application/json,.json"></label>' +
      (S.ask === 'reset' ? '' : '<button type="button" class="chip danger" data-act="reset">Reset</button>') + '</div>' +
      resetPart + '<p class="data-msg">' + esc(S.msg) + '</p></div></section>';
    return html;
  }
  // Entering Progress: the change since the last visit, then the new visit point is saved.
  function visitProgress() {
    var p = S.prog, old = p.pv || {};
    var now = { sn: p.sessions, k: knownCount(p), m: masteredCount(p), full: Object.keys(p.full).length };
    var parts = [];
    [['sn', 'session', 'sessions'], ['k', 'known', 'known'], ['m', 'mastered', 'mastered'], ['full', 'full problem', 'full problems']]
      .forEach(function (d) {
        var n = (now[d[0]] || 0) - (old[d[0]] || 0);
        if (n > 0) parts.push('+' + n + ' ' + (n === 1 ? d[1] : d[2]));
      });
    S.delta = parts.length ? 'Since last visit: ' + parts.join(' · ') + '.' : null;
    p.pv = now;
    save();
  }

  // Live "what was understood" line for expression input. Parse errors show here and on submit; no attempt is counted.
  function updateEcho() {
    var el = document.getElementById('echo');
    if (!el || !S.sess) return;
    var card = PE.currentCard(S.sess), txt = S.draft.trim();
    if (!txt) { el.className = 'echo'; el.textContent = 'Type the expression, for example x^2/2.'; return; }
    var pr = A.parseExpr(txt, card.item.answer.vars || []);
    if (pr.error) { el.className = 'echo bad'; el.textContent = 'Not read: ' + pr.error; return; }
    var shown;
    try { shown = A.canon(pr.ast); } catch (e) { el.className = 'echo bad'; el.textContent = 'Not read: expression too deep'; return; }   // A6
    el.className = 'echo';
    el.textContent = 'Read as ' + shown;
  }

  // The scroll resets when the view or the card changes, not when an answer opens the reveal (the stimulus stays put).
  function viewKey() {
    if (S.summary) return 'summary';
    if (S.sess) {
      var c = PE.currentCard(S.sess);
      return 'd' + S.sess.pos + ':' + (c && c.type === 'full' ? (c.commit ? 1 : 0) + '' + (c.graded ? 1 : 0) : '');
    }
    return S.tab;
  }
  function render() {
    syncSession();
    var nav = document.getElementById('tabs'), tabs = !(S.sess || S.summary);
    nav.hidden = !tabs;
    document.body.classList.toggle('hastabs', tabs);
    ['today', 'test', 'progress'].forEach(function (t) {
      document.getElementById('tab-' + t).setAttribute('aria-selected', String(S.tab === t));
    });
    var banner = document.getElementById('banner');
    banner.hidden = !S.notice;
    banner.textContent = S.notice;
    if (S.summary) root.innerHTML = viewSummary();
    else if (S.sess) root.innerHTML = viewDrill();
    else if (S.tab === 'progress') root.innerHTML = viewProgress();
    else if (S.tab === 'test') root.innerHTML = viewTest();
    else root.innerHTML = viewToday();
    document.getElementById('pack-name').textContent = stepTitle();
    document.getElementById('hdr-right').innerHTML = headRight();
    if (clockRead()) startClock(); else stopClock();
    var vk = viewKey();
    if (vk !== S.lastView) { S.lastView = vk; window.scrollTo(0, 0); }
    var inp = document.getElementById('ans');
    if (inp && S.sess && !S.reveal) {
      var cc = PE.currentCard(S.sess);
      if (cc && cc.type === 'code' && !S.draft) S.draft = cc.item.answer.starter || '';
    }
    if (inp) { inp.value = S.draft; inp.focus(); }
    // after an answer, Next stays in view without moving the stimulus
    // (only the render that opened the reveal, and never over the quit confirm)
    var scrollNext = S.revealScroll; S.revealScroll = false;
    if (scrollNext && S.sess && S.reveal && !S.ask) {
      var nx = root.querySelector('.reveal .primary');
      if (nx && nx.scrollIntoView) nx.scrollIntoView({ block: 'nearest' });
    }
    updateEcho();
    warmCode();
    markOverflow();
    requestAnimationFrame(markOverflow);
  }
  // Display math: shrink a wide block to fit (floor 72%); the edge-shadow scroll cue shows only on a block that still overflows.
  function markOverflow() {
    Array.prototype.forEach.call(root.querySelectorAll('.teach .katex-display'), function (el) {
      el.style.fontSize = '';
      var over = el.scrollWidth > el.clientWidth + 1;
      if (over) {
        // Shrink a wide block to fit, down to 72% of its styled size (measured in px, so the mobile .9em rule
        // is multiplied, not replaced); only a block still too wide after that scrolls and gets the cue.
        var base = parseFloat(getComputedStyle(el).fontSize) || 16;
        var k = Math.max(0.72, el.clientWidth / el.scrollWidth);
        el.style.fontSize = (base * k).toFixed(2) + 'px';
        over = el.scrollWidth > el.clientWidth + 1;
        // Width is not linear in font size: step down a little further while it still overflows and room remains.
        for (var step = 0; over && k > 0.72 && step < 6; step++) {
          k = Math.max(0.72, k - 0.02);
          el.style.fontSize = (base * k).toFixed(2) + 'px';
          over = el.scrollWidth > el.clientWidth + 1;
        }
      }
      el.classList.toggle('ovf', over);
    });
  }
  window.addEventListener('resize', markOverflow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markOverflow);
  // KaTeX fonts load lazily per glyph set; a card that pulls in a new face changes width after the render pass.
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', markOverflow);

  function secondsSince() { return Math.max(0, Math.floor((Date.now() - S.cardStart) / 1000)); }

  function startSession() {
    var sess = PE.startSession(S.prog, IX, today());
    if (!sess) { S.msg = 'Nothing to do today.'; render(); return; }
    S.sess = sess; S.reveal = null; S.hint = ''; S.draft = ''; S.summary = null; S.ask = null; S.cardStart = Date.now();
    save(); render();
  }

  // Unparsable input: hint only, nothing counted, draft kept.
  function unparsableHint(r) {
    if (r.detail === 'empty') return 'Type an answer first.';
    if (r.kind === 'expression') return 'Not read: ' + r.detail + '.';
    return 'Type a number like 7, 0.5 or 9/2.';
  }

  function commitFull(response) {
    var card = PE.currentCard(S.sess);
    if (card.commit) return;
    var r = PE.fullCommit(S.prog, IX, S.sess, response, secondsSince());
    if (r.unparsable) { S.hint = unparsableHint(r); render(); return; }
    S.hint = ''; S.draft = '';
    save(); render();
  }

  // Placement probe: no reveal. An unparsable typed answer is a hint and no attempt.
  function answerPlace(response, dontKnow) {
    var r = PE.placementAnswer(S.sess, response, dontKnow);
    if (r.unparsable) { S.hint = unparsableHint(r); render(); return; }
    S.hint = ''; S.draft = ''; S.cardStart = Date.now();
    if (r.done) return finishPlacement();
    render();
  }

  function answer(response) {
    if (!S.sess) return;
    if (S.sess.kind === 'place') return answerPlace(response, false);
    if (PE.currentCard(S.sess).type === 'full') return commitFull(response);
    if (S.reveal) return;
    var card = PE.currentCard(S.sess);
    var r = PE.answerCard(S.prog, IX, S.sess, response, secondsSince());
    if (r.unparsable) { S.hint = unparsableHint(r); render(); return; }
    if (!S.readonly) PE.noteMiss(S.prog, card, r);
    // The choice-card note shows once per session: the first reveal where it applies sets the flag.
    var tc = S.prog.tech[card.tech], choiceHold = r.ok && !r.requeue && !card.requeued && tc && tc.s >= PE.PRODUCTION_STREAK && !PE.isProduction(card.type);
    if (choiceHold && !S.sess.choiceNoted) { r.choiceNote = true; S.sess.choiceNoted = true; }
    if (card.type === 'code' && S.codeReport) {
      var cr = S.codeReport;
      r.code = { line: A.codeFailLine(card.item.answer, cr), err: cr.error === 'runtime-error' ? 'Error: ' + cr.detail : cr.error === 'timeout' ? 'Timed out after ' + (PY_WALL_MS / 1000) + ' s.' : '',
        src: S.draft, stdout: cr.stdout || '', parsed: cr.parsed, tests: cr.tests || [] };
    }
    S.codeReport = null;
    S.reveal = r; S.hint = ''; S.draft = ''; S.revealScroll = true;
    save(); render();
  }

  function next() {
    if (!S.sess) return;
    var cur = PE.currentCard(S.sess);
    if (!cur) return;
    // double tap on Continue must not skip a card
    if (cur.type === 'full' ? !cur.graded : (cur.type !== 'teach' && !S.reveal)) return;
    step();
  }
  // Moves to the next card, or ends the session or exam at the last one.
  function step() {
    S.reveal = null; S.hint = ''; S.draft = '';
    if (!PE.advance(S.sess, S.prog)) {
      if (S.sess.kind === 'exam') return finishExam();
      S.summary = PE.finishSession(S.prog, IX, S.sess); S.sess = null;
    }
    S.cardStart = Date.now();
    save(); render();
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var r = store.importText(S, String(reader.result));
      if (r.ok) { S.sess = null; S.reveal = null; S.summary = null; }
      S.msg = r.msg; S.ask = null; S.delta = null;
      render();
    };
    reader.readAsText(file);
  }

  // Multi-select: the form's own checkboxes, sent as display indexes.
  function multiPicks() {
    var boxes = document.querySelectorAll('#multi input[name=pick]:checked');
    return Array.prototype.map.call(boxes, function (b) { return Number(b.value); });
  }

  // J5: read-only Export writes the stored record as it is now (another tab may have saved since this tab read);
  // falls back to the text read at open (newer-build record, D4), then to this tab's progress.
  function exportText() {
    if (S.readonly) {
      try { var cur = store.raw(); if (cur !== null && cur !== undefined) return cur; } catch (e) { /* unreadable: fall back */ }
      if (S.raw) return S.raw;
    }
    return JSON.stringify(S.prog, null, 2);
  }

  function onAct(e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'start') startSession();
    else if (act === 'place') startPlacement();
    else if (act === 'exam') startExam();
    else if (act === 'dk') { if (S.sess && S.sess.kind === 'place') answerPlace(null, true); }
    else if (act === 'pause-new') { if (!S.readonly) { PE.setPauseNew(S.prog, !S.prog.pauseNew); save(); } render(); }
    else if (act === 'opt') answer(Number(el.getAttribute('data-i')));
    else if (act === 'run') runCode('run');
    else if (act === 'code-skip') skipCode();
    else if (act === 'continue') next();
    else if (act === 'to-progress') { visitProgress(); S.tab = 'progress'; S.msg = ''; S.ask = null; render(); }
    else if (act === 'show-all') { S.showAll = !S.showAll; render(); }
    else if (act === 'theme') toggleTheme();
    else if (act === 'miss') {
      var full = el.nextElementSibling;
      if (full) { full.hidden = !full.hidden; el.setAttribute('aria-expanded', String(!full.hidden)); }
    }
    else if (act === 'quit') { S.ask = 'quit'; render(); }
    else if (act === 'quit-yes') { S.sess = null; S.ask = null; S.tab = 'today'; render(); }
    else if (act === 'home') { S.summary = null; S.tab = 'today'; render(); }
    else if (act === 'cancel') { S.ask = null; render(); }
    else if (act === 'export') {
      try { download('pe_' + DATA.pack.key + '_' + today() + '.json', exportText()); S.msg = 'Exported.'; }
      catch (err) { S.msg = 'Export failed: ' + err.message; }
      render();
    }
    else if (act === 'reset') { S.ask = 'reset'; S.msg = ''; render(); }
    else if (act === 'reset-yes') {
      var r = store.reset(S);
      if (r.ok) { S.sess = null; S.reveal = null; S.summary = null; }
      S.msg = r.msg; S.ask = null; S.delta = null; render();
    }
  }
  root.addEventListener('click', onAct);
  document.getElementById('hdr-right').addEventListener('click', onAct);
  root.addEventListener('submit', function (e) {
    if (e.target.id === 'typed') {
      e.preventDefault();
      answer(document.getElementById('ans').value);
    } else if (e.target.id === 'rubric') {
      e.preventDefault();
      var card = PE.currentCard(S.sess);
      if (!card || card.type !== 'full' || !card.commit || card.graded) return;
      var ticks = Array.prototype.map.call(document.querySelectorAll('#rubric input[name=tick]:checked'), function (b) { return Number(b.value); });
      PE.fullGrade(S.prog, IX, S.sess, ticks);
      save(); render();
    } else if (e.target.id === 'codeform') {
      e.preventDefault();
      runCode('check');
    } else if (e.target.id === 'multi') {
      e.preventDefault();
      var picks = multiPicks();
      if (!picks.length) { S.hint = 'Pick at least one option.'; render(); return; }
      answer(picks);
    }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id !== 'ans') return;
    S.draft = e.target.value;
    // draft edits are parked after a short pause and on hide, not on every keystroke
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(syncSession, 400);
    if (S.hint) { S.hint = ''; var h = root.querySelector('.hint'); if (h) h.textContent = ''; }
    updateEcho();
  });
  // Editor: Tab inserts four spaces. Escape hands Tab back to the browser for the next press (keyboard users can leave).
  var tabFree = false;
  root.addEventListener('keydown', function (e) {
    if (e.target.id !== 'ans' || e.target.tagName !== 'TEXTAREA') return;
    if (e.key === 'Escape') { tabFree = true; return; }
    if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (tabFree) { tabFree = false; return; }
    e.preventDefault();
    var ta = e.target;
    if (!document.execCommand || !document.execCommand('insertText', false, '    ')) {
      ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'import') importFile(e.target.files[0]);
  });
  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    var t = b.getAttribute('data-tab');
    if (t === 'progress') visitProgress();
    S.tab = t; S.msg = ''; S.ask = null; render();
  });

  // ---- offline cache (sw.js, built next to the page by build.sh; kill switch and rollback in README)
  // A worker that takes over from an earlier one shows the banner. The open page keeps running on what it loaded.
  function registerWorker() {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return;
    var sw = navigator.serviceWorker, wasControlled = !!sw.controller;
    sw.addEventListener('controllerchange', function () {
      if (wasControlled) document.getElementById('update').hidden = false;
    });
    var reg = function () { sw.register('sw.js').catch(function () {}); };
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
  }

  document.getElementById('update').addEventListener('click', function () { location.reload(); });
  document.title = DATA.pack.name;
  loadTheme();
  store.open(S);
  if (!resumeParked()) S.cardStart = Date.now();
  render();
  registerWorker();
})();
