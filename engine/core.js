/* problem-engine core. Pure logic: no DOM, no clock. Runs in Node tests and in the built page.
 * Rules: docs/SPEC.md sections 2 and 5; pack fields: docs/PACK_SCHEMA.md. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  // Answer checking lives in answer.js (M4): node requires it, the built page gets window.PEAnswer.
  var ANS = typeof module === 'object' && module.exports ? require('./answer.js')
    : (typeof window !== 'undefined' ? window : globalThis).PEAnswer;

  var PROG_VERSION = 1;
  var REFRESH_SHARE = 0.1;      // share of Review slots that revisit mastered techniques
  var PER_TECH_CAP = 3;         // items of one technique per session, outside its Learn block
  var WIP_CAP = 6;              // Learn waits while more techniques than this sit at 0 < s < mastered
  var LEARN_ITEMS = 4;          // micro problems after the teach card
  var PRODUCTION_STREAK = 2;    // from this streak only free-response answers credit
  var EXAM_RULE = true;         // M6: the gate counts a technique as known only when mastered and fp (exam rule, SPEC 2.6)
  var NEW_EARLY = 2;            // new techniques per session while fewer than NEW_EARLY_BELOW are started (SPEC 5)
  var NEW_LATER = 2;            // new per session once NEW_EARLY_BELOW are started (rec_n2, changed 2026-10-12 after pacing study)
  var NEW_EARLY_BELOW = 20;
  var REVIEW_PROD_SHARE = 0.4;  // share of Review cards on a technique with streak >= PRODUCTION_STREAK that are typed
  var PLACE_PASS = 0.7;         // bucket and prefix threshold (SPEC 6, decisions 9)
  var PLACE_PROBES = 5;         // probes per tier bucket
  var PLACE_MIN = 3;            // a bucket with fewer candidates is skipped and says so
  var PLACE_ZERO_RUN = 3;       // stop: this many completed buckets in a row with no right answer
  var PLACE_LOW_RUN = 2;        // stop: this many completed buckets in a row below PLACE_PASS
  var EXAM_MICRO = 8;           // level exam: micro problems and full problems at the level below the gate
  var EXAM_FULL = 2;
  var EXAM_PASS = 0.7;
  var EXAM_NEAR_PCT = 5;        // exam offered when the gate is within this many points of opening
  var ANSWER_KINDS = ['numeric', 'mcq', 'expression', 'multi', 'self'];
  var PLAYABLE = ['numeric', 'expression', 'mcq', 'multi'];   // self waits for M5
  var PRODUCTION = ['numeric', 'expression'];                 // typed answers: the only kinds that earn the s>=2 credit
  var FULL_MIN_TECHS = 4;       // Full waits until this many techniques have a streak (SPEC 5 stage 4)
  var FULL_NEAR = 0.5;          // rubric below this share of pass is "far below": a right commit then grades 0
  var FULL_BUDGET = { easy: 300, mid: 600, hard: 1080 };   // fallback when pack.full.budgetSec is absent

  function num(x, dflt) { return typeof x === 'number' && isFinite(x) ? x : dflt; }
  function nonneg(x) { return typeof x === 'number' && isFinite(x) && x >= 0 ? Math.floor(x) : 0; }
  function flag(x) { return x ? 1 : 0; }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  // ---- seeded shuffle (option order is fixed per card, so a retry sees the same order)
  function hash32(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function permutation(n, seedStr) {
    var r = rng(hash32(seedStr));
    var p = [];
    for (var i = 0; i < n; i++) p.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(r() * (j + 1));
      var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
    }
    return p;
  }

  // ---- items
  // Kind the engine plays: numeric, expression, mcq, multi, or null (skipped in planning; self waits for M5).
  function itemKind(item) {
    var a = item && item.answer;
    if (!a || PLAYABLE.indexOf(a.kind) < 0) return null;
    if (a.kind === 'mcq' || a.kind === 'multi') return Array.isArray(a.options) && a.options.length >= 2 ? a.kind : null;
    return a.kind;
  }
  // Typed kinds earn the production streak credit (SPEC 2.4); choice kinds do not.
  function isProduction(type) { return PRODUCTION.indexOf(type) >= 0; }

  // Full cards keep the answer kind in `kind` (their `type` is 'full'); other cards use `type`.
  function answerText(card) {
    var a = card.item.answer, kind = card.kind || card.type;
    if (a.display) return a.display;
    if (kind === 'mcq') return String(a.options[a.correct]);
    if (kind === 'multi') return a.correct.map(function (i) { return String(a.options[i]); }).join('; ');
    return String(a.value);
  }

  function makeCard(ix, item, stage, n) {
    var kind = itemKind(item);
    var order = null;
    if (kind === 'mcq' || kind === 'multi') {
      var len = item.answer.options.length;
      order = item.answer.shuffle === false ? Array.from({ length: len }, function (_, i) { return i; })
        : permutation(len, n + '|' + stage + '|' + item.id);
    }
    var card = { type: stage === 'full' ? 'full' : kind, stage: stage, id: item.id, tech: item.tags[0], item: item,
      order: order, requeued: false };
    if (stage === 'full') { card.kind = kind; card.budgetSec = budgetFor(ix.cfg, item.difficulty); }
    return card;
  }

  // response: display index for mcq, array of display indexes for multi, string for typed kinds.
  // Choice responses are mapped back to the authored option order before answer.check runs.
  // Returns {ok, chosen|typed, error?} or {unparsable: true, error?, detail?} (no attempt counted).
  function gradeCard(card, response) {
    var a = card.item.answer, kind = card.kind || card.type;
    if (kind === 'mcq') {
      var idx = Number(response);
      if (!Number.isInteger(idx) || idx < 0 || idx >= card.order.length) return { ok: null, unparsable: true };
      var orig = card.order[idx];
      var m = ANS.check({ kind: 'mcq', correct: a.correct, options: a.options }, orig);
      return { ok: m.ok, chosen: orig };
    }
    if (kind === 'multi') {
      var list = Array.isArray(response) ? response : [];
      var origs = [];
      for (var i = 0; i < list.length; i++) {
        var di = Number(list[i]);
        if (!Number.isInteger(di) || di < 0 || di >= card.order.length) return { ok: null, unparsable: true };
        origs.push(card.order[di]);
      }
      var mm = ANS.check({ kind: 'multi', correct: a.correct, options: a.options }, origs);
      return { ok: mm.ok, chosen: origs };
    }
    var c = ANS.check(a, response == null ? '' : String(response));
    if (!c.attempt) return { ok: null, unparsable: true, error: c.error, detail: c.detail };
    return { ok: c.ok, typed: c.parsed, error: c.error };
  }

  // ---- index
  function config(pack) {
    var s = (pack && pack.session) || {};
    var fb = (pack && pack.full && pack.full.budgetSec) || FULL_BUDGET;
    return {
      review: nonneg(s.review), learn: nonneg(s.learn), micro: nonneg(s.micro),
      full: s.full === undefined ? 1 : nonneg(s.full),
      fullBudget: { easy: num(fb.easy, FULL_BUDGET.easy), mid: num(fb.mid, FULL_BUDGET.mid), hard: num(fb.hard, FULL_BUDGET.hard) },
      gate: num(pack && pack.gate, 0.7), mastered: Math.max(1, nonneg(pack && pack.mastered) || 3)
    };
  }

  function index(data) {
    var pack = data.pack, techs = data.techniques, items = data.items;
    var levelIndex = {};
    pack.levels.forEach(function (l, i) { levelIndex[l.id] = i; });
    var sorted = techs.slice().sort(function (a, b) {
      return (levelIndex[a.level] - levelIndex[b.level]) || (a.order - b.order) || cmp(a.id, b.id);
    });
    var order = {}, techById = {}, techsByLevel = {}, itemById = {}, itemsByTech = {};
    sorted.forEach(function (t, i) {
      order[t.id] = i; techById[t.id] = t;
      (techsByLevel[t.level] = techsByLevel[t.level] || []).push(t);
    });
    items.forEach(function (it) {
      itemById[it.id] = it;
      (itemsByTech[it.tags[0]] = itemsByTech[it.tags[0]] || []).push(it);
    });
    return {
      pack: pack, cfg: config(pack), levels: pack.levels, levelIndex: levelIndex, techs: sorted,
      techById: techById, order: order, itemById: itemById, itemsByTech: itemsByTech, techsByLevel: techsByLevel
    };
  }

  // ---- progress record (SPEC 2.5)
  function newProg() {
    return { v: PROG_VERSION, sessions: 0, theme: null, placedOnce: false, pl: null, pauseNew: false,
      tech: {}, items: {}, full: {}, day: { d: null, n: 0, log: [] }, pv: { sn: 0, m: 0, full: 0 } };
  }
  function defTech(r) {
    return Object.assign({}, r, {
      s: nonneg(r.s), l: nonneg(r.l), r: nonneg(r.r), w: nonneg(r.w), m: flag(r.m), wk: flag(r.wk),
      prov: flag(r.prov), fp: flag(r.fp), in: nonneg(r.in)
    });
  }
  function defFull(r) {
    var g = Array.isArray(r.g) ? r.g.filter(function (x) { return x === 0 || x === 1 || x === 2; }).slice(-2) : [];
    return { g: g, l: nonneg(r.l), best: nonneg(r.best) };
  }
  function defItem(r) {
    return Object.assign({}, r, { r: nonneg(r.r), w: nonneg(r.w), l: nonneg(r.l), t: nonneg(r.t) });
  }
  // Throws on a newer format version (the whole file is refused) or a malformed shape.
  function normalizeProg(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('progress is not an object');
    if (typeof raw.v !== 'number') throw new Error('progress has no version');
    if (raw.v > PROG_VERSION) { var e = new Error('saved by a newer version'); e.code = 'newer'; e.version = raw.v; throw e; }
    if (raw.tech !== undefined && (typeof raw.tech !== 'object' || raw.tech === null)) throw new Error('tech is not an object');
    if (raw.items !== undefined && (typeof raw.items !== 'object' || raw.items === null)) throw new Error('items is not an object');
    var p = newProg();
    Object.assign(p, raw, { v: PROG_VERSION, sessions: nonneg(raw.sessions) });
    p.tech = {}; p.items = {}; p.full = {};
    p.placedOnce = !!raw.placedOnce; p.pl = typeof raw.pl === 'string' ? raw.pl : null; p.pauseNew = !!raw.pauseNew;
    Object.keys(raw.full || {}).forEach(function (id) { p.full[id] = defFull(raw.full[id] || {}); });
    Object.keys(raw.tech || {}).forEach(function (id) { p.tech[id] = defTech(raw.tech[id] || {}); });
    Object.keys(raw.items || {}).forEach(function (id) { p.items[id] = defItem(raw.items[id] || {}); });
    var d = raw.day && typeof raw.day === 'object' ? raw.day : {};
    p.day = { d: typeof d.d === 'string' ? d.d : null, n: nonneg(d.n), log: Array.isArray(d.log) ? d.log.slice() : [] };
    return p;
  }

  function rec(prog, id) {
    if (!prog.tech[id]) prog.tech[id] = defTech({});
    return prog.tech[id];
  }
  function isIntro(prog, id) { return !!(prog.tech[id] && prog.tech[id].in > 0); }
  // Teach is offered again when the technique was never started, or was started (teach card passed) but no
  // problem was answered (session ended before the first answer). F1.
  function needsTeach(prog, id) {
    if (!isIntro(prog, id)) return true;
    var r = prog.tech[id];
    if (r.prov === 1) return false;   // placement-provisional: the test already covered it (SPEC 6)
    return r.r + r.w === 0;
  }
  // Placement-provisional techniques count as known for the gate (SPEC 6). Earned ones need mastery and, under the
  // exam rule (SPEC 2.6), fp unless the technique is exempt.
  function knownTech(r, tech) {
    if (!r) return false;
    if (r.prov === 1) return true;
    return r.m === 1 && (!EXAM_RULE || (tech && tech.exam === false) || r.fp === 1);
  }

  function usedToday(prog, today, id) {
    return !!(prog.day && prog.day.d === today && prog.day.log.indexOf(id) >= 0);
  }
  function touchDay(prog, today, id) {
    if (!prog.day || prog.day.d !== today) prog.day = { d: today, n: 0, log: [] };
    if (prog.day.log.indexOf(id) < 0) prog.day.log.push(id);
  }

  // ---- levels and gate (SPEC 2.6, decisions: levels are curriculum tiers)
  function levelStatus(prog, ix) {
    return ix.levels.map(function (lv) {
      var ts = ix.techsByLevel[lv.id] || [];
      var known = ts.filter(function (t) { return knownTech(prog.tech[t.id], t); }).length;
      var taught = ts.filter(function (t) { return isIntro(prog, t.id); }).length;
      return { id: lv.id, label: lv.label, total: ts.length, known: known, taught: taught,
        pct: ts.length ? known / ts.length : 1 };
    });
  }
  // Held when the first level with untaught techniques has a previous level under the gate.
  function gateState(prog, ix) {
    var st = levelStatus(prog, ix);
    var F = -1;
    for (var i = 0; i < st.length; i++) { if (st[i].taught < st[i].total) { F = i; break; } }
    if (F <= 0) return { held: false, F: F, sentence: null, levels: st };
    var prev = st[F - 1];
    if (prev.pct >= ix.cfg.gate) return { held: false, F: F, sentence: null, levels: st };
    var pct = Math.floor(prev.pct * 100);
    return { held: true, F: F, levels: st,
      sentence: st[F].id + ' waits: ' + prev.id + ' at ' + pct + '% known.', short: 'gate: ' + prev.id + ' at ' + pct + '%' };
  }

  // ---- planning (SPEC 5: Learn, Review, Micro; Full is M3+)
  function byDue(prog, ix) {
    return function (a, b) {
      var ra = prog.tech[a.id] || { s: 0, l: 0 }, rb = prog.tech[b.id] || { s: 0, l: 0 };
      return (ra.s - rb.s) || (ra.l - rb.l) || (ix.order[a.id] - ix.order[b.id]);
    };
  }

  // wantProd: undefined keeps the micro rule (typed first from streak 2); true or false is the Review quota.
  function pickItem(ctx, t, tier, wantProd) {
    var rec0 = ctx.prog.tech[t.id] || { s: 0 };
    var cands = (ctx.ix.itemsByTech[t.id] || []).filter(function (it) {
      return it.tier === tier && itemKind(it) && !ctx.st.used[it.id];
    });
    if (!cands.length) return null;
    function pref(it) {
      var prod = isProduction(itemKind(it));
      if (wantProd === undefined) return rec0.s >= PRODUCTION_STREAK && prod ? 0 : 1;
      return prod === wantProd ? 0 : 1;
    }
    cands.sort(function (a, b) {
      var ua = usedToday(ctx.prog, ctx.today, a.id) ? 1 : 0, ub = usedToday(ctx.prog, ctx.today, b.id) ? 1 : 0;
      var la = ctx.prog.items[a.id] ? ctx.prog.items[a.id].l : 0, lb = ctx.prog.items[b.id] ? ctx.prog.items[b.id].l : 0;
      var pa = pref(a), pb = pref(b);
      if (wantProd === undefined) return (ua - ub) || (pa - pb) || (la - lb) || cmp(a.id, b.id);
      return (pa - pb) || (ua - ub) || (la - lb) || cmp(a.id, b.id);
    });
    return cands[0];
  }

  // quota: Review. Once a technique's streak allows typed answers, about REVIEW_PROD_SHARE of those cards are typed.
  function take(ctx, t, tier, stage, out, quota) {
    var rec0 = ctx.prog.tech[t.id] || { s: 0 };
    var counted = !!quota && rec0.s >= PRODUCTION_STREAK;
    var wantProd = counted ? ctx.st.prod < REVIEW_PROD_SHARE * (ctx.st.elig + 1) : undefined;
    var it = pickItem(ctx, t, tier, wantProd);
    // A typed card is the only kind that earns credit from streak 2 (SPEC 2.4). When the recall pool has no typed
    // item for this technique, the typed card comes from tier b, so Review cannot fill the per-technique cap with
    // cards that never credit.
    if (counted && wantProd && (!it || !isProduction(itemKind(it)))) {
      var typed = pickItem(ctx, t, 'b', true);
      if (typed && isProduction(itemKind(typed))) it = typed;
    }
    if (!it) return false;
    if (counted) { ctx.st.elig += 1; if (isProduction(itemKind(it))) ctx.st.prod += 1; }
    ctx.st.used[it.id] = true;
    ctx.st.perTech[t.id] = (ctx.st.perTech[t.id] || 0) + 1;
    out.push(makeCard(ctx.ix, it, stage, ctx.n));
    return true;
  }

  // Round-robin over techniques (lowest streak first) so consecutive cards differ.
  function planStage(ctx, stage, tier, slots, main, refresh, refreshN) {
    var out = [];
    var quota = stage === 'review';
    refresh.slice(0, refreshN).forEach(function (t) { if (out.length < slots) take(ctx, t, tier, stage, out, quota); });
    var rest = main.concat(refresh.slice(refreshN));
    var progress = true;
    while (out.length < slots && progress) {
      progress = false;
      for (var i = 0; i < rest.length && out.length < slots; i++) {
        var t = rest[i];
        if ((ctx.st.perTech[t.id] || 0) >= PER_TECH_CAP) continue;
        if (take(ctx, t, tier, stage, out, quota)) progress = true;
      }
    }
    return out;
  }

  // New techniques per session (SPEC 5): 2 while fewer than 20 are started, then 1; pack.session.learn is the ceiling.
  function newCap(prog, ix) {
    var started = ix.techs.filter(function (t) { return isIntro(prog, t.id); }).length;
    return Math.min(ix.cfg.learn, started < NEW_EARLY_BELOW ? NEW_EARLY : NEW_LATER);
  }
  function microItems(ix, id) {
    return (ix.itemsByTech[id] || []).filter(function (it) {
      return it.tier === 'b' && itemKind(it);
    }).sort(function (a, b) { return (a.difficulty - b.difficulty) || cmp(a.id, b.id); }).slice(0, LEARN_ITEMS);
  }
  function planLearn(ctx) {
    var prog = ctx.prog, ix = ctx.ix;
    if (ix.cfg.learn < 1) return { status: 'skip', reason: 'no learn stage', cards: [], techs: [] };
    if (prog.pauseNew) return { status: 'paused', reason: 'new techniques paused', cards: [], techs: [] };
    var wip = ix.techs.filter(function (t) {
      var r = prog.tech[t.id];
      return r && r.in > 0 && r.s > 0 && r.s < ix.cfg.mastered && !r.prov;   // placed techniques are not work in progress
    }).length;
    if (wip > WIP_CAP) return { status: 'skip', reason: wip + ' in progress', cards: [], techs: [] };
    var untaught = ix.techs.filter(function (t) { return needsTeach(prog, t.id); });
    if (!untaught.length) return { status: 'skip', reason: 'all techniques started', cards: [], techs: [] };
    var gate = gateState(prog, ix);
    if (gate.held) return { status: 'held', reason: gate.short, cards: [], techs: [] };
    var eligible = untaught.filter(function (t) {
      if (ix.levelIndex[t.level] > gate.F) return false;   // never skip past the gated level
      // a prerequisite counts once started and credited (streak >= 1), changed 2026-10-12 after pacing study
      return (t.prereq || []).every(function (p) { return prog.tech[p] && (prog.tech[p].s >= 1 || prog.tech[p].m === 1 || prog.tech[p].prov === 1); });
    });
    if (!eligible.length) return { status: 'skip', reason: 'waiting on prerequisites', cards: [], techs: [] };
    var cap = newCap(prog, ix), picks = [];
    eligible.forEach(function (tech) {
      if (picks.length >= cap) return;
      var items = microItems(ix, tech.id);
      if (items.length) picks.push({ tech: tech, items: items });
    });
    if (!picks.length) return { status: 'skip', reason: eligible[0].level + ' has no problems yet', cards: [], techs: [] };
    var cards = [];
    picks.forEach(function (pk) {
      cards.push({ type: 'teach', stage: 'learn', tech: pk.tech.id, name: pk.tech.name, markdown: pk.tech.teach, item: null, requeued: false });
      pk.items.forEach(function (it) { ctx.st.used[it.id] = true; cards.push(makeCard(ctx.ix, it, 'learn', ctx.n)); });
    });
    return { status: 'ready', reason: null, tech: picks[0].tech, techs: picks.map(function (pk) { return pk.tech; }), cards: cards };
  }

  function buildPlan(prog, ix, today) {
    var n = prog.sessions + 1;
    var ctx = { prog: prog, ix: ix, today: today, n: n, st: { used: {}, perTech: {}, elig: 0, prod: 0 } };
    var cfg = ix.cfg;
    // Started but never answered means the teach card is coming again (F1): no Review or Micro cards before it.
    var introduced = ix.techs.filter(function (t) { return isIntro(prog, t.id) && !needsTeach(prog, t.id); });
    var mastered = introduced.filter(function (t) { return prog.tech[t.id].m === 1; });
    var notMastered = introduced.filter(function (t) { return prog.tech[t.id].m !== 1; });

    var learn = planLearn(ctx);
    var refreshN = Math.round(cfg.review * REFRESH_SHARE);
    var refreshList = mastered.slice().sort(function (a, b) { return (prog.tech[a.id].l - prog.tech[b.id].l) || (ix.order[a.id] - ix.order[b.id]); });

    var review = planStage(ctx, 'review', 'a', cfg.review, notMastered.slice().sort(byDue(prog, ix)), refreshList, refreshN);
    var micro = planStage(ctx, 'micro', 'b', cfg.micro,
      introduced.slice().sort(function (a, b) {
        var wa = prog.tech[a.id].wk ? 0 : 1, wb = prog.tech[b.id].wk ? 0 : 1;
        return (wa - wb) || byDue(prog, ix)(a, b);
      }), [], 0);

    var full = planFull(ctx);
    var reviewNote = review.length ? null : (introduced.length ? 'no recall items due' : null);
    var microNote = micro.length ? null : (introduced.length ? 'no micro items' : null);
    return {
      n: n,
      learn: { status: learn.status, reason: learn.reason, tech: learn.tech || null, techs: learn.techs || [],
        count: learn.cards.filter(function (c) { return c.type !== 'teach'; }).length },
      review: { status: review.length ? 'ready' : 'skip', reason: reviewNote, count: review.length },
      micro: { status: micro.length ? 'ready' : 'skip', reason: microNote, count: micro.length },
      full: { status: full.status, reason: full.reason, count: full.cards.length },
      cards: review.concat(learn.cards, micro, full.cards)
    };
  }

  // Commits the session: increments the ordinal and introduces the Learn technique.
  // Returns null when nothing can be planned (the ordinal is not consumed then).
  function startSession(prog, ix, today) {
    var plan = buildPlan(prog, ix, today);
    if (!plan.cards.length) return null;
    prog.sessions += 1;
    var n = prog.sessions;
    if (!prog.day || prog.day.d !== today) prog.day = { d: today, n: 0, log: [] };
    prog.day.n += 1;
    return {
      n: n, today: today, plan: plan, queue: plan.cards, pos: 0,
      credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: []
    };
  }

  function currentCard(sess) { return sess.queue[sess.pos] || null; }
  // Passing a teach card is what starts a technique (`in`). Ending earlier leaves it untaught (F1).
  function advance(sess, prog) {
    var card = currentCard(sess);
    if (card && card.type === 'teach') {
      if (!prog) throw new Error('advance past a teach card needs the progress record');
      var r = rec(prog, card.tech);
      if (!isIntro(prog, card.tech)) sess.introduced.push(card.tech);
      r.in = sess.n;
    }
    sess.pos += 1;
    return sess.pos < sess.queue.length;
  }

  // ---- credit rules (SPEC 2.4)
  // A miss resets the streak and drops the placement flag (SPEC 6: prov drops at first miss or at mastered).
  // changed 2026-10-12 after pacing study: a miss costs one streak step, not the whole streak; m = s >= mastered.
  function resetTech(r, mastered) { r.s = Math.max(0, r.s - 1); r.m = r.s >= mastered ? 1 : 0; r.prov = 0; }

  function applyAnswer(prog, ix, sess, card, ok, seconds) {
    var item = card.item, primary = item.tags[0], critical = item.critical || [];
    var it = prog.items[item.id] = prog.items[item.id] || defItem({});
    if (ok) it.r += 1; else it.w += 1;
    it.l = sess.n;
    if (seconds) it.t = nonneg(seconds);
    var out = { credited: false, mastered: false, requeue: false };

    item.tags.slice(1).forEach(function (tag) {
      var r = rec(prog, tag);
      if (ok) r.r += 1;
      else { r.w += 1; if (critical.indexOf(tag) >= 0) resetTech(r, ix.cfg.mastered); }
    });

    var r = rec(prog, primary);
    if (ok) {
      r.r += 1;
      if (item.tier === 'b') r.wk = 0;   // a right micro clears the weak flag from a failed full problem (SPEC 2.4)
      // a right typed tier b answer at streak >= PRODUCTION_STREAK also sets fp (changed 2026-10-12 after pacing study)
      if (item.tier === 'b' && isProduction(card.type) && r.s >= PRODUCTION_STREAK) r.fp = 1;
      var held = r.s >= PRODUCTION_STREAK && !isProduction(card.type);
      if (!(card.requeued || sess.credited[primary] || held)) {
        r.s += 1;
        r.l = sess.n;
        sess.credited[primary] = true;
        out.credited = true;
        if (r.m !== 1 && r.s >= ix.cfg.mastered) { r.m = 1; r.prov = 0; out.mastered = true; sess.mastered.push(primary); }
      }
    } else {
      r.w += 1;
      resetTech(r, ix.cfg.mastered);
      sess.credited[primary] = true;
      if (!card.requeued && !sess.requeued[item.id]) { sess.requeued[item.id] = true; out.requeue = true; }
    }
    return out;
  }

  // response: display index (mcq) or typed string (numeric).
  function answerCard(prog, ix, sess, response, seconds) {
    var card = currentCard(sess);
    if (!card || card.type === 'teach') throw new Error('no answerable card at this position');
    if (card.type === 'full') throw new Error('full problems take fullCommit and fullGrade');
    var g = gradeCard(card, response);
    if (g.unparsable) return { unparsable: true, error: g.error, detail: g.detail, kind: card.type };
    var out = applyAnswer(prog, ix, sess, card, g.ok, seconds);
    card.ok = !!g.ok;
    if (!card.requeued) {
      sess.scored += 1;
      if (g.ok) sess.right += 1; else sess.missed.push(card);
    }
    if (out.requeue && sess.kind !== 'exam') {
      sess.queue.splice(Math.min(sess.pos + 3, sess.queue.length), 0, Object.assign({}, card, { requeued: true }));
    }
    touchDay(prog, sess.today, card.id);
    return { unparsable: false, ok: g.ok, credited: out.credited, mastered: out.mastered, requeue: out.requeue,
      answer: answerText(card), solution: card.item.solution, chosen: g.chosen, typed: g.typed, error: g.error };
  }

  // ---- full problems (SPEC 2.4, 3.4, 5 stage 4). Commit (timed, correctness record), reveal, rubric self-grade.
  function r2(x) { return Math.round(x * 100) / 100; }
  // Share of the budget by difficulty: 1-2 easy, 3 mid, 4-5 hard.
  function budgetFor(cfg, difficulty) {
    if (difficulty <= 2) return cfg.fullBudget.easy;
    return difficulty === 3 ? cfg.fullBudget.mid : cfg.fullBudget.hard;
  }
  // Clock from timestamps, so a hidden tab keeps counting. `now` is injected (Date.now in the page, a fake in tests).
  function clockFor(startMs, budgetSec, now) {
    return function read() {
      var elapsed = Math.max(0, Math.floor((now() - startMs) / 1000));
      return { elapsed: elapsed, left: budgetSec - elapsed, over: elapsed >= budgetSec };
    };
  }
  // Full stage: a technique with streak >= 1 that has a tier c item whose secondary tag is mastered.
  // Weak (wk) techniques first, then the oldest-seen technique; the item is the least recently seen one.
  // pack.session.full full problems per session (default 1), each on a different technique (changed 2026-10-12:
  // the ceiling was ignored before, planFull returned one card whatever pack.session.full said).
  function planFull(ctx) {
    var prog = ctx.prog, ix = ctx.ix;
    if (ix.cfg.full < 1) return { status: 'skip', reason: 'no full stage', cards: [] };
    var started = ix.techs.filter(function (t) { return prog.tech[t.id] && prog.tech[t.id].s >= 1; });
    if (started.length < FULL_MIN_TECHS) {
      return { status: 'skip', reason: 'needs ' + FULL_MIN_TECHS + ' started', cards: [] };
    }
    var taken = {}, cards = [], skip = null;
    for (var k = 0; k < ix.cfg.full; k++) {
      var one = pickFull(ctx, started, taken);
      if (one.status !== 'ready') { if (!cards.length) skip = one; break; }
      taken[one.tech.id] = true;
      cards = cards.concat(one.cards);
    }
    if (!cards.length) return skip;
    return { status: 'ready', reason: null, tech: null, cards: cards };
  }
  function pickFull(ctx, started, taken) {
    var prog = ctx.prog, ix = ctx.ix;
    var cands = started.filter(function (t) { return !taken[t.id]; }).sort(function (a, b) {
      var ra = prog.tech[a.id], rb = prog.tech[b.id];
      return (rb.wk - ra.wk) || (ra.l - rb.l) || (ix.order[a.id] - ix.order[b.id]);
    });
    for (var i = 0; i < cands.length; i++) {
      var t = cands[i];
      var items = (ix.itemsByTech[t.id] || []).filter(function (it) {
        return it.tier === 'c' && itemKind(it) && !ctx.st.used[it.id] &&
          it.tags.slice(1).some(function (g) { return prog.tech[g] && prog.tech[g].m === 1; });
      }).sort(function (a, b) {
        var ua = usedToday(prog, ctx.today, a.id) ? 1 : 0, ub = usedToday(prog, ctx.today, b.id) ? 1 : 0;
        var la = prog.items[a.id] ? prog.items[a.id].l : 0, lb = prog.items[b.id] ? prog.items[b.id].l : 0;
        return (ua - ub) || (la - lb) || cmp(a.id, b.id);
      });
      if (items.length) {
        ctx.st.used[items[0].id] = true;
        return { status: 'ready', reason: null, tech: t, cards: [makeCard(ix, items[0], 'full', ctx.n)] };
      }
    }
    return { status: 'skip', reason: 'no full problem ready', cards: [] };
  }
  function countTags(prog, item, ok) {
    item.tags.forEach(function (tag) { var r = rec(prog, tag); if (ok) r.r += 1; else r.w += 1; });
  }
  // Commit: the timed MCQ (or typed number) is the correctness record. `seconds` is the time at commit.
  function fullCommit(prog, ix, sess, response, seconds) {
    var card = currentCard(sess);
    if (!card || card.type !== 'full') throw new Error('no full problem at this position');
    if (card.commit) throw new Error('full problem already committed');
    var g = gradeCard(card, response);
    if (g.unparsable) return { unparsable: true, error: g.error, detail: g.detail, kind: card.kind };
    var item = card.item, sec = nonneg(seconds), ok = !!g.ok;
    card.commit = { ok: ok, chosen: g.chosen, typed: g.typed, error: g.error, seconds: sec, over: sec >= card.budgetSec };
    var it = prog.items[item.id] = prog.items[item.id] || defItem({});
    if (ok) it.r += 1; else it.w += 1;
    it.l = sess.n; it.t = sec;
    countTags(prog, item, ok);
    touchDay(prog, sess.today, item.id);
    return { unparsable: false, ok: ok, chosen: g.chosen, typed: g.typed, answer: answerText(card), solution: item.solution,
      seconds: sec, budget: card.budgetSec, over: card.commit.over };
  }
  // ticks: rubric indexes the learner ticked. Returns the sorted, de-duplicated valid indexes.
  function rubricPicks(item, ticks) {
    var seen = {}, out = [];
    (Array.isArray(ticks) ? ticks : []).forEach(function (t) {
      var i = Number(t);
      if (Number.isInteger(i) && i >= 0 && i < item.rubric.length && !seen[i]) { seen[i] = true; out.push(i); }
    });
    return out.sort(function (a, b) { return a - b; });
  }
  // SPEC 2.4 and 3.4. A wrong commit grades 0. Otherwise the lower of the rubric level (2 at pass, 1 from
  // FULL_NEAR * pass, else 0) and the time level (2 inside budget, 1 at or past it). Self-grade can only lower credit.
  function gradeFullRule(o) {
    if (!o.mcqOk) return 0;
    var rub = o.score >= o.pass ? 2 : o.score >= FULL_NEAR * o.pass ? 1 : 0;
    var time = o.seconds < o.budget ? 2 : 1;
    return Math.min(rub, time);
  }
  function fullWhy(o) {
    return [
      o.mcqOk ? 'Committed answer right.' : 'Committed answer wrong.',
      'Rubric ' + o.score + ' of ' + o.total + ', pass at ' + o.pass + '.',
      o.seconds < o.budget ? 'In budget: ' + o.seconds + ' s of ' + o.budget + ' s.'
        : 'Over budget: ' + o.seconds + ' s of ' + o.budget + ' s.'
    ];
  }
  // Credit: grade 2 credits the primary like a right micro (once per session, mastery as usual) and sets fp on
  // every tag. Grade 0 resets the primary, sets wk on it and on each secondary, and blocks credit this session.
  // Grade 1 holds.
  function applyFullGrade(prog, ix, sess, card, grade) {
    var item = card.item, primary = item.tags[0];
    var fx = { credited: false, mastered: false, reset: false, weak: [], fp: [] };
    var r = rec(prog, primary);
    if (grade === 2) {
      item.tags.forEach(function (tag) { rec(prog, tag).fp = 1; fx.fp.push(tag); });
      if (!sess.credited[primary]) {
        r.s += 1; r.l = sess.n; sess.credited[primary] = true; fx.credited = true;
        if (r.m !== 1 && r.s >= ix.cfg.mastered) { r.m = 1; r.prov = 0; fx.mastered = true; sess.mastered.push(primary); }
      }
    } else if (grade === 0) {
      resetTech(r, ix.cfg.mastered); r.wk = 1; sess.credited[primary] = true; fx.reset = true; fx.weak.push(primary);
      item.tags.slice(1).forEach(function (tag) { rec(prog, tag).wk = 1; fx.weak.push(tag); });
    }
    return fx;
  }
  function recordFull(prog, id, n, grade, seconds) {
    var f = prog.full[id] = prog.full[id] || { g: [], l: 0, best: 0 };
    f.g = f.g.concat([grade]).slice(-2);
    f.l = n;
    if (grade === 2 && seconds > 0 && (!f.best || seconds < f.best)) f.best = seconds;
  }
  // Self-grade after the reveal. ticks: rubric indexes the learner checked off.
  function fullGrade(prog, ix, sess, ticks) {
    var card = currentCard(sess);
    if (!card || card.type !== 'full' || !card.commit) throw new Error('grade needs a committed full problem');
    if (card.graded) throw new Error('full problem already graded');
    var item = card.item, picked = rubricPicks(item, ticks);
    var score = r2(picked.reduce(function (s, i) { return s + item.rubric[i].weight; }, 0));
    var total = r2(item.rubric.reduce(function (s, c) { return s + c.weight; }, 0));
    var o = { mcqOk: card.commit.ok, score: score, total: total, pass: item.pass, seconds: card.commit.seconds, budget: card.budgetSec };
    var grade = gradeFullRule(o);
    var fx = applyFullGrade(prog, ix, sess, card, grade);
    card.graded = { grade: grade, why: fullWhy(o), score: score, total: total, pass: item.pass, ticks: picked, effects: fx };
    sess.scored += 1;
    if (grade === 2) sess.right += 1; else sess.missed.push(card);
    recordFull(prog, item.id, sess.n, grade, card.commit.seconds);
    touchDay(prog, sess.today, item.id);
    return Object.assign({ answer: answerText(card), solution: item.solution }, card.graded);
  }

  // ---- placement (SPEC 6, decisions 9). Buckets are tiers in pack order. A bucket's probes are tier b micro items:
  // one per technique, flagged `probe: true` when the tier has any flag, else the first tier b item of each technique.
  function placeProbes(ix, tier) {
    var flagged = [], plain = [];
    (ix.techsByLevel[tier] || []).forEach(function (t) {
      var its = (ix.itemsByTech[t.id] || []).filter(function (it) {
        return it.tier === 'b' && itemKind(it);
      }).sort(function (a, b) { return (a.difficulty - b.difficulty) || cmp(a.id, b.id); });
      var f = its.filter(function (it) { return it.probe === true; });
      if (f.length) flagged.push(f[0]);
      else if (its.length) plain.push(its[0]);
    });
    return (flagged.length ? flagged : plain).slice(0, PLACE_PROBES);
  }
  // Every probe offers "I don't know" (card.dk), which scores 0 and costs no attempt.
  function placementPlan(ix, n) {
    return ix.levels.map(function (lv) {
      var items = placeProbes(ix, lv.id);
      if (items.length < PLACE_MIN) {
        return { tier: lv.id, status: 'skip', reason: items.length ? lv.id + ' has ' + items.length + ' probe items, needs ' + PLACE_MIN : 'no probes yet', cards: [] };
      }
      return { tier: lv.id, status: 'ready', reason: null, cards: items.map(function (it) {
        var c = makeCard(ix, it, 'place', n);
        c.dk = true;
        return c;
      }) };
    });
  }
  // One attempt per probe and no feedback until the result. Cards are queued bucket by bucket.
  function startPlacement(prog, ix) {
    var n = prog.sessions + 1;
    var buckets = placementPlan(ix, n), queue = [];
    buckets.forEach(function (b, bi) { b.cards.forEach(function (c) { c.bucket = bi; queue.push(c); }); });
    if (!queue.length) return null;
    var levelIndex = {};
    ix.levels.forEach(function (lv, i) { levelIndex[lv.id] = i; });
    return { kind: 'place', n: n, queue: queue, pos: 0, levelIds: ix.levels.map(function (lv) { return lv.id; }),
      levelIndex: levelIndex, walked: [], stop: null, done: false, result: null,
      buckets: buckets.map(function (b) {
        return { tier: b.tier, status: b.status, reason: b.reason, total: b.cards.length, asked: 0, right: 0 };
      }) };
  }
  // Stop rules after a bucket completes (SPEC 6 early stop, CURRICULUM 4.2): a run of empty buckets, or a run of
  // buckets under PLACE_PASS. Returns 'zero', 'low' or null.
  function placementStop(sess) {
    var w = sess.walked.map(function (i) { return sess.buckets[i]; });
    if (w.length >= PLACE_ZERO_RUN && w.slice(-PLACE_ZERO_RUN).every(function (b) { return b.right === 0; })) return 'zero';
    if (w.length >= PLACE_LOW_RUN && w.slice(-PLACE_LOW_RUN).every(function (b) { return b.right / b.asked < PLACE_PASS; })) return 'low';
    return null;
  }
  // response: display index (mcq) or typed string; dontKnow scores 0 without grading.
  function placementAnswer(sess, response, dontKnow) {
    var card = currentCard(sess);
    if (sess.done || !card || card.stage !== 'place') throw new Error('no placement probe at this position');
    var ok = false;
    if (!dontKnow) {
      var g = gradeCard(card, response);
      if (g.unparsable) return { unparsable: true, error: g.error, detail: g.detail, kind: card.type };
      ok = !!g.ok;
    }
    var b = sess.buckets[card.bucket];
    b.asked += 1;
    if (ok) b.right += 1;
    sess.pos += 1;
    if (b.asked === b.total) {
      sess.walked.push(card.bucket);
      sess.stop = placementStop(sess);
      if (sess.stop) sess.done = true;
    }
    if (sess.pos >= sess.queue.length) sess.done = true;
    if (sess.done) sess.result = placementResult(sess);
    return { unparsable: false, done: sess.done };
  }
  // Prefix rule (SPEC 6): the largest k such that buckets 0..k-1 reach PLACE_PASS in total and every one of them has
  // a right answer, except an isolated empty bucket whose walked neighbours both have one.
  function placementResult(sess) {
    var w = sess.walked.map(function (i) { return sess.buckets[i]; });
    var k = 0;
    for (var len = w.length; len >= 1 && k === 0; len--) {
      var cr = 0, ca = 0;
      for (var i = 0; i < len; i++) { cr += w[i].right; ca += w[i].asked; }
      if (cr / ca < PLACE_PASS) continue;
      var ok = true;
      for (var j = 0; j < len && ok; j++) {
        if (w[j].right >= 1) continue;
        var isolated = j > 0 && j < w.length - 1 && w[j - 1].right >= 1 && w[j + 1].right >= 1;
        if (!isolated) ok = false;
      }
      if (ok) k = len;
    }
    var prefixEnd = k > 0 ? sess.levelIndex[w[k - 1].tier] : -1;
    return {
      prefixEnd: prefixEnd,
      placed: sess.levelIds.slice(0, prefixEnd + 1),
      pl: prefixEnd + 1 < sess.levelIds.length ? sess.levelIds[prefixEnd + 1] : null,
      stop: sess.stop || 'end',
      buckets: sess.buckets.map(function (b) {
        return { tier: b.tier, status: b.status, reason: b.reason, asked: b.asked, right: b.right };
      })
    };
  }
  // Writes the placed prefix. Only forward: a result that lands no higher changes nothing (retake never lowers).
  // Techniques with no streak and no answers get {s:1, prov:1}; earned progress is never touched.
  function applyPlacement(prog, ix, res) {
    var prevEnd = prog.placedOnce ? (prog.pl ? ix.levelIndex[prog.pl] - 1 : ix.levels.length - 1) : -1;
    if (prog.placedOnce && res.prefixEnd <= prevEnd) return { applied: false, placed: 0, pl: prog.pl };
    var seeded = 0;
    ix.techs.forEach(function (t) {
      if (ix.levelIndex[t.level] > res.prefixEnd) return;
      var r = rec(prog, t.id);
      if (r.m === 1 || r.s > 0 || r.r + r.w > 0) return;
      r.s = 1; r.prov = 1;
      if (!r.in) r.in = Math.max(1, prog.sessions);
      seeded += 1;
    });
    prog.placedOnce = true;
    prog.pl = res.pl;
    return { applied: true, placed: seeded, pl: res.pl };
  }

  // ---- level exam (SPEC 2.6). Offered when the gate is held and the level below it is within EXAM_NEAR_PCT points.
  // Integer arithmetic on known/total so the boundary is exact.
  function examLevel(prog, ix) {
    var g = gateState(prog, ix);
    if (!g.held || g.F < 1) return null;
    var prev = g.levels[g.F - 1], gatePct = Math.round(ix.cfg.gate * 100);
    if (prev.total === 0 || prev.known * 100 < (gatePct - EXAM_NEAR_PCT) * prev.total) return null;
    return { id: prev.id, label: prev.label, known: prev.known, total: prev.total, pct: prev.pct };
  }
  // Mixed set at the level below the gate: EXAM_MICRO micro problems (one per technique first), then EXAM_FULL full
  // problems whose secondary tag is mastered. The session does not consume a session number.
  function startExam(prog, ix, today) {
    var lv = examLevel(prog, ix);
    if (!lv) return null;
    var n = prog.sessions + 1;
    var ctx = { prog: prog, ix: ix, today: today, n: n, st: { used: {}, perTech: {}, elig: 0, prod: 0 } };
    var techs = (ix.techsByLevel[lv.id] || []).slice().sort(byDue(prog, ix));
    var micro = planStage(ctx, 'exam', 'b', EXAM_MICRO, techs, [], 0);
    var fullCands = [];
    techs.forEach(function (t) {
      (ix.itemsByTech[t.id] || []).forEach(function (it) {
        if (it.tier === 'c' && itemKind(it) && it.tags.slice(1).some(function (g) { return prog.tech[g] && prog.tech[g].m === 1; })) fullCands.push(it);
      });
    });
    fullCands.sort(function (a, b) {
      var ua = usedToday(prog, today, a.id) ? 1 : 0, ub = usedToday(prog, today, b.id) ? 1 : 0;
      var la = prog.items[a.id] ? prog.items[a.id].l : 0, lb = prog.items[b.id] ? prog.items[b.id].l : 0;
      return (ua - ub) || (la - lb) || cmp(a.id, b.id);
    });
    var full = fullCands.slice(0, EXAM_FULL).map(function (it) { return makeCard(ix, it, 'full', n); });
    var queue = micro.concat(full);
    if (!queue.length) return null;
    if (!prog.day || prog.day.d !== today) prog.day = { d: today, n: 0, log: [] };
    return { kind: 'exam', level: lv.id, label: lv.label, n: n, today: today, queue: queue, pos: 0,
      credited: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: [], result: null };
  }
  // Scores the exam: right micro answers and grade-2 full problems over the whole set. Pass at EXAM_PASS sets fp on
  // every technique answered right. Returns {right, total, pass, fp}.
  function finishExam(prog, ix, sess) {
    var total = sess.queue.length, right = 0, fpIds = [];
    sess.queue.forEach(function (c) {
      if (c.type === 'full') {
        if (c.graded && c.graded.grade === 2) { right += 1; c.item.tags.forEach(function (g) { fpIds.push(g); }); }
      } else if (c.ok) {
        right += 1; fpIds.push(c.item.tags[0]);
      }
    });
    var pass = total > 0 && right * 10 >= Math.round(EXAM_PASS * 10) * total;
    var fp = [];
    if (pass) {
      fpIds.forEach(function (id) { if (fp.indexOf(id) < 0) { rec(prog, id).fp = 1; fp.push(id); } });
    }
    sess.result = { level: sess.level, right: right, total: total, pass: pass, fp: fp };
    return sess.result;
  }
  // Test tab switch. Pause holds Learn only; Review and Full keep running (SPEC 5).
  function setPauseNew(prog, on) {
    prog.pauseNew = !!on;
    return prog.pauseNew;
  }


  // ---- session resume (M7). A Today session as plain data. Cards keep their item by id, their option order and
  // their commit and grade, so a reload shows the same item with the same options. The plan is not kept: the queue
  // is what the drill runs on. Placement and level exam sessions are not resumed (they carry sess.kind).
  function cardToData(card) {
    var d = {};
    Object.keys(card).forEach(function (k) { if (k !== 'item') d[k] = card[k]; });
    d.itemId = card.item ? card.item.id : null;
    return JSON.parse(JSON.stringify(d));
  }
  function cardFromData(ix, d) {
    var c = JSON.parse(JSON.stringify(d));
    var id = c.itemId;
    delete c.itemId;
    if (id === null) c.item = null;
    else {
      c.item = ix.itemById[id];
      if (!c.item) throw new Error('resume: unknown item ' + id);
    }
    return c;
  }
  // Returns null for a placement or level exam session (not resumed).
  function snapshotSession(sess) {
    if (!sess || sess.kind) return null;
    var d = {};
    Object.keys(sess).forEach(function (k) { if (k !== 'plan' && k !== 'queue' && k !== 'missed') d[k] = sess[k]; });
    d.queue = sess.queue.map(cardToData);
    d.missed = sess.missed.map(cardToData);
    return JSON.parse(JSON.stringify(d));
  }
  // Throws when the data does not describe a resumable Today session. The caller drops the record.
  function restoreSession(ix, d) {
    if (!d || typeof d !== 'object' || d.kind || !Array.isArray(d.queue) || !Array.isArray(d.missed)) {
      throw new Error('resume: not a Today session');
    }
    if (!(d.pos >= 0 && d.pos < d.queue.length)) throw new Error('resume: position out of range');
    var sess = {};
    Object.keys(d).forEach(function (k) { if (k !== 'queue' && k !== 'missed') sess[k] = d[k]; });
    sess.plan = null;
    sess.queue = d.queue.map(function (c) { return cardFromData(ix, c); });
    sess.missed = d.missed.map(function (c) { return cardFromData(ix, c); });
    return sess;
  }

  function finishSession(prog, ix, sess) {
    return {
      n: sess.n, scored: sess.scored, right: sess.right,
      missed: sess.missed.map(function (c) {
        return { id: c.item.id, prompt: c.item.prompt, answer: answerText(c), solution: c.item.solution };
      }),
      mastered: sess.mastered.map(function (id) { return ix.techById[id].name; }),
      introduced: sess.introduced.map(function (id) { return ix.techById[id].name; })
    };
  }

  return {
    snapshotSession: snapshotSession, restoreSession: restoreSession,
    PROG_VERSION: PROG_VERSION, REFRESH_SHARE: REFRESH_SHARE, PER_TECH_CAP: PER_TECH_CAP, WIP_CAP: WIP_CAP,
    LEARN_ITEMS: LEARN_ITEMS, PRODUCTION_STREAK: PRODUCTION_STREAK, EXAM_RULE: EXAM_RULE, ANSWER_KINDS: ANSWER_KINDS,
    PLAYABLE: PLAYABLE, PRODUCTION: PRODUCTION,
    NEW_EARLY: NEW_EARLY, NEW_LATER: NEW_LATER, NEW_EARLY_BELOW: NEW_EARLY_BELOW, REVIEW_PROD_SHARE: REVIEW_PROD_SHARE,
    PLACE_PASS: PLACE_PASS, PLACE_PROBES: PLACE_PROBES, PLACE_MIN: PLACE_MIN, PLACE_ZERO_RUN: PLACE_ZERO_RUN,
    PLACE_LOW_RUN: PLACE_LOW_RUN, EXAM_MICRO: EXAM_MICRO, EXAM_FULL: EXAM_FULL, EXAM_PASS: EXAM_PASS,
    EXAM_NEAR_PCT: EXAM_NEAR_PCT,
    hash32: hash32, permutation: permutation,
    itemKind: itemKind, isProduction: isProduction, answerText: answerText, makeCard: makeCard, gradeCard: gradeCard,
    config: config, index: index, newProg: newProg, normalizeProg: normalizeProg,
    knownTech: knownTech, isIntro: isIntro, needsTeach: needsTeach, usedToday: usedToday, touchDay: touchDay,
    levelStatus: levelStatus, gateState: gateState, buildPlan: buildPlan, startSession: startSession,
    newCap: newCap, currentCard: currentCard, advance: advance, applyAnswer: applyAnswer, answerCard: answerCard,
    finishSession: finishSession,
    placementPlan: placementPlan, placeProbes: placeProbes, startPlacement: startPlacement,
    placementAnswer: placementAnswer, placementResult: placementResult, applyPlacement: applyPlacement,
    examLevel: examLevel, startExam: startExam, finishExam: finishExam, setPauseNew: setPauseNew,
    FULL_MIN_TECHS: FULL_MIN_TECHS, FULL_NEAR: FULL_NEAR, FULL_BUDGET: FULL_BUDGET,
    budgetFor: budgetFor, clockFor: clockFor, gradeFullRule: gradeFullRule, planFull: planFull,
    fullCommit: fullCommit, fullGrade: fullGrade, rubricPicks: rubricPicks
  };
});
