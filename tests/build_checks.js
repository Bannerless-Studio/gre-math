'use strict';
// Build gate: one self-contained page, no external loads, refuses invalid or incomplete packs.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { suite } = require('./lib/check.js');
const S = suite('build_checks');
const ROOT = path.join(__dirname, '..');
const NODE = process.env.NODE || process.execPath;
const OUT_DIR = path.join(ROOT, '.cache', 'tests');
fs.mkdirSync(OUT_DIR, { recursive: true });

function build(packDir, out) {
  try {
    execFileSync('/bin/sh', [path.join(ROOT, 'build.sh'), packDir, out], { env: Object.assign({}, process.env, { NODE }), stdio: 'pipe' });
    return { code: 0 };
  } catch (e) { return { code: e.status, stderr: String(e.stderr || '') }; }
}

const page = path.join(OUT_DIR, 'fixture.html');
const r = build(path.join(ROOT, 'packs', '_fixture'), page);
S.eq('build of the fixture exits 0', r.code, 0);
const html = fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : '';
S.check('page contains the pack data', html.includes('window.PE_DATA={"pack":'));
S.check('page contains the engine core', html.includes('window.PE || ') || html.includes('module.exports') || html.includes('root.PE = api') || html.includes('var api = factory()'));
S.check('no leftover placeholders', !/<!--PE_|__PE_BUILD__/.test(html));
S.check('build marker is last', /<!--pe-build:[0-9]+-[0-9]+-->\s*<\/body>/.test(html));
S.check('no external script or stylesheet', !/<script[^>]+src=|<link[^>]+href=/i.test(html));
S.check('no network URL in page', !/https?:\/\//.test(html.replace(/https?:\/\/www\.w3\.org[^"' ]*/g, '')));
S.check('pack JSON never closes its own script', (html.match(/<\/script>/g) || []).length === 7);   // DATA, TEXT, ANSWER, STORE, CORE, APP, BUILD (M7 window.PE_BUILD)
S.check('KaTeX CSS inlined with ten core faces as base64 woff2', (html.match(/data:font\/woff2;base64,/g) || []).length === 10);
S.check('no KaTeX runtime JS in the page', !html.includes('renderToString') && !html.includes('katex.min'));
S.check('no non-core font face in the page', !/KaTeX_(Fraktur|Script|SansSerif|Typewriter)[-\w]*\.(woff2?|ttf)/.test(html));
S.check('items carry pre-rendered math', /\n,"tags":\["</.test(html) && !html.includes('<math') && !html.includes('annotation encoding'));
S.check('engine text module is inlined', html.includes('window.PEText') || html.includes('PEText') );

// offline worker (M4): sw.js next to the page, same build id, caches only the marked page
const swPath = path.join(OUT_DIR, 'sw.js');
const sw = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
S.check('build writes sw.js next to the page', sw.length > 0);
S.check('sw.js names the page it caches', sw.includes('const PAGE = "fixture.html";'));
const pageId = (html.match(/<!--pe-build:([0-9]+-[0-9]+)-->/) || [])[1];
const swId = (sw.match(/const BUILD = "([0-9]+-[0-9]+)";/) || [])[1];
S.check('page carries a build marker', !!pageId);
S.check('sw.js build id matches the page marker', !!pageId && pageId === swId);
S.check('sw.js has no leftover placeholders', !/__PE_/.test(sw));
S.check('sw.js checks the marker before caching the page', sw.includes('"<!--pe-build:" + BUILD + "-->"') && sw.includes('t.indexOf(MARK) >= 0'));
S.check('sw.js writes to the cache only the page URL, no precache list', (sw.match(/\.put\(/g) || []).length > 0 && (sw.match(/\.put\(/g) || []).length === (sw.match(/\.put\(PAGE_URL,/g) || []).length && !/addAll|precache/i.test(sw));
S.check('sw.js handles fetch only inside its scope', sw.includes('url.href.indexOf(SCOPE) !== 0') && sw.includes('rel === PAGE'));
S.check('sw.js deletes only its own prefixed caches', sw.includes('k.indexOf(PREFIX) === 0 && k !== CACHE'));
S.check('kill switch copy is in engine/', fs.existsSync(path.join(ROOT, 'engine', 'sw.disable.js')));
S.check('kill switch deletes the same cache prefix sw.js creates', (function () {
  const kill = fs.readFileSync(path.join(ROOT, 'engine', 'sw.disable.js'), 'utf8');
  const a = (kill.match(/const PREFIX = "([^"]+)" \+/) || [])[1], b = (sw.match(/const PREFIX = "([^"]+)" \+/) || [])[1];
  return !!a && a === b && kill.includes('registration.unregister()') && !/addEventListener\("fetch"/.test(kill);
})());
// Script order in the page: answer.js and store.js load before core.js; store resolves core lazily. Run them in a bare context.
(function () {
  const vm = require('vm');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const pick = (re) => scripts.findIndex((t) => re.test(t));
  const iAns = pick(/PEAnswer\s*=/), iSt = pick(/root\.PEStore\s*=/), iCore = pick(/root\.PE\s*=/);
  S.check('page loads answer.js and store.js before core.js', iAns >= 0 && iSt >= 0 && iCore > iAns && iCore > iSt);
  const win = {}; win.window = win;
  const ctx = vm.createContext(win);
  let err = '';
  try { [iAns, iSt, iCore].forEach((i) => vm.runInContext(scripts[i], ctx)); } catch (e) { err = e.message; }
  S.check('page scripts run in order without a module system', err === '' && !!win.PEAnswer && !!win.PEStore && !!win.PE);
  let ok = false;
  try {
    const mem = {}; const st = win.PEStore.make({ getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } }, 'k');
    const state = {}; st.open(state); ok = !state.readonly && state.prog && state.prog.v === 1 && st.save(state) && 'k' in mem;
  } catch (e) { err = e.message; }
  S.check('store.js works against the page-global core', ok);
})();
// same sources, same id; a changed item, a new id (the stale-page guard depends on this)
const again = path.join(OUT_DIR, 'again.html');
build(path.join(ROOT, 'packs', '_fixture'), again);
const againId = (fs.readFileSync(again, 'utf8').match(/<!--pe-build:([0-9]+-[0-9]+)-->/) || [])[1];
S.check('rebuilding unchanged sources keeps the build id', againId === pageId);
const changed = fs.mkdtempSync(path.join(OUT_DIR, 'changed-'));
['pack.json', 'techniques.json', 'items.json'].forEach((x) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', x), path.join(changed, x)));
const ci = JSON.parse(fs.readFileSync(path.join(changed, 'items.json'), 'utf8'));
ci[0].prompt = ci[0].prompt + ' (edited)';
fs.writeFileSync(path.join(changed, 'items.json'), JSON.stringify(ci));
const chOut = path.join(OUT_DIR, 'changed.html');
S.check('changed item builds', build(changed, chOut).code === 0);
const chId = (fs.readFileSync(chOut, 'utf8').match(/<!--pe-build:([0-9]+-[0-9]+)-->/) || [])[1];
S.check('changed item changes the build id', !!chId && chId !== pageId);
S.check('changed item writes a matching sw.js beside its page', (fs.readFileSync(path.join(OUT_DIR, 'sw.js'), 'utf8').match(/const BUILD = "([0-9]+-[0-9]+)";/) || [])[1] === chId);
// the pack.json bytes are part of the page, so a pack.json-only change must change the id too
const meta = fs.mkdtempSync(path.join(OUT_DIR, 'meta-'));
['pack.json', 'techniques.json', 'items.json'].forEach((x) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', x), path.join(meta, x)));
const pj = JSON.parse(fs.readFileSync(path.join(meta, 'pack.json'), 'utf8'));
pj.name = pj.name + ' ';
fs.writeFileSync(path.join(meta, 'pack.json'), JSON.stringify(pj));
const mOut = path.join(OUT_DIR, 'meta.html');
build(meta, mOut);
const mId = (fs.readFileSync(mOut, 'utf8').match(/<!--pe-build:([0-9]+-[0-9]+)-->/) || [])[1];
S.check('pack.json-only change changes the build id', !!mId && mId !== pageId);

// refuses a pack that fails validation
const bad = fs.mkdtempSync(path.join(OUT_DIR, 'bad-'));
['pack.json', 'techniques.json', 'items.json'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', f), path.join(bad, f)));
const items = JSON.parse(fs.readFileSync(path.join(bad, 'items.json'), 'utf8'));
delete items[0].source;
fs.writeFileSync(path.join(bad, 'items.json'), JSON.stringify(items));
const rb = build(bad, path.join(OUT_DIR, 'bad.html'));
S.check('invalid pack refuses to build', rb.code !== 0);
S.check('invalid pack writes no page', !fs.existsSync(path.join(OUT_DIR, 'bad.html')));

// refuses a pack with no items file
const missing = fs.mkdtempSync(path.join(OUT_DIR, 'missing-'));
['pack.json', 'techniques.json'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', f), path.join(missing, f)));
S.check('pack without items refuses to build', build(missing, path.join(OUT_DIR, 'missing.html')).code !== 0);

// refuses JSON that would close the script tag
const tricky = fs.mkdtempSync(path.join(OUT_DIR, 'tricky-'));
['pack.json', 'techniques.json', 'items.json'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', f), path.join(tricky, f)));
const tr = JSON.parse(fs.readFileSync(path.join(tricky, 'items.json'), 'utf8'));
tr[0].solution = 'see </script> here';
fs.writeFileSync(path.join(tricky, 'items.json'), JSON.stringify(tr));
S.check('script-closing JSON refuses to build', build(tricky, path.join(OUT_DIR, 'tricky.html')).code !== 0);

// refuses a pack whose math KaTeX rejects, and writes no page
const texBad = fs.mkdtempSync(path.join(OUT_DIR, 'texbad-'));
['pack.json', 'techniques.json', 'items.json'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', f), path.join(texBad, f)));
const tb = JSON.parse(fs.readFileSync(path.join(texBad, 'items.json'), 'utf8'));
tb[0].prompt = 'Solve $\\frac{a$ for $a$.';
fs.writeFileSync(path.join(texBad, 'items.json'), JSON.stringify(tb));
S.check('pack with a LaTeX error refuses to build', build(texBad, path.join(OUT_DIR, 'texbad.html')).code !== 0);
S.check('pack with a LaTeX error writes no page', !fs.existsSync(path.join(OUT_DIR, 'texbad.html')));

// refuses a pack with an out-of-subset glyph
const glyphBad = fs.mkdtempSync(path.join(OUT_DIR, 'glyphbad-'));
['pack.json', 'techniques.json', 'items.json'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', f), path.join(glyphBad, f)));
const gb = JSON.parse(fs.readFileSync(path.join(glyphBad, 'items.json'), 'utf8'));
gb[0].solution = 'Use $\\mathscr{L}$.';
fs.writeFileSync(path.join(glyphBad, 'items.json'), JSON.stringify(gb));
S.check('pack with an out-of-subset glyph refuses to build', build(glyphBad, path.join(OUT_DIR, 'glyphbad.html')).code !== 0);

S.done();
