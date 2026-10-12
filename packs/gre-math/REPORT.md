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

## T4 review (sonnet-5.5)

Blind-solve of every item, then compared to the key.

| File | Items | Key agreement (blind) |
|---|---|---|
| T4.ab.json | 144 (48 recall, 96 micro) | 144/144 (100%) |
| T4.c.json | 32 | 32/32 (100%) |
| T4.teach.json | 16 cards | no errors; all at most 65 words |

Author-flagged ids checked: t4-0030 (key 2 correct, others fail), t4-0102 (limit comparison, key right), t4-0018 (key [0,1] correct; u=sqrt(1+x^2) works, x dm = u du), t4-0054 (key [0,3] correct), t4-0081 (key [0,1] correct), t4-f024 (key 0<c<e correct, c=e diverges since terms ~ sqrt(2 pi n)), t4-f026 (2 conditional: I and II), t4-f012 (key 2 ln(3/4)+3/2 correct, A=-2 B=3 C=2), t4-f031 (key 2pi/3 - sqrt3/2 re-derived, correct).

### Changed items

| id | class | change |
|---|---|---|
| t4-0007, t4-0027, t4-0051 | ill-posed (constant of integration) | "an antiderivative" accepted only C=0 under sample equality. Prompts now fix the constant: tends to 0 at infinity (0007, 0051), F(0)=1 (0027). Keys unchanged; solution gains one sentence. Verified +1 variants now rejected. |
| t4-0107 | domain | key abs(x) but domain [0.3,2.7] accepted plain x. Domain now [-2.7,2.7]; x rejected. |
| t4-0015, 0025, 0033, 0036, 0042, 0045, 0061, 0098, 0115 | domain (natural domain excluded) | expression domains widened to include negatives where the function is defined there (0036 to [-1.2,1.2], 0045 and 0115 to [-0.8,0.8], rest [-2.7,2.7]). All value and also forms re-checked ok:true. |
| t4-0018, 0054, 0063, 0090, 0108, 0117, 0135, 0144 | solution refers to shuffled options by position | solutions cited "Option 1", "first", "third", "last" while options shuffle. Rewritten to cite the content. |
| t4-f002 | distractor note | why[4] called the correct step (-2x^-2 to +2x^-1) the error; now "-2x^-2 as -2x^-1", which gives 12. |
| t4-f008 | distractor note | why[1] garbled; now "kept 1/2 instead of 1/4 in front of sin^2 2x" (gives pi/4). |
| t4-f023 | distractor note | why[4] was incoherent; rewritten. |
| t4.trig-sub teach | teach card | trap named only the sine dx; now general with the sine case in brackets. |

### Left as is
- Pass ratio: 3 of 4 (75%) on 22 full items, 4 of 6 (67%) on 10; integer weights cannot hit 70% exactly. Within 5 points either way, kept.
- t4-f025 and t4-f005: secondary techniques are thin (alt-series is the whole problem; by-parts dominates f005). Kept, as for T2 f018.
- t4-0102: direct comparison also works, but it is not offered, so one defensible option.
- Probes: exactly one per technique in the T4 list (u-sub t4-0017, by-parts t4-0022, partial-frac t4-0049, improper-int t4-0067, series-tests t4-0103, taylor t4-0130); all tier b numeric.
- No MCQ with two defensible options, no distractor equal to key, no micro prompt over 2 sentences, no non-core LaTeX font (all 1888 math spans render under KaTeX strict).

Checks: `check_items.py --batch=T4.ab.json` OK 144 items; `--batch=T4.c.json` OK 32 items; all 38 expression forms (value plus also) check ok:true.

## T5 review (sonnet-5.5)

Counts: ab 126 items (28 recall mcq/numeric/expression, 98 micro), c 28 full, teach 14 cards. Probes: 6 (partials, gradient, lagrange, double-int, line-int, green), all tier b numeric, one per CURRICULUM §4 T5 technique. MCQ/multi `shuffle` defaults to true in engine/core.js (confirmed).

Blind-solve agreement: ab 126/126 keys agree (0 key errors); c 28/28 agree. Author-flagged ids (t5-0033, 0050, 0054, 0063, 0080; f004, f012, f028) all correct and well-posed. Full items: each uses at least 2 techniques; rubrics follow solution steps; pass 3.5 of 5 (70%) on all 28.

| id | class | change |
|---|---|---|
| t5-0044 | ill-posed (D_v with non-unit v ambiguous: -14 vs -7) | prompt now asks for derivative "in the direction of v"; key -7 unchanged |
| t5-0061 | ill-posed (lambda sign depends on convention) | prompt states "Using grad f = lambda grad g"; key 4 unchanged |
| t5-0090 | two defensible options | option 3 changed to upper limit 1-x on dz (value 1/3, was 1/6 = tetrahedron volume); key [0,2] unchanged |
| teach lines-planes | ambiguous symbol d | trap clarifies plane constant d vs normal |
| teach mv-extrema | unclear trap | trap now says check boundary of closed region |
| teach lagrange | inaccurate claim (boundary of non-closed set) | now "finds the extremes when constraint set is closed and bounded" |
| teach triple-int | convoluted trap | rewritten: inner bound using a variable not yet fixed |
| teach line-int | example missing path | added "from (0,0) to (1,1)" |
| teach green | example clarity | integral shown as 2*1=2 |

Left as is: t5-0003 (angle domain [0.3,2.7] keeps sin>0, abs(sin) form equal but natural); t5-0045 option 3 true by definition of critical point for differentiable f; t5-0048 D=0 (asks only for D); f008 second tag t3.related-rates is light (check step) but acceptable; f013 second tag t5.partials is light; f001 trig-id tag is the Lagrange identity step. No LaTeX outside KaTeX core; no micro prompt over 2 sentences. Teach cards all <= 80 words.

Checkers: `check_items.py --batch=T5.ab.json` OK 126 items; `--batch=T5.c.json` OK 28 items; expression value + also forms via engine/answer.js check: 54 forms, 0 failures.

## T6 review (sonnet-5.5)

| File | Items | Key agreement (blind) |
|---|---|---|
| T6.ab.json | 135 (45 recall, 90 micro) | 135/135 (100%) |
| T6.c.json | 30 | 30/30 (100%) |

Author-flagged ids checked: t6-0076 (c1=2, correct), t6-0079 (similar to diag(1,2): options 0,1,2; the upper triangular one has distinct eigenvalues), t6-0099 (char poly (x-2)^2, eigenspace dim 1), t6-0107 (options 0 and 3 only), t6-0125 (A11=1), t6-f028 (|k|<=2 gives 5), t6-f020 (k=-10..-2 gives 9), t6-f014 (max rank 4, blocks 3,3,1). All keys correct. All distractor why-notes in the 30 full items recomputed; each numeric claim checked.

### Changed items

| id | class | change |
|---|---|---|
| t6-0084 | ill-posed | "Which is an eigenvalue" made option "2 only" defensible-looking; prompt now "Which lists all the eigenvalues" |
| t6-0073 | distractor note | congruence note said P must be orthogonal; now "matches similarity only when P is orthogonal" |
| t6-f003 | distractor note | why[1] and why[4] described errors that do not give 6 and 9; rewritten (set m-2=0 instead of m-4=0; used unreduced constant 3) |
| t6-f006 | distractor note | why for 89 and 233 claimed recurrence slips that do not produce them; now Fibonacci mis-indexing (F11, F13 vs D5=F12) |
| t6-f024 | distractor note | -27 is (0-3)^3, note now says (x-3)^3 leaving out eigenvalue 5 |
| t6-f027 | distractor note | "averaged the eigenvalues" gives 2 not 3; now Q at unit vector (1,1,0)/sqrt2, which violates the constraint |

### Left as is
- t6-f010: techniques logic-sets and proof-methods are thin; the item is essentially one vector-spaces check, five times. Kept.
- t6-f025: determinant tag is only a cross-check in the solution, not a required step. Kept.
- t6-0047: option "no vector is a multiple of another" is wrong only for three or more vectors; stem not restricted, key unambiguous. Kept.
- All 30 full items: total weight 5, pass 3.5 (70%). Rubric lines match solution steps.
- Probes: one per technique in the T6 list (gauss t6-0013, determinant t6-0022, rank-nullity t6-0058, eigen-2x2 t6-0085, diagonalize t6-0094, spectral t6-0121); all tier b numeric.
- Teach cards: all 15 at most 70 words, each states move and trap; no errors, no edits.
- No micro prompt over 2 sentences, no non-core LaTeX font, no distractor equal to key.

Checks: `check_items.py --batch=T6.ab.json` OK 135 items; `--batch=T6.c.json` OK 30 items; all 45 expression forms (value plus `also`) check ok:true.

## T7 review (sonnet-5.5)

| File | Items | Key agreement (blind) |
|---|---|---|
| T7.ab.json | 144 (48 recall, 96 micro) | 144/144 (100%) |
| T7.c.json | 32 | 32/32 (100%) |

Every countable claim was recomputed by brute force in Python (gcd/lcm counts, Z_n orders and subgroup counts, Z_n^x orders, S_n/A_n cycle counts and orders, D_n involutions and conjugacy classes, S_3 normal subgroups and cosets, Sylow-3 count in S_4, abelian partition counts, nilpotents in Z_72, ring homomorphisms Z_12 to Z_18, monic irreducibles over F_2 and F_5, F_81 generators via an explicit F_81 construction, all 4-element group tables with fixed identity). All matched the keys. Author-flagged ids checked: t7-0051 (8 divisors of 24, key right; wording ambiguous), t7-0080 (2), t7-0029 (1), t7-0140 (3), t7-0096 (2, literal-free check re-run), t7-f028 (2 PIDs: Z[i], Q[x]), t7-f018 (|HK|=72; configuration exists, e.g. Z4xZ2xZ9), t7-f031 (degree 6). Also checked the literal checks t7-0074, 0076, 0085, 0087, 0103, f014.

### Changed items

| id | class | change |
|---|---|---|
| t7-0051 | ill-posed | "how many values can the order take" could read as one group's subgroup orders; now "How many positive integers does Lagrange's theorem allow as the order of a subgroup of a group of order 24" |
| t7-0129 | ill-posed | "when is a cubic reducible" had several sufficient options; now "reducible exactly when which condition holds" |
| t7-f004 | rubric mismatch | rubric said x=2+5k and variables k, m; solution starts from x=4+9a with a, b; rubric now matches |
| t7-f009 | distractor note | "4" was said to count divisors of 12 (that is 6); now divisors of 6 |
| t7-f014 | distractor note | "40" note spoke of 2-cycle orientations; now "doubled again for the 2-cycle" |
| t7-f019 | distractor note | "3" was said to count elements of order 3 (that is 2); now maps with image of order dividing 3 |
| t7-f021 | distractor note | "4" said to count prime factors of 720; now the exponent 4 of the 2-part |
| t7-f028 | distractor note | "5" note blamed UFD/PID confusion although Z[sqrt-5] is no UFD; now "counted every ring in the list" |
| t7-f029 | distractor note | "20" was said to count reducible ones (15); now 25 minus the five squares. "5" was said to count irreducibles with zero linear term (2); now counts monic quadratics with zero linear term |

### Left as is
- t7-f018: second tag nt-gcd is only a sanity check (intersection order divides gcd). Essentially one technique (cosets-normal product formula). Kept.
- All 32 full items: total weight 4, pass 3 (75%). Same 4/3 convention as T3 and T4; cannot reach 70% with integer weights on 2/1/1. Rubric lines otherwise match solutions.
- t7-0052 prompt has three short sentences, the third is "Select all that apply". Kept.
- t7-0129 options 0 and 3 stay as distractors; with the new wording only the root criterion is necessary and sufficient.
- Probes: one per technique in the T7 list (nt-mod t7-0013, order-lagrange t7-0049, perm-groups t7-0058, quotient-hom t7-0085, sylow-action t7-0103, poly-irred t7-0130); all tier b numeric.
- Teach cards: all 16 at most 72 words (math counted as words), each states move and trap; examples recomputed; no edits.
- No distractor equals the key, no non-core LaTeX font, expression domains admit no wrong-but-sample-equal answer (all 17 expression items are polynomial or rational identities).

Checks: `check_items.py --batch=T7.ab.json` OK 144 items; `--batch=T7.c.json` OK 32 items; all 38 expression forms (value plus `also`) check ok:true.

## T8 review (sonnet-5.5)

| File | Items | Key agreement (blind) |
|---|---|---|
| T8.ab.json | 135 (45 recall, 90 micro) | 135/135 (100%) |
| T8.c.json | 30 | 30/30 (100%) |
| T8.teach.json | 15 cards | 3 edited |

Every multi-select statement was justified individually (theorem or counterexample) before comparing with the key. Author-flagged ids t8-0071, 0043, 0052, 0125, 0134 all match. Full items f007, f018 (rubric partial sum recomputed: H_4m - H_2m/2 - H_m/2 gives (3/2)ln2), f028 (five countable sets) and the 16 proof-type items all match their keys.

### Changed items

| id | class | change |
|---|---|---|
| t8-0028 | ill-posed | "which delta works" (any smaller works) now "the largest delta" |
| t8-0031 | ill-posed | "the delta this bound yields" now "largest delta <= 1 for which the bound guarantees < 0.3" |
| t8-0033 | ill-posed | "a delta" (expression, smaller ones valid) now "the largest delta", with a > 0 so t/abs(a) equals t/a on the domain |
| t8-0045 | ill-posed | "the Lipschitz constant" now "the least Lipschitz constant" |
| t8-0065 | two defensible options | "All functions with a derivative" is integrable (differentiable implies continuous); now "All bounded functions" |
| t8-0102 | solution wording | "no connecting path" conflated path-connected and connected; now separation wording |
| t8-0129 | ill-posed | x sin(1/x) and x^2 sin(1/x) undefined at 0; prompt now fixes f(0)=0 |
| t8-f005 | rubric mismatch | "last two have no limit" pointed at the wrong options; now names (-1)^n and sin n |
| t8-f017 | positional reference | solution and rubric cited options by position ("first", "Fourth", "last"); options shuffle, now named by formula |
| teach cardinality | missing dependency | added algebraic numbers countable and monotone jumps countable (used by 0125, f027, f028); 69 words, math counted |
| teach riemann | missing dependency | added "countable sets have measure zero" (used by 0071, f015); 70 words |
| teach compact-conn | missing dependency | added open-cover definition (used by f026); 60 words |

### Left as is
- All 30 full items: total weight 4, pass 3 (75%), same convention as T3 to T7.
- t8-f025 and f021 lean on one technique with a thin secondary; kept.
- Probes: one per CURRICULUM list technique (seq-conv 0013, cont-eps 0031, unif-conv 0085, metric-open 0094, compact-conn 0104, cardinality 0121); all tier b numeric.
- No distractor equals key, all LaTeX is KaTeX core, expression domains admit no wrong-but-sample-equal answer, every `why` array aligns with its options.

Checks: `check_items.py --batch=T8.ab.json` OK 135 items; `--batch=T8.c.json` OK 30 items; all 36 expression forms (value plus `also`) ok:true.

## T9 review (sonnet-5.5)

Counts: `T9.ab.json` 171 items (57 recall, 114 micro; 104 numeric, 40 mcq, 14 multi, 13 expression), `T9.c.json` 38 full, `T9.teach.json` 19 cards.

Blind-solve agreement (key vs my independent answer; countable and probabilistic claims brute-forced by script: MISSISSIPPI gaps, stars-and-bars with bounds, onto functions, no-111 strings, C5 colorings, loop counts, Euler-circuit edge deletion; Simpson, Newton, residue and eigenvalue items recomputed by hand):

| file | items | agree | rate |
|---|---|---|---|
| T9.ab | 171 (13 expression items checked by hand and by `engine/answer.js`) | 171 | 100% |
| T9.c | 38 | 38 | 100% |
| T9.teach | 19 cards | no errors found | n/a |

No wrong keys. All defects were wording, distractor or domain issues.

Changed items (`T9.ab.json`; ids kept):

| id | class | change |
|---|---|---|
| t9-0011 | distractor true | "no more than $n$ objects" was a true statement (author's own why said so); replaced by "at least $n$ objects" (false for $n\ge3$) |
| t9-0018 | trivial option, solution wording | option "There are 11 pigeons" restated the prompt; replaced by "Some hole holds at most one pigeon" (guaranteed, since $11<20$). Key `[0,4]` unchanged. Solution rewritten (old text was garbled) |
| t9-0089 | convention | prompt now states symmetric about center, finite mean, single mode (Cauchy has no mean; flat-top shapes have no unique mode). Key unchanged. Solution covers the shift option |
| t9-0099 | notation hazard | option "$2\sqrt{-1}$" depends on the $\sqrt{-1}=i$ convention; replaced by "$2e^{i\pi/2}$" (still equal to $2i$, key unchanged) |
| t9-0080 | expression domain | sampling domain $[0.3,2.7]$ left the stated range $0\le x\le1$ (true $F$ is 1 beyond it); domain now $[0.1,0.95]$ |
| t9-0004, 0054, 0063, 0139, 0140 | micro prompt length | 3-sentence prompts merged to 2 sentences, content unchanged |

Checks: `python3 -I tools/check_items.py --batch=.../T9.ab.json` gives `OK 171 items`; `.../T9.c.json` gives `OK 38 items`. Every expression `value` and `also` form in T9.ab passes `check(spec, form)` with ok:true (13 items, 35 forms); `value+0.001` is rejected for all.

Left as is:
- Probes: exactly one `probe: true` per list technique (counting t9-0004, prob-basics t9-0058, rand-var t9-0067, complex-arith t9-0094, ode-linear t9-0139); all tier b, micro, numeric.
- Full items: rubric lines match solution steps in all 38. `pass` is 3 of 4 (75%) or 4 of 5 (80%); no integer weights give exactly 70% at those totals, left alone. Distractor `why` fields spot-verified numerically for f001 to f006, f013, f020, f022, f027 (each wrong option maps to the stated mistake).
- Borderline two-technique items kept: t9-f007 (handshake plus tree edge count plus one linear equation), t9-f011 (binary search plus log floor). Both still need the second step to reach the key.
- t9-f017, f021 to f027 (except f024), f030 to f032, f034, f037, f038 have `check: null`; accepted by the checker, keys verified by hand here.
- Author-flagged items checked and correct: t9-0099 (reworded), 0162 ($\{0,1,3\}$: Euler global error is $O(h)$, left-endpoint $O(h)$), 0048 (10), 0089 (reworded), 0043 (1; $K_{3,3}$ minus an edge is planar), f034 (period $\pi\sqrt2$), f024 ($a=-3$, $v(1,1)=3$), f011 (10).
- Teach cards: all 19 are at most 70 words, each states a move and a trap, no mathematical errors found; no edits.
