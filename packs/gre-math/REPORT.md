# gre-math content report

## Batch 1: T1 (2026-10-12, haiku-5.5)
- 13 techniques × (3 recall MCQ + 6 micro numeric) = 117 items.
- `python3 -I tools/check_items.py` → OK 117 items (numeric answers recomputed from `check`; MCQ shape; tags exist).
- Not verified at authoring: MCQ correctness and well-posedness (blind-solve review pending).
- Author's doubtful ids for owner spot check: t1-0038, t1-0054, t1-0047, t1-0060, t1-0099.
- techniques.json holds all 140 techniques; `teach` cards written for T1 only, others `TODO: teach card`.

## Batch 1 review (sonnet-5.5)

- Method: blind-solved all 117 items from prompt/options alone (key hidden), then compared to key.
- Agreement: 117/117 (100%) blind answer == key. No KEY WRONG, no MY ERROR.
- Author-flagged ids t1-0038, t1-0054, t1-0047, t1-0060, t1-0099 re-solved and confirmed correct (t1-0038: 2/3 not a candidate since 3 does not divide 2; t1-0054: x=3 extraneous, 0 solutions; t1-0047: option 2 only defensible; t1-0060: 4; t1-0099: 16).
- Checks run: no two-defensible MCQ options, no distractor equal to key, all numeric prompts single-number, no LaTeX syntax errors found.

| id | class | change |
|---|---|---|
| t1-0094 | wording | prompt was a broken sentence ("has y-coordinate. Find it."); now "Find the y-coordinate of the vertex of ..." Key unchanged (4). |
| t1-0099 | wording clarity | "image point at x=3" made explicit: point (1,5) maps under the transformation; asks its y-coordinate. Key unchanged (16). |

Left as-is: t1-0084 option 0 gloss ("even: symmetric...") slightly clunky but unambiguous; t1-0116 relies on Thales (hypotenuse = diameter), stated nowhere in prompt but standard GRE knowledge and covered by item solution.

## Batch 2: T1 full items (sonnet-5.5)

- Added 26 tier c items `t1-f001`..`t1-f026`: 2 per T1 technique as primary (13 techniques), each with 1-2 secondary tags, 5 mcq options with `why` per distractor, 3-4 rubric lines (weights sum 4 or 6, pass 3 or 4), `check` expression on all 26. Difficulty 2-3. Items file now 143 items.
- Checker: `tools/check_items.py` extended minimally: tier c mcq needs exactly 5 options, 3-4 rubric lines, weight sum 4-6, `pass` in range, 2+ tags, and `check` is evaluated and compared to the correct option when it parses as a plain number or p/q (float tolerance 1e-9). Other options (surds) only run the `check`. Result: `OK 143 items`.
- Validator: `node tools/validate_pack.js packs/gre-math` returned `OK gre-math: 10 levels, 140 techniques, 143 items`. No tier c rejection.
- Blind solve: independent numeric re-solves (numpy roots / linear solves / bisection / brute force) with keys hidden, matched against option values: 26/26 agree (item 18 matched at grid tolerance 1e-2, value 3-sqrt6).
- Least sure:
  - t1-f018: sum over piecewise branches with a surd answer; options with surds not auto-compared to `check` beyond running it, and "3" distractor needs the reader to notice sqrt6 > 2.
  - t1-f026: two-configuration chord casework; prompt says "sum of all possible distances", unusual GRE phrasing though unambiguous.
  - t1-f022: parity bookkeeping with h(2) = 2f(0) - g(-2) + g(2); easy to mis-sign, and f(0)=1 is given only to keep the answer unique, so the item may read as artificial.

## Batch 2 review (sonnet-5.5)

- Method: blind-solved t1-f001..t1-f026 from prompt/options alone (key, solution, check hidden), then compared. Rubric lines and tags read against solutions and `techniques.json` afterwards.
- Agreement: 26/26 (100%) blind answer == key. No KEY WRONG, no ILL-POSED, no MY ERROR. Authored key positions cycle 2,0,4,1,3 but all items have `shuffle` true, so the card order is permuted at runtime.
- Author-flagged: t1-f018 (3-sqrt6; sqrt6 about 2.45 fails x<2, so only -sqrt6 and 3 count) confirmed. t1-f026 (5 and 12 from centre; 17 + 7 = 24; both configurations valid since 5 and 12 are below 13) confirmed, phrasing unambiguous. t1-f022 (h(2) = 2f(0) - g(-2) + g(2) = 2 - 3 - 3 = -4) confirmed; f(0)=1 is needed, f(2)=5 is a legitimate distractor.
- Rubric vs solution: all 26 rubric lines match the solution's actual steps; weights sum to total, pass reachable.
- Tier c purpose (needs 2+ techniques), marginal, left as-is: t1-f003 (one 3-variable linear system; lin-eq secondary is incidental), t1-f002 (mixture solved by one equation; sys-eq secondary thin), t1-f005 (discriminant only; factor is incidental), t1-f026 (no coordinates used; coord-geom secondary is a stretch). The other 22 use two distinct moves, e.g. Vieta (t1.factor) with rational-expr, extraneous-root checks, parity with shifts.
- Changed items: none.
- Checks: `python3 -I tools/check_items.py` OK 143 items; `node tools/validate_pack.js packs/gre-math` OK.

## T3 review (sonnet-5.5)

- Scope: 126 items in `T3.ab.json` (28 recall mcq, 14 recall numeric, 71 micro numeric, 10 micro expression, 3 micro multi), 28 full items in `T3.c.json`, 14 teach cards in `T3.teach.json`.
- Method: solved blind (key, solution, check hidden) in batches, then compared. Rubrics, tags and solutions read after.
- Agreement: `T3.ab.json` 125/126 first pass (99.2%); the single miss, t3-0053, was MY ERROR (sign slip: 2x+cos x equals 1 at 0, key 4 is right). `T3.c.json` 28/28 (100%). No KEY WRONG, no ILL-POSED.
- Author-flagged: t3-0021 (only option 0 defensible), t3-0082 (0*1 is not indeterminate, option 0 only), t3-0098 (-x*v/y, domain fine), t3-0081 (0.509678 = 3e/16), t3-0027 (x-1, fine); t3-f028 (see below), t3-f026 (38: f''=12(x-1)(x-3), sign change at both roots, f(1)=11, f(3)=27), t3-f018 (2, confirmed).
- Expression items: all 10 `value` and `also` forms pass `check` (ok:true); a wrong form is rejected. Domains [0.3,2.7] admit no wrong-but-equal answer and exclude no natural domain (x=1 in t3-0043 is skipped as non-finite).
- Probes: exactly one per technique in CURRICULUM section 4 for T3 (limit-algebra t3-0004, deriv-rules t3-0040, chain-rule t3-0049, implicit t3-0067, optimize t3-0103, mvt-rolle t3-0121); all tier b numeric.
- No forbidden KaTeX fonts (mathfrak/scr/sf/tt/boldsymbol) in any T3 file.

| id | class | change |
|---|---|---|
| t3-0084 | two defensible MCQ options | option 3 "differentiable and g'(a)!=0" read as a plausible required condition; replaced by "f and g are polynomials" (clearly wrong). Key 0 unchanged. |
| t3-0094 | micro prompt length | 3 sentences merged to 2 (ladder prompt). Key -3/2 unchanged. |
| t3-f028 | full item gave away the technique | prompt stated "so f(3)=0 and f'(2)=0", leaving nothing for mvt-rolle. Now asks for f(1) given only that Rolle applies on [0,3] with point c=2; solution already derives both conditions. Key 0 (-2) unchanged. |

Left as-is:
- Full items: pass is 3 of weight 4 (75%) for all 28, accepted as roughly 70%. Secondary techniques thin but not empty in t3-f010 (func-basics incidental), t3-f027 (abs-ineq only restates the slope bounds), t3-f025 (primary curve-shape, the work is closed-interval optimize; tags kept). All others use two distinct moves.
- Micro prompts t3-0076, 0079, 0081, 0095, 0099 count 3 sentences only because of a trailing "Give a decimal to N places." instruction.
- Teach cards: all 14 at or under 80 words (curve-shape exactly 80), each states the move and a trap; no errors found; no edits.

Checks: `check_items.py --batch=T3.ab.json` OK 126 items; `--batch=T3.c.json` OK 28 items.

## T2 review (sonnet-5.5)

Blind solve of all 117 ab items and 26 full items, then compared with keys. Teach cards (13) read for errors and length. Probes checked against CURRICULUM section 4.

| File | Items | Key agreement (blind) |
|---|---|---|
| T2.ab.json | 117 | 117/117 (100%) |
| T2.c.json | 26 | 26/26 (100%) |

Author-flagged ids checked: t2-0032 (closed interval, 5 intercepts, correct), t2-0117 (2 base cases), t2-0110 (3), t2-0025 (`k*pi`, `also` has `pi*k`), t2-0101 (key right, wording tightened), t2-f024 (key 2 correct, rubric fixed), t2-f012 (key sum of roots 8*sqrt3, discriminant 36, correct), t2-f017 (key 26 correct, d=-21 gives 27,9,3).

### Changed items

| id | class | change |
|---|---|---|
| t2-0057 | ill-posed | prompt now "For $x>0$": log10(x^2) = 2 log10 x only for x>0 |
| t2-0101 | wording | "a single example" replaced by "a single example $x_0$ with $P(x_0)$ true" |
| t2-0116 | prompt length | 3 sentences cut to 2, same answer 585 |
| t2-f001 | distractor note | why[3] described the wrong error; now quadrant I signs, giving -1/2 |
| t2-f002 | distractor note | why[2] and why[3] were swapped and wrong; fixed to match 22/25 and -8/25 |
| t2-f004 | distractor note, rubric | why[2] (-1/5) did not match its text; rubric line 1 now matches the tan-formula solution |
| t2-f022 | distractor note | why[] was misaligned with the options; rewritten per option |
| t2-f024 | rubric | pass was 3 of 4 (75%); now 4 lines, total 5, pass 3.5 (70%) |
| t2-f026 | duplicate | same question as micro t2-0114 (2^n>n^3, answer 10); changed to 3^n>n^4, answer 8, options, why, solution, rubric, check updated |

### Left as is
- t2-f018: second technique (lin-eq) is thin; the problem is essentially one geometric series. Kept.
- t2-0088: non-integer sample points accept any form equal as a polynomial; fine because `also` lists the expanded forms.
- Probes: exactly one per technique in the T2 list (unit-circle t2-0005, trig-id t2-0013, exp-log t2-0059, seq-series t2-0077, induction t2-0113); all tier b numeric.
- Teach cards: all 13 at most 71 words, each states move and trap; no errors, no edits.
- No MCQ with two defensible options, no distractor equal to key, no non-core LaTeX font (validator passes).

Checks: `check_items.py --batch=T2.ab.json` OK 117 items; `--batch=T2.c.json` OK 26 items; all 41 expression forms (value plus `also`) check ok:true.
