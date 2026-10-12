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
S.check('pack JSON never closes its own script', (html.match(/<\/script>/g) || []).length === 8);   // DATA, KATEX_JS, TEXT, ANSWER, STORE, CORE, APP, BUILD (M7 window.PE_BUILD)
S.check('KaTeX CSS inlined with ten core faces as base64 woff2', (html.match(/data:font\/woff2;base64,/g) || []).length === 10);
const katexJs = fs.readFileSync(path.join(ROOT, 'vendor', 'katex', 'katex.min.js'), 'utf8');
S.eq('KaTeX 0.16.11 JS is inlined exactly once (runtime rendering)', html.split(katexJs).length - 1, 1);
S.check('no non-core font face in the page', !/KaTeX_(Fraktur|Script|SansSerif|Typewriter)[-\w]*\.(woff2?|ttf)/.test(html));
// Pack data is source only: no html field, no tag dictionary, no private-use chars (U+E100..U+F8FF) in the data.
const dataJson = (html.match(/window\.PE_DATA=(\{[\s\S]*?\});<\/script>/) || [])[1] || '';
S.check('PE_DATA is present and parses', dataJson.length > 0 && (() => { try { JSON.parse(dataJson); return true; } catch (e) { return false; } })());
const dataObj = dataJson ? JSON.parse(dataJson) : { items: [], techniques: [] };
S.check('items and techniques carry source only, no html field', dataObj.items.length > 0 && dataObj.items.every((i) => !('html' in i)) &&
  dataObj.techniques.every((t) => !('html' in t)), dataObj.items.length);
S.check('pack data has no tag dictionary', !('tags' in dataObj));
S.check('pack data has no private-use chars', !/[\uE100-\uF8FF]/.test(dataJson));
S.check('items keep their raw Markdown-lite source', dataObj.items[0].prompt === JSON.parse(fs.readFileSync(path.join(ROOT, 'packs', '_fixture', 'items.json'), 'utf8'))[0].prompt);
S.check('engine text module is inlined', html.includes('window.PEText') || html.includes('PEText') );
// Runtime math: the page's own KaTeX and text scripts, run in a bare vm context as a browser would, render a fraction,
// a display integral and a matrix through the same span code the page calls (T.md with T.mathSpan).
{
  const vm = require('vm');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const iKx = scripts.findIndex((t) => t.trim() === katexJs.trim()), iTxt = scripts.findIndex((t) => /root\.PEText\s*=/.test(t));
  const win = {}; win.window = win;
  const ctx = vm.createContext(win);
  let err = '', out = {};
  try {
    vm.runInContext(scripts[iKx], ctx);
    vm.runInContext(scripts[iTxt], ctx);
    const md = (src, inline) => win.PEText.md(src, inline, (tex, dsp) => win.PEText.mathSpan(win.katex, tex, dsp));
    out.frac = md('Fraction $\\frac{a}{b}$', true);
    out.integral = md('$$\\int_0^1 x e^x\\,dx$$', false);
    out.matrix = md('$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$', true);
    out.version = win.katex && win.katex.version;
  } catch (e) { err = e.message; }
  S.check('page KaTeX and text scripts run in a bare context', err === '' && iKx >= 0 && iTxt > iKx, err);
  S.eq('page KaTeX is 0.16.11', out.version, '0.16.11');
  S.check('page renders a fraction with role=math', /role="math"/.test(out.frac) && out.frac.includes('frac-line'), out.frac);
  S.check('page renders a display integral', out.integral.includes('katex-display') && out.integral.includes('op-symbol large-op'), out.integral);
  S.check('page renders a 2x2 matrix', out.matrix.includes('arraycolsep') && (out.matrix.match(/<span class="vlist-r">/g) || []).length >= 2, out.matrix);
}

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

// figures: a copy of the fixture with a figure on an item and on a technique builds; the page carries both as data,
// and the page's figure helper wraps them in .figure. A script figure refuses to build.
const FIG_ITEM = '<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="70" x2="110" y2="70"/><text x="60" y="12" text-anchor="middle" font-size="10">fig</text></svg>';
const FIG_TECH = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="10" fill="none"/></svg>';
const makeFigPack = (dir, itemFig, techFig) => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  ['pack.json', 'techniques.json', 'items.json'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'packs', '_fixture', f), path.join(dir, f)));
  const items = JSON.parse(fs.readFileSync(path.join(dir, 'items.json'), 'utf8'));
  const techs = JSON.parse(fs.readFileSync(path.join(dir, 'techniques.json'), 'utf8'));
  items[0].figure = itemFig; techs[0].figure = techFig;
  fs.writeFileSync(path.join(dir, 'items.json'), JSON.stringify(items));
  fs.writeFileSync(path.join(dir, 'techniques.json'), JSON.stringify(techs));
  return dir;
};
{
  const vm = require('vm');
  const figPage = path.join(OUT_DIR, 'figpack.html');
  const rf = build(makeFigPack(path.join(OUT_DIR, 'figpack'), FIG_ITEM, FIG_TECH), figPage);
  S.eq('build of a pack with figures exits 0', rf.code, 0);
  const fh = fs.existsSync(figPage) ? fs.readFileSync(figPage, 'utf8') : '';
  const data = JSON.parse((fh.match(/window\.PE_DATA=(\{[\s\S]*?\});<\/script>/) || [])[1] || 'null') || {};
  S.check('page data carries the item figure unchanged', data.items && data.items[0].figure === FIG_ITEM);
  S.check('page data carries the technique figure unchanged', data.techniques && data.techniques[0].figure === FIG_TECH);
  const figScripts = [...fh.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const appSrc = figScripts.find((t) => t.indexOf('PE.itemKind') >= 0 && t.indexOf('viewDrill') >= 0) || '';
  S.check('page app inserts figures above the prompt on drill, full and teach cards', (appSrc.match(/T\.figure\(/g) || []).length >= 3, (appSrc.match(/T\.figure\(/g) || []).length);
  const txtSrc = figScripts.find((t) => /root\.PEText\s*=/.test(t));
  const win = {}; win.window = win;
  const ctx = vm.createContext(win);
  let figErr = '';
  try { vm.runInContext(txtSrc, ctx); } catch (e) { figErr = e.message; }
  const wrapped = figErr ? '' : win.PEText.figure(data.items[0].figure);
  S.check('figure helper wraps the item figure in div.figure', wrapped === '<div class="figure">' + FIG_ITEM + '</div>', figErr || wrapped.slice(0, 80));
  S.eq('figure helper renders nothing for a card without a figure', figErr ? 'err' : win.PEText.figure(undefined), '');
  S.check('a pack with a script figure refuses to build', build(makeFigPack(path.join(OUT_DIR, 'figbad'), '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>', FIG_TECH), path.join(OUT_DIR, 'figbad.html')).code !== 0);
}

// deploy_pack.sh refuses to write any pack other than gre-math into the repo root (refusal happens before any build)
{
  const { spawnSync } = require('child_process');
  const rootIndex = path.join(ROOT, 'index.html');
  const before = fs.statSync(rootIndex).mtimeMs;
  const r2 = spawnSync('/bin/sh', [path.join(ROOT, 'tools', 'deploy_pack.sh'), path.join(ROOT, 'packs', '_fixture'), ROOT], { env: Object.assign({}, process.env, { NODE }), encoding: 'utf8' });
  S.check('deploy_pack refuses a non gre-math pack at the repo root', r2.status === 1 && /refusing/.test(r2.stderr || ''), r2.stderr);
  S.eq('refusal leaves the root index.html untouched', fs.statSync(rootIndex).mtimeMs, before);
}

S.done();
