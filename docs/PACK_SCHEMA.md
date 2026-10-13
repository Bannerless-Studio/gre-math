# Pack schema (format as built in M1)

Authoritative for what `engine/core.js` and `tools/validate_pack.js` accept. Change this file in the same commit as any field change.

A pack is three UTF-8 JSON files in one directory: `pack.json`, `techniques.json`, `items.json`. Prose fields are Markdown with `$...$` (inline) and `$$...$$` (display) LaTeX. The build validates their math and the page renders it; see Rendering (M2).

## pack.json

| Field | Required | Default | Meaning |
|---|---|---|---|
| `key` | yes | none | `[a-z0-9][a-z0-9._-]*`. Progress is stored under `pe_<key>`. |
| `name` | yes | none | Title shown on the page. |
| `lang` | no | none | Informational in M1. |
| `levels` | yes | none | Ordered `[{id, label, short}]`. Ids are unique. Order is curriculum order. |
| `gate` | no | `0.7` | Share of a level's techniques that must be mastered before the next level opens for Learn. Must be in (0, 1]. |
| `mastered` | no | `3` | Credited sessions needed for a technique to master. Integer >= 1. |
| `session.review` | no | `12` | Review cards per session. |
| `session.learn` | no | `1` | Ceiling on new techniques per session. `0` turns Learn off. Planning allows 2 per session (SPEC 5); the ceiling applies on top, so `2` is the usual value. (changed 2026-10-12 after pacing study: the allowance was 1 after 20 techniques are started.) |
| `session.micro` | no | `8` | Micro cards per session. |
| `session.full` | no | `1` | Full problems per session (Full stage, after Micro), each on a different technique. `0` turns the stage off. (changed 2026-10-12 after pacing study: values above 1 were ignored before.) |
| `full.budgetSec` | yes when tier c items exist | none | `{easy, mid, hard}`, integer seconds. A tier c item's budget is `easy` for difficulty 1-2, `mid` for 3, `hard` for 4-5. |
| `weights`, `settled`, `eta`, `attribution` | no | none | Reserved. Validated only when present (`weights` must sum to 1). |

## techniques.json

Array of technique objects.

| Field | Required | Default | Meaning |
|---|---|---|---|
| `id` | yes | none | `[a-z0-9][a-z0-9._-]*`, unique, never renamed (progress keys on it). |
| `name` | yes | none | Shown in Learn and Progress. |
| `level` | yes | none | Must be an id in `pack.levels`. |
| `area` | yes | none | Free label, e.g. `calc`, `alg`. Ignored by the engine in M1. |
| `prereq` | yes | none | Array of technique ids (use `[]`). Must exist, must not sit at a later level, and the graph must be acyclic. |
| `teach` | yes | none | Markdown card shown once, at introduction. |
| `order` | yes | none | Integer. Teach order inside a level. |
| `exam` | no | `true` | Exam rule flag. Enforced from M6: the gate counts a technique as known only when mastered and `fp`. `false` exempts a recall-only technique (mastery alone counts). |
| `figure` | no | none | One inline SVG string shown above the Learn card. Rules in "Figures" below. |

## items.json

Array of item objects.

| Field | Required | Default | Meaning |
|---|---|---|---|
| `id` | yes | none | `[a-z0-9][a-z0-9._-]*`, unique, append-only. |
| `tier` | yes | none | `a` recall, `b` micro, `c` full. Only `a` and `b` are played in M1. |
| `type` | no | from tier | `recall`, `micro` or `full`. If present it must match the tier. |
| `level` | yes | none | Must equal the level of `tags[0]`. |
| `tags` | yes | none | Non-empty. Each must be a technique id. `tags[0]` is the primary technique and the only one that gets streak credit. |
| `critical` | no | `[]` | Secondary tags that also reset on a miss. Each must be in `tags[1:]`. |
| `probe` | no | `false` | M6 placement probe. `true` only on a tier b item with a playable answer kind (numeric, mcq, expression, multi, code). Placement uses one flagged item per technique, up to five per tier. A tier with no flagged item falls back to each technique's first tier b item.
| `difficulty` | yes | none | Integer 1 to 5. Orders Learn micro problems (easiest first). |
| `prompt` | yes | none | Markdown, non-empty. |
| `solution` | yes | none | Markdown, non-empty. Shown after every answer. Mandatory for tier c. |
| `hints` | no | `[]` | Markdown strings. Math is rendered by the page (see Rendering). Not shown in the page yet. |
| `answer` | yes | none | See below. |
| `source` | yes | none | `{type, ...}`. `type` is `original`, `adapted` or `public-domain`. |
| `figure` | no | none | One inline SVG string shown above the prompt on every card tier (drill, timed full problem). Rules in "Figures" below. |

Every technique that has items must have at least one tier `b` item, because Learn draws its micro problems from tier `b`. At least one of them must have answer kind `numeric` or `expression`, or the production gate (streak 2 and up, typed answers only) can never be met.

### Answers

| `answer.kind` | Fields | Engine behaviour in M1 |
|---|---|---|
| `numeric` | `value` (number, `"p/q"`, decimal or scientific string such as `"1.6e-19"`), `tol` (abs, default 0), `rel` (default 0, from 0 to 0.1), `form` (`exact` default, `decimal`, `fraction`), `display` (optional text shown as the answer) | Typed input. Accepts integers, decimals, `p/q` and scientific literals (`3e8`, `1.6e-19`). `exact` compares rationals exactly (number values compare within the tolerance below). `decimal` uses `tol` and `rel`. `fraction` also requires the typed value in lowest terms. Input that does not parse is not counted. |

Numeric tolerance is `max(tol, rel * |value|)`, relative to the target and never an absolute floor, so a value near 1e-19 is checked at its own scale. An exact-zero target typed as an expression (`cos(pi/2)`, `0.1+0.2-0.3`) gets a `1e-12` absolute slack; a typed literal is compared exactly. `rel` applies to `decimal` and to float-valued targets; an exact rational target under `exact` compares exactly and ignores `tol` and `rel`. `tools/check_items.py` uses the same rule.
| `mcq` | `options` (>= 2 Markdown strings), `correct` (index into `options`), `shuffle` (default `true`) | Shown as buttons. Display order is a seeded shuffle, fixed per card. |
| `expression` | `value` (ASCII, see Answer checker), `vars` (names, required for variables), `domain`, `also`, `points` | Typed input with a live "Read as" line (the parsed form, fully parenthesised) and an inline message on a parse error. A parse error counts no attempt and keeps the input. Playable since M4. |
| `multi` | `options` (>= 2 Markdown strings), `correct` (non-empty list of distinct indexes into `options`), `shuffle` (default `true`) | Checkboxes and a Check button. Set equality, no partial credit. Playable since M4. |
| `code` | `lang` (`"python"`), `entry` (identifier), `setup` (optional string), `tests` (>= 3 of `{args: [...], expect: <json>}`), `tol` (0 to 1, optional), `packages` (subset of `numpy`, `pandas`), `starter` (must define `entry`) | Editor with Run tests and Check. Python runs in the page (Pyodide, see SPEC 3.4). `solution` must contain the reference code in a fenced block; `python3 -I tools/run_code_items.py <pack>` proves it against the tests. Typed (production) kind. Not allowed on tier c. Use spaces, not tabs, in `setup` and `starter`. `setup` may import only numpy, pandas and pure stdlib modules (math, statistics, random, collections, itertools, functools, fractions, decimal, re, string, heapq, bisect, operator, dataclasses, typing). Integers in `args`/`expect` stay within 2^53 - 1; a bigger expected int is written `{"__i": "<digits>"}`. With no `tol`, an integer `expect` needs an exact integer result. |
| `ladder` | none (`{ "kind": "ladder" }`); the content is in the item's `stages`, see Ladder items | Staged discovery walk, tier b only. See Ladder items. |
| `self` | none | Not used for tier c (see Full items). A `self` item is skipped in planning and warned by the validator. |

## Ladder items (tier b)

A ladder walks a learner from a statement to the technique through 3 to 7 staged interventions and grades the process (how much help was needed), not one final answer. It is a deterministic stand-in for a coaching conversation. `answer` is `{ "kind": "ladder" }`; the item must be tier `b`, `type` `micro`. It is playable and appears wherever a tier b micro item does (Learn, Review), except as a placement probe (`probe` is refused) and in the level exam's micro set. It is a production item (can credit from streak 2) iff at least one stage is `counterexample` or `typed`. The technique rule above ("at least one typed tier b item") is satisfied by such a ladder.

| Item field | Required | Meaning |
|---|---|---|
| `prompt` | yes | Markdown: the problem statement with constraints and at least one example (answers verified by brute force by the author). |
| `stages` | yes | Array of 3 to 7 stages, played in order. |
| `lesson` | yes | Markdown, teach-card voice (`docs/TEACH_CARDS.md`): the reusable mental move. Shown after the last stage. |
| `solution` | yes | Markdown: full algorithm, correctness in 2 to 3 sentences, complexity. Shown with the lesson. |

Common stage fields: `id` (unique within the item, `[a-z0-9][a-z0-9._-]*`), `move` (optional technique id, default `tags[0]`; must exist), `type` (`choose`, `counterexample`, `typed`), `ask` (Markdown), `hint` (optional Markdown, once, costs one grade level), `reveal` (Markdown, shown once the stage resolves).

| `type` | Fields | Play |
|---|---|---|
| `choose` | `options`: 3 or 4 of `{text, ok, feedback}`, exactly one `ok: true` | Option order is a seeded shuffle per card and stage. A wrong pick shows its `feedback` (Markdown, ideally a concrete counterexample) and is disabled; the learner picks again. |
| `counterexample` | `claim` (Markdown conjecture), `input_hint` (input format and size cap), `code` (Python defining `def breaks(inp)`: True iff the string `inp` is a valid input violating the claim; invalid or oversized input raises `ValueError` with a short message), `examples`: >= 2 of `{inp, breaks}` with at least one `true` and one `false` | The learner types an input; the page runs `breaks(inp)` in the Pyodide worker (10 s wall). True resolves the stage. False shows "The claim survives this input." and counts one attempt. An exception, timeout or missing runtime shows its message and counts no attempt. `examples` are for author tooling only (`python3 -I tools/run_ladder_examples.py <pack>` runs them against `code` in CPython through `pyharness.py`); they are not shown. |
| `typed` | `answer`: a `numeric` or `expression` answer object | Checked by the answer checker; an unparsable entry counts no attempt. |

Grading. Stage grade: 2 on the first attempt without a hint; 1 with a hint or exactly one wrong attempt (both together is still 1); 0 after two or more wrong attempts or Show me. Show me exists on `counterexample` and `typed` stages and is enabled after one failed attempt. Item grade is the minimum over stages. Grade 2 credits the primary technique exactly like a right micro (once per session, streak cap, production gate: a ladder without a production stage cannot credit from streak 2). Grade 1 holds: only `items[id].l` and `st` change; it is not scored, not listed as missed. Grade 0 resets like a miss (`resetTech`, secondary `critical` tags, Recent misses, Missed list) without a requeue. Stage grades are stored as `items[id].st` (array, one per stage, additive; unknown fields survive import). A pack whose tier b items are all ladders has no placement test and no level exam.

Build: a pack whose `items.json` contains `"type": "counterexample"` or a `code` answer gets the Python worker and harness inlined.

## Full items (tier c, M5)

A full item is a multi-step problem. The learner commits an answer under a timer, then reads the solution and self-grades the method against a rubric. The commit is the correctness record. The rubric can only lower the grade.

```json
{ "id": "f031", "tier": "c", "type": "full", "level": "T1", "tags": ["t1.quad", "t1.lin-eq"], "critical": [],
  "difficulty": 2, "prompt": "Two numbers have sum $8$ and product $15$. Which quadratic has them as roots?",
  "answer": { "kind": "mcq", "options": ["$x^2-8x+15=0$", "$x^2+8x+15=0$", "$x^2-8x-15=0$", "$x^2+15x+8=0$", "$x^2-15x+8=0$"], "correct": 0, "shuffle": true },
  "solution": "For roots $r$ and $s$, $x^2-(r+s)x+rs=0$.",
  "hints": [], "rubric": [ { "text": "Use the sum and product of roots.", "weight": 1 }, { "text": "Set $-b/a=8$ and $c/a=15$.", "weight": 2 } ],
  "pass": 3, "source": { "type": "original", "gen": "...", "ver": "..." } }
```

| Field | Rule |
|---|---|
| `tier` | `c`. `type`, if present, is `full`. |
| `answer.kind` | `mcq` with exactly 5 options (`correct` indexes them), or `numeric`. Not `self`, `expression`, `multi`. |
| `rubric` | Non-empty list of `{text, weight}`. `text` is Markdown with LaTeX (rendered by the page). `weight` is a number above 0. |
| `pass` | Number above 0, at most the total rubric weight. Rubric weight at or above `pass` is the rubric level 2. |
| `solution` | Mandatory. Shown after the commit. |
| `difficulty` | 1 to 5. Picks the budget (`full.budgetSec`). |
| `tags` | Primary first. Full problems need at least one mastered secondary tag to be picked (see Engine rules). |

Only tier c items may carry `rubric` or `pass`. The validator enforces each row above.

## Engine rules (M1)

- Credit: a right answer adds one streak to the primary technique, at most once per session per technique. Three credited sessions master it (`mastered`).
- Miss: streak drops by one (not below 0). Mastery is cleared only when the streak falls below `mastered` (changed 2026-10-12 after pacing study; was streak 0 and mastery cleared at once). The item is requeued once in the same session with no credit. The technique gets no further credit that session.
- Production gate: from streak 2 a right MCQ or multi holds the streak. Only a typed answer (`numeric`, `expression`, `code`, or a ladder with a `counterexample` or `typed` stage) credits. Planning prefers typed items once a technique reaches streak 2.
- Secondary tags: a right answer adds a practice count only. A miss costs one streak step only for tags listed in `critical`.
- Spacing is by session ordinal. Items seen today are deprioritised but never excluded.
- Learn picks the first untaught technique whose prerequisites each have a streak of at least 1 or are placed (changed 2026-10-12 after pacing study; was mastered). It is held when the first level with untaught techniques has a previous level below `gate`.
- Known (M6): mastered and `fp` under the exam rule, unless `exam` is `false`. A placement-provisional technique (`prov`) is known. Prerequisites accept streak 1 or more, mastered or provisional.
- `fp` is also set by a right typed tier b answer at streak 2 or more (changed 2026-10-12 after pacing study).
- Review production share (M6): once a technique reaches streak 2, about 40 percent of its Review cards are typed. When its tier a pool has no typed item, the typed card comes from tier b.
- Learn cap (M6): see `session.learn`. `pauseNew` (top-level, set on Today) stops Learn only.
- Work in progress: placement-provisional techniques are not counted toward the work-in-progress cap.
- Placement (M6, SPEC 6): one bucket per tier, five probes each. Stop after three buckets in a row with no right answer, or two in a row under 0.7. The placed prefix is the largest run of buckets that reaches 0.7 in total and has a right answer in each, except an isolated empty bucket. Placed techniques get `s` 1 and `prov` 1 when they have no streak and no answers. `prov` drops at the first miss on the technique and at mastery. A retake only applies when it lands higher.
- Level exam (M6): offered when the gate is held and the level below is within 5 points of it or one technique short of it. Eight micro and two full problems at that level. Seven right or more sets `fp` on each technique answered right. Exam answers do not requeue and do not take a session number.

Full stage (M5, SPEC 5 stage 4):

- Planned after Micro when at least 4 techniques have a streak (`s >= 1`). The candidate is a technique with `s >= 1` that has a tier c item whose secondary tag is mastered. Weak (`wk`) techniques come first, then the one seen longest ago. The item is the least recently seen eligible item.
- Commit: the timer starts when the card shows. The commit time is the time at commit (no auto-submit; over budget keeps counting). The commit updates the item and tag `r`/`w` counts.
- Grade: a wrong commit grades 0. Otherwise the grade is the lower of the rubric level (2 at `pass`, 1 from half of `pass`, else 0) and the time level (2 before the budget, 1 at or after it).
- Grade 2 credits the primary like a right micro (once per session, mastery as usual) and sets `fp` on every tag.
- Grade 1 holds: no credit, no reset.
- Grade 0 costs the primary one streak step (changed 2026-10-12 after pacing study), sets `wk` on the primary and each secondary, and gives no credit to that technique for the rest of the session.
- A right micro on a technique clears its `wk`.

## Progress record (format version 1)

Stored under `pe_<pack.key>` in localStorage. Backup keys: `pe_<key>_invalid_backup`, `pe_<key>_pre_import_backup`, `pe_<key>_reset_backup`. The last two are 2-slot rings: the key above is the newest slot, `<key>_1` the one before it.

| Path | Fields |
|---|---|
| top level | `v` (1), `sessions`, `theme`, `placedOnce`, `pl` (landing level id, null when the prefix reaches the top), `pauseNew` (M6), `tech`, `items`, `full`, `day`, `pv` |
| `tech[id]` | `s` streak, `l` last credited session, `r`/`w` counts, `m` mastered flag, `wk` weak flag, `prov`, `fp`, and `in` (session that introduced it; `in > 0` means started) |
| `items[id]` | `r`/`w` counts, `l` last session seen, `t` last answer seconds, `st` stage grades of the last ladder play (ladder items only) |
| `day` | `d` date, `n` sessions that day, `log` item ids seen that day |
| `pv` | Progress visit totals (M6): `sn` sessions, `k` known, `m` mastered, `full` full problems. Entering Progress shows the change since these and saves the new totals. |

`in` is an addition to the SPEC 2.5 record. It is set to the session ordinal when the teach card is passed (M2, F1), not when the session starts. A technique that only appears through a secondary tag has a record with `in` of 0 and is not started. A technique with `in` above 0 and no answers (`r` + `w` = 0) gets its teach card offered again.

Import rules: a file with a newer `v` is refused. Unknown ids and unknown fields are kept. The current progress is written to `_pre_import_backup` before any import; if that backup cannot be written the import does not run.

## Answer checker (M3)

Module `engine/answer.js` (browser global `PEAnswer`). Pure logic. Suite: `tests/answer_checks.js`.

API: `check(spec, typed)`, `parseExpr(src, vars)`, `evalExpr(ast, env)`, `toLatex(ast)`, `canon(ast)`, `parseNumber(input)`.

`check` returns `{ok, parsed, attempt, error?, detail?}`. `attempt: false` on every parse, spec, or domain failure, so no attempt is counted. `error` codes: `unparsable`, `bad-spec`, `unsupported-kind`, `too-few-points`, `out-of-range`, `lowest-terms`, `fraction-form`, `literal-required`; for `code` also `no-runtime` (no attempt), `runtime-error` and `timeout` (wrong, an attempt).

- `numeric`: `value` (number, `"p/q"`, decimal or scientific string), `form` (default `exact`), `tol`, `rel` (tolerance rule in "Answers" above). Literals (`3`, `-6/2`, `0.5`, `2/4`) go through the core rules. `form: fraction` needs lowest terms and a `p/q` or integer literal, so `0.5` is rejected. Other typed input goes to the expression parser with no variables (`sqrt(2)`, `pi/4`) and is compared at 1e-9. Under `form: exact` with a rational target, or under `form: fraction`, expression input is rejected (`literal-required`): a float cannot prove exactness.
- `expression`: `value` (ASCII), `vars`, `domain` (map `var: [lo, hi]`, or one `[lo, hi]` for all vars; default `[0.3, 2.7]`), `points` (default 12, minimum 8), `also` (extra accepted forms). Points come from a seeded RNG keyed on `value` and `vars`, so results are deterministic. Points where either side is non-finite are skipped. At least 8 valid points are required. Tolerance `1e-9 * max(1, |a|, |b|)` at every valid point.
- `mcq`: `correct` (0-based index), `options` (optional, bounds the typed index).
- `multi`: `correct` (index array), `options` (optional). Set equality, duplicates collapse, no partial credit.
- `self` is not handled here. `check` returns `unsupported-kind`.

Expression grammar: numbers, declared vars, `pi`, `e`, `+ - * / ^`, unary minus (binds looser than `^`), parentheses, implicit `*` (`2x`, `2(3)`, `x(x+1)`, `xsin(x)`). Two adjacent variables multiply only when both are single letters, so write `hbar*omega`, not `hbaromega`. Functions need parentheses: `sin cos tan asin acos atan sinh cosh tanh exp ln log sqrt abs`. `ln` is natural log. `log` is base 10. Scientific notation (`1e5`) is rejected inside expressions, because `2e-1` would be ambiguous (`2*e-1` or `0.2`); numeric answers accept it. Any undeclared letter is an unknown identifier. `^` is right-associative.

Names in `vars` may be longer than one letter and may contain digits or underscores (`hbar`, `eps0`, `mu0`, `k_B`). A declared name is matched whole, longest first, so `expo` and `exp` both resolve correctly. An undeclared name is an error. `e` is a variable when `vars` lists it, and Euler's number otherwise. `pi` is always the constant (`π` is accepted as a typed alias). Negative and fractional exponents evaluate on the reals (`2^-1` is `1/2`, `x^(1/2)` is `sqrt(x)`); a negative base with a fractional exponent gives no value at that point and is skipped.

Expression comparison tolerance is `1e-9 * max(|a|, |b|)` at each sample point, relative to the values being compared. The one exception is a side that is exactly 0 at every valid sample point (`value: "0"`, `x-x`): the other side then gets a `1e-12` absolute slack, so `sin(x)^2+cos(x)^2-1` or `sin(2x)-2sin(x)cos(x)` match it despite float cancellation. Two non-zero tiny sides (`1.05e-34*w` against `2.1e-34*w`) stay purely relative.

## Rendering (M2)

The page renders every `prompt`, `solution`, `hints[]`, `answer.options[]`, `answer.display`, `rubric[].text` and technique `teach` at run time, through `katex.renderToString` (KaTeX 0.16.11, vendored in `vendor/katex/`, inlined by `build.sh`). The page data is the raw pack, with no `html` field and no tag dictionary. Each distinct field string renders once and is cached for the page. The build (`tools/render_pack.js`, run by `build.sh`) validates the same fields and writes no rendered HTML.

Markup rules (shared module `engine/text.js`):

- `$...$` is inline math, `$$...$$` is display math.
- `\$` is a literal dollar sign outside math.
- Other text is escaped (`&`, `<`, `>`, `"`), then `` `code` `` and `**bold**` apply, and blank lines split paragraphs. A fenced block (three backticks, optional language, each fence on its own line) renders as `<pre><code>`: literal text, blank lines kept, no math, no bold.
- A JSON escape misread (a single backslash before a letter, such as `\frac` written as `\f` followed by `rac`) lands as a control character. The validator rejects any control character in a string.

The build validates the same fields with `throwOnError` and strict warnings on. It fails a pack on:

- any LaTeX that KaTeX rejects (`throwOnError`), or any KaTeX strict warning;
- any math span that asks for a font face outside the core subset.

Core subset (the only fonts in the page; the list is `CORE_FONTS` in `tools/render.js`): KaTeX Main Regular, Bold, Italic; Math Italic; AMS Regular; Size1 to Size4; Caligraphic Regular. Not in the subset, so these fail the pack: `\mathfrak` (Fraktur), `\mathscr` (Script), `\mathsf` (SansSerif), `\mathtt` (Typewriter), `\boldsymbol` and bold-italic math letters (Math BoldItalic). Use `\mathbf` for bold Latin letters and `\mathbb` for blackboard bold. Adding a face is a rule change: vendor the woff2, add it to `CORE_FONTS`, and update this section in the same commit.

The page carries the KaTeX JavaScript once, and the KaTeX CSS with the core faces as base64 woff2. Typed learner answers are shown as typed, escaped, and never reach KaTeX.

## Figures

An item or technique may carry `figure`: one inline SVG string. The page inserts it above the prompt (drill and timed full cards) or above the Learn card, inside `<div class="figure">`. The page inserts it as HTML, so the build is the only gate: `tools/figure.js` checks every figure and the build fails on any rejection (`validate_pack.js` and `render_pack.js` both run it).

| Rule | Value |
|---|---|
| size | at most 8 KB (UTF-8) |
| root | exactly one `<svg>` with a `viewBox` of four numbers; nothing but whitespace outside it |
| elements | `svg g line polyline polygon rect circle ellipse path text tspan marker defs title` (lowercase) |
| attributes | `x y x1 y1 x2 y2 cx cy r rx ry d points width height viewBox fill stroke stroke-width stroke-dasharray stroke-linecap font-size font-family text-anchor transform opacity marker-end marker-start id refX refY markerWidth markerHeight orient xmlns`; `xmlns` only with the SVG namespace |
| ids | must start with `fig-`, so a figure cannot shadow a page id such as `ans` |
| characters | tag whitespace is ASCII only; control, NBSP-like and bidi characters are refused anywhere (the HTML parser does not split attributes on them, which would let an attribute hide inside a quoted value); duplicate attributes and `URL(` in any case are refused |
| url() | only `url(#fig-...)`, for markers |
| rejected | `script`, `foreignObject`, `a`, `image`, `use`, `style` and `class` (element or attribute), `on*`, `href`, `xlink:*`, comments, CDATA, doctype, processing instructions, a bare `&` in text, and the characters `< > & backtick { } backslash ; :` inside an attribute value |

Sizing and colour come from the page: `.figure svg` is 100% wide up to 360px, and `currentColor` is the default stroke and fill. An element with its own `stroke` or `fill` keeps it, so open shapes should set `fill="none"`.

```json
{ "figure": "<svg viewBox=\"0 0 120 80\" xmlns=\"http://www.w3.org/2000/svg\"><line x1=\"10\" y1=\"70\" x2=\"110\" y2=\"70\"/><path d=\"M10 70 Q60 0 110 70\" fill=\"none\"/><text x=\"60\" y=\"12\" text-anchor=\"middle\" font-size=\"10\">parabola</text></svg>" }
```

## Warnings (not errors)

- Items whose answer kind the engine cannot play yet: `self` (until M5). The validator lists them with a count.

## Authoring notes (M4)

- `log` is base 10 and `ln` is natural log, in `expression` values and `also` forms. The checker does not warn on `log`, so an author who means natural log must write `ln`.
- `expression` values are ASCII: `x^2/2`, `sqrt(1-x^2)`, `pi/4`. Write implicit products as `2x` only with single-letter variables, and use `*` otherwise.
- A `multi` item should have at least one correct and one wrong option. The validator enforces only a non-empty `correct` list of valid indexes.
- Typed answers at streak 2 or more are what earn credit, so every technique needs one tier b `numeric` or `expression` item (the validator checks this).
