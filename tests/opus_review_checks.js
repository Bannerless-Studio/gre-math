'use strict';
// Opus whole-engine review 2026-10-13 (committed tree 43d61e5). Regression checks for the confirmed defects.
// Every check here FAILS on 43d61e5 and should pass once the matching fix lands. Not wired into run_tier.sh.
// Run: node tests/opus_review_checks.js     (ids match the review report: D = data safety, L = learning model,
// A = answer checker, S = security/build, V = validator)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { suite } = require('./lib/check.js');
const { load } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const store = require('../engine/store.js');
const A = require('../engine/answer.js');
const S = suite('opus_review_checks');
const DAY = '2026-10-13';
const ROOT = path.join(__dirname, '..');

function mem(init, failKey) {
  const m = new Map(Object.entries(init || {}));
  return { map: m, getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (failKey && failKey(k)) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); } };
}
function right(card) {
  const a = card.item.answer, k = card.kind || card.type;
  if (k === 'mcq') return card.order.indexOf(a.correct);
  if (k === 'multi') return a.correct.map((c) => card.order.indexOf(c));
  return String(a.value);
}
function wrong(card) {
  const a = card.item.answer, k = card.kind || card.type;
  if (k === 'mcq') return (card.order.indexOf(a.correct) + 1) % card.order.length;
  return '123456789';
}
const base = (o) => Object.assign({ s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 }, o);
const bare = (n, cards) => ({ n, today: DAY, queue: cards, pos: 0, credited: {}, requeued: {}, scored: 0, right: 0,
  missed: [], mastered: [], introduced: [] });
function packIx(key) {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'packs', key, f), 'utf8'));
  const data = { pack: rd('pack.json'), techniques: rd('techniques.json'), items: rd('items.json') };
  return { data, ix: core.index(data) };
}
const fx = core.index(load());
const gm = packIx('gre-math');

// ---- D1: a second tab with an older copy must not overwrite newer progress (silent loss).
{
  const ls = mem(); const tabA = store.make(ls, 'pe_x', 'b'), tabB = store.make(ls, 'pe_x', 'b');
  const a = tabA.open({}), b = tabB.open({});
  a.prog.sessions = 7; tabA.save(a);
  b.prog.pv = { sn: 0, k: 0, m: 0, full: 0 }; tabB.save(b);       // stale tab: visitProgress -> save
  S.check('D1 stale tab save does not lose the other tab\'s sessions', JSON.parse(ls.getItem('pe_x')).sessions === 7,
    JSON.parse(ls.getItem('pe_x')).sessions);
}

// ---- D2: the built page hands store.js the real build id (window.PE_BUILD is set after app.js runs).
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const ls = mem();
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, hidden: false, innerHTML: '', textContent: '', className: '', value: '',
    setAttribute() {}, getAttribute() { return null; }, addEventListener(t, f) { (this.h = this.h || {})[t] = f; }, focus() {},
    querySelector() { return null; } });
  const document = { getElementById: el, addEventListener() {}, querySelectorAll() { return []; }, readyState: 'loading',
    hidden: false, title: '', body: { appendChild() {} }, createElement() { return el('x'); } };
  const win = { document, localStorage: ls, addEventListener() {}, scrollTo() {}, navigator: {}, location: { protocol: 'file:' },
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math };
  win.window = win;
  const ctx = vm.createContext(win);
  scripts.forEach((s) => vm.runInContext(s, ctx));
  el('root').h.click({ target: { closest: () => ({ getAttribute: () => 'start' }) } });
  const rec = JSON.parse(ls.getItem('pe_' + ctx.PE_DATA.pack.key + '_session') || '{}');
  S.check('D2 parked session carries the page build id', rec.build === ctx.PE_BUILD && typeof rec.build === 'string', rec.build);
}

// ---- D3: a failed session write must not leave an older parked record (reload would replay and credit twice).
{
  let fail = false;
  const ls = mem({}, (k) => fail && k === 'pe_x_session');
  const st = store.make(ls, 'pe_x', 'b'); const P = st.open({});
  const sess = core.startSession(P.prog, fx, DAY);
  while (core.currentCard(sess).type === 'teach') core.advance(sess, P.prog);
  st.save(P); st.saveSession({ sess: core.snapshotSession(sess) }, 1000);
  fail = true;
  core.answerCard(P.prog, fx, sess, right(core.currentCard(sess)), 3); st.save(P);
  st.saveSession({ sess: core.snapshotSession(sess) }, 1100);
  S.check('D3 failed saveSession drops the stale parked record', store.make(ls, 'pe_x', 'b').readSession(1200) === null);
}

// ---- D4: read-only "newer" mode must not offer an empty record as the export.
{
  const raw = JSON.stringify({ v: 2, sessions: 80 });
  const st = store.make(mem({ pe_x: raw }), 'pe_x', 'b'); const P = st.open({});
  S.check('D4 newer-build read-only: in-memory record is not a blank one that Export would write', P.prog.sessions === 80 || P.raw === raw,
    P.prog.sessions);
}

// ---- D5: a second reset or import must not replace a real backup with an empty record.
{
  const ls = mem(); const st = store.make(ls, 'pe_x', 'b'); const P = st.open({});
  P.prog.sessions = 55; st.save(P); st.reset(P); st.reset(P);
  const keys = [...ls.map.keys()].filter((k) => k.indexOf('pe_x_') === 0);
  S.check('D5 two resets keep the 55-session backup somewhere', keys.some((k) => { try { return JSON.parse(ls.getItem(k)).sessions === 55; } catch (e) { return false; } }), keys);
}

// ---- L1: the level exam must not add streak credit beyond once per session ordinal (repeatable exam = mastery farm).
{
  const p = core.newProg(); p.sessions = 10;
  const T1 = gm.ix.techsByLevel.T1;
  T1.forEach((t, i) => { p.tech[t.id] = i < 9 ? base({ s: 3, m: 1, fp: 1, l: 9, r: 3 }) : base({ s: 0, l: 9, r: 1, w: 1 }); });
  const target = T1[9].id;
  for (let k = 0; k < 3; k++) {
    const sess = core.startExam(p, gm.ix, DAY);
    if (!sess) break;
    while (core.currentCard(sess)) {
      const c = core.currentCard(sess);
      if (c.type === 'full') { core.fullCommit(p, gm.ix, sess, right(c), 10); core.fullGrade(p, gm.ix, sess, c.item.rubric.map((_, i) => i)); }
      else core.answerCard(p, gm.ix, sess, right(c), 5);
      if (!core.advance(sess, p)) break;
    }
    core.finishExam(p, gm.ix, sess);
  }
  S.check('L1 three exams in one sitting give at most one streak step', p.tech[target].s <= 1, p.tech[target]);
}

// ---- L2: a placed (known) technique must stay known when it reaches mastery.
{
  const t = gm.ix.techs.find((x) => x.exam !== false && (gm.ix.itemsByTech[x.id] || []).some((i) => i.tier === 'a' && core.isProduction(core.itemKind(i))));
  const typedA = gm.ix.itemsByTech[t.id].find((i) => i.tier === 'a' && core.isProduction(core.itemKind(i)));
  const p = core.newProg(); p.sessions = 2; p.tech[t.id] = base({ s: 2, prov: 1 });
  const known0 = core.knownTech(p.tech[t.id], t);
  const sess = bare(3, [core.makeCard(gm.ix, typedA, 'review', 3)]);
  core.answerCard(p, gm.ix, sess, right(sess.queue[0]), 5);
  S.check('L2 placed technique stays known after mastery', known0 && p.tech[t.id].m === 1 && core.knownTech(p.tech[t.id], t), p.tech[t.id]);
}

// ---- L3: full grade 0 resets critical secondary tags, as a micro miss does (SPEC 2.4).
{
  const it = gm.data.items.find((i) => i.tier === 'c' && i.critical && i.critical.length);
  const p = core.newProg(); it.tags.forEach((g) => { p.tech[g] = base({ s: 3, m: 1, fp: 1 }); });
  const sess = bare(6, [core.makeCard(gm.ix, it, 'full', 6)]);
  core.fullCommit(p, gm.ix, sess, wrong(sess.queue[0]), 30); core.fullGrade(p, gm.ix, sess, []);
  S.check('L3 grade 0 costs the critical secondary a streak step', p.tech[it.critical[0]].s === 2, p.tech[it.critical[0]]);
}

// ---- L5: a clean full problem (grade 2) clears the weak flag on its primary.
{
  const it = gm.data.items.find((i) => i.tier === 'c');
  const p = core.newProg(); it.tags.forEach((g) => { p.tech[g] = base({ s: 1, wk: 1 }); });
  const sess = bare(6, [core.makeCard(gm.ix, it, 'full', 6)]);
  core.fullCommit(p, gm.ix, sess, right(sess.queue[0]), 10); core.fullGrade(p, gm.ix, sess, it.rubric.map((_, i) => i));
  S.check('L5 grade 2 clears wk on the primary', p.tech[it.tags[0]].wk === 0, p.tech[it.tags[0]]);
}

// ---- A1: a typed 0 must not match a non-zero target whose values are all tiny (physics constants).
{
  const spec = { kind: 'expression', value: '6.626*10^-34*f', vars: ['f'] };
  S.check('A1 typed 0 vs 6.626e-34*f is wrong', A.check(spec, '0').ok === false);
  S.check('A1 typed f-f vs 6.626e-34*f is wrong', A.check(spec, 'f-f').ok === false);
}

// ---- A2: a typed answer undefined where the target is defined must not pass on the remaining points.
{
  S.check('A2 ln(x) is not ln(abs(x)) on [-1,3]', A.check({ kind: 'expression', value: 'ln(abs(x))', vars: ['x'], domain: [-1, 3] }, 'ln(x)').ok === false);
  S.check('A2 2*ln(x) is not ln(x^2) on [-2,2], 20 points', A.check({ kind: 'expression', value: 'ln(x^2)', vars: ['x'], domain: [-2, 2], points: 20 }, '2*ln(x)').ok === false);
}

// ---- A3: a zero-width domain is a bad spec (every sample is the same point).
S.check('A3 domain [1,1] is bad-spec', A.check({ kind: 'expression', value: 'x^2', vars: ['x'], domain: [1, 1] }, 'x').error === 'bad-spec');

// ---- A4: rel/tol are silently dead on an exact rational value ("9.81" string, form exact) but live on 9.81 (number).
// DECISIONS 10 keeps exact compare for rational targets, so the validator must refuse the dead field.
{
  const V = require('../tools/validate_pack.js');
  const d = load(); const b = d.items.find((i) => i.tier === 'b');
  d.items.push(Object.assign(JSON.parse(JSON.stringify(b)), { id: 'zz-a4', answer: { kind: 'numeric', value: '9.81', rel: 0.01 } }));
  S.check('A4 validator flags rel on an exact rational string value', V.check(d).errors.some((e) => /zz-a4/.test(e)));
}

// ---- A6: very long input never throws out of check (expression path).
{
  let threw = false;
  try { A.check({ kind: 'expression', value: 'x', vars: ['x'] }, '-'.repeat(20000) + 'x'); } catch (e) { threw = true; }
  S.check('A6 deep unary chain returns a result instead of throwing', !threw);
}

// ---- S1: build.sh refuses a closing script tag in any letter case.
{
  const sh = fs.readFileSync(path.join(ROOT, 'build.sh'), 'utf8');
  S.check('S1 build.sh script-close guard is case-insensitive', /grep -[a-z]*i[a-z]* '<\/script/.test(sh) || /\\u003c|u003c/.test(sh));
}

// ---- V1: validate_pack rejects expression specs the checker itself calls bad-spec, and a key that fails its own check.
{
  const V = require('../tools/validate_pack.js');
  const d = load();
  const b = d.items.find((i) => i.tier === 'b');
  const mk = (id, answer) => Object.assign(JSON.parse(JSON.stringify(b)), { id, answer });
  d.items.push(mk('zz-1', { kind: 'expression', value: 'x+', vars: ['x'] }), mk('zz-2', { kind: 'expression', value: 'x^2', vars: ['x'], domain: [1, 1] }),
    mk('zz-5', { kind: 'numeric', value: 0.333, form: 'fraction' }));
  const errs = V.check(d).errors.join('\n');
  ['zz-1', 'zz-2', 'zz-5'].forEach((id) => S.check('V1 validator flags ' + id, errs.indexOf(id) >= 0));
  const t = load();
  t.techniques.push({ id: 't1.empty', name: 'E', level: t.techniques[0].level, area: 'a', teach: 'x', order: 99, prereq: [] });
  S.check('V2 validator flags an item-less technique below the last level (blocks every later level)',
    V.check(t).errors.some((e) => /t1\.empty/.test(e)));
}

// ---- Re-review 2026-10-13 (after the fixes landed): one check per defect fixed in that pass.
// R1: a level exam miss records w only; it must not cost a critical secondary tag a streak step either (L1 rule).
{
  const d = load(), ix = core.index(d);
  const src = d.items.find((i) => i.tier === 'b' && core.itemKind(i) === 'numeric');
  const other = d.techniques.find((t) => t.id !== src.tags[0]).id;
  const it = Object.assign(JSON.parse(JSON.stringify(src)), { tags: [src.tags[0], other], critical: [other] });
  const p = core.newProg(); p.sessions = 5;
  p.tech[src.tags[0]] = base({ s: 2 }); p.tech[other] = base({ s: 3, m: 1, fp: 1 });
  const sess = Object.assign(bare(6, [core.makeCard(ix, it, 'review', 6)]), { kind: 'exam' });
  core.answerCard(p, ix, sess, '123456789', 5);
  S.check('R1 exam miss leaves a critical secondary streak alone', p.tech[other].s === 3 && p.tech[other].m === 1, p.tech[other]);
  const sess2 = bare(6, [core.makeCard(ix, it, 'review', 6)]);
  core.answerCard(p, ix, sess2, '123456789', 5);
  S.check('R1 Today miss still costs the critical secondary one step', p.tech[other].s === 2, p.tech[other]);
}
// R2: L4 cap reaches records saved before it: a streak above mastered + 1 drops under the cap at its first miss.
{
  const it = load().items.find((i) => i.tier === 'b' && core.itemKind(i) === 'numeric');
  const p = core.newProg(); p.sessions = 40; p.tech[it.tags[0]] = base({ s: 30, m: 1, fp: 1, l: 39 });
  core.answerCard(p, fx, bare(41, [core.makeCard(fx, it, 'review', 41)]), '123456789', 5);
  const r1 = Object.assign({}, p.tech[it.tags[0]]);
  core.answerCard(p, fx, bare(42, [core.makeCard(fx, it, 'review', 42)]), '123456789', 5);
  S.check('R2 legacy streak 30: first miss leaves it at mastered, second un-masters', r1.s === 3 && r1.m === 1 && p.tech[it.tags[0]].s === 2 && p.tech[it.tags[0]].m === 0,
    [r1, p.tech[it.tags[0]]]);
}
// R3: single-star italics: labels and *word* render; COUNT(*) ... COUNT(*) on one line stays literal.
{
  const T = require('../engine/text.js');
  const h = T.md('*Trap:* Computing SUM(x) / COUNT(*) as an average. COUNT(*) counts the NULL rows, *free* and *minimal key*.', true, null);
  S.check('R3 COUNT(*) pair is not italicised', h.indexOf('COUNT(*) as an average. COUNT(*) counts') >= 0, h);
  S.check('R3 labels and words still italicised', (h.match(/<em>/g) || []).length === 3 && h.indexOf('<em>Trap:</em>') >= 0, h);
}
// R4: build.sh guards the inlined Python worker and harness case-insensitively too (S1 class).
{
  const sh = fs.readFileSync(path.join(ROOT, 'build.sh'), 'utf8');
  const bad = sh.split('\n').filter((l) => /grep -[a-z]*l '<\/script'/.test(l) && !/grep -[a-z]*i[a-z]* '<\/script'/.test(l));
  S.check('R4 every build.sh closing-script guard is case-insensitive', bad.length === 0, bad);
}
// R5: the live expression echo does not throw on a pathologically deep input (A6 on the page path).
{
  const app = fs.readFileSync(path.join(ROOT, 'engine', 'app.js'), 'utf8');
  const fn = app.slice(app.indexOf('function updateEcho'), app.indexOf('function render()'));
  S.check('R5 updateEcho guards canon with try', /try\s*\{[^}]*A\.canon\(/.test(fn));
}
// R6: a stale tab (another tab saved since it read) refuses import and reset before writing any backup.
{
  const ls = mem(); const tabA = store.make(ls, 'pe_y', 'b'), tabB = store.make(ls, 'pe_y', 'b');
  const a = tabA.open({}), b = tabB.open({});
  a.prog.sessions = 4; tabA.save(a);
  ls.setItem('pe_y_pre_import_backup', JSON.stringify(Object.assign(core.newProg(), { sessions: 9 })));
  b.prog.sessions = 2;
  const ri = tabB.importText(b, JSON.stringify(Object.assign(core.newProg(), { sessions: 1 })));
  S.check('R6 stale tab import refused, backup slot and record untouched', !ri.ok && b.readonly &&
    JSON.parse(ls.getItem('pe_y_pre_import_backup')).sessions === 9 && JSON.parse(ls.getItem('pe_y')).sessions === 4, [ri, b.notice]);
  const c = tabB.open({}); a.prog.sessions = 5; tabA.save(a);
  const rr = tabB.reset(c);
  S.check('R6 stale tab reset refused, no reset backup written', !rr.ok && c.readonly && ls.getItem('pe_y_reset_backup') === null &&
    JSON.parse(ls.getItem('pe_y')).sessions === 5, rr);
}

// R7 (J1): backups are 2-slot rings, newest first; a slot with progress is never displaced by an empty record.
{
  const ls = mem(); const st = store.make(ls, 'pe_r', 'b'); const P = st.open({});
  const slot = (k) => (ls.getItem(k) === null ? null : JSON.parse(ls.getItem(k)).sessions);
  P.prog.sessions = 5; st.save(P); st.reset(P);
  P.prog.sessions = 8; st.save(P); st.reset(P);
  S.check('R7 reset ring: slot 0 newest, slot 1 previous', slot('pe_r_reset_backup') === 8 && slot('pe_r_reset_backup_1') === 5,
    [slot('pe_r_reset_backup'), slot('pe_r_reset_backup_1')]);
  st.reset(P);   // record is empty now: reset must not displace either slot
  S.check('R7 empty record leaves both slots', slot('pe_r_reset_backup') === 8 && slot('pe_r_reset_backup_1') === 5);
  const ls2 = mem({ pe_q_pre_import_backup: JSON.stringify(Object.assign(core.newProg(), { sessions: 6 })) });   // pre-ring single record
  const s2 = store.make(ls2, 'pe_q', 'b'); const Q = s2.open({}); Q.prog.sessions = 2; s2.save(Q);
  s2.importText(Q, JSON.stringify(Object.assign(core.newProg(), { sessions: 1 })));
  S.check('R7 single legacy record becomes slot 0, then shifts to slot 1',
    [ls2.getItem('pe_q_pre_import_backup'), ls2.getItem('pe_q_pre_import_backup_1')].map((x) => (x === null ? null : JSON.parse(x).sessions)).join() === '2,6');
}
// R8 (J2): a level exam miss on a placed technique clears prov (primary and critical secondary), moving no streak.
{
  const d = load(), ix = core.index(d);
  const src = d.items.find((i) => i.tier === 'b' && core.itemKind(i) === 'numeric');
  const other = d.techniques.find((t) => t.id !== src.tags[0]).id;
  const it = Object.assign(JSON.parse(JSON.stringify(src)), { tags: [src.tags[0], other], critical: [other] });
  const p = core.newProg(); p.sessions = 5;
  p.tech[src.tags[0]] = base({ s: 1, prov: 1 }); p.tech[other] = base({ s: 1, prov: 1 });
  const sess = Object.assign(bare(6, [core.makeCard(ix, it, 'review', 6)]), { kind: 'exam' });
  core.answerCard(p, ix, sess, '123456789', 5);
  const a = p.tech[src.tags[0]], b = p.tech[other];
  S.check('R8 exam miss clears prov, streak stays', a.prov === 0 && a.s === 1 && b.prov === 0 && b.s === 1, [a, b]);
  const sess2 = Object.assign(bare(6, [core.makeCard(ix, it, 'review', 6)]), { kind: 'exam' });
  const q = core.newProg(); q.tech[src.tags[0]] = base({ s: 1, prov: 1 });
  core.answerCard(q, ix, Object.assign(sess2, { cards: 0 }), right(sess2.queue[0]), 5);
  S.check('R8 exam right answer keeps prov', q.tech[src.tags[0]].prov === 1, q.tech[src.tags[0]]);
}
// R9 (J5): read-only because another tab saved: Export writes the stored record, not this tab's stale copy.
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const ls = mem(); const els = {}; let exported = null;
  const el = (id) => els[id] || (els[id] = { id, hidden: false, innerHTML: '', textContent: '', className: '', value: '',
    setAttribute() {}, getAttribute() { return null; }, addEventListener(t, f) { (this.h = this.h || {})[t] = f; }, focus() {},
    querySelector() { return null; }, click() {}, remove() {} });
  const document = { getElementById: el, addEventListener() {}, querySelectorAll() { return []; }, readyState: 'loading',
    hidden: false, title: '', body: { appendChild() {} }, createElement() { return el('x'); } };
  const win = { document, localStorage: ls, addEventListener() {}, scrollTo() {}, navigator: {}, location: { protocol: 'file:' },
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math,
    Blob: function (parts) { exported = parts.join(''); }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} } };
  win.window = win;
  const ctx = vm.createContext(win);
  scripts.forEach((s) => vm.runInContext(s, ctx));
  const click = (act) => el('root').h.click({ target: { closest: () => ({ getAttribute: () => act }) } });
  const key = 'pe_' + ctx.PE_DATA.pack.key;
  click('start');                                              // this tab writes its record
  const other = JSON.stringify(Object.assign(core.newProg(), { sessions: 77 }));
  ls.setItem(key, other);                                      // another tab saved
  click('quit'); click('quit-yes'); click('start');            // next save here is stale: read-only
  click('export');
  S.check('R9 read-only export writes the stored record', exported === other, exported && exported.slice(0, 80));
}

// ---- UI port review: theme key, storage guard, no prog.theme writes
{
  const app = fs.readFileSync(path.join(ROOT, 'engine', 'app.js'), 'utf8');
  S.check('U1 app.js never assigns prog.theme', !/prog\.theme\s*=[^=]/.test(app));
  S.check('U2 THEME_KEY is KEY + _theme', /THEME_KEY\s*=\s*KEY\s*\+\s*'_theme'/.test(app));
  S.check('U3 storage listener guard is e.key !== KEY', /addEventListener\('storage',[\s\S]{0,80}e\.key !== KEY/.test(app));
}

S.done();
