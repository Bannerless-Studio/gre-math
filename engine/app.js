/* problem-engine page: Today, Test (placement, level exam), drill, summary, Progress. All rules live in core.js;
 * checking in answer.js; persistence in store.js. */
(function () {
  'use strict';

  var PE = window.PE, A = window.PEAnswer, ST = window.PEStore, T = window.PEText, DATA = T.unpackData(window.PE_DATA);
  var KEY = 'pe_' + DATA.pack.key;
  var IX = PE.index(DATA);
  var root = document.getElementById('root');
  var S = { tab: 'today', prog: null, readonly: false, notice: '', sess: null, reveal: null, summary: null,
    hint: '', msg: '', cardStart: 0, draft: '', ask: null, placeResult: null, examResult: null, delta: null };

  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  var esc = T.esc;
  // Fallback only: Markdown-lite with $...$ left as typed. The build pre-renders math into item.html and techniques[].html.
  function md(s, inline) { return T.md(s, inline); }
  // Rendered HTML when the build supplied it, else the raw fallback.
  function field(item, name, inline) {
    if (item && item.html && item.html[name] != null) return item.html[name];
    return md(item ? item[name] : '', inline);
  }
  // i is the authored (original) option index.
  function optHtml(item, i) {
    if (item.html && item.html.options && item.html.options[i] != null) return item.html.options[i];
    return md(item.answer.options[i], true);
  }
  // Mirrors core answerText: display, else the correct option(s) for mcq and multi, else the typed value.
  function ansHtml(item, text) {
    var a = item.answer, h = item.html || {};
    if (a.display != null) return h.display != null ? h.display : md(a.display, true);
    var kind = PE.itemKind(item);
    if (kind === 'mcq') return optHtml(item, a.correct);
    if (kind === 'multi') return a.correct.map(function (i) { return optHtml(item, i); }).join(', ');
    return md(text, true);
  }
  function techHtml(card) {
    var t = IX.techById[card.tech];
    return t && t.html && t.html.teach != null ? t.html.teach : md(card.markdown);
  }
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
    return '<li class="row"><span class="name">' + name + '</span>' + (dev ? '<span class="dev">' + esc(dev) + '</span>' : '') + '</li>';
  }
  // The gate sentence (T2 waits: T1 at 62% known.) is the Learn note while the gate holds.
  function learnNote(l) {
    if (l.status === 'ready') {
      var list = l.techs && l.techs.length ? l.techs : (l.tech ? [l.tech] : []);
      return 'New: ' + list.map(function (t) { return techName(t.id); }).join(', ');
    }
    if (l.status === 'paused') return 'Paused';
    return l.reason || '';
  }
  function viewToday() {
    var t = today(), plan = PE.buildPlan(S.prog, IX, t);
    var rows = row('Review', plan.review.status === 'ready' ? '' : plan.review.reason) +
      row('Learn', learnNote(plan.learn)) +
      row('Micro', plan.micro.status === 'ready' ? '' : plan.micro.reason) +
      row('Full', plan.full.status === 'ready' ? '' : plan.full.reason);
    var action = plan.cards.length
      ? '<button type="button" class="primary" data-act="start">Start</button>'
      : '<p class="empty">Nothing due today.</p>';
    var pause = '<button type="button" class="ghost pause" data-act="pause-new"' + (S.readonly ? ' disabled' : '') + '>' +
      (S.prog.pauseNew ? 'Resume new techniques' : 'Pause new techniques') + '</button>';
    return '<section><p class="anchor">Session ' + plan.n + '</p>' +
      '<p class="goal">' + knownCount(S.prog) + ' of ' + IX.techs.length + ' known</p>' +
      '<ol class="stages">' + rows + '</ol>' + action + '<p class="pause-row">' + pause + '</p></section>';
  }

  function stageLabel(card, sess) {
    if (sess && sess.kind === 'exam') return 'Exam';
    if (sess && sess.kind === 'place') return 'Placement';
    return card.stage === 'review' ? 'Review' : card.stage === 'learn' ? 'Learn' : card.stage === 'full' ? 'Full' : 'Micro';
  }

  // Reveal: the verdict, the answer when wrong, the solution, and only the facts that are not routine.
  function revealHtml(card, r) {
    var notes = [], name = techName(card.tech);
    if (!r.ok && WHY[r.error]) notes.push(WHY[r.error]);
    if (r.mastered) notes.push('Mastered: ' + name + '.');
    if (r.requeue) notes.push('Back later in this session. No credit.');
    else if (card.requeued) notes.push('Practice only. No credit.');
    else if (r.choiceNote) notes.push('Choice cards hold the streak here. Type an answer to earn credit.');
    var ans = r.ok ? '' : '<p class="answer">Answer: ' + ansHtml(card.item, r.answer) + '</p>';
    return '<div class="reveal ' + (r.ok ? 'ok' : 'bad') + '">' +
      '<p class="verdict">' + (r.ok ? 'Right' : 'Not quite') + '</p>' + ans +
      '<div class="prose">' + field(card.item, 'solution') + '</div>' +
      (notes.length ? '<p class="note">' + esc(notes.join(' ')) + '</p>' : '') +
      '<button type="button" class="primary" data-act="continue">Continue</button></div>';
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
    } else {
      var ph = card.type === 'expression' ? 'e.g. x^2/2 or sqrt(1-x^2)' : 'e.g. 7, 0.5 or 9/2';
      body = '<form class="typed" id="typed" autocomplete="off"><input id="ans" inputmode="text" autocapitalize="off" ' +
        'autocorrect="off" spellcheck="false" placeholder="' + ph + '" aria-label="Your answer">' +
        '<button type="submit" class="primary">Check</button></form>';
      if (card.type === 'expression') body += '<p class="echo" id="echo" aria-live="polite"></p>';
    }
    return body;
  }

  function viewDrill() {
    var sess = S.sess, card = PE.currentCard(sess), total = sess.queue.length;
    var pct = Math.round((sess.pos / total) * 100);
    var quitText = sess.kind === 'place' ? 'End the test? Nothing is saved.' : 'End this session? Answers so far are saved.';
    var head = '<div class="bar"><span>' + stageLabel(card, sess) + ' · ' + (sess.pos + 1) + ' of ' + total + '</span>' +
      (S.ask === 'quit' ? '' : '<button type="button" class="ghost" data-act="quit">End</button>') + '</div>' +
      '<div class="meter"><i style="width:' + pct + '%"></i></div>';
    if (S.ask === 'quit') {
      head += '<div class="confirm"><p>' + quitText + '</p>' +
        '<button type="button" class="danger" data-act="quit-yes">End</button> ' +
        '<button type="button" class="ghost" data-act="cancel">Keep going</button></div>';
    }
    if (card.type === 'teach') {
      return head + '<article class="card"><p class="kicker">New technique</p><h2>' + esc(card.name) + '</h2>' +
        '<div class="prose">' + techHtml(card) + '</div>' +
        '<button type="button" class="primary" data-act="continue">Start problems</button></article>';
    }
    if (card.type === 'full') return head + viewFull(card);
    var body = '<div class="card"><div class="prose">' + field(card.item, 'prompt') + '</div>';
    if (sess.kind === 'place') {
      // Placement gives no feedback: the probe is answered and the next one opens.
      body += cardBody(card) + '<button type="button" class="ghost dk" data-act="dk">I don\'t know</button>';
    } else if (S.reveal) {
      body += revealHtml(card, S.reveal);
    } else {
      body += cardBody(card);
    }
    body += '<p class="hint">' + esc(S.hint) + '</p></div>';
    return head + body;
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
  function rubricHtml(item, i) {
    var h = item.html && item.html.rubric && item.html.rubric[i];
    return h != null ? h : md(item.rubric[i].text, true);
  }
  function viewFull(card) {
    var item = card.item, c = card.commit, g = card.graded, budget = card.budgetSec;
    var numeric = card.kind !== 'mcq';
    var meta = '<p class="kicker">Timed problem · budget ' + mmss(budget) + '</p>';
    var prompt = '<div class="prose">' + field(item, 'prompt') + '</div>';
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
      return '<div class="card full">' + meta + clock + prompt + body + '<p class="hint">' + esc(S.hint) + '</p></div>';
    }
    var committed = '<p class="kicker">Committed at ' + mmss(c.seconds) + ' of ' + mmss(budget) + (c.over ? ' · over budget' : '') + '</p>';
    if (!g) {
      var list = '<fieldset class="checks rubric"><legend class="note">Self-grade the method. Check each step you did.</legend>' +
        item.rubric.map(function (r, i) {
          return '<label class="check"><input type="checkbox" name="tick" value="' + i + '"><span>' + rubricHtml(item, i) +
            ' <small class="weight">(' + esc(String(r.weight)) + ')</small></span></label>';
        }).join('') + '</fieldset>';
      return '<div class="card full">' + meta + committed +
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
    return '<div class="card full">' + meta + committed +
      '<div class="reveal grade g' + g.grade + '"><p class="verdict">Grade ' + g.grade + ' of 2, ' + GRADE_WORD[g.grade] + '.</p>' + why +
      '<button type="button" class="primary" data-act="continue">Continue</button></div></div>';
  }

  // Summary: the count, the changes, and the missed prompts with the answer. Solutions sit behind a fold.
  function viewSummary() {
    var s = S.summary, miss = s.missed.map(function (m) {
      var it = IX.itemById[m.id];
      var prompt = it ? field(it, 'prompt') : md(m.prompt), sol = it ? field(it, 'solution') : md(m.solution);
      var ans = it ? ansHtml(it, m.answer) : md(m.answer, true);
      return '<article class="card"><div class="prose">' + prompt + '</div>' +
        '<p class="answer">Answer: ' + ans + '</p><details class="sol"><summary>Solution</summary><div class="prose">' + sol + '</div></details></article>';
    }).join('');
    var deltas = [];
    if (s.mastered.length) deltas.push('+' + s.mastered.length + ' mastered: ' + s.mastered.join(', '));
    if (s.introduced.length) deltas.push('New: ' + s.introduced.join(', '));
    return '<section><p class="anchor">Session ' + s.n + ' done</p>' +
      '<p class="big">' + s.right + ' of ' + s.scored + '</p>' +
      (deltas.length ? '<p class="goal">' + esc(deltas.join(' · ')) + '</p>' : '') +
      (miss ? '<h3>Missed</h3><div class="missed">' + miss + '</div>' : '') +
      '<button type="button" class="primary" data-act="home" style="margin-top:18px">Back to Today</button></section>';
  }

  // ---- Test tab: placement (SPEC 6) and the level exam (SPEC 2.6)
  function placeResultHtml(r) {
    // Skipped buckets fold into one row per run (a skip is expected until a tier has probes).
    var rows = '', run = [];
    function flush() {
      if (!run.length) return;
      var lbl = run.length > 1 ? run[0].tier + ' to ' + run[run.length - 1].tier : run[0].tier;
      rows += '<li><span>' + esc(lbl) + '</span><span class="streak">skipped: ' + esc(run[0].reason) + '</span></li>';
      run = [];
    }
    r.buckets.forEach(function (b) {
      if (b.status === 'skip') { if (run.length && run[0].reason.replace(/^\S+ /, '') !== b.reason.replace(/^\S+ /, '')) flush(); run.push(b); return; }
      flush();
      rows += '<li><span>' + esc(b.tier) + '</span><span class="streak">' + b.right + ' of ' + b.asked + '</span></li>';
    });
    flush();
    return '<h3>Placement result</h3><ul class="techs">' + rows + '</ul>';
  }
  function examResultHtml(x) {
    var need = Math.ceil(PE.EXAM_PASS * x.total);
    return '<h3>Level exam</h3><p class="goal">' + esc(x.level) + ': ' + x.right + ' of ' + x.total + '</p>' +
      '<p class="note">' + (x.pass ? 'Passed. ' + x.fp.length + ' techniques marked known.' : 'Not passed. Need ' + need + '.') + '</p>';
  }
  function viewTest() {
    var p = S.prog, ro = S.readonly ? ' disabled' : '', html = '<section><p class="anchor">Test</p>';
    if (p.placedOnce) {
      html += '<p class="goal">Placed. Next: ' + esc(p.pl ? levelLabel(p.pl) : 'none') + '.</p>';
    } else {
      html += '<p class="goal">Not placed yet.</p>' +
        '<p class="note">About 5 problems per level. No feedback until the end. "I don\'t know" scores 0.</p>' +
        '<button type="button" class="primary" data-act="place"' + ro + '>Place me</button>';
    }
    if (S.placeResult) html += placeResultHtml(S.placeResult);
    var lx = PE.examLevel(p, IX);
    if (lx) {
      html += '<h3>Level exam</h3><p class="note">' + esc(lx.id + ' · ' + lx.label) + '. 8 micro and 2 full problems. ' +
        'Pass at 7 of 10 marks the techniques you got right as known.</p>' +
        '<button type="button" class="primary" data-act="exam"' + ro + '>Start exam</button>';
    }
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

  // ---- Progress v2: hero with the change since the last visit, level blocks, folded lower levels
  function levelBlock(p, l) {
    var ts = IX.techsByLevel[l.id] || [];
    var mastered = ts.filter(function (x) { return p.tech[x.id] && p.tech[x.id].m === 1; }).length;
    var started = ts.filter(function (x) { return PE.isIntro(p, x.id); }).length;
    var filled = l.total ? Math.round(l.pct * 10) : 0, cells = '';
    for (var i = 0; i < 10; i++) cells += '<i class="' + (i < filled ? 'on' : '') + '"></i>';
    var on = ts.filter(function (x) { return PE.isIntro(p, x.id); });
    var techs = on.length ? '<details class="lvdet"><summary>Techniques</summary><ul class="techs">' + on.map(function (x) {
      var r = p.tech[x.id];
      return '<li><span>' + esc(x.name) + '</span><span class="streak">' + (r.m ? 'Mastered' : (r.prov ? 'Placed' : r.s + ' of ' + IX.cfg.mastered)) + '</span></li>';
    }).join('') + '</ul></details>' : '';
    return '<div class="lv"><div class="lv-head"><span>' + esc(l.id + ' · ' + l.label) + '</span>' +
      '<span>' + l.known + ' of ' + l.total + ' known</span></div>' +
      '<div class="cells" aria-hidden="true">' + cells + '</div>' +
      (started ? '<p class="lv-foot">' + mastered + ' mastered · ' + started + ' started</p>' : '') + techs + '</div>';
  }
  function viewProgress() {
    var p = S.prog, st = PE.levelStatus(p, IX), gate = PE.gateState(p, IX);
    var started = IX.techs.filter(function (x) { return PE.isIntro(p, x.id); }).length;
    var html = '<section><p class="anchor">' + p.sessions + (p.sessions === 1 ? ' session' : ' sessions') + '</p>' +
      '<p class="goal">' + knownCount(p) + ' of ' + IX.techs.length + ' known · ' + masteredCount(p) + ' mastered · ' + started + ' started</p>';
    if (S.delta) html += '<p class="delta">' + esc(S.delta) + '</p>';
    if (gate.held) html += '<p class="gate">' + esc(gate.sentence) + '</p>';
    // Levels below the first one under 90 percent known fold into one block (the last level always shows).
    var firstOpen = -1;
    st.forEach(function (l, i) { if (firstOpen < 0 && l.total && l.pct < 0.9) firstOpen = i; });
    var cut = firstOpen < 0 ? st.length - 1 : firstOpen;
    var folded = st.slice(0, cut), open = st.slice(cut);
    if (folded.length) {
      var fk = folded.reduce(function (s, l) { return s + l.known; }, 0), ft = folded.reduce(function (s, l) { return s + l.total; }, 0);
      var span = folded.length > 1 ? folded[0].id + ' to ' + folded[folded.length - 1].id : folded[0].id;
      html += '<details class="folded"><summary>' + esc(span) + ' · ' +
        fk + ' of ' + ft + ' known</summary>' + folded.map(function (l) { return levelBlock(p, l); }).join('') + '</details>';
    }
    html += open.map(function (l) { return levelBlock(p, l); }).join('');
    var resetPart = S.ask === 'reset'
      ? '<div class="confirm"><p>Reset all progress? A backup is kept in this browser.</p>' +
        '<button type="button" class="danger" data-act="reset-yes">Reset progress</button> ' +
        '<button type="button" class="ghost" data-act="cancel">Keep progress</button></div>'
      : '<button type="button" class="danger" data-act="reset">Reset progress</button>';
    html += '<h3>Your data</h3><div class="data">' +
      '<button type="button" class="ghost" data-act="export">Export progress (JSON)</button>' +
      '<label class="file-btn">Import progress (JSON)<input type="file" id="import" accept="application/json,.json"></label>' +
      resetPart + '</div>' +
      '<p class="data-msg">' + esc(S.msg) + '</p></section>';
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
    el.className = 'echo';
    el.textContent = 'Read as ' + A.canon(pr.ast);
  }

  function render() {
    syncSession();
    var nav = document.getElementById('tabs');
    nav.hidden = !!(S.sess || S.summary);
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
    if (clockRead()) startClock(); else stopClock();
    window.scrollTo(0, 0);
    var inp = document.getElementById('ans');
    if (inp) { inp.value = S.draft; inp.focus(); }
    updateEcho();
  }

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
    // The choice-card note shows once per session: the first reveal where it applies sets the flag.
    var tc = S.prog.tech[card.tech], choiceHold = r.ok && !r.requeue && !card.requeued && tc && tc.s >= PE.PRODUCTION_STREAK && !PE.isProduction(card.type);
    if (choiceHold && !S.sess.choiceNoted) { r.choiceNote = true; S.sess.choiceNoted = true; }
    S.reveal = r; S.hint = ''; S.draft = '';
    save(); render();
  }

  function next() {
    if (!S.sess) return;
    var cur = PE.currentCard(S.sess);
    if (!cur) return;
    // double tap on Continue must not skip a card
    if (cur.type === 'full' ? !cur.graded : (cur.type !== 'teach' && !S.reveal)) return;
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

  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'start') startSession();
    else if (act === 'place') startPlacement();
    else if (act === 'exam') startExam();
    else if (act === 'dk') { if (S.sess && S.sess.kind === 'place') answerPlace(null, true); }
    else if (act === 'pause-new') { if (!S.readonly) { PE.setPauseNew(S.prog, !S.prog.pauseNew); save(); } render(); }
    else if (act === 'opt') answer(Number(el.getAttribute('data-i')));
    else if (act === 'continue') next();
    else if (act === 'quit') { S.ask = 'quit'; render(); }
    else if (act === 'quit-yes') { S.sess = null; S.ask = null; S.tab = 'today'; render(); }
    else if (act === 'home') { S.summary = null; S.tab = 'today'; render(); }
    else if (act === 'cancel') { S.ask = null; render(); }
    else if (act === 'export') {
      try { download('pe_' + DATA.pack.key + '_' + today() + '.json', JSON.stringify(S.prog, null, 2)); S.msg = 'Exported.'; }
      catch (err) { S.msg = 'Export failed: ' + err.message; }
      render();
    }
    else if (act === 'reset') { S.ask = 'reset'; S.msg = ''; render(); }
    else if (act === 'reset-yes') {
      var r = store.reset(S);
      if (r.ok) { S.sess = null; S.reveal = null; S.summary = null; }
      S.msg = r.msg; S.ask = null; S.delta = null; render();
    }
  });
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
  document.getElementById('pack-name').textContent = DATA.pack.name;
  document.title = DATA.pack.name;
  store.open(S);
  if (!resumeParked()) S.cardStart = Date.now();
  render();
  registerWorker();
})();
