# Pack schema (format as built in M1)

Authoritative for what `engine/core.js` and `tools/validate_pack.js` accept. Change this file in the same commit as any field change.

A pack is three UTF-8 JSON files in one directory: `pack.json`, `techniques.json`, `items.json`. Prose fields are Markdown with `$...$` (inline) and `$$...$$` (display) LaTeX. The build renders them; see Rendering (M2).

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
| `probe` | no | `false` | M6 placement probe. `true` only on a tier b item with a playable answer kind (numeric, mcq, expression, multi). Placement uses one flagged item per technique, up to five per tier. A tier with no flagged item falls back to each technique's first tier b item.
| `difficulty` | yes | none | Integer 1 to 5. Orders Learn micro problems (easiest first). |
| `prompt` | yes | none | Markdown, non-empty. |
| `solution` | yes | none | Markdown, non-empty. Shown after every answer. Mandatory for tier c. |
| `hints` | no | `[]` | Markdown strings. Rendered at build into `html.hints` (see Rendering). Not shown in the page yet. |
| `answer` | yes | none | See below. |
| `source` | yes | none | `{type, ...}`. `type` is `original`, `adapted` or `public-domain`. |

Every technique that has items must have at least one tier `b` item, because Learn draws its micro problems from tier `b`. At least one of them must have answer kind `numeric` or `expression`, or the production gate (streak 2 and up, typed answers only) can never be met.

### Answers

| `answer.kind` | Fields | Engine behaviour in M1 |
|---|---|---|
| `numeric` | `value` (number, `"p/q"`, or decimal string), `tol` (abs, default 0), `rel` (default 0), `form` (`exact` default, `decimal`, `fraction`), `display` (optional text shown as the answer) | Typed input. Accepts integers, decimals and `p/q`. `exact` compares rationals exactly (number values compare within 1e-9). `decimal` uses `tol` and `rel`. `fraction` also requires the typed value in lowest terms. Input that does not parse is not counted. |
| `mcq` | `options` (>= 2 Markdown strings), `correct` (index into `options`), `shuffle` (default `true`) | Shown as buttons. Display order is a seeded shuffle, fixed per card. |
| `expression` | `value` (ASCII, see Answer checker), `vars` (names, required for variables), `domain`, `also`, `points` | Typed input with a live "Read as" line (the parsed form, fully parenthesised) and an inline message on a parse error. A parse error counts no attempt and keeps the input. Playable since M4. |
| `multi` | `options` (>= 2 Markdown strings), `correct` (non-empty list of distinct indexes into `options`), `shuffle` (default `true`) | Checkboxes and a Check button. Set equality, no partial credit. Playable since M4. |
| `self` | none | Not used for tier c (see Full items). A `self` item is skipped in planning and warned by the validator. |

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
| `rubric` | Non-empty list of `{text, weight}`. `text` is Markdown with LaTeX (rendered at build). `weight` is a number above 0. |
| `pass` | Number above 0, at most the total rubric weight. Rubric weight at or above `pass` is the rubric level 2. |
| `solution` | Mandatory. Shown after the commit. |
| `difficulty` | 1 to 5. Picks the budget (`full.budgetSec`). |
| `tags` | Primary first. Full problems need at least one mastered secondary tag to be picked (see Engine rules). |

Only tier c items may carry `rubric` or `pass`. The validator enforces each row above.

## Engine rules (M1)

- Credit: a right answer adds one streak to the primary technique, at most once per session per technique. Three credited sessions master it (`mastered`).
- Miss: streak drops by one (not below 0). Mastery is cleared only when the streak falls below `mastered` (changed 2026-10-12 after pacing study; was streak 0 and mastery cleared at once). The item is requeued once in the same session with no credit. The technique gets no further credit that session.
- Production gate: from streak 2 a right MCQ or multi holds the streak. Only a typed answer (`numeric` or `expression`) credits. Planning prefers typed items once a technique reaches streak 2.
- Secondary tags: a right answer adds a practice count only. A miss costs one streak step only for tags listed in `critical`.
- Spacing is by session ordinal. Items seen today are deprioritised but never excluded.
- Learn picks the first untaught technique whose prerequisites each have a streak of at least 1 or are placed (changed 2026-10-12 after pacing study; was mastered). It is held when the first level with untaught techniques has a previous level below `gate`.
- Known (M6): mastered and `fp` under the exam rule, unless `exam` is `false`. A placement-provisional technique (`prov`) is known. Prerequisites accept streak 1 or more, mastered or provisional.
- `fp` is also set by a right typed tier b answer at streak 2 or more (changed 2026-10-12 after pacing study).
- Review production share (M6): once a technique reaches streak 2, about 40 percent of its Review cards are typed. When its tier a pool has no typed item, the typed card comes from tier b.
- Learn cap (M6): see `session.learn`. `pauseNew` (top-level, set on Today) stops Learn only.
- Work in progress: placement-provisional techniques are not counted toward the work-in-progress cap.
- Placement (M6, SPEC 6): one bucket per tier, five probes each. Stop after three buckets in a row with no right answer, or two in a row under 0.7. The placed prefix is the largest run of buckets that reaches 0.7 in total and has a right answer in each, except an isolated empty bucket. Placed techniques get `s` 1 and `prov` 1 when they have no streak and no answers. `prov` drops at the first miss on the technique and at mastery. A retake only applies when it lands higher.
- Level exam (M6): offered when the gate is held and the level below is within 5 points of it. Eight micro and two full problems at that level. Seven right or more sets `fp` on each technique answered right. Exam answers do not requeue and do not take a session number.

Full stage (M5, SPEC 5 stage 4):

- Planned after Micro when at least 4 techniques have a streak (`s >= 1`). The candidate is a technique with `s >= 1` that has a tier c item whose secondary tag is mastered. Weak (`wk`) techniques come first, then the one seen longest ago. The item is the least recently seen eligible item.
- Commit: the timer starts when the card shows. The commit time is the time at commit (no auto-submit; over budget keeps counting). The commit updates the item and tag `r`/`w` counts.
- Grade: a wrong commit grades 0. Otherwise the grade is the lower of the rubric level (2 at `pass`, 1 from half of `pass`, else 0) and the time level (2 before the budget, 1 at or after it).
- Grade 2 credits the primary like a right micro (once per session, mastery as usual) and sets `fp` on every tag.
- Grade 1 holds: no credit, no reset.
- Grade 0 costs the primary one streak step (changed 2026-10-12 after pacing study), sets `wk` on the primary and each secondary, and gives no credit to that technique for the rest of the session.
- A right micro on a technique clears its `wk`.

## Progress record (format version 1)

Stored under `pe_<pack.key>` in localStorage. Backup keys: `pe_<key>_invalid_backup`, `pe_<key>_pre_import_backup`, `pe_<key>_reset_backup`.

| Path | Fields |
|---|---|
| top level | `v` (1), `sessions`, `theme`, `placedOnce`, `pl` (landing level id, null when the prefix reaches the top), `pauseNew` (M6), `tech`, `items`, `full`, `day`, `pv` |
| `tech[id]` | `s` streak, `l` last credited session, `r`/`w` counts, `m` mastered flag, `wk` weak flag, `prov`, `fp`, and `in` (session that introduced it; `in > 0` means started) |
| `items[id]` | `r`/`w` counts, `l` last session seen, `t` last answer seconds |
| `day` | `d` date, `n` sessions that day, `log` item ids seen that day |
| `pv` | Progress visit totals (M6): `sn` sessions, `k` known, `m` mastered, `full` full problems. Entering Progress shows the change since these and saves the new totals. |

`in` is an addition to the SPEC 2.5 record. It is set to the session ordinal when the teach card is passed (M2, F1), not when the session starts. A technique that only appears through a secondary tag has a record with `in` of 0 and is not started. A technique with `in` above 0 and no answers (`r` + `w` = 0) gets its teach card offered again.

Import rules: a file with a newer `v` is refused. Unknown ids and unknown fields are kept. The current progress is written to `_pre_import_backup` before any import; if that backup cannot be written the import does not run.

## Answer checker (M3)

Module `engine/answer.js` (browser global `PEAnswer`). Pure logic. Suite: `tests/answer_checks.js`.

API: `check(spec, typed)`, `parseExpr(src, vars)`, `evalExpr(ast, env)`, `toLatex(ast)`, `canon(ast)`, `parseNumber(input)`.

`check` returns `{ok, parsed, attempt, error?, detail?}`. `attempt: false` on every parse, spec, or domain failure, so no attempt is counted. `error` codes: `unparsable`, `bad-spec`, `unsupported-kind`, `too-few-points`, `out-of-range`, `lowest-terms`, `fraction-form`, `literal-required`.

- `numeric`: `value` (number or `"p/q"` or decimal string), `form` (default `exact`), `tol`, `rel`. Literals (`3`, `-6/2`, `0.5`, `2/4`) go through the core rules. `form: fraction` needs lowest terms and a `p/q` or integer literal, so `0.5` is rejected. Other typed input goes to the expression parser with no variables (`sqrt(2)`, `pi/4`) and is compared at 1e-9. Under `form: exact` with a rational target, or under `form: fraction`, expression input is rejected (`literal-required`): a float cannot prove exactness.
- `expression`: `value` (ASCII), `vars`, `domain` (map `var: [lo, hi]`, or one `[lo, hi]` for all vars; default `[0.3, 2.7]`), `points` (default 12, minimum 8), `also` (extra accepted forms). Points come from a seeded RNG keyed on `value` and `vars`, so results are deterministic. Points where either side is non-finite are skipped. At least 8 valid points are required. Tolerance `1e-9 * max(1, |a|, |b|)` at every valid point.
- `mcq`: `correct` (0-based index), `options` (optional, bounds the typed index).
- `multi`: `correct` (index array), `options` (optional). Set equality, duplicates collapse, no partial credit.
- `self` is not handled here. `check` returns `unsupported-kind`.

Expression grammar: numbers, declared vars, `pi`, `e`, `+ - * / ^`, unary minus (binds looser than `^`), parentheses, implicit `*` (`2x`, `2(3)`, `x(x+1)`, `xsin(x)`). Two adjacent variables multiply only when both are single letters. Functions need parentheses: `sin cos tan asin acos atan sinh cosh tanh exp ln log sqrt abs`. `ln` is natural log. `log` is base 10. Scientific notation (`1e5`) is rejected. Any undeclared letter is an unknown identifier. `^` is right-associative.

## Rendering (M2)

The build (`tools/render_pack.js`, run by `build.sh`) renders every `prompt`, `solution`, `hints[]`, `answer.options[]`, `answer.display` and technique `teach` through `katex.renderToString` (KaTeX 0.16.11, vendored in `vendor/katex/`). Raw files stay the source of truth. Each record in the page data gains an `html` object with `prompt`, `solution`, `hints`, `options`, `display` (items) or `teach` (techniques). The page shows `html` when present and falls back to the raw Markdown-lite text when a field has no rendered version.

Markup rules (shared module `engine/text.js`):

- `$...$` is inline math, `$$...$$` is display math.
- `\$` is a literal dollar sign outside math.
- Other text is escaped (`&`, `<`, `>`, `"`), then `` `code` `` and `**bold**` apply, and blank lines split paragraphs.
- A JSON escape misread (a single backslash before a letter, such as `\frac` written as `\f` followed by `rac`) lands as a control character. The validator rejects any control character in a string.

The validator renders the same fields. It fails a pack on:

- any LaTeX that KaTeX rejects (`throwOnError`), or any KaTeX strict warning;
- any math span that asks for a font face outside the core subset.

Core subset (the only fonts in the page; the list is `CORE_FONTS` in `tools/render.js`): KaTeX Main Regular, Bold, Italic; Math Italic; AMS Regular; Size1 to Size4; Caligraphic Regular. Not in the subset, so these fail the pack: `\mathfrak` (Fraktur), `\mathscr` (Script), `\mathsf` (SansSerif), `\mathtt` (Typewriter), `\boldsymbol` and bold-italic math letters (Math BoldItalic). Use `\mathbf` for bold Latin letters and `\mathbb` for blackboard bold. Adding a face is a rule change: vendor the woff2, add it to `CORE_FONTS`, and update this section in the same commit.

The page carries the KaTeX CSS with the core faces as base64 woff2. It carries no KaTeX JavaScript.

## Warnings (not errors)

- Items whose answer kind the engine cannot play yet: `self` (until M5). The validator lists them with a count.

## Authoring notes (M4)

- `log` is base 10 and `ln` is natural log, in `expression` values and `also` forms. The checker does not warn on `log`, so an author who means natural log must write `ln`.
- `expression` values are ASCII: `x^2/2`, `sqrt(1-x^2)`, `pi/4`. Write implicit products as `2x` only with single-letter variables, and use `*` otherwise.
- A `multi` item should have at least one correct and one wrong option. The validator enforces only a non-empty `correct` list of valid indexes.
- Typed answers at streak 2 or more are what earn credit, so every technique needs one tier b `numeric` or `expression` item (the validator checks this).
