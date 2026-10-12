'use strict';
// M7 session resume (SPEC M7): the parked Today session as data, the store record (12 h, build id, drops on
// import and reset), and the restored queue (same item, same option order, commit and grade kept).
const { suite } = require('./lib/check.js');
const { fresh, load, correctResponse } = require('./lib/fixture.js');
const core = require('../engine/core.js');
const store = require('../engine/store.js');
const S = suite('session_resume_checks');
const DAY = '2026-10-12';
const KEY = 'pe_fixture';
const BUILD = 'build-A';
const HOUR = 60 * 60 * 1000;
const NOW = 1800000000000;

function memStorage(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    map: m
  };
}
const base = (over) => Object.assign({ s: 0, l: 0, r: 0, w: 0, m: 0, wk: 0, prov: 0, fp: 0, in: 1 }, over || {});
// Plays the teach card and returns the session parked at its first non-teach card.
function toFirstProblem(prog, ix) {
  const sess = core.startSession(prog, ix, DAY);
  while (core.currentCard(sess).type === 'teach') core.advance(sess, prog);
  return sess;
}
// A progress record where the Full stage is ready (see full_checks.js readyProg).
function readyProg() {
  const p = core.newProg();
  p.sessions = 6;
  p.tech['t1.lin-eq'] = base({ s: 3, m: 1, r: 3, l: 4 });
  p.tech['t1.quad'] = base({ s: 3, m: 1, r: 3, l: 5 });
  p.tech['t2.exp-log'] = base({ s: 1, r: 1, l: 5 });
  p.tech['t1.factor'] = base({ s: 1, r: 1, l: 5 });
  p.tech['t2.unit-circle'] = base({ s: 1, r: 1, l: 5 });
  return p;
}
const jsonEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- 1. snapshot round trip through the store record
{
  const { ix, prog } = fresh();
  const sess = toFirstProblem(prog, ix);
  const st = store.make(memStorage(), KEY, BUILD);
  const snap = core.snapshotSession(sess);
  S.check('a Today session snapshots', snap !== null);
  S.check('the store writes the record', st.saveSession({ sess: snap, reveal: null, draft: '12', cs: NOW }, NOW));
  const got = st.readSession(NOW + 1000);
  S.eq('the record reads back equal', got && got.sess, JSON.parse(JSON.stringify(snap)));
  S.eq('draft and timer stamp come back', got && [got.draft, got.cs], ['12', NOW]);
  const back = core.restoreSession(ix, got.sess);
  S.eq('same queue length and position', [back.queue.length, back.pos], [sess.queue.length, sess.pos]);
  S.eq('same card ids in the same order', back.queue.map((c) => c.item ? c.item.id : c.type), sess.queue.map((c) => c.item ? c.item.id : c.type));
}

// ---- 2. the item on screen: same id, same option order, and the same right answer after a reload
{
  const { ix, prog } = fresh();
  const sess = toFirstProblem(prog, ix);
  const mcq = sess.queue.find((c) => c.type === 'mcq');
  S.check('the fixture session has a multiple choice card', !!mcq, sess.queue.map((c) => c.type));
  const back = core.restoreSession(ix, core.snapshotSession(sess));
  const again = core.restoreSession(ix, JSON.parse(JSON.stringify(core.snapshotSession(sess))));
  const restored = back.queue.find((c) => c.type === 'mcq');
  S.eq('option order is stable across a reload', restored.order, mcq.order);
  S.eq('option order is stable across a second reload', again.queue.find((c) => c.type === 'mcq').order, mcq.order);
  S.eq('correct display index is the same after reload', correctResponse(restored), correctResponse(mcq));
  S.check('restored card points at the shared item object', restored.item === ix.itemById[mcq.item.id]);
}

// ---- 3. a micro answered before the reload is not asked again, and the reveal comes back
{
  const { ix, prog } = fresh();
  const sess = toFirstProblem(prog, ix);
  const first = core.currentCard(sess);
  const r = core.answerCard(prog, ix, sess, correctResponse(first), 5);
  const back = core.restoreSession(ix, core.snapshotSession(sess));
  S.eq('the answered card is still the current card (reveal shown before Continue)', back.queue[back.pos].id, first.id);
  S.eq('the credit survives in the restored session', Object.keys(back.credited), Object.keys(sess.credited));
  S.check('the answer result was ok', r.ok === true);
}

// ---- 4. a full problem committed before the reload keeps its commit; grading still works after it
{
  const { ix } = fresh();
  const prog = readyProg();
  const sess = core.startSession(prog, ix, DAY);
  let full = null;
  for (;;) {
    const c = core.currentCard(sess);
    if (!c) break;
    if (c.type === 'full') { full = c; break; }
    if (c.type !== 'teach') core.answerCard(prog, ix, sess, correctResponse(c), 4);
    if (!core.advance(sess, prog)) break;
  }
  S.check('a full problem is on the queue', !!full);
  core.fullCommit(prog, ix, sess, correctResponse(full), 120);
  const data = JSON.parse(JSON.stringify(core.snapshotSession(sess)));
  const back = core.restoreSession(ix, data);
  const card = back.queue[back.pos];
  S.eq('the full problem comes back on the same item', card.item.id, full.item.id);
  S.eq('the commit is kept', card.commit && [card.commit.ok, card.commit.seconds], [true, 120]);
  S.eq('the budget is kept', card.budgetSec, full.budgetSec);
  S.eq('the option order is kept', card.order, full.order);
  const g = core.fullGrade(prog, ix, back, [0, 1, 2]);
  S.eq('grading after the reload is grade 2 for a clean in-budget commit', g.grade, 2);
}

// ---- 5. teach cards and requeued copies keep their fields
{
  const { ix, prog } = fresh();
  const sess = core.startSession(prog, ix, DAY);
  const back = core.restoreSession(ix, core.snapshotSession(sess));
  S.eq('the teach card comes back first with its markdown', [back.queue[0].type, back.queue[0].item, typeof back.queue[0].markdown], ['teach', null, 'string']);
}
{
  const { ix, prog } = fresh();
  const sess = toFirstProblem(prog, ix);
  const c = core.currentCard(sess);
  const { wrongResponse } = require('./lib/fixture.js');
  core.answerCard(prog, ix, sess, wrongResponse(c), 5);
  const had = sess.queue.filter((x) => x.requeued).length;
  const back = core.restoreSession(ix, core.snapshotSession(sess));
  S.eq('a requeued copy keeps requeued true', back.queue.filter((x) => x.requeued).length, had);
  S.eq('the miss is kept in the missed list', back.missed.map((x) => x.item.id), sess.missed.map((x) => x.item.id));
  S.eq('the session tallies come back', [back.scored, back.right], [sess.scored, sess.right]);
}

// ---- 6. store record drops: 12 h age, future stamp, build, shape, unreadable
{
  const { ix, prog } = fresh();
  const snap = core.snapshotSession(toFirstProblem(prog, ix));
  const data = { sess: snap, reveal: null, draft: '', cs: NOW };
  const kept = (age) => {
    const mem = memStorage();
    const st = store.make(mem, KEY, BUILD);
    st.saveSession(data, NOW);
    return st.readSession(NOW + age) !== null;
  };
  S.check('11 h 59 min old is restored', kept(12 * HOUR - 60000));
  S.check('exactly 12 h old is dropped', !kept(12 * HOUR));
  S.check('a record more than 12 h old is dropped', !kept(13 * HOUR));
  S.check('a record dated in the future is dropped', !kept(-1000));
  S.check('a record saved by another build is dropped', (() => {
    const mem = memStorage();
    store.make(mem, KEY, 'build-OLD').saveSession(data, NOW);
    return store.make(mem, KEY, BUILD).readSession(NOW) === null && !mem.map.has(KEY + '_session');
  })());
  S.check('an unreadable record is dropped, no throw', (() => {
    const mem = memStorage({ [KEY + '_session']: '{not json' });
    const got = store.make(mem, KEY, BUILD).readSession(NOW);
    return got === null && !mem.map.has(KEY + '_session');
  })());
  S.check('a record without the version field is dropped', (() => {
    const mem = memStorage({ [KEY + '_session']: JSON.stringify({ build: BUILD, t: NOW, s: data }) });
    return store.make(mem, KEY, BUILD).readSession(NOW) === null;
  })());
  S.check('no record reads as null', store.make(memStorage(), KEY, BUILD).readSession(NOW) === null);
}

// ---- 7. dropSession and the storage key
{
  const mem = memStorage();
  const st = store.make(mem, KEY, BUILD);
  st.saveSession({ sess: {}, reveal: null, draft: '', cs: 1 }, NOW);
  S.check('the record lives under pe_<key>_session', mem.map.has(KEY + '_session'));
  st.dropSession();
  S.check('dropSession removes it', !mem.map.has(KEY + '_session'));
}

// ---- 8. import and reset drop the parked session; a refused import keeps it
{
  const { ix, prog } = fresh();
  const data = { sess: core.snapshotSession(toFirstProblem(prog, ix)), reveal: null, draft: '', cs: NOW };
  const mem = memStorage();
  const st = store.make(mem, KEY, BUILD);
  const page = { prog: core.newProg(), readonly: false, notice: '' };
  st.saveSession(data, NOW);
  const exported = JSON.stringify(core.newProg());
  const r = st.importText(page, exported);
  S.check('import applies', r.ok === true);
  S.check('import drops the parked session', st.readSession(NOW) === null);
  st.saveSession(data, NOW);
  const rr = st.reset(page);
  S.check('reset applies', rr.ok === true);
  S.check('reset drops the parked session', st.readSession(NOW) === null);
  st.saveSession(data, NOW);
  const refused = store.make(mem, KEY, BUILD).importText(Object.assign({}, page, { readonly: true }), exported);
  S.check('a refused import (read-only) keeps the parked session', refused.ok === false && store.make(mem, KEY, BUILD).readSession(NOW) !== null);
  const refusedReset = st.reset(Object.assign({}, page, { readonly: true }));
  S.check('a refused reset (read-only) keeps the parked session', refusedReset.ok === false && st.readSession(NOW) !== null);
}

// ---- 9. only Today sessions are parked; a placement or exam session has no snapshot
{
  const { ix, prog } = fresh();
  const sess = toFirstProblem(prog, ix);
  S.eq('a placement session is not snapshotted', core.snapshotSession(Object.assign({}, sess, { kind: 'place' })), null);
  S.eq('an exam session is not snapshotted', core.snapshotSession(Object.assign({}, sess, { kind: 'exam' })), null);
  S.eq('no session snapshots to null', core.snapshotSession(null), null);
}

// ---- 10. bad data is refused, never half restored
{
  const { ix, prog } = fresh();
  const snap = JSON.parse(JSON.stringify(core.snapshotSession(toFirstProblem(prog, ix))));
  const unknown = JSON.parse(JSON.stringify(snap));
  unknown.queue[1].itemId = 'nope';
  S.check('an unknown item id refuses the restore', (() => { try { core.restoreSession(ix, unknown); return false; } catch (e) { return /unknown item/.test(e.message); } })());
  const pos = JSON.parse(JSON.stringify(snap));
  pos.pos = pos.queue.length;
  S.check('a position past the queue refuses the restore', (() => { try { core.restoreSession(ix, pos); return false; } catch (e) { return /out of range/.test(e.message); } })());
  S.check('a placement record refuses the restore', (() => { try { core.restoreSession(ix, Object.assign({}, snap, { kind: 'place' })); return false; } catch (e) { return true; } })());
  S.check('a record with no queue refuses the restore', (() => { try { core.restoreSession(ix, { pos: 0 }); return false; } catch (e) { return true; } })());
}

// ---- 11. the restored session can finish: the same plan runs to the end and the summary counts match
{
  const { ix, prog } = fresh();
  const sess = toFirstProblem(prog, ix);
  // answer the first card, then park and restore, then play the rest
  const first = core.currentCard(sess);
  core.answerCard(prog, ix, sess, correctResponse(first), 5);
  core.advance(sess, prog);
  const back = core.restoreSession(ix, JSON.parse(JSON.stringify(core.snapshotSession(sess))));
  let guard = 0;
  for (;;) {
    const c = core.currentCard(back);
    if (!c) break;
    if (c.type !== 'teach') core.answerCard(prog, ix, back, correctResponse(c), 5);
    if (!core.advance(back, prog)) break;
    if (++guard > 200) throw new Error('runaway');
  }
  const summary = core.finishSession(prog, ix, back);
  S.check('the restored session finishes with a summary', summary.n === sess.n && summary.scored >= 1, summary);
}

// ---- 12. the record survives a second save of the same session (draft typing rewrites it)
{
  const { ix, prog } = fresh();
  const snap = core.snapshotSession(toFirstProblem(prog, ix));
  const mem = memStorage();
  const st = store.make(mem, KEY, BUILD);
  st.saveSession({ sess: snap, reveal: null, draft: '1', cs: NOW }, NOW);
  st.saveSession({ sess: snap, reveal: null, draft: '12', cs: NOW }, NOW + 5000);
  const got = st.readSession(NOW + 6000);
  S.eq('a later write replaces the draft and keeps the stamp', got && [got.draft, got.cs], ['12', NOW]);
  S.check('the record age counts from the last write', st.readSession(NOW + 5000 + 12 * HOUR - 1000) !== null);
}

// ---- 13. Full stage: two full problems in one session come back as two cards on different techniques
{
  const d = load();
  d.pack.session.full = 2;
  const ix = core.index(d);
  const prog = readyProg();
  const sess = core.startSession(prog, ix, DAY);
  const back = core.restoreSession(ix, JSON.parse(JSON.stringify(core.snapshotSession(sess))));
  S.eq('both full cards come back', back.queue.filter((c) => c.type === 'full').length, sess.queue.filter((c) => c.type === 'full').length);
}

// ---- 14. JSON is the only thing stored: no functions or live references survive
{
  const { ix, prog } = fresh();
  const snap = core.snapshotSession(toFirstProblem(prog, ix));
  S.check('the snapshot survives JSON unchanged', jsonEq(JSON.parse(JSON.stringify(snap)), snap));
  S.check('the snapshot holds no item objects', snap.queue.every((c) => !('item' in c) && (c.itemId === null || typeof c.itemId === 'string')));
}

S.done();
