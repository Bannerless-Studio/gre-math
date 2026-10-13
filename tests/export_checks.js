'use strict';
// Progress safety suite (M4): engine/store.js over a fake localStorage. Spec: docs/SPEC.md 2.5 and section 8 M4.
// Covers: backups before import and reset, refused newer versions, read-only on storage failure, invalid-record backup.
const { suite } = require('./lib/check.js');
const core = require('../engine/core.js');
const store = require('../engine/store.js');
const S = suite('export_checks');
const { check, eq } = S;

const KEY = 'pe_test';
const SUFFIX = { invalid: '_invalid_backup', preImport: '_pre_import_backup', reset: '_reset_backup' };

// Fake localStorage with switchable failures.
function fakeStorage(initial) {
  const data = Object.assign({}, initial || {});
  const f = { failGet: false, failSet: false, failSetKeys: null, data };
  f.getItem = (k) => { if (f.failGet) throw new Error('read blocked'); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; };
  f.setItem = (k, v) => {
    if (f.failSet || (f.failSetKeys && f.failSetKeys.indexOf(k) >= 0)) throw new Error('quota');
    data[k] = String(v);
  };
  return f;
}
function progJson(extra) {
  const p = core.newProg();
  p.sessions = 3;
  p.tech['t1.lin-eq'] = { s: 2, l: 2, r: 4, w: 1, m: 0, wk: 0, prov: 0, fp: 0, in: 1 };
  return JSON.stringify(Object.assign(p, extra || {}));
}
const newerText = JSON.stringify({ v: 2, sessions: 9, tech: {} });
const freshState = () => ({ prog: null, readonly: false, notice: '' });

// 1. no record: a new progress, writable, no notice
{
  const st = fakeStorage();
  const s = freshState(); store.make(st, KEY).open(s);
  check('fresh storage opens writable', s.readonly === false && s.notice === '' && s.prog.sessions === 0);
}
// 2. save writes the key and a reload reads it back
{
  const st = fakeStorage();
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  s.prog.sessions = 5;
  check('save returns true on a writable store', m.save(s) === true);
  const back = JSON.parse(st.data[KEY]);
  eq('save writes the record under pe_<key>', back.sessions, 5);
}
// 3. unreadable JSON: copy kept under _invalid_backup, record opens fresh, writable
{
  const st = fakeStorage({ [KEY]: '{not json' });
  const s = freshState(); store.make(st, KEY).open(s);
  eq('invalid JSON keeps the raw text in _invalid_backup', st.data[KEY + SUFFIX.invalid], '{not json');
  check('invalid JSON shows the copy notice and stays writable', s.notice === store.MSG.invalid && s.readonly === false);
}
// 4. invalid record and no room for the backup: read-only, raw record untouched
{
  const st = fakeStorage({ [KEY]: '{not json' });
  st.failSetKeys = [KEY + SUFFIX.invalid];
  const s = freshState(); store.make(st, KEY).open(s);
  check('invalid record that cannot be backed up opens read-only', s.readonly === true && s.notice === store.MSG.invalidNoBackup);
  eq('the unreadable record is left as it was', st.data[KEY], '{not json');
}
// 5. storage read throws: read-only, nothing saved
{
  const st = fakeStorage({ [KEY]: progJson() }); st.failGet = true;
  const s = freshState(); const m = store.make(st, KEY); m.open(s);
  check('read error opens read-only with the unreadable notice', s.readonly === true && s.notice === store.MSG.unreadable);
  const before = st.data[KEY];
  s.prog.sessions = 99;
  check('read-only save writes nothing', m.save(s) === false && st.data[KEY] === before);
}
// 6. no storage at all (page could not reach localStorage): read-only
{
  const s = freshState(); store.make(null, KEY).open(s);
  check('null storage opens read-only', s.readonly === true && s.notice === store.MSG.unreadable);
}
// 7. newer format version: read-only, record untouched, no backup written
{
  const st = fakeStorage({ [KEY]: newerText });
  const s = freshState(); store.make(st, KEY).open(s);
  check('saved newer v opens read-only with the newer notice', s.readonly === true && s.notice === store.MSG.newer);
  eq('saved newer v leaves the record as it was', st.data[KEY], newerText);
  check('saved newer v writes no backup', !(KEY + SUFFIX.invalid in st.data));
}
// 8. write failure during a save turns read-only and says so
{
  const st = fakeStorage({ [KEY]: progJson() });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  st.failSet = true;
  check('failed save returns false', m.save(s) === false);
  check('failed save turns read-only with the export notice', s.readonly === true && s.notice === store.MSG.unsaved);
}
// 9. import of a valid file: pre-import backup holds the old record, record is replaced
{
  const st = fakeStorage({ [KEY]: progJson({ sessions: 3 }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const oldRaw = st.data[KEY];
  const r = m.importText(s, progJson({ sessions: 7 }));
  check('valid import reports ok', r.ok === true && r.msg === store.MSG.imported);
  eq('valid import backs up the previous record before replacing', st.data[KEY + SUFFIX.preImport], oldRaw);
  eq('valid import replaces the record', JSON.parse(st.data[KEY]).sessions, 7);
}
// 10. import of a newer file: refused whole, vocab wording, record and pre-import backup untouched
{
  const st = fakeStorage({ [KEY]: progJson({ sessions: 3 }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const before = st.data[KEY];
  const r = m.importText(s, JSON.stringify({ v: 2, sessions: 50 }));
  check('newer import is refused with the vocab wording', r.ok === false && r.msg === 'This file was exported by a newer version of the app (v2). Update the app, then import.');
  eq('newer import leaves the record untouched', st.data[KEY], before);
  check('newer import leaves the pre-import backup untouched (none written)', !(KEY + SUFFIX.preImport in st.data));
  eq('newer import keeps the in-memory progress', s.prog.sessions, 3);
}
// 11. import when the pre-import backup cannot be written: aborted, record untouched
{
  const st = fakeStorage({ [KEY]: progJson({ sessions: 3 }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const before = st.data[KEY];
  st.failSetKeys = [KEY + SUFFIX.preImport];
  const r = m.importText(s, progJson({ sessions: 8 }));
  check('import aborts when the backup write fails', r.ok === false && r.msg === store.MSG.importBackupFailed);
  eq('aborted import leaves the record untouched', st.data[KEY], before);
}
// 12. import of unreadable text: refused, no backup written
{
  const st = fakeStorage({ [KEY]: progJson() });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const r = m.importText(s, '{oops');
  check('unreadable import is refused with the reason', r.ok === false && r.msg.indexOf('Not imported: ') === 0);
  check('unreadable import writes no pre-import backup', !(KEY + SUFFIX.preImport in st.data));
}
// 13. import of a file that is not progress: refused
{
  const st = fakeStorage({ [KEY]: progJson() });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  check('import of a non-object is refused', m.importText(s, '[1,2]').ok === false);
  check('import of tech as a string is refused', m.importText(s, JSON.stringify({ v: 1, tech: 'x' })).ok === false);
}
// 14. import while read-only: refused, nothing written
{
  const st = fakeStorage({ [KEY]: newerText });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const r = m.importText(s, progJson({ sessions: 4 }));
  check('import in read-only mode is refused', r.ok === false && r.msg === store.MSG.readonlyImport);
  eq('read-only refusal leaves the record untouched', st.data[KEY], newerText);
  check('read-only refusal writes no backup', !(KEY + SUFFIX.preImport in st.data));
}
// 15. reset: the old record goes to _reset_backup, then a new record is saved
{
  const st = fakeStorage({ [KEY]: progJson({ sessions: 6 }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const oldRaw = st.data[KEY];
  const r = m.reset(s);
  check('reset reports ok', r.ok === true && r.msg === store.MSG.reset);
  eq('reset backs up the old record first', st.data[KEY + SUFFIX.reset], oldRaw);
  eq('reset saves a new record', JSON.parse(st.data[KEY]).sessions, 0);
}
// 16. reset when the backup cannot be written: aborted, record untouched
{
  const st = fakeStorage({ [KEY]: progJson({ sessions: 6 }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const before = st.data[KEY];
  st.failSetKeys = [KEY + SUFFIX.reset];
  const r = m.reset(s);
  check('reset aborts when the backup write fails', r.ok === false && r.msg === store.MSG.resetBackupFailed);
  eq('aborted reset leaves the record untouched', st.data[KEY], before);
  eq('aborted reset keeps the in-memory progress', s.prog.sessions, 6);
}
// 17. reset and import refused in read-only mode
{
  const st = fakeStorage({ [KEY]: newerText }); st.failGet = false;
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const r = m.reset(s);
  check('reset in read-only mode is refused', r.ok === false && r.msg === store.MSG.readonlyReset);
  eq('refused reset leaves the newer record untouched', st.data[KEY], newerText);
}
// 18. unknown ids and fields from a newer pack survive an import (SPEC 2.5)
{
  const st = fakeStorage({ [KEY]: progJson() });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  const raw = JSON.parse(progJson());
  raw.tech['future.tech'] = { s: 1, l: 1, r: 1, w: 0, m: 0 };
  raw.futureField = 'kept';
  m.importText(s, JSON.stringify(raw));
  check('unknown technique id survives an import', !!s.prog.tech['future.tech'] && s.prog.tech['future.tech'].s === 1);
  check('unknown top-level field survives an import', s.prog.futureField === 'kept');
}
// 19. a second import after a failed one still backs up the record it actually replaces
{
  const st = fakeStorage({ [KEY]: progJson({ sessions: 2 }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  st.failSetKeys = [KEY + SUFFIX.preImport];
  m.importText(s, progJson({ sessions: 9 }));
  st.failSetKeys = null;
  const before = st.data[KEY];
  m.importText(s, progJson({ sessions: 9 }));
  eq('the pre-import backup holds the record that was replaced', st.data[KEY + SUFFIX.preImport], before);
}
// 20. messages are the wording the page shows (non-empty, one line each)
check('every store message is one non-empty line', Object.keys(store.MSG).every((k) => typeof store.MSG[k] === 'string' && store.MSG[k].length > 0 && store.MSG[k].indexOf('\n') < 0));

// 21. rm (recent misses) round-trips export -> import; reset drops it
{
  const rm = [{ id: 'i1', a: '4' }, { id: 'i2', a: '1/2' }];
  const st = fakeStorage({ [KEY]: progJson({ rm }) });
  const m = store.make(st, KEY); const s = freshState(); m.open(s);
  eq('rm survives open', s.prog.rm, rm);
  const exported = m.raw();
  const st2 = fakeStorage({ [KEY]: progJson() });
  const m2 = store.make(st2, KEY); const s2 = freshState(); m2.open(s2);
  const r = m2.importText(s2, exported);
  check('rm import ok', r.ok === true);
  eq('rm round-trips export to import', s2.prog.rm, rm);
  m2.reset(s2);
  eq('reset clears rm', s2.prog.rm, undefined);
}

S.done();
