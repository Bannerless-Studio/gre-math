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
