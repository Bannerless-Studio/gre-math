/* problem-engine Python worker. Inlined into the page as text by build.sh and started from a Blob URL (engine/app.js);
 * never loaded as a file. Runs learner code in Pyodide, off the page thread, so a stuck loop is stopped by the page
 * terminating this worker (hard timeout in app.js).
 *
 * Messages in:  {type:'init', base, harness}      base = Pyodide index URL, harness = engine/pyharness.py source
 *               {type:'run', id, user, setup, entry, tests, packages}   tests = JSON string
 * Messages out: {type:'status', msg} {type:'ready'} {type:'fatal', error}
 *               {type:'started', id}              packages are loaded; the page starts the wall-clock timer now
 *               {type:'done', id, json}           json = pyharness.run() output; {type:'fail', id, error}
 *
 * Network: nothing here fetches except Pyodide's own files (init) and package wheels (before the run starts). While
 * learner code runs, fetch, XMLHttpRequest, WebSocket, importScripts and postMessage are replaced by functions that
 * throw. This is a best-effort guard on top of the browser sandbox (a worker has no DOM and no page access), not a
 * security boundary: learner code can still reach the originals through prototypes. The code is the learner's own and
 * runs on their own machine; the reference solution is in the page data anyway (docs/SPEC.md 3.4). */
'use strict';
var py = null, runFn = null, loaded = {};
// The only packages a run may load (docs/SPEC.md 3.4). Pack data never reaches loadPackage except through this list,
// so an item cannot name a wheel URL (loadPackage accepts URLs). tools/validate_pack.js enforces the same list.
var PACKAGES = ['numpy', 'pandas'];

self.onmessage = function (e) {
  var m = e.data;
  if (m.type === 'init') init(m); else if (m.type === 'run') run(m);
};

function init(m) {
  try {
    self.postMessage({ type: 'status', msg: 'Loading Python' });
    self.importScripts(m.base + 'pyodide.js');
    self.loadPyodide({ indexURL: m.base }).then(function (p) {
      py = p;
      // The harness gets its own globals dict, never Pyodide's __main__: learner code (run by the harness in a
      // fresh dict per run) cannot reach it through `import __main__`.
      var hg = py.runPython('dict()');
      py.runPython(m.harness, { globals: hg });
      runFn = hg.get('run');
      self.postMessage({ type: 'ready' });
    }).catch(function (err) { self.postMessage({ type: 'fatal', error: String(err && err.message || err) }); });
  } catch (err) { self.postMessage({ type: 'fatal', error: String(err && err.message || err) }); }
}

function blocked() { throw new Error('network access is not available here'); }

function run(m) {
  var asked = Array.isArray(m.packages) ? m.packages : [];
  var bad = asked.filter(function (p) { return PACKAGES.indexOf(p) < 0; });
  if (bad.length) { self.postMessage({ type: 'fail', id: m.id, error: 'package not allowed: ' + String(bad[0]).slice(0, 60) }); return; }
  var need = asked.filter(function (p) { return !loaded[p]; });
  var ready = need.length
    ? (self.postMessage({ type: 'status', msg: 'Loading ' + need.join(', ') }), py.loadPackage(need).then(function () { need.forEach(function (p) { loaded[p] = true; }); }))
    : Promise.resolve();
  ready.then(function () {
    self.postMessage({ type: 'started', id: m.id });
    // postMessage too: learner code (through Pyodide's `js` module) should not post a forged 'done' to the page.
    var names = ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'postMessage'], saved = {};
    names.forEach(function (n) { saved[n] = self[n]; self[n] = blocked; });
    var json;
    try { json = runFn(m.user, m.setup || '', m.entry, m.tests); }
    finally { names.forEach(function (n) { self[n] = saved[n]; }); }
    self.postMessage({ type: 'done', id: m.id, json: String(json) });
  }).catch(function (err) { self.postMessage({ type: 'fail', id: m.id, error: String(err && err.message || err) }); });
}
