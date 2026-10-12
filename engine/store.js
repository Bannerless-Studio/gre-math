/* problem-engine progress storage. Pure logic over a storage object (localStorage in the page, a fake in tests).
 * Rules: docs/SPEC.md 2.5 (keys and backups) and README "Progress safety".
 * Every failure goes to read-only mode or a refused action, never a silent overwrite. The page passes null
 * when it cannot reach localStorage at all (Safari private mode and blocked site data can throw on access). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PEStore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Resolved when make() runs, not at load: in the page this script loads before core.js.
  function coreModule() {
    if (typeof module === 'object' && module.exports) return require('./core.js');
    return (typeof window !== 'undefined' ? window : globalThis).PE;
  }

  var MSG = {
    unreadable: 'Progress cannot be read in this browser. Nothing will be saved.',
    newer: 'Saved progress comes from a newer build. Opened read-only.',
    invalid: 'Saved progress was unreadable. A copy is kept in this browser.',
    invalidNoBackup: 'Saved progress is unreadable and could not be backed up. Opened read-only.',
    unsaved: 'Progress could not be saved. Export it now.',
    readonlyImport: 'Read-only mode: import is disabled.',
    readonlyReset: 'Read-only mode: reset is disabled.',
    importBackupFailed: 'Not imported: the current progress could not be backed up.',
    resetBackupFailed: 'Not reset: the backup could not be written.',
    imported: 'Imported. Your previous progress is in the pre-import backup.',
    reset: 'Progress reset. Backup kept.'
  };
  // Same wording as the vocab-engine import refusal (docs/PACK_SCHEMA.md "Progress file version").
  function newerWording(v) {
    return 'This file was exported by a newer version of the app (v' + v + '). Update the app, then import.';
  }

  var SESSION_MAX_MS = 12 * 60 * 60 * 1000;   // M7: a parked session older than this is dropped

  // build: the build id of the page (window.PE_BUILD). A session saved by another build is dropped.
  function make(storage, key, build) {
    var PE = coreModule();
    var sessionKey = key + '_session';
    function get() {
      if (!storage) throw new Error('no storage');
      return storage.getItem(key);
    }
    function set(k, v) {
      if (!storage) throw new Error('no storage');
      storage.setItem(k, v);
    }
    function backup(suffix, text) { set(key + suffix, text); }

    // ---- session resume (M7, SPEC M7). Best effort: a failed write or read never changes progress or read-only mode.
    // Record: {v, build, t (last write, ms), s (the page's session data)}. Only progress lives in the progress key.
    function dropSession() {
      try { if (storage) storage.removeItem(sessionKey); } catch (e) { /* nothing to drop */ }
    }
    function saveSession(data, now) {
      try {
        set(sessionKey, JSON.stringify({ v: 1, build: build, t: now, s: data }));
        return true;
      } catch (e) { return false; }
    }
    // Returns the saved session data, or null. Drops the record when it is unreadable, from another build,
    // older than SESSION_MAX_MS, or dated in the future.
    function readSession(now) {
      var raw;
      try { raw = storage ? storage.getItem(sessionKey) : null; } catch (e) { return null; }
      if (raw === null || raw === undefined) return null;
      var rec;
      try { rec = JSON.parse(raw); } catch (e) { dropSession(); return null; }
      if (!rec || rec.v !== 1 || rec.build !== build || typeof rec.t !== 'number' || !rec.s) { dropSession(); return null; }
      var age = now - rec.t;
      if (age < 0 || age >= SESSION_MAX_MS) { dropSession(); return null; }
      return rec.s;
    }

    // Reads the saved record. st is the page state: {prog, readonly, notice}. Returns st.
    function open(st) {
      var raw;
      st.prog = PE.newProg(); st.readonly = false; st.notice = '';
      try { raw = get(); } catch (e) { st.readonly = true; st.notice = MSG.unreadable; return st; }
      if (raw === null) return st;
      try { st.prog = PE.normalizeProg(JSON.parse(raw)); return st; } catch (e) {
        if (e.code === 'newer') { st.readonly = true; st.notice = MSG.newer; return st; }
        try { backup('_invalid_backup', raw); st.notice = MSG.invalid; }
        catch (e2) { st.readonly = true; st.notice = MSG.invalidNoBackup; }
        return st;
      }
    }

    // Writes st.prog. A failed write turns the page read-only. Returns true when saved.
    function save(st) {
      if (st.readonly) return false;
      try { set(key, JSON.stringify(st.prog)); return true; } catch (e) {
        st.readonly = true; st.notice = MSG.unsaved; return false;
      }
    }

    // Import of an exported file. Returns {ok, msg}. st is changed only on success.
    // Order: refuse read-only, parse and version-check the file, write the pre-import backup, then replace.
    function importText(st, text) {
      if (st.readonly) return { ok: false, msg: MSG.readonlyImport };
      var next;
      try { next = PE.normalizeProg(JSON.parse(String(text))); } catch (e) {
        if (e.code === 'newer') return { ok: false, msg: newerWording(e.version) };
        return { ok: false, msg: 'Not imported: ' + e.message };
      }
      try { backup('_pre_import_backup', JSON.stringify(st.prog)); } catch (e) {
        return { ok: false, msg: MSG.importBackupFailed };
      }
      st.prog = next;
      dropSession();
      if (!save(st)) return { ok: true, msg: MSG.unsaved };
      return { ok: true, msg: MSG.imported };
    }

    // Reset to a new record. The current progress is backed up first; a failed backup aborts the reset.
    function reset(st) {
      if (st.readonly) return { ok: false, msg: MSG.readonlyReset };
      try { backup('_reset_backup', JSON.stringify(st.prog)); } catch (e) {
        return { ok: false, msg: MSG.resetBackupFailed };
      }
      st.prog = PE.newProg();
      dropSession();
      if (!save(st)) return { ok: true, msg: MSG.unsaved };
      return { ok: true, msg: MSG.reset };
    }

    return { open: open, save: save, importText: importText, reset: reset, key: key,
      saveSession: saveSession, readSession: readSession, dropSession: dropSession };
  }

  return { make: make, MSG: MSG };
});
