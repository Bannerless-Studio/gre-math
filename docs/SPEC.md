# problem-engine: architecture spec

Status: draft 1, 2026-10-12. Sibling of `../vocab-engine`. Generic engine plus packs; first pack is the GRE Mathematics Subject Test, later physics and olympiad/Codeforces.

Goal: the machinery that made vocab-engine fast (small sessions, spacing by sessions, streak mastery, level gate, placement, surprisal-driven UI, offline single file) applied to problem solving. The unit of learning shifts from a word pair to a *technique*.

Non-goals for v1: accounts, servers, sync, teacher dashboards, audio, handwriting input, proof grading by machine.

## 1. What to lift from vocab-engine

Source read: CLAUDE.md, README.md "What the app does" / "Progress backups", docs/PACK_SCHEMA.md (appView, levelGate, levelExam, placement, Progress file version, Session resume), build.sh, sw.template.js, tests/run_tier.sh. vocab-engine/engine/core.js is 294 KB and app.html 273 KB; both carry years of zh/ja/script flags, so reuse is by pattern, not by file copy, except where marked.

| Candidate | Where | Verdict | Why |
|---|---|---|---|
| Single-file build | `build.sh` (awk only, POSIX cksum, `<!--ve-build:id-->` last line) | adapt | Keep the awk-only idea and the build marker. Replace the pack inputs (words/sentences/...) with `pack.js items.js techniques.js placement.js`, add a vendored KaTeX inlining step. Keep filename whitelist `[A-Za-z0-9._-]`. |
| Service worker | `engine/sw.template.js`, `sw.disable.js` | copy, strip audio | Cache named by build id; page cached only when it carries this build's marker (stale CDN guard); skipWaiting + claim; cross-origin never intercepted. Delete the AUDIO_CACHE block (no audio in v1). Keep `sw.disable.js` and the "never delete a published sw.js" rule. |
| Update flow | app.html "Updated, reload for the new version" banner; page keeps running on loaded build | copy behaviour | Page is self-contained, so mid-session reload is never forced. Matters more here: a timed full problem must never be interrupted. |
| `notranslate` meta | app.html head | copy | Browser translation would rewrite math prose and variable names. |
| Progress storage | core.js `storageKey`, `defaultProg`, `validateProgShape`, `normalizeProg`, `PROG_VERSION` | adapt | Keep `vocab_<key>` style key (`pe_<pack.key>`), top-level `v`, "importer of version N reads every file <= N, refuses newer whole", normalize fills missing fields. Rewrite the record shape (section 2.5). |
| Backups and import/export | README "Progress backups and recovery": `_invalid_backup`, `_pre_import_backup`, `_reset_backup`, read-only mode on storage read error, import not applied if backup can't be written | copy logic | Rule "silent progress loss is forbidden" carries over unchanged. Port the code and its tests (`export_checks.js`, 19 checks) nearly as is. |
| Session resume | core.js `sessionKey/sessionHash/sessionStale`, `vocab_<key>_session` | adapt, M7 | Needed: a 15-minute timed problem must survive a tab discard. Simplify: record = queue of item ids + option order seeds + timer start stamp; drop 12 h stale and build-id check as is. The builder-name/draw-replay machinery is not needed because items are static JSON. |
| Scheduler | core.js `buildReviewPlan`, `dayReviewPlan`, pairs ranking ("lowest pair streak first, then asked longest ago, a tenth of slots refresh known pairs") | rewrite, keep rules | The code is entangled with dayAware, characters, scripts, typed tiers. Keep the rules: lowest streak first, then oldest by session ordinal, ~10% refresh of known, a miss sets streak to 0, spacing by session ordinal never wall-clock days. |
| Mastery | `WORD_MASTERED = 3`, miss resets to 0, `wordsBy` typed step-down | adapt | Mastered at 3 credited sessions on a technique (2.4). Typed/production-only credit from streak 2 maps to "free-response answer required from streak 2". |
| Level gate | `levelGateHold`, `LEVEL_GATE = 0.7`, `levelKnownPct`, note "HSK 4 waits, HSK 3 at 74% known" | adapt | Small and clean. Known = technique mastered. Gate sentence reused verbatim style: `Calculus II waits. Calculus I at 64% known.` |
| Level exam | `levelExam` (word not known until read in hanzi) | rewrite as exam rule | Analogy: a technique does not count as known for the gate until it has been solved as a full problem (tier c) at least once. See 2.6. |
| Placement | `placement` buckets, `placementItems [3,4]`, `placementWhole` (largest k with accuracy >= 0.75), `placementEarlyStop` (3 empty buckets), `placedKnown`, provisional `prov` records, forward-only | adapt | Same shape, buckets become tier/topic bands. Provisional records seeded at streak 1, dropped at first miss or at mastered. Retake never lowers. |
| Today / Progress / Test, appView v2 | `appView`, `progressView`, `missSummary`, hero deltas, anchor line | adapt design, rewrite markup | Rules to keep: anchor line (`Session 80`), one row per stage without counts, rows show only what moves or deviates, drill end `19 of 20` + only missed rows, Session done shows `+6 mastered` signed non-zero deltas, Progress folds settled levels (`SETTLED` 0.9), nothing hidden in Settings. Skip the markup: app.html is zh-specific. Surprisal-ui skill applies to every surface. |
| Test harness | `tests/run_tier.sh fast\|full [--area]`, pure core.js loaded in Node, fake-DOM app checks, `day_sim_checks.js` seeded session sims, golden snapshots | adapt harness, skip flag machinery | Keep: core is DOM-free and `require`d by tests; per-suite summary line; fast vs full tiers; seeded `mulberry32` for any golden. Skip: `FLAG_SINCE`, `packAsOf`, flag-off byte-identity (no live packs to protect yet). Keep the stale-dist guard (rebuild into scratch, byte-compare). |
| Pack validation | `tools/validate_pack.py` | rewrite in Node | The answer checker runs in the browser and in the pipeline; one JS implementation validates packs, so no Python/JS drift. |
| Hard-won rules | CLAUDE.md Always/Never | copy as repo rules | IDs append-only (progress keys on item and technique ids; renumbering loses progress). No pack-specific `if (pack.key === ...)` in core. Generated files never hand-edited. Pack-schema doc updated in the same commit as any pack field change. Gate only pack-varying behaviour behind flags, and collapse flags early (vocab-engine needed a 25-flag collapse). |

Repo layout (target):

```
problem-engine/
  engine/ core.js  answer.js  app.html  sw.template.js  sw.disable.js
  vendor/katex/   (pinned, see 4)
  packs/gre-math/ pack.json items.json techniques.json placement.json attribution.json  (+ generated *.js)
  tools/          validate_pack.js  build_pack.js  gen/ (LLM pipeline, section 7)
  tests/ docs/ build.sh dist/
```

core.js stays DOM-free (`PE` global like `VocabCore`), `answer.js` is DOM-free and shared by app and tools.

## 2. Learning model

### 2.1 Three card tiers

| Tier | Item | Time | Answer | Credit |
|---|---|---|---|---|
| a. recall | definition, theorem statement, formula, identity, "what does X equal" | 5-20 s | MCQ (4 options) at first, short typed expression/number once the technique has streak >= 2 | Streak of the item's technique tags |
| b. micro | single-technique problem, auto-checkable | 1-3 min | numeric, expression, MCQ, multi-select | Streak of its technique tags |
| c. full | multi-step, GRE-style, 5-20 min timed (default budget = `difficulty`-based, shown) | 5-20 min | MCQ (GRE has 5 options) or numeric, then reveal worked solution and self-grade | Technique streak via self-grade, plus item stored for rotation |

The spaced unit is the technique tag, not the item. A technique is a named move, e.g. `calc.ibp` (integration by parts), `la.eig.char-poly`, `alg.sylow-count`, `prob.cond-bayes`. A recall card tests that you hold the move; a micro tests that you can apply it cleanly; a full problem tests that you can select it inside noise and combine it.

### 2.2 Item roles per technique

Each technique has, in the pack, a ladder of roughly 3 recall, 6 micro, 2 full items at launch (counts are pipeline targets, section 7). The scheduler picks the technique first, then the item from its ladder that was seen least recently, then the card type from the technique's streak (2.4). Items repeat only after every item of that tier on that technique was used (a worked answer memorised is not mastery).

### 2.3 Spacing by sessions

Same rule as vocab: the clock is the session ordinal `prog.sessions`, never days. A technique is "due" by streak and by `sessions - l` (last-seen ordinal). Several sessions a day is legal and does not starve anything. Wall-clock is stored only for the full-problem timer and for ETA display.

### 2.4 Technique streak and mastery

Per technique: `s` (streak 0-3+), `l` (last credited session), `m` (mastered flag, sticky until a miss).

- A correct answer on any item carrying the technique adds credit **at most once per session** per technique. This is the "master by 3 right across sessions" rule: three credited sessions = mastered (`TECH_MASTERED = 3`). Extra right answers in the same session are practice only.
- A wrong answer costs one streak step: `s = max(0, s - 1)`. It re-queues the item once in the same session (practice, no credit), exactly like vocab's in-drill requeue. `m` stays set only while `s >= 3` (changed 2026-10-12 after pacing study; was `s = 0` and un-mastered at once).
- Production gate: from `s = 2`, only a free-response answer (numeric/expression, or full-problem self-grade "clean") adds credit; a right MCQ holds the streak. Mirrors `wordsBy: "typed"`. A right typed tier b answer at `s >= 2` also sets `fp` (changed 2026-10-12 after pacing study).
- A multi-tag item credits/penalises its **primary** tag only (first in `tags`); secondary tags get practice records without streak change on right, and no reset on wrong, unless the author marked the tag `critical`. Prevents one slip on a 4-technique full problem from wiping 4 streaks.
- Full-problem self-grade: `0` missed, `1` right but over time or with help, `2` clean and in budget. `2` credits like a right micro; `1` holds; `0` costs the primary tag one streak step (changed 2026-10-12 after pacing study) and marks each secondary tag `weak` (next micro for it is prioritised, no streak change).
- Mastered techniques come back for refresh: ~10% of Review slots, oldest first. A miss on a refresh costs one streak step and un-masters only when `s` drops below 3 (changed 2026-10-12 after pacing study).

### 2.5 Progress record (format version 1)

localStorage key `pe_<pack.key>`; same backup keys as vocab (`_invalid_backup`, `_pre_import_backup`, `_reset_backup`).

```json
{
  "v": 1,
  "sessions": 42,
  "theme": null,
  "placedOnce": true,
  "pl": "L2",
  "tech": { "calc.ibp": { "s": 2, "l": 40, "r": 9, "w": 3, "m": 0, "wk": 0, "prov": 0, "fp": 0 } },
  "items": { "i0412": { "r": 1, "w": 0, "l": 38, "t": 71 } },
  "full": { "i0900": { "g": [1, 2], "l": 41, "best": 412 } },
  "day": { "d": "2026-10-12", "n": 3, "log": [] },
  "pv": { "sn": 40, "m": 31, "full": 6 }
}
```

- `tech[id]`: `s` streak, `l` last credited session ordinal, `r`/`w` lifetime counts, `m` mastered, `wk` weak flag from a failed full problem, `prov` placement-seeded, `fp` full problem solved at grade 2 at least once (the exam rule bit, 2.6).
- `items[id]`: `r`/`w` counts, `l` last session seen, `t` last answer seconds (feeds timing estimates). Written lazily on first sight.
- `full[id]`: last two self-grades `g`, best seconds.
- `day`: same-day log so repeated sessions don't repeat items (vocab dayAware); optional.
- `pv`: last Progress visit totals for the hero delta (as in vocab).
- Ids are append-only strings; unknown ids in an import are kept (not dropped) so a newer pack's progress survives an older build.

### 2.6 Levels, gate, exam rule

Pack levels are ordered bands (GRE math: `L0` pre-calculus review, `L1` single-variable calculus, `L2` multivariable + ODE, `L3` linear algebra, `L4` abstract algebra, `L5` real analysis, `L6` additional topics: discrete, number theory, probability/stats, topology basics). The subject test is roughly 50% calculus-based, 25% algebra, 25% additional topics; the pack's `weights` field carries that so Review samples proportionally once the learner is past placement.

- Gate: the first level with untaught techniques is held while the previous level has fewer known techniques than `LEVEL_GATE = 0.7` (known = mastered). Held level also holds all later ones. Evaluated at plan time, not stored (vocab rule).
- Exam rule (analogue of `levelExam`): a technique counts as known for the gate only if mastered **and** `fp = 1`. `fp` is set by a full problem at grade 2, or by a right typed tier b answer at streak >= 2 (changed 2026-10-12 after pacing study). Without the exam rule a learner could master 70% of a level on recall cards alone and never solve a full problem. Level 0 and recall-only techniques (pure definitions) are exempt via `techniques.json` field `exam: false`.
- Level exam: when the gate sits within 5 percentage points of opening, offer a timed mixed set of 8 micro + 2 full at the previous level; passing at >= 0.7 sets `fp = 1` on every technique answered correctly. Optional, in Test tab.

## 3. Pack schema

All JSON, one object per file, UTF-8. Prose fields are Markdown with `$...$` inline and `$$...$$` display LaTeX (section 4). `tools/validate_pack.js` is the gate; the schema doc `docs/PACK_SCHEMA.md` is authoritative and changes in the same commit as any field.

### 3.1 pack.json

```json
{
  "key": "gre-math", "name": "GRE Mathematics Subject Test", "lang": "en",
  "levels": [ { "id": "L0", "label": "Pre-calculus", "short": "Pre" }, ... ],
  "weights": { "calc": 0.5, "alg": 0.25, "extra": 0.25 },
  "gate": 0.7, "mastered": 3, "settled": 0.9,
  "full": { "budgetSec": { "easy": 300, "mid": 600, "hard": 1080 } },
  "session": { "review": 12, "learn": 1, "micro": 8, "full": 1 },
  "eta": { "...": "calibrated by sim, like vocab ETA" },
  "attribution": "attribution.json"
}
```

Anything not here is engine default; pack-varying behaviour is a field, never `if (pack.key === ...)`.

### 3.2 techniques.json

```json
[{ "id": "calc.ibp", "name": "Integration by parts", "level": "L1", "area": "calc",
   "prereq": ["calc.deriv.product", "calc.int.basic"],
   "teach": "Markdown card: when it applies, the move, one worked example, the usual trap.",
   "exam": true, "order": 14 }]
```

`prereq` is a DAG (validator rejects cycles and prereqs at a later level). `order` is teach order inside a level. `teach` is the Learn card shown at introduction (30-60 s read).

### 3.3 items.json

```json
{ "id": "i0412", "tier": "b", "type": "micro", "level": "L1",
  "tags": ["calc.ibp"], "critical": [], "difficulty": 2,
  "prompt": "Evaluate $\\int_0^1 x e^{x}\\,dx$.",
  "answer": { "kind": "numeric", "value": 1, "tol": 0 },
  "solution": "Let $u=x$, $dv=e^x dx$ ... so the value is $1$.",
  "hints": ["Which factor gets simpler when differentiated?"],
  "source": { "type": "original", "gen": "2026-10-12/opus-5.5", "ver": "blind-solve+sympy" } }
```

- `tier`: `a` recall, `b` micro, `c` full. `difficulty` 1-5; maps to full-problem time budget.
- `tags[0]` is the primary technique. `critical` lists secondary tags that also reset on a miss.
- `solution` is shown after any answer; for tier c it is mandatory and the grading rubric lives in `answer.rubric`.
- `source.type`: `original` (authored for this pack), `adapted` (concept from a named licensed source, text rewritten), `public-domain`. Never `verbatim-copyrighted`; validator errors on a missing `source`.

### 3.4 Answer specs

| kind | fields | check |
|---|---|---|
| `numeric` | `value` (number or `"p/q"`), `tol` (abs, default 0), `rel` (optional), `form`: `exact` \| `decimal` \| `fraction` | exact: parse typed integer/fraction, compare as rationals. decimal: abs/rel tolerance. fraction: also requires lowest terms. `sqrt(2)`, `pi` allowed in typed answers via the expression parser, compared numerically at 1e-9. |
| `expression` | `value` (ASCII expression), `vars` (names), `domain` (per-var interval, default `[0.3, 2.7]`), `also` (extra accepted forms), `points` (default 12) | sampling check below |
| `mcq` | `options` (Markdown each), `correct` (index), `shuffle` (default true), `why` (per-option misconception tag, optional) | index compare |
| `multi` | `options`, `correct` (set of indices), `partial: false` | set equality; no partial credit |
| `self` | `rubric` (list of checklist strings, each with `weight`), `pass` (min weight) | learner ticks rubric items against `solution`; grade 2/1/0 from weight and timer |

GRE items are 5-option MCQ; tier c items default to `mcq` first (commit to an answer, timed), then reveal and rubric self-grade for the *method*. The MCQ result is the correctness record; the self-grade can only lower credit (a lucky guess with a wrong method = grade 0-1).

#### Expression equality in the browser

Feasible and small (~150-200 lines, no dependency): a tokenizer + shunting-yard parser to an AST, then `evaluate(ast, env)`.

- Grammar: numbers, variables from `vars`, `+ - * / ^`, unary minus, parentheses, implicit multiplication (`2x`, `x(x+1)`), functions `sin cos tan asin acos atan sinh cosh tanh exp ln log sqrt abs`, constants `pi e`. Input is ASCII (`x^2/2`, `sqrt(1-x^2)`), not LaTeX. A live KaTeX preview of the parsed AST shows the learner what was understood before submit.
- Check: draw `points` random env points from each var's `domain` with a seeded RNG, evaluate target and answer, skip points where either is non-finite, require >= 8 valid points, then `|a-b| <= 1e-9 * max(1, |a|, |b|)` at all. If either side throws on every point, reject as unparsable (show parse error, no penalty, no attempt counted).
- Limits: equality on the domain, not as formal identity (piecewise, branch cuts, `ln|x|` vs `ln x` differ on negatives; mitigate with explicit `domain` and a second sampling interval for signed domains). Floating cancellation near 1e-12 for adversarial pairs: acceptable, since the authoring pipeline rejects items whose answer is a near-degenerate expression.
- Not covered: indefinite integrals with `+ C` (compare derivatives is out of scope; author such items as definite integrals or MCQ), set-valued/matrix answers (use `multi`, `mcq`, or a `numeric` entry per cell via `entries: [...]`), proofs (always `self`).
- Fallback ladder, per item, set at authoring time: `expression` -> if `vars` non-empty and the validator can't find a stable domain, downgrade to `mcq` with three distractors from known mistakes. The validator runs each item's own `value` against its `also` list and 20 deliberately wrong forms from the generator to prove the check discriminates.

## 4. Math rendering

Hard requirement: one self-contained HTML, offline, GitHub Pages, no fetch. Measured 2026-10-12 from `katex@0.16.11` and `mathjax@3.2.2` npm tarballs downloaded into an empty scratch dir (not executed); mock page = CSS + base64 woff2 + JS inlined.

| Option | Inlined raw | Gzipped (Pages serves gzip) | Notes |
|---|---|---|---|
| KaTeX, JS + CSS only (no fonts, falls back to system serif) | 299 KB | ~79 KB | Renders wrong glyphs for operators and big delimiters. Not acceptable. |
| **KaTeX, core font subset** (Main Regular/Bold/Italic, Math Italic, AMS Regular, Size1-4, Caligraphic) | **483 KB** | **220 KB** | Covers integrals, sums, fractions, matrices, blackboard bold, common symbols. Fraktur/Script/SansSerif/Typewriter omitted. |
| KaTeX, all 20 woff2 fonts | 644 KB | 342 KB | Covers `\mathfrak`, `\mathscr`, `\mathtt`. Needed only for rare group-theory items. |
| MathJax 3 `tex-svg` (fonts are paths inside the JS) | 2.1 MB | 676 KB | Covers everything, slow startup, async API. |
| MathJax 3 `tex-chtml` | 1.16 MB + ~490 KB fonts dir | ~1.1 MB+ | Same startup cost; font files are fetched at runtime, which breaks "no fetch" unless inlined. |
| MathML only | 0 | 0 | Chrome 109+, Safari, Firefox render MathML Core natively in 2026, but glyph quality depends on the platform math font (STIX Two/Cambria Math present on desktop; Android coverage uneven), and authoring MathML for hundreds of items is worse than LaTeX. Not measured in a browser here. |
| Plain Unicode | 0 | 0 | Cannot express stacked fractions, integrals with limits, matrices. Fine only for recall cards of the form `sin²x + cos²x = 1`. |

Baseline for scale: vocab-engine `dist/zh.html` is 2.36 MB raw, 624 KB gzipped, so KaTeX-core adds ~20% raw.

**Recommendation: KaTeX with the core font subset, inlined at build time** (JS, CSS with `@font-face` data URIs, woff2 only). Render at pack-load: all item prompts/solutions pre-converted to HTML at build with `katex.renderToString` in Node, so the page ships HTML strings and the browser needs only CSS + fonts; KaTeX JS is then needed in the page only for the live expression preview (2.3) and could be dropped to cut 275 KB raw (page = ~208 KB for CSS+fonts). Decision for M2 (superseded 2026-10-12, see the paragraph below): pre-render at build.

**Runtime rendering (since 2026-10-12).** The page renders math itself from the Markdown-lite source, with KaTeX 0.16.11 JavaScript and the core-subset CSS both inlined once. The pre-rendered build cost about 3 KB per item (HTML markup plus a tag dictionary), so pack size grew with every item and the ~1,400-item target would reach about 5 MB. Source costs under 1 KB per item. Measured with the same pack: 616 items 2,294,108 bytes before, 1,167,679 after (gzip 425 KB to 359 KB); 935 items 3,298,557 bytes before, 1,462,240 after. The 1.1 MB target at 616 items is not met: the remaining weight is 275 KB KaTeX JS, 205 KB CSS and fonts, 560 KB pack JSON and 114 KB engine JS. The build still fails on any LaTeX error, KaTeX warning or out-of-subset glyph (`tools/render_pack.js`), and the page uses the same span code, so the page only ever sees validated math. A card's math reached the DOM within 3 ms of input in the built page (Playwright, 360 by 780). Pin the exact KaTeX version in `vendor/katex/VERSION` and add the font-subset list to `docs/PACK_SCHEMA.md`; adding a font later is a pack-rule change (fallback glyph = visible tofu, so the validator scans every item's rendered HTML for glyphs outside the subset).

Authoring rule: LaTeX subset is the KaTeX supported-functions list; validator renders every prompt/option/solution with `throwOnError: true` and fails the pack on any error.

## 5. Session plan ("Today")

By analogy with vocab Today (review 15, learn, listen 12, recall 8, sentences 8, read 1). Targets a 25-35 minute session; stages skip themselves when the pool is empty.

| # | Stage | Count | Content |
|---|---|---|---|
| 1 | Review | 12 | Recall cards (tier a) on due techniques, lowest streak first, then oldest `l`; ~10% refresh of mastered. 40% production (typed) once streaks allow, mirroring `REVIEW_PRODUCTION_SHARE`. |
| 2 | Learn | 2 techniques | Teach card (30-60 s), then 4 micro problems on it in ascending difficulty, same-session. The new technique is the next unplaced one by `order` whose prereqs each have a streak of at least 1 (or are placed) and which the gate does not hold (changed 2026-10-12 after pacing study; the prereq was mastered before). |
| 3 | Micro | 8 | Tier b, due techniques, interleaved (no two consecutive items of the same technique when avoidable). Includes any `wk` (weak after a failed full problem) technique first. |
| 4 | Full | `session.full` (default 1) | Timed tier c on the oldest-due techniques that have `s >= 1` (so the learner has met them), each on a different technique, with at least one secondary tag already mastered. Skipped when fewer than 4 techniques have `s >= 1`. (changed 2026-10-12 after pacing study: a value above 1 was ignored before.) |
| 5 | Debrief | - | Drill-end summary as vocab `missSummary`: `7 of 8`, then only missed items with solutions; `Session 43 done  +2 mastered  +1 full`. |

Capacity rules at the technique level (the vocab "set size / ramp" analogue):

- **New-technique cap:** at most 2 new techniques per session, before and after 20 techniques are started (`pack.session.learn` is the ceiling; changed 2026-10-12 after pacing study, was 1 after 20). Zero when more than 6 techniques sit at `0 < s < 3` ("work in progress" cap). This is the only brake on overload.
- **Per-technique cap per session:** at most 3 items of one technique across stages 1-3 outside its Learn block.
- **Prereq rule:** a technique is introduced only when all `prereq` techniques have a streak of at least 1 or are placement-provisional (changed 2026-10-12 after pacing study; was mastered).
- **Weak first:** `wk` techniques (failed in a full problem) jump the Micro queue once, then clear on the next credited right.
- **Pause new:** `pauseNew` (vocab) as an owner toggle in Progress settings: review-only session when the learner is behind or on an exam week.
- **Level gate** holds Learn only (never Review or Full); the gate sentence appears on the Today row.
- **Many sessions per day** are allowed; `day.log` keeps items from repeating within the day.
- ETA ("about N sessions to the next goal") appears after 14 sessions, from a seeded session simulation calibrated per pack (vocab `tests/eta_checks.js --calibrate`); never a hard-coded number.

Today UI follows appView v2: anchor `Session 43`, goal row, one row per stage without counts, rows show only deviations (the gate sentence, the technique being learned, a skipped stage reason), Start/Resume.

## 6. Placement diagnostic

Floor assumption: the learner finished O-level (arithmetic, fractions, basic algebra, simple geometry). L0 therefore starts from "solve a quadratic, manipulate exponentials/logs, basic trig values", not from arithmetic.

- Buckets: each level split into 2 buckets of techniques (early/late), 3 or 4 items per bucket cycled as `placementItems [3,4]`. Items are tier b micro, MCQ-or-numeric per item, one attempt, no feedback until the result (vocab behaviour).
- Order: ascending. After each bucket compute accuracy; **adaptive**: the first bucket with accuracy < 0.7 closes the test and is the landing bucket. Early stop also if three consecutive buckets have 0 right (vocab `placementEarlyStop`). Tier-a recall items are used only inside a bucket's first level as warm-up, never to place above L0.
- Result rule (vocab `placementWhole`, adapted to 0.7): the placed prefix is the largest `k` such that cumulative accuracy over buckets `0..k-1` is >= 0.7 and every bucket in it has at least one right answer, except an isolated zero-right bucket whose neighbours both have a right answer. One unlucky bucket can't zero a 25/30 test.
- Writes: techniques in the placed prefix get `{s:1, prov:1}` (tier-of-placed-word analogue); `prov` is dropped at first miss or at mastered. They count as known for the gate (`wordKnownP`, vocab fb52 reasoning) so a placed learner doesn't see "Level 2 waits, Level 1 at 0%". `pl` stores the landing level; retake only moves forward. Placement writes no `items` or `full` records.
- Length: 8 buckets x 3.5 = ~28 items, 25 minutes worst case; the early stop makes a beginner's test ~9 items.
- Re-placement: Test tab offers it only before `placedOnce` (vocab fb-appView C rule), plus a level exam later.

## 7. Content pipeline

Stages, all scripted in `tools/gen/` (Node; sympy via a subprocess for symbolic checks), each stage writing JSON to `packs/<key>/.cache/` so a rerun skips finished work.

1. **Outline.** One technique list per level with prereq DAG and target counts per technique (3 recall / 6 micro / 2 full). Authored by an Opus-class agent from public syllabi (GRE Math content-area percentages, standard calculus/linear algebra/abstract algebra texts) and reviewed by the owner once, since it fixes ids (append-only afterwards).
2. **Draft.** LLM generates items per technique and tier as JSON against the item schema, including `solution`, `answer`, and a `check` block: a small Python/sympy or Node snippet that recomputes the answer from the prompt's parameters.
3. **Machine verification (blocking).**
   - `numeric`: execute `check`, compare to `answer.value` (rational-exact where possible).
   - `expression`: sample-check against the `check` result at 20 points; run the discrimination test (section 3.4).
   - `mcq`/`multi`: key unique; options pairwise distinct after normalisation (numeric options as rationals, expressions by sampling); every distractor differs from the key; each distractor carries a `why` tag from a misconception list for the technique (sign error, dropped constant, wrong substitution...) and, where numeric, is reproducible by a coded error model in `check`. Reject "all of the above / none of the above" for v1.
   - **Blind solve:** a second model instance (different family or at least a fresh context) solves the prompt without the key; disagreement fails the item. Cost control: Haiku/Sonnet blind-solve for tier a and b, Opus for tier c.
   - KaTeX render with `throwOnError`; glyph-subset scan; prompt length cap.
4. **Review.** An Opus reviewer reads each tier-c item and a 20% sample of b and a: is the stated technique actually the intended path, is there a shorter unintended path that bypasses the tag, is the difficulty plausible against the timer budget. Owner spot-checks 10% of the first 200 items, then the sample rate drops.
5. **Accept.** Items get `source` with generator model, date, verification bitmask. Failures stay in `.cache/rejected` with the reason. Accepted items are appended to `items.json` by id; ids never change.
6. **Calibrate (post-launch).** In-app optional "report problem" button writes a local flagged-list the owner can export; flagged items go back through stage 3.

Licensing: **no verbatim copyrighted test questions.** ETS GRE Mathematics practice books and released tests are copyrighted; items are original or concept-adapted with rewritten text and fresh numbers, never paraphrased line by line. `attribution.json` lists generators, tool versions (KaTeX, any CC textbook consulted for syllabus ordering only) and the licence of the pack (proposal: CC BY-NC 4.0 for items, MIT for engine). Any item adapted from a CC source records that source and its licence in `source.ref`; non-commercial or share-alike sources need an owner decision before use. The GitHub Pages site and repo are public, so item text is public.

## 8. Build order

Each milestone is brief-sized (about one worker-day) with acceptance criteria; later ones depend on earlier ones. Test commands follow vocab: `tests/run_tier.sh fast`.

**M1. Playable Today on a seed pack (recall + micro).**
- Scope: repo skeleton; `build.sh` (adapted); `core.js` with progress shape 2.5, technique streak rules 2.4, Review + Micro + Learn planning (stages 1-3 only), session-ordinal spacing; `app.html` with Today, drill (MCQ + numeric answer), drill end summary; seed pack `packs/seed/` with 2 levels, 10 techniques, ~60 items (hand-written, tiny); inline plain-text/Unicode math only (no KaTeX yet); progress in localStorage.
- Accept: `./build.sh packs/seed dist/seed.html` produces one file that opens from `file://`; a scripted 10-session Node sim reaches mastered on a technique after 3 *distinct* sessions, never from 3 in one session; a miss resets; engine_checks >= 40 passing; Today shows Review, Learn, Micro rows and finishes a session on a 360x780 viewport with no horizontal scroll.

**M2. Math rendering.** Vendor KaTeX (pinned), build-time `renderToString` of prompt/option/solution, inline CSS + core-subset fonts. Accept: `dist/seed.html` <= 600 KB raw excluding items; validator fails a pack with a LaTeX error or an out-of-subset glyph; visual check of integrals, matrices, fractions at 360px width; offline render verified with network disabled.

**M3. Answer checker.** `answer.js`: numeric (exact/decimal/fraction), expression (parser + sampling, preview optional), mcq, multi. Accept: >= 150 unit cases including adversarial equal and unequal pairs (`sin(x)^2+cos(x)^2` vs `1`, `(x^2-1)/(x-1)` vs `x+1` on a domain avoiding 1, `ln(x^2)` vs `2ln(x)` with domain flagged), parse errors never count as attempts, discrimination test in validator passes on the seed pack.

**M4. Progress safety + PWA.** Adapt storage/backups/import/export/version, `sw.template.js` (audio stripped), update banner, stale-dist guard test. Accept: ported export_checks equivalent (>= 15 checks: v refuse-newer leaves record and pre_import untouched, read-only mode on storage read error, backups written before import/reset); sw.js caches only a marked page; second load works offline in the Playwright fallback (see memory: browser check env).

**M5. Full problems + self-grade.** Tier c items, timer (visible budget, no auto-submit), MCQ commit then solution reveal and rubric self-grade, grade-to-credit rules, `wk` flag, full-problem stage 4 in Today. Accept: grade table behaviour covered by core tests; timer survives a hidden tab (counts hidden time, like vocab `read.done.t` rule); a failed full problem moves weak techniques into next Micro.

**M6. Gate, exam rule, placement, Progress v2.** `LEVEL_GATE` 0.7 with `fp` exam rule, gate sentence on Today/Progress, adaptive placement (section 6), Progress with level blocks, hero deltas, folding. Accept: seeded sims show gate opens after N sessions printed by the sim (no quoted figure in docs without a measured run); placement walk tests incl. early stop and isolated-zero bucket; retake never lowers; provisional records drop on first miss.

**M7. Session resume.** Adapted resume incl. timer start stamp. Accept: reload mid-micro and mid-full restores the same item and option order; 12 h stale record dropped; Import/Reset drops it.

**M8. Content pipeline v1 + GRE pack L0-L1.** `tools/gen/` stages 1-5 on L0 and L1 (~25 techniques, ~300 items). Accept: validator green; 100% of numeric/expression items pass the executable check; blind-solve agreement rate recorded in `REPORT.md`; owner reviews the first 60 items; attribution file complete.

**M9. Remaining GRE levels + ETA calibration.** L2-L6 generation, `eta` calibrated by seeded sim. Accept: Today shows `about N sessions` after 14 sessions from a measured curve; a full-tier test run (all suites) green; deployed to GitHub Pages under the org with `check_site.sh`-style stale guard.

Physics and olympiad/Codeforces packs begin only after M9. Expected extensions: `code` answer kind (run tests in a worker, off by default), `proof` self-grade with longer rubric.

## 9. Open decisions for the owner

1. **One HTML per pack, or one shell with many packs?** Recommend one HTML per pack (vocab-engine model, offline, independent progress). Cost: KaTeX is duplicated per page (~480 KB raw each).
2. **Who verifies mathematical correctness at scale?** The pipeline gives executable checks and blind solves, but a wrong key silently teaches wrong math. Recommend owner spot-checks 10% of the first 200 items and any item a learner flags; confirm you accept that residual risk before M8.
3. **Item licence and openness.** Pages and repo are public, so the item bank is public. Recommend CC BY-NC 4.0 for items, MIT for the engine; say if you want the bank private or monetisable instead.
4. **Format fidelity to the real exam.** The GRE is 66 five-option MCQ in 170 minutes. Recommend tier c always MCQ-first with the timer (exam realism) plus self-graded method; tier b free-response where checkable. Alternatively all MCQ (simpler, weaker production gate).
5. **Mobile input for expression answers.** Recommend plain ASCII entry with live KaTeX preview in v1 and no custom math keypad; a virtual keypad is a later milestone if typing `sqrt(1-x^2)/2` on a phone proves painful in your own use.
