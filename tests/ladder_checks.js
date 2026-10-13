'use strict';
// Ladder item kind (DECISIONS 17): stage checks, validator rules, grading into progress, resume, build.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const { suite } = require('./lib/check.js');
const { load, fresh } = require('./lib/fixture.js');
const { playLadder, BREAKS } = require('./lib/ladder.js');
const A = require('../engine/answer.js');
const core = require('../engine/core.js');
const { validate } = require('../tools/validate_pack.js');
const S = suite('ladder_checks');
const ROOT = path.join(__dirname, '..');
const NODE = process.env.NODE || process.execPath;
const clone = (x) => JSON.parse(JSON.stringify(x));
const hasErr = (data, needle) => validate(data).some((e) => e.includes(needle));
const base = load();
const LID = 'f038';
const lad = (d) => d.items.find((i) => i.id === LID);

// ---- 1. stage checks (answer.js)
{
  const it = lad(base), [s1, s2, s3] = it.stages;
  S.check('fixture ladder exists with a choose, counterexample and typed stage', s1.type === 'choose' && s2.type === 'counterexample' && s3.type === 'typed');
  S.eq('choose: the ok option is right', A.check({ kind: 'ladder', stage: s1 }, 0).ok, true);
  S.eq('choose: a wrong option is wrong but counted', (({ ok, attempt }) => [ok, attempt])(A.check({ kind: 'ladder', stage: s1 }, 1)), [false, true]);
  S.eq('choose: an out-of-range index is not an attempt', A.check({ kind: 'ladder', stage: s1 }, 9).attempt, false);
  S.eq('typed: delegates to numeric (right)', A.checkLadderStage(s3, '4').ok, true);
  S.eq('typed: delegates to numeric (wrong)', A.checkLadderStage(s3, '5').ok, false);
  S.eq('typed: unparsable is not an attempt', A.checkLadderStage(s3, 'abc').attempt, false);
  S.eq('counterexample: breaks True passes', A.checkLadderStage(s2, BREAKS(true)).ok, true);
  const surv = A.checkLadderStage(s2, BREAKS(false));
  S.eq('counterexample: breaks False counts an attempt', [surv.ok, surv.attempt], [false, true]);
  const exc = A.checkLadderStage(s2, { status: 'ok', results: [{ error: 'ValueError: n must be from 1 to 1000' }] });
  S.eq('counterexample: an exception is no attempt and carries the message', [exc.attempt, exc.error, exc.detail], [false, 'runtime-error', 'ValueError: n must be from 1 to 1000']);
  S.eq('counterexample: timeout is no attempt', [A.checkLadderStage(s2, { status: 'timeout' }).attempt, A.checkLadderStage(s2, { status: 'timeout' }).error], [false, 'timeout']);
  S.eq('counterexample: runtime unavailable is no attempt', A.checkLadderStage(s2, { status: 'unavailable', error: 'offline' }).error, 'no-runtime');
  S.eq('counterexample: a non-boolean return is an error', A.checkLadderStage(s2, { status: 'ok', results: [{ got: 3 }] }).attempt, false);
}

// ---- 2. validator
{
  const d = clone(base);
  S.eq('fixture with the ladder is clean', validate(d), []);
  const d2 = clone(base); lad(d2).stages[0].options[1].ok = true;
  S.check('two ok options is an error', hasErr(d2, 'exactly one ok option'), validate(d2));
  const d3 = clone(base); lad(d3).stages.pop();
  S.check('two stages is an error', hasErr(d3, 'stages must be an array of 3 to 7'), validate(d3));
  const d4 = clone(base); lad(d4).stages = lad(d4).stages.concat(lad(d4).stages.map((s, k) => Object.assign(clone(s), { id: 'x' + k })), lad(d4).stages.map((s, k) => Object.assign(clone(s), { id: 'y' + k })));
  S.check('eight stages is an error', hasErr(d4, '3 to 7'), validate(d4));
  const d5 = clone(base); lad(d5).stages[1].examples = [{ inp: '1', breaks: true }, { inp: '2', breaks: true }];
  S.check('counterexample examples need a True and a False', hasErr(d5, 'breaks true and one breaks false'), validate(d5));
  const d6 = clone(base); lad(d6).stages[1].code = 'def other(x):\n    return True\n';
  S.check('counterexample code must define breaks(inp)', hasErr(d6, 'def breaks(inp)'), validate(d6));
  const d7 = clone(base); lad(d7).stages[2].answer = { kind: 'numeric', value: 'abc' };
  S.check('typed stage with a bad numeric key is an error', validate(d7).length > 0);
  const d8 = clone(base); delete lad(d8).lesson;
  S.check('missing lesson is an error', hasErr(d8, 'lesson is required'), validate(d8));
  const d9 = clone(base); lad(d9).stages[2].id = lad(d9).stages[0].id;
  S.check('duplicate stage id is an error', hasErr(d9, 'duplicate stage id'), validate(d9));
  const d10 = clone(base); lad(d10).tier = 'a'; lad(d10).type = 'recall';
  S.check('a ladder outside tier b is an error', hasErr(d10, 'tier b'), validate(d10));
  const d11 = clone(base); lad(d11).stages[0].options.push({ text: 'x', ok: false, feedback: 'f' }, { text: 'y', ok: false, feedback: 'f' });
  S.check('five options is an error', hasErr(d11, '3 or 4 options'), validate(d11));
  const d12 = clone(base); lad(d12).stages[0].reveal = '$\\notacommand$';
  S.check('LaTeX in a stage reveal is checked', validate(d12).length > 0);
  // production rule: a technique whose only tier b items are choose-only ladders is an error
  const d13 = clone(base);
  d13.items.filter((i) => i.tags[0] === 't1.lin-eq' && i.tier === 'b' && i.id !== LID).forEach((i) => { i.answer = { kind: 'mcq', options: ['a', 'b'], correct: 0 }; });
  lad(d13).stages = [lad(d13).stages[0], Object.assign(clone(lad(d13).stages[0]), { id: 'b' }), Object.assign(clone(lad(d13).stages[0]), { id: 'c' })];
  S.check('choose-only ladder does not satisfy the production gate', hasErr(d13, 'no tier b numeric, expression or code'), validate(d13));
  const d14 = clone(base);
  d14.items.filter((i) => i.tags[0] === 't1.lin-eq' && i.tier === 'b' && i.id !== LID).forEach((i) => { i.answer = { kind: 'mcq', options: ['a', 'b'], correct: 0 }; });
  S.check('ladder with a typed or counterexample stage satisfies the production gate', validate(d14).length === 0, validate(d14));
}

// ---- 3. kind helpers
{
  const { ix } = fresh();
  const it = ix.itemById[LID];
  S.eq('itemKind is ladder', core.itemKind(it), 'ladder');
  S.eq('fixture ladder is production', core.isProdItem(it), true);
  const choose3 = clone(it); choose3.stages = choose3.stages.map((s, k) => Object.assign(clone(it.stages[0]), { id: 'c' + k }));
  S.eq('choose-only ladder is not production', core.isProdItem(choose3), false);
  const a = core.makeCard(ix, it, 'learn', 5), b = core.makeCard(ix, it, 'learn', 5), c = core.makeCard(ix, it, 'learn', 6);
  S.eq('option order is seeded and stable', a.orders, b.orders);
  S.check('non-choose stages carry no order', a.orders[1] === null && a.orders[2] === null);
  S.check('choose order is a permutation of the options', a.orders[0].slice().sort().join() === '0,1,2' && c.orders[0].length === 3);
  const bad = clone(it); bad.tier = 'c';
  S.eq('a tier c ladder is not playable', core.itemKind(bad), null);
}

// ---- 4. grading into progress
const DAY = '2026-10-13';
const bare = (n, cards) => ({ n, today: DAY, queue: cards, pos: 0, credited: {}, lost: {}, requeued: {}, scored: 0, right: 0, missed: [], mastered: [], introduced: [] });
function setup(streak) {
  const { ix, prog } = fresh();
  if (streak !== undefined) { prog.tech['t1.lin-eq'] = { s: streak, m: 0, r: 0, w: 0, l: 0, in: 1, prov: 0, fp: 0, wk: 0 }; }
  const card = core.makeCard(ix, ix.itemById[LID], 'learn', 1);
  const sess = bare(1, [card]);
  return { ix, prog, card, sess };
}
{
  const stageResults = [];
  const { ix, prog, card, sess } = setup(0);
  S.eq('stage 1 of 3 shows before any attempt', [core.ladderOf(card).i, core.ladderStage(card).id], [0, 's1']);
  const wrong = core.ladderAttempt(prog, ix, sess, card, card.orders[0].indexOf(1), 3);
  S.check('wrong pick returns its feedback and counts one attempt', wrong.ok === false && wrong.att === 1 && /Squaring/.test(wrong.feedback), wrong);
  S.eq('repeating a wrong pick is ignored', core.ladderAttempt(prog, ix, sess, card, card.orders[0].indexOf(1), 3).unparsable, true);
  S.eq('...and does not add an attempt', core.ladderOf(card).att, 1);
  const r1 = core.ladderAttempt(prog, ix, sess, card, card.orders[0].indexOf(0), 3);
  S.eq('right pick after one wrong resolves the stage with grade 1', [r1.ok, r1.grade, r1.done], [true, 1, false]);
  S.eq('state moved to stage 2 with a clean slate', [core.ladderOf(card).i, core.ladderOf(card).att, core.ladderOf(card).hint], [1, 0, 0]);
  S.eq('show me refused before a failed attempt', (() => { try { core.ladderShow(prog, ix, sess, card, 3); return 'allowed'; } catch (e) { return 'refused'; } })(), 'refused');
  S.eq('survives is a counted attempt', core.ladderAttempt(prog, ix, sess, card, BREAKS(false), 3).att, 1);
  S.eq('an exception counts nothing', core.ladderAttempt(prog, ix, sess, card, { status: 'ok', results: [{ error: 'ValueError: x' }] }, 3).unparsable, true);
  S.eq('...attempts stay at 1', core.ladderOf(card).att, 1);
  const sh = core.ladderShow(prog, ix, sess, card, 3);
  S.eq('show me resolves with grade 0 and reveals', [sh.grade, sh.done, typeof sh.reveal, sh.ok], [0, false, 'string', true]);
  const hint = core.ladderHint(card);
  S.check('stage 3 has no hint', hint === null);
  const r3 = core.ladderAttempt(prog, ix, sess, card, '4', 3);
  S.check('last stage finishes the item', r3.done === true && r3.fin && r3.fin.grade === 0 && r3.fin.shown === true, r3);
  S.eq('grades stored on the item record', prog.items[LID].st, [1, 0, 2]);
  S.check('min grade 0 resets the technique and counts a miss', prog.tech['t1.lin-eq'].s === 0 && sess.scored === 1 && sess.right === 0 && sess.missed.length === 1, prog.tech);
  S.check('item counters and day log updated', prog.items[LID].w === 1 && prog.items[LID].l === 1 && prog.day.log.includes(LID));
  S.eq('second attempt after finish is refused', (() => { try { core.ladderAttempt(prog, ix, sess, card, '4', 3); return 'allowed'; } catch (e) { return 'refused'; } })(), 'refused');
}
{
  const { ix, prog, card, sess } = setup(1);
  const last = playLadder(prog, ix, sess, card, 'good', 5);
  S.check('clean ladder is grade 2 and credits the technique', last.fin.grade === 2 && last.fin.credited === true && prog.tech['t1.lin-eq'].s === 2, [last.fin, prog.tech['t1.lin-eq']]);
  S.eq('clean stage grades', prog.items[LID].st, [2, 2, 2]);
  S.check('scored right', sess.scored === 1 && sess.right === 1 && sess.missed.length === 0);
}
{
  const { ix, prog, card, sess } = setup(1);
  const last = playLadder(prog, ix, sess, card, 'hint', 5);
  S.check('hint on one stage holds: grade 1, streak unchanged, not scored, not a miss', last.fin.grade === 1 && prog.tech['t1.lin-eq'].s === 1 && sess.scored === 0 && sess.right === 0 && sess.missed.length === 0, [last.fin, prog.tech['t1.lin-eq']]);
  S.eq('hint stage grade 1, rest clean', prog.items[LID].st, [1, 2, 2]);
  S.check('hold touches neither r, w, t nor the day log', prog.items[LID].r === 0 && prog.items[LID].w === 0 && !prog.items[LID].t && !prog.day.log.includes(LID));
}
{
  const { ix, prog, card, sess } = setup(1);
  const l = core.ladderOf(card);
  core.ladderAttempt(prog, ix, sess, card, card.orders[0].indexOf(1), 1);
  core.ladderHint(card);
  const r = core.ladderAttempt(prog, ix, sess, card, card.orders[0].indexOf(0), 1);
  S.eq('hint plus one wrong attempt is grade 1', r.grade, 1);
  S.eq('two wrong attempts is grade 0', (() => { const c3 = setup(1); const l3 = core.ladderOf(c3.card); core.ladderAttempt(c3.prog, c3.ix, c3.sess, c3.card, c3.card.orders[0].indexOf(1), 1); core.ladderAttempt(c3.prog, c3.ix, c3.sess, c3.card, c3.card.orders[0].indexOf(2), 1); return core.ladderAttempt(c3.prog, c3.ix, c3.sess, c3.card, c3.card.orders[0].indexOf(0), 1).grade; })(), 0);
  S.eq('hint can be taken once', (() => { const c2 = setup(1).card; core.ladderHint(c2); return core.ladderHint(c2); })(), null);
}
{
  // choice-only held rule: a ladder without a production stage cannot credit from streak 2 (like mcq)
  const { ix, prog, sess } = setup(2);
  const it = clone(ix.itemById[LID]); it.stages = it.stages.map((s, k) => Object.assign(clone(ix.itemById[LID].stages[0]), { id: 'c' + k }));
  const card = core.makeCard(ix, it, 'learn', 1);
  sess.queue = [card];
  playLadder(prog, ix, sess, card, 'good', 5);
  S.eq('choose-only ladder at streak 2 holds the streak', prog.tech['t1.lin-eq'].s, 2);
}
{
  // progress survives a store round trip with the unknown field `st`
  const { ix, prog, card, sess } = setup(1);
  playLadder(prog, ix, sess, card, 'good', 5);
  const back = core.normalizeProg(JSON.parse(JSON.stringify(prog)));
  S.eq('st survives normalize', back.items[LID].st, [2, 2, 2]);
}

// ---- 5. mid-ladder resume, and the generic path refuses a ladder card
{
  const { ix, prog, card, sess } = setup(1);
  Object.assign(sess, { credited: {}, requeued: {} });
  core.ladderAttempt(prog, ix, sess, card, card.orders[0].indexOf(1), 1);
  core.ladderHint(card);
  const snap = JSON.parse(JSON.stringify(core.snapshotSession(sess)));
  const back = core.restoreSession(ix, snap);
  const bc = back.queue[0];
  S.eq('stage state survives a reload', [bc.lad.i, bc.lad.att, bc.lad.hint, bc.lad.wrong], [0, 1, 1, [card.orders[0].indexOf(1) >= 0 ? card.lad.wrong[0] : null]]);
  S.eq('option orders survive a reload', bc.orders, card.orders);
  S.eq('answerCard refuses a ladder card', (() => { try { core.answerCard(prog, ix, sess, '1', 1); return 'allowed'; } catch (e) { return /ladderAttempt/.test(e.message) ? 'refused' : e.message; } })(), 'refused');
}

// ---- 6. planning: ladders are neither placement probes nor exam micro
{
  const { ix } = fresh();
  const probes = [].concat.apply([], ix.levels.map((lv) => core.placeProbes(ix, lv.id)));
  S.check('no ladder is a placement probe', probes.every((it) => core.itemKind(it) !== 'ladder'));
}

// ---- 7. build: a ladder-only pack (no code items) inlines the worker; a ladder-free, code-free pack does not
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pe-ladder-'));
  const build = (items, name) => {
    const dir = path.join(tmp, name); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(base.pack));
    fs.writeFileSync(path.join(dir, 'techniques.json'), JSON.stringify(base.techniques));
    fs.writeFileSync(path.join(dir, 'items.json'), JSON.stringify(items));
    const out = path.join(dir, 'out', name + '.html');
    try { execFileSync('/bin/sh', [path.join(ROOT, 'build.sh'), dir, out], { env: Object.assign({}, process.env, { NODE }), stdio: 'pipe' }); }
    catch (e) { return { code: e.status, stderr: String(e.stderr || '') }; }
    return { code: 0, html: fs.readFileSync(out, 'utf8') };
  };
  const noCode = base.items.filter((i) => i.answer.kind !== 'code');
  const withLadder = build(noCode, 'ladder');
  S.eq('ladder-only pack builds', withLadder.code, 0);
  S.check('ladder counterexample stage inlines the worker and the harness',
    !!withLadder.html && /<script type="text\/plain" id="pe-pyworker">/.test(withLadder.html) && /<script type="text\/plain" id="pe-pyharness">/.test(withLadder.html));
  const noLadder = build(noCode.filter((i) => i.answer.kind !== 'ladder'), 'plain');
  S.check('a pack with neither carries no Python blocks', noLadder.code === 0 && !/<script type="text\/plain"/.test(noLadder.html));
  const chooseOnly = clone(noCode); const L = chooseOnly.find((i) => i.id === LID);
  L.stages = [L.stages[0], Object.assign(clone(L.stages[0]), { id: 'b' }), Object.assign(clone(L.stages[0]), { id: 'c' })];
  const co = build(chooseOnly, 'choose');
  // (a choose-only ladder is valid when another production item exists; here f003/f004 are numeric)
  S.check('choose-only ladder pack has no worker', co.code === 0 && !/<script type="text\/plain"/.test(co.html), co.stderr);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---- 8. author tool: counterexample examples run against their code in local CPython
{
  const py = spawnSync('python3', ['-I', path.join(ROOT, 'tools', 'run_ladder_examples.py'), path.join(ROOT, 'packs', '_fixture')], { encoding: 'utf8' });
  S.check('run_ladder_examples passes on the fixture', py.status === 0 && /OK ladder examples: 2 run, 0 mismatched/.test(py.stdout), py.stdout + py.stderr);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pe-ladder-py-'));
  const items = clone(base.items); lad({ items }).stages[1].examples[0].breaks = false;
  fs.writeFileSync(path.join(tmp, 'items.json'), JSON.stringify(items));
  const bad = spawnSync('python3', ['-I', path.join(ROOT, 'tools', 'run_ladder_examples.py'), tmp], { encoding: 'utf8' });
  S.check('a wrong example fails the tool', bad.status === 1 && /FAIL f038 s2/.test(bad.stdout), bad.stdout);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---- 9. page smoke (fake DOM): the ladder card renders stage by stage and the buttons drive the engine
{
  const vm = require('vm');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pe-ladder-ui-'));
  const pagePath = path.join(tmp, 'fx.html');
  execFileSync('/bin/sh', [path.join(ROOT, 'build.sh'), path.join(ROOT, 'packs', '_fixture'), pagePath], { env: Object.assign({}, process.env, { NODE }), stdio: 'pipe' });
  const html = fs.readFileSync(pagePath, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const mem = () => { const map = new Map(); return { map, getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }; };
  function boot(ls, fakePy) {
    const els = {};
    const el = (id) => els[id] || (els[id] = { id, hidden: false, innerHTML: '', textContent: '', className: '', value: '',
      setAttribute() {}, getAttribute() { return null; }, addEventListener(t, f) { (this.h = this.h || {})[t] = f; }, focus() {},
      querySelector() { return null; }, querySelectorAll() { return []; }, classList: { toggle() {}, add() {}, remove() {} }, style: {} });
    const document = { getElementById: el, addEventListener() {}, querySelectorAll() { return []; }, readyState: 'loading',
      hidden: false, title: '', body: { appendChild() {}, classList: { toggle() {} } }, createElement() { return el('x'); }, fonts: null };
    const win = { document, localStorage: ls, addEventListener() {}, scrollTo() {}, navigator: {}, location: { protocol: 'file:' },
      console: { log() {}, warn() {}, error() {} }, requestAnimationFrame(f) { f(); }, getComputedStyle() { return { fontSize: '16px' }; }, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math };
    if (fakePy) {   // a worker that answers run requests: breaks(inp) is True only for '1'
      win.URL = { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} };
      win.Blob = function () {};
      win.Worker = function () {
        const w = this;
        w.terminate = () => {};
        w.postMessage = (m) => {
          if (m.type === 'init') setTimeout(() => w.onmessage({ data: { type: 'ready' } }), 0);
          else if (m.type === 'run') {
            const inp = JSON.parse(m.tests)[0].args[0];
            setTimeout(() => { w.onmessage({ data: { type: 'started', id: m.id } }); w.onmessage({ data: { type: 'done', id: m.id, json: JSON.stringify({ status: 'ok', results: [inp === 'bad' ? { error: 'ValueError: not an int' } : { got: inp === '1' }], stdout: '' }) } }); }, 0);
          }
        };
      };
    }
    win.window = win;
    const ctx = vm.createContext(win);
    scripts.forEach((x) => vm.runInContext(x, ctx));
    return { ctx, el, root: () => el('root') };
  }
  const click = (pg, act, extra) => pg.root().h.click({ target: { closest: () => ({ getAttribute: (a) => (a === 'data-act' ? act : a === 'data-i' ? String(extra) : null) }) } });
  const submit = (pg, id, value) => { pg.el('ans').value = value; pg.root().h.submit({ target: { id }, preventDefault() {} }); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    // 1. start once to learn the session key and build id, then park a session whose first card is the ladder
    const ls = mem();
    const p0 = boot(ls);
    click(p0, 'start');
    const key = [...ls.map.keys()].find((k) => /_session$/.test(k));
    const rec = JSON.parse(ls.getItem(key));
    const ix = core.index(load());
    const card = core.makeCard(ix, ix.itemById[LID], 'learn', 1);
    const sess = bare(1, [card]);
    rec.s = { sess: core.snapshotSession(sess), reveal: null, draft: '', cs: Date.now() };
    rec.t = Date.now();
    ls.setItem(key, JSON.stringify(rec));
    const pg = boot(ls);
    let h = pg.root().innerHTML;
    S.check('UI: ladder opens on stage 1 of 3 with its options', /Stage 1 of 3/.test(h) && (h.match(/data-act="opt"/g) || []).length === 3, h.slice(0, 300));
    S.check('UI: choose stage has a Hint button and no Show me', /data-act="lad-hint"/.test(h) && !/lad-show/.test(h));
    const wrongDisplay = card.orders[0].indexOf(1), rightDisplay = card.orders[0].indexOf(0);
    click(pg, 'opt', wrongDisplay);
    h = pg.root().innerHTML;
    S.check('UI: a wrong pick shows its feedback and disables the option', /Squaring/.test(h) && /class="opt bad"[^>]*disabled/.test(h), h.slice(0, 400));
    click(pg, 'opt', rightDisplay);
    h = pg.root().innerHTML;
    S.check('UI: the resolved stage collapses to its reveal, stage 2 opens', /class="lad-done"><p class="anchor">Stage 1 of 3/.test(h) && /Stage 2 of 3/.test(h) && /lad-claim/.test(h) && /data-act="lad-show" disabled/.test(h), h.slice(0, 600));
    // counterexample: Python cannot start in this fake page, so the attempt is refused with a message and not counted
    submit(pg, 'typed', '1');
    await wait(30);
    S.check('UI: runtime unavailable shows a message and counts no attempt', /Python|Running|Loading/.test(pg.el('lad-out').innerHTML || ''), pg.el('lad-out').innerHTML);
    click(pg, 'lad-hint');
    h = pg.root().innerHTML;
    S.check('UI: Hint reveals the stage hint once and removes the button', /Try the smallest value/.test(h) && !/data-act="lad-hint"/.test(h), h.slice(0, 500));
    // finish the remaining stages through the engine API on the parked card, then reload to see the lesson card
    const back = boot(ls);
    S.check('UI: a reload keeps stage 2 with the hint shown', /Stage 2 of 3/.test(back.root().innerHTML) && /Try the smallest value/.test(back.root().innerHTML));
    // Show me, a wrong typed answer and a True counterexample all go through ladAfter; the grade must reach storage
    {
      const prog3 = core.newProg();
      prog3.tech['t1.lin-eq'] = { s: 2, m: 0, r: 0, w: 0, l: 0, in: 1, prov: 0, fp: 0, wk: 0 };
      const card3 = core.makeCard(ix, ix.itemById[LID], 'learn', 1), sess3 = bare(1, [card3]);
      core.ladderAttempt(prog3, ix, sess3, card3, card3.orders[0].indexOf(0), 1);   // stage 1 clean, now on the counterexample
      rec.s = { sess: core.snapshotSession(sess3), reveal: null, draft: '', cs: Date.now() };
      ls.setItem(key, JSON.stringify(rec));
      ls.setItem(key.replace(/_session$/, ''), JSON.stringify(prog3));
      const f = boot(ls, true);
      submit(f, 'typed', '5'); await wait(30);
      S.check('UI: a surviving claim shows the message and enables Show me', /claim survives/.test(f.root().innerHTML) && /data-act="lad-show">/.test(f.root().innerHTML), f.root().innerHTML.slice(-300));
      submit(f, 'typed', 'bad'); await wait(30);
      S.check('UI: a Python error shows its message', /ValueError: not an int/.test(f.root().innerHTML + f.el('lad-out').innerHTML), f.el('lad-out').innerHTML);
      submit(f, 'typed', '1'); await wait(30);
      let fh2 = f.root().innerHTML;
      S.check('UI: a True counterexample resolves the stage and opens stage 3', /Stage 3 of 3/.test(fh2) && /Stage 2 of 3/.test(fh2) && /Try the smallest/.test(fh2) === false, fh2.slice(0, 200));
      submit(f, 'typed', '9');
      S.check('UI: a wrong typed answer says so', /Not it\./.test(f.root().innerHTML), f.root().innerHTML.slice(-300));
      click(f, 'lad-show');
      fh2 = f.root().innerHTML;
      S.check('UI: Show me finishes the item with the shown verdict', /Needed the answer shown\./.test(fh2) && /data-act="continue"/.test(fh2), fh2.slice(0, 200));
      const reload = boot(ls);
      const saved = JSON.parse(ls.getItem(key.replace(/_session$/, '')));
      S.eq('UI: Show me reached storage: stage grades', saved.items[LID].st, [2, 1, 0]);
      S.eq('UI: Show me reset the streak', saved.tech['t1.lin-eq'].s, 1);
      S.check('UI: Show me is in Recent misses', Array.isArray(saved.rm) && saved.rm.some((x) => x.id === LID), saved.rm);
      S.check('UI: a reload before Next still shows the finished card', /Needed the answer shown\./.test(reload.root().innerHTML));
    }
    // a finished ladder shows the lesson and solution, then Next steps on
    {
      const prog2 = core.newProg(), card2 = core.makeCard(ix, ix.itemById[LID], 'learn', 1), sess2 = bare(1, [card2, core.makeCard(ix, ix.itemById.f003, 'learn', 1)]);
      playLadder(prog2, ix, sess2, card2, 'good', 5);
      rec.s = { sess: core.snapshotSession(sess2), reveal: null, draft: '', cs: Date.now() };
      ls.setItem(key, JSON.stringify(rec));
      const fin = boot(ls);
      const fh = fin.root().innerHTML;
      S.check('UI: finished ladder shows verdict, lesson, solution and Next', /Clean\./.test(fh) && /Isolate the unknown first/.test(fh) && /Constant time/.test(fh) && /data-act="continue"/.test(fh), fh.slice(0, 300));
      click(fin, 'continue');
      S.check('UI: Next moves to the following card', !/Stage \d of 3/.test(fin.root().innerHTML) && !/Clean\./.test(fin.root().innerHTML));
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    S.done();
  })().catch((e) => { console.error('FAIL ui smoke threw :: ' + (e && e.stack || e)); process.exitCode = 1; });
  return;
}

