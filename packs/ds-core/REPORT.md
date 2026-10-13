# ds-core content report

## Skeleton (2026-10-13)
- `CURRICULUM.md`, `pack.json`, `techniques.json` (138 techniques, T1-T10), `attribution.json` written. `items.json` is `[]`; no batches yet.
- `teach` cards: `TODO: teach card` for T1-T9, written for T10.
- Anchor: composite of NYU MS Data Science and Edinburgh MSc Data Science (Informatics) course structures; see CURRICULUM section 1 for URLs, fetch date and the course-to-tier mapping.
- Code items: not authored; wait for the engine `code` answer kind (shape in CURRICULUM section 5).
- Not verified: current-year course availability at either school; Edinburgh page gave area names only.

## T1 review (sonnet-5.5)
Blind-solved all 154 items (126 in `T1.ab.json`, 28 in `T1.c.json`), then compared with the key. Reviewed 14 teach cards and the 5 probes.

| File | Items | Key agreed on first compare | Key wrong | Ill-posed | My error |
|---|---|---|---|---|---|
| T1.ab.json | 126 | 125 (99%) | 0 | 0 (t1-0008 agreed but was convention-ambiguous, see below) | 1 (t1-0068, arithmetic slip, key 13 confirmed) |
| T1.c.json | 28 | 28 (100%) | 0 | 0 | 0 |

Every expression `value` and `also` form passes `engine/answer.js` check. 3 plausible wrong forms per expression item (27 items) were run through the engine; none accepted.

### Changed items
| id | class | change |
|---|---|---|
| t1-0008 | convention ambiguity | "15 study French and German" could mean exactly two or at least two. Prompt now says pair counts include those studying all three. Key 3 unchanged. |
| t1-0072 | tolerance does the work | Wrong answer 500 x 0.02 = 10 was within 2% of key 9.90. Base changed 1.02 to 1.1, key 47.66 (full precision); wrong 50 now rejected. |
| t1-0084 | obvious by inspection | `x^3` replaced by `x^4-2x^2` (key 3, difficulty 2, solution rewritten). |
| t1-0107 | multi with one correct option | Option 2 now `2u+v-u`, correct = [0,1]; solution rewritten. |
| t1-0124 | small difference, 2% tolerance | Key is a 0.0047 difference. Now `tol` 5e-5, `rel` 0, prompt says 4 decimal places. 0.005 and 0.0046 rejected. |
| t1-f009 | pass weight | pass 4 of 5 (80%) set to 3.5 (70%). All other full items are 3 of 4 (75%), left. |
| t1-f014 | small difference, 2% tolerance | Estimating 2 orders of magnitude (3.10) was accepted by 2%. Now `tol` 0.01, `rel` 0, prompt says 2 decimal places. 3.10, 3.15, 2.94 rejected. |
| t1-f027 | tolerance 0.005 without stated precision | Exact change 0.1464 sat 2.4% from tangent 0.15. Step changed 2000 to 2100 becomes 2000 to 2400: tangent 0.6 vs exact 0.547, default `rel` 0.02. Prompt, rubric, solution, hint, check updated. |

### Left as is
- Probes: exactly one `probe: true` each on sets (t1-0004), exp-log (t1-0049), derivative (t1-0067), critical-points (t1-0085), dot-norm (t1-0112). All tier b numeric.
- Teach cards: all 14 are under 80 words, each has a move and a trap, no errors found. No edits.
- t1-0025, t1-0052, t1-0066: prompts ask for a simplified form, but the engine checks equivalence, so a verbatim unsimplified answer such as `abs(x-3)` is accepted. Engine limit, not fixable per item. Mild self-harm only.
- t1-f008: arithmetic-mean trap 1.25 is 3.4% above key 1.2094, so 2% rejects it. Margin is thin but works.
- t1-f024: second technique (sigma) is a stretch; the item is mostly linear systems. Kept.
- t1-f002: sigma is thin, mostly set partition plus algebra. Kept.
- Numeric keys are full precision. MCQ numeric options all more than 2% apart (f010 13.39 vs 12.99 is 3%).
- LaTeX commands in both files are all KaTeX core.
- No item references another item.

## T2 review (sonnet-5.5)

Counts: `T2.ab.json` 135 (45 recall, 90 micro), `T2.c.json` 30, `T2.teach.json` 15 cards. Method: blind independent solve of every item, then compared with the key.

| File | Items | Key agreement |
|---|---|---|
| T2.ab.json | 135 | 135/135 (100%) |
| T2.c.json | 30 | 30/30 (100%) |
| T2.teach.json | 15 | no errors found; all under 80 words, move and trap present |

Changed items:

| id | class | change |
|---|---|---|
| t2-0108 | convention ambiguity (rule vs exact tail) | tolerance `rel` 0.02 to 0.1 so 0.025 and exact 0.0228 both pass; prompt and solution say so; 0.05, 0.16, 0.0013 still fail |
| t2-0132 | convention ambiguity (rule vs exact tail) | same change as t2-0108 |
| t2-0129 | "sharpest bound" wording | Cantelli gives 1/17, below Chebyshev 1/16, so "sharpest valid" was false. Prompt now names Markov and Chebyshev and asks for the smaller of the two |
| t2-0033 | expression variable names | prompt now says to type the sigmas as s1 and s2 (variables are s1, s2) |

Left as is:
- t2-0099: hypergeometric 0.2743 confirmed; distractors are single wrong moves, none within 2% of the key.
- t2-0050, t2-0073: multi keys confirmed (0,1,2,4 and 0,1), each with more than one correct option.
- t2-0110 (0.16 vs exact 0.1587) sits inside the 2% tolerance, so both pass.
- t2-f030: prompt states the CLT and no continuity correction; key 0.683 is the CLT value.
- t2-f010: one core idea (Z is determined by X and Y), second technique is light. Kept as a pairwise vs mutual independence item.
- t2-f003, t2-f016: second technique is weak (sets and expectation). Kept.
- Full items: `pass` is 0.70 or 0.75 of total weight (totals 4 or 5, half-point steps), not exactly 70%.
- Probes: 5 flagged, one each for bayes (t2-0064), expectation (t2-0082), discrete-dists (t2-0094), normal (t2-0106), lln-clt (t2-0130); all tier b numeric.
- Expression items: all 50 forms (values and `also`) pass the engine checker; no wrong-but-equal forms found. Prompts using Greek letters (lam, sigma) rely on the spelling convention.

## T3 review (sonnet-5.5)

Blind-solved all 135 ab items and 30 full items (python/scipy, exact formulas); compared with keys afterwards. Reviewed 15 teach cards.

| File | Items | Key agrees with blind solve | Well-posed as written |
|---|---|---|---|
| T3.ab.json | 135 | 135/135 (100%) | 130/135 (5 ill-posed, below) |
| T3.c.json | 30 | 30/30 (100%) | 30/30 |
| T3.teach.json | 15 | 15 cards, 2 content fixes | n/a |

Checker: `OK 135 items` (ab), `OK 30 items` (c). All 17 expression items: `value` and every `also` form ok:true via `engine/answer.js`; 30 plausible wrong forms tested, none pass.

### Changed items

| id | class | change |
|---|---|---|
| t3-0092 | ILL-POSED (one- vs two-sample) | prompt said "per group" for the one-sample formula; now "one-sample z test", key unchanged |
| t3-0094 (probe) | ILL-POSED | "mean difference ... per group" keyed 50 (one-sample); prompt now a one-sample shift, rounded up to n, key 50 |
| t3-0095 | ILL-POSED | n=25 could be per group; now "one-sample", key unchanged |
| t3-0098 | ILL-POSED | keyed as one-sample while saying per group; prompt now two equal groups, key and solution changed 43 -> 85 (factor 2) |
| t3-0099 | ILL-POSED | now "one-sample", key unchanged |
| t3-0061 | contestable option | "population sd known exactly" is not clearly false for a t test; replaced by "the two groups have equal variances" (clearly false for one-sample); solution/hint updated |
| t3-0071 | contestable "condition" | p0 in SE is a procedure, not a condition; prompt now "Which statements ... are correct", options unchanged |
| t3-0067 | tolerance lets wrong move pass | using p-hat in SE gave 1.621 vs 1.6 (1.3%, inside 2%); numbers changed to p0=0.3, p-hat=0.4 (key 2.182, wrong move 2.041) |
| t3-0070 | tolerance lets wrong move pass | unpooled z 2.218 vs 2.191 (1.2%); rel tightened to 0.005 |
| t3-0124 | wrong move passes | slope and R^2 both 0.6 on the shared dataset; own dataset (1,3),(2,4),(3,4),(4,6),(5,8): R^2=0.9, slope 1.2 |
| t3-0117 | clumsy prompt | gave away the count; now states observed difference and asks for P(diff >= 2.5), solution lists the 6 differences, key 1/6 |
| t3-0115 | wording | "split into two groups" is 3 or 6; now "choose which two form group A" (6) |
| t3-0079 | convention | added "no continuity correction" |
| t3-0051 | cosmetic | "alpha" -> $\alpha$ |
| t3-f021 | rounding rule | prompt now "Round up to the next integer"; answer exact 99 (was decimal rel 0.004) |
| t3-f019 | form | exact (was decimal rel 0) |
| t3-f002, f003, f007, f009, f013, f015, f017, f025, f027 | rounded keys | reset to full precision from `check` |
| teach t3.power | error | formula was one-sample but labelled per group; now one-sample formula plus "two-group test needs twice that per group" (75 words) |
| teach t3.chisq | incomplete | goodness-of-fit df now "minus fitted parameters" (61 words) |

### Left as is
- t3-0039: options fine; wrong option 3 is weak but unambiguously false.
- t3-0134: options 0, 1, 3 true and 2 false under standard OLS inference assumptions; no change.
- t3-0006, 0009 etc: all other keys match blind solves; derived-from-given-Phi keys (0015, 0049, 0050, 0054, 0095) differ from exact values by <0.5%, inside tolerance.
- t3-0114 is near-trivial arithmetic (rank = 0.025 B) and several multi items are conceptual recall; kept, since they are not pure definition lookups.
- t3-f012 and t3-f020 both reduce to 1-0.95^k; different techniques (peeking vs multiple tests) so kept, but redundant in drill.
- Full items: all 30 need two or more techniques; every rubric matches its solution steps. `pass` is 3 of 4 (75%) for all 30; weights 2/1/1 cannot hit 70% exactly, so unchanged.
- t3-f016: continuity correction and p0-based SE are stated; key 1.59 holds.
- Probes: exactly one per T3 probe technique (ci 0040, hypothesis 0049, t-tests 0058, power 0094, ols-multi 0130); all tier b numeric.
- No `e` as a variable, no LaTeX beyond KaTeX core found. No MCQ with numeric options in T3.ab; f-file numeric MCQ options are >2% apart.

## T4 review (sonnet-5.5)

Counts: T4.ab 135 (45 recall, 90 micro), T4.c 30 full, T4.teach 15 cards. Blind solves in python/numpy plus hand derivation; the authors' `check` expressions were not trusted.

Agreement with key: T4.ab 135/135 (100%), T4.c 30/30 (100%). No key was wrong. Fixes are wording, convention and key-precision only.

### Changed items
| id | class | change |
|---|---|---|
| t4-0050 | prompt references other item | restated the three points |
| t4-0053 | prompt references other item | restated X and y |
| t4-0122 | prompt references other item | restated L, eta, w0 |
| t4-0087 | convention ambiguity | option 0 "X^T X/(n-1) is the sample covariance" (n vs n-1) -> "X^T X is proportional to the sample covariance" |
| t4-0100 | convention ambiguity | prompt states the gradient is a column vector (distractor a^T is a row) |
| t4-0126 | contestable option | option 3 (alternating signs) is false at w0 = 0; prompt now states w0 != 0 |
| t4-0120 | wording | removed dangling "Give the value." |
| t4-0041, 0088, 0112, f019 | rounded keys | 0.7071, 2.8284, 1.5858, 81.818 reset to full precision |
| t4-0029 | numeric-option MCQ, check null | check "5-3" added |
| t4-f010, f012, f014, f018, f020, f022, f030 | numeric-option MCQ, check null | independent check expressions added, matched to correct option |

### Left as is
- Flagged ids: 0045 (t declared in prompt; Y^2*sin(t)^2, Y^2*cos(t), Y*cos(t)^2 rejected), 0034 (rank 3 confirmed with numpy), 0079 (spectral norm stated; key sigma_2 = 2), 0025 (exactly one singular matrix), f020 (centring and divisor n-1 stated; key 8), f026 (only option 0 convex; others verified by Hessian), f008 (verified with a concrete rank-2 5x3 X: normal equations consistent, solution set a line), f005 (feature scale 2 gives Sigma' = 4 Sigma, det 512), f025 (a = 4 attained, PSD).
- All 18 expression items: value and every `also` pass engine/answer.js; 3 to 5 plausible wrong forms each (sign, dropped factor, wrong trig, swapped ratio) all rejected. Every typed variable appears in its prompt; no `e`; no domain issues.
- No numeric MCQ options within 2% of each other. LaTeX uses only KaTeX core commands.
- Tier a/b items 0026, 0035, 0072, 0078, 0090 lean on recall but need a small inference; kept.
- t4-f011 repeats the data of t4-0049/0050 (same fit); different tiers, kept but redundant in drill. t4-f002 and f024 lean toward a single technique; kept.
- Full items: all 30 carry 2+ tags and need them (f027 uses 3); rubrics match solution steps. `pass` is 3 of 4 (75%) for all 30; integer weights 2/1/1 cannot hit 70%, unchanged.
- Teach cards: 15, all 42 to 70 words, each states a move and a trap; formulas and examples re-derived, no errors, no edits.
- Probes: exactly one per technique in the T4 set (inverse-det 0022, eigen 0058, svd 0076, gradient 0094, grad-descent 0121); all tier b numeric.

### Checker
```
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T4.ab.json   -> OK 135 items
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T4.c.json    -> OK 30 items
engine/answer.js check(): value + all `also` forms ok:true for 18/18 expression items
```

## T5 review (sonnet-5.5)

Counts: T5.ab 126 items (42 recall, 84 micro), T5.c 28 full, T5.teach 14 cards. All 154 items solved blind and compared with the key.

Agreement: T5.ab 126/126 (100%), T5.c 28/28 (100%). No wrong key, no ill-posed item. Fixes below are wording, option and shape defects.

### Changed items
| id | class | change |
|---|---|---|
| t5-0091 | two defensible MCQ options | option 1 "Each cell holds one value and no more" is also a tidy-data rule; replaced by the false "Each cell may hold a list of several values" |
| t5-0081, t5-0099 | NULL shown in pandas output | option tables used NULL; now NaN, matching the prompt and the pandas convention |
| t5-0034, 0040, 0043, 0062, 0115, 0116, 0122, 0125, 0105, 0117 | micro prompt > 2 sentences | dropped the redundant "Give a count/value/sum" hint or merged sentences; conventions kept |
| t5-0120 | vague convention | "using the approximate value" now states log2(1000) = 9.97 approximately; key 9966 unchanged, within rel 0.02 |
| T5.teach (all 14) | old 40-80 word shape | rewritten to the v2 six-section shape; 127 to 156 words excluding math/code; examples use numbers unlike the drills |

### Left as is
- t5-0087, t5-0098 keep a third sentence starting "where ..." that defines the variable used by the code; needed.
- t5-f001 (second tag sql-select) and t5-f015 (second tag pandas-vector) lean on one technique; keys and rubrics correct, kept.
- Rubrics match solution steps for all 28 full items. `pass` is 3 of 4 (75%) for all; integer weights 2/1/1 cannot reach 70%, unchanged as in T1 to T4.
- No expression items, no figures, no code kind, no numeric MCQ options. LaTeX uses core fonts only (render errors 0).
- Conventions verified against PostgreSQL semantics: NULL sorts first on DESC (f004), SUM of all-NULL is NULL (f012), default RANGE frame includes peers (0062, f013), outer-merge and melt NaN handling (0087, f019, f021).
- Probes: exactly one per technique, all tier b numeric: sql-null 0023, sql-joins 0033, sql-window 0059, pandas-index 0068, tidy 0098.

### Checker
```
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T5.ab.json -> OK 126 items
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T5.c.json  -> OK 28 items
tools/render.js renderItem on all 154 items, renderText + glyphIssues on 14 cards: 0 errors
```

## Teach cards v2 review (T1–T4 and T10, sonnet-5.5)

Cards checked: 64 (T1 14, T2 15, T3 15, T4 15, T10 5). Every Example recomputed by hand and in python; Move formulas and conventions read against the technique's drills (tier a, b and c prompts). T10 has no drills, so its cards were judged on facts and shape only.

Result: 48 cards changed, 16 left as is. One factual slip, 35 teaching gaps, 21 example/drill overlaps, 1 shape fix (classes overlap, so counts do not sum to 48).

### Changed cards

| id | class | change |
|---|---|---|
| t1.sets | overlap | Example numbers changed (item 0005 used 45/30). |
| t1.derivative | overlap | Example moved from f'(3)=12-based to f'(4). |
| t1.functions | teaching | Added inverse method (drills ask for inverses). |
| t1.inequalities | teaching | Added quadratic inequality: roots, test each region. |
| t1.sigma | teaching | Added sum of cubes and shifted lower bound. |
| t1.deriv-rules | teaching | Added quotient rule (drill 0078). |
| t1.integral | teaching | Added power-rule antiderivative and area between curves. |
| t1.dot-norm | teaching | Added orthogonal = zero dot product. |
| t2.counting | teaching | Added ordered picks without repeats. |
| t2.axioms | overlap | Example changed to three dice rolls (drill used sum 7 or 11). |
| t2.bayes | overlap | Example priors/rates changed (drill used 1%, 90%, 5%). |
| t2.independence | overlap | Example was a verbatim drill option (even and at most 4); now heart and face card. |
| t2.discrete-rv | overlap | Mass values changed. |
| t2.expectation | teaching | Added E[g(X)] for a function (LOTUS). |
| t2.discrete-dists | teaching, overlap | Poisson pmf added to Move; hypergeometric form and Bernoulli added; Example p changed. Author flag confirmed. |
| t2.pdf-cdf | teaching | Added E[X] from a density (drill 0103). |
| t2.normal | overlap | Example now z=3 (drill 0108 used 130 on N(100,15²) and 0.025). |
| t2.cont-dists | teaching, overlap | Added Gamma mean and exponential median; removed unsupported "proportion"; window 20 → 30. |
| t2.joint-cov | overlap | Example had the drill's Var 4, Var 9; now 25, 36. |
| t2.lln-clt | teaching, overlap | Added proportion SE; Example numbers changed (n=36/20 appeared in drills). |
| t3.descriptive | teaching | Quartile method (median of each half) and z-score added. |
| t3.sampling | teaching | Standardise step for P(x̄ > c). |
| t3.estimators | teaching | Author flag confirmed: MSE was never worked. Example now compares x̄ with 0.8x̄ and computes both MSEs; variance of the mean added. |
| t3.mle | teaching, overlap | Normal MLE added to known results. Example (exponential) was drill 0035 itself; now geometric. |
| t3.ci | teaching | Proportion standard error added. |
| t3.hypothesis | teaching | How to compute power from a cutoff, and one-sided p. |
| t3.t-tests | teaching | Pooled two-sample t and s_p² shown. |
| t3.proportions | shape | Inline pooled-SE formula moved to display. |
| t3.chisq | teaching, overlap | Author flag confirmed: df now loses one per fitted parameter; symbols named; Example changed (60/40 coin was a drill). |
| t3.multiple | teaching, overlap | Benjamini-Hochberg rule, adjusted p, expected false positives added; Example α/m changed. |
| t3.power | teaching | Power from n and minimum detectable shift added. |
| t3.ab-design | teaching, overlap | z for a difference in means added; Example now worked to a z. |
| t3.bootstrap | teaching | Permutation test counting and p-value. |
| t3.ols-simple | teaching | b = r·s_y/s_x and R² from sums. |
| t4.matrix-ops | teaching | Transpose and trace defined (drills use both). |
| t4.inverse-det | teaching | 3×3 determinant expansion (drill 0024). |
| t4.projection | teaching | Orthonormality and Gram-Schmidt (drill 0043). |
| t4.normal-eq | teaching, overlap | Example now an intercept fit (drills fit a+bx); first draft reused the ridge item's data and was changed. |
| t4.eigen | overlap | Example matrix was drill 0059 verbatim; changed. |
| t4.spectral | teaching, overlap | Example matrix was drill 0071; changed; unit-vector range of the form added. |
| t4.svd | teaching, overlap | Frobenius norm, rank-k error; Example now a non-diagonal matrix with a Frobenius check. |
| t4.pca | teaching | Author flag confirmed: n vs n−1 explained (shares unchanged); scores and reconstruction added; unit eigenvector. |
| t4.gradient | teaching | Directional derivative and its maximum. |
| t4.matrix-calc | teaching | Gradient of wᵀAw and Jacobian of Aw (drills 0104, 0108). |
| t4.convexity | overlap | Example was drill 0116 verbatim; changed. |
| t4.lagrange | overlap | Example was drill 0131 verbatim; changed. |
| t10.case-framing | factual | Target line said "observable when the action is taken"; a churn label is known only after the wait. |
| t10.model-selection | teaching | Compare candidates on the same validation folds. |

### Left as is

t1.geom-series, t1.exp-log, t1.log-scale, t1.critical-points, t1.vectors, t1.linear-approx, t2.conditional, t2.variance, t2.tail-bounds, t3.ols-multi, t4.linear-systems, t4.span-rank, t4.grad-descent, t10.metric-choice, t10.pipeline, t10.communicate. All Examples recompute; drills covered. Shared numbers with c-tier items on t2.variance, t2.cont-dists, t3.t-tests, t3.power are standard constants (0.05, 1.96, 0.80) or unrelated values, not duplicated problems.

### Verification

Script over all 64 cards: renderText succeeds, glyphIssues empty, six italic labels in order, no headings, no "note that", word count 90–160 excluding math and code, display math or fence in Move and Example, no Example sharing two or more significant numbers with any single drill prompt. JSON loads under python3 -I. Nothing committed.

## T6 review (sonnet-5.5)

Counts: T6.ab 144 items (48 recall, 96 micro), T6.c 32 full, T6.teach 16 cards. All 176 items solved blind (numeric ones recomputed in Python) and compared with the key.

Agreement: T6.ab 144/144 (100%), T6.c 32/32 (100%). No wrong key, no ill-posed item. Author-flagged ids checked: t6-0012 (prompt defines bias as the squared gap, matches the key), t6-0052 (cube vs ball), t6-0042 (median 2, sum 8), t6-0097 (formula given, width 2), t6-0015, t6-f007 (one step: b=0.25, w=1, p=0.777), t6-f013 (all three vocabulary words present, so no absent-word factors exist), t6-f020 (0.125). All correct.

### Changed items
| id | class | change |
|---|---|---|
| t6-0024, t6-0026 | missing convention | ridge shrink `1/(1+lambda)` depends on the objective; prompts now state RSS + lambda*beta^2 |
| t6-0052 | ambiguous shape | neighbourhood stated as a cube of side s, not a ball |
| t6-0046 | edge case | duplicate points with different labels break "training error 0"; prompt adds "all feature vectors are distinct" |
| t6-0122 | not self-contained | said "Same scores"; scores restated |
| t6-0077, t6-0086 | dependency on a sibling item | "The same 4 trees" / "Start at" reworded to stand alone |
| t6-0004, 0005, 0008, 0013, 0015, 0025, 0031, 0033, 0050, 0051, 0053, 0058, 0059, 0061, 0067, 0068, 0069, 0072, 0076, 0078, 0081, 0085, 0087, 0095, 0097, 0116, 0121, 0123, 0125, 0133, 0139 | micro prompt > 2 sentences | merged the "Give a decimal / exact fraction" hint or setup into two sentences; all conventions kept |
| t6-f030 | bad trap | trap said adjusted R2 is below R2 (a fact, not a wrong move); now the n-p df error giving 0.817 |
| t6-f013 | trap wording | "gives ham probability 0" now says P(winner given ham) is 0 without smoothing |
| T6.teach ml-setup, bias-variance, ridge-lasso, loss, naive-bayes, trees, boosting, cv, clf-metrics, reg-metrics | v2 shape gaps | named unnamed symbols (L, n, sigma^2, p_k, n_wc, N_c, V, alpha, F_t, h_t, alpha weight, ybar, TP/FP/FN/TN); ridge-lasso now states both objectives (RSS + lambda*beta^2 and half RSS + lambda*abs(beta)) so the two shrink formulas are consistent; loss formulas moved to display math; naive-bayes and boosting examples to display math, boosting example no longer uses an unexplained residual 12; cv gains the displayed estimate |

### Left as is
- All 16 cards: six labelled sections, 104 to 154 words excluding math after edits; examples use numbers unlike the drills; no banned fonts; render errors 0.
- Full items: all carry 2+ tags and need them; rubrics match solution steps. `pass` is 3 of 4 (75%) for 31 items and 4 of 5 (80%) for t6-f007; integer weights cannot reach 70%, as in T1 to T5.
- t6-0097 gives the formula for w, so it is a plug-in item; kept as tier b practice.
- t6-0118/0120 and similar concept MCQs checked for a second defensible option; none found.
- Probes: exactly one per technique in the T6 set, all tier b numeric: bias-variance 0013, ridge-lasso 0022, trees 0067, cv 0103, clf-metrics 0112.

### Checker
```
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T6.ab.json -> OK 144 items
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T6.c.json  -> OK 32 items
engine/answer.js check(): value + all `also` forms ok:true for 53/53 forms (26 expression items)
tools/render.js renderItem on 176 items, renderText + glyphIssues on 16 cards: 0 errors
```


## T7 review (sonnet-5.5)

Counts: T7.ab 126 items (42 recall, 84 micro), T7.c 28 full, 14 teach cards. Every item solved blind, then compared with the key.

Agreement with key on first pass: ab 126/126 (100%), c 28/28 (100%). Defects found were ill-posed or under-specified wording, not wrong keys.

### Changed items (ids kept)
| id | class | change |
|---|---|---|
| t7-0004 | length | micro prompt trimmed to 2 sentences (probe, key unchanged) |
| t7-0014 | self-contained | removed dangling "Same clusters" |
| t7-0015 | format+length | MCQ -> numeric 2; prompt cut to 2 sentences |
| t7-0016 | length | trimmed to 2 sentences |
| t7-0022 | convention+length | inclusive bound stated; 2 sentences |
| t7-0023 | self-contained+convention | removed "Same rows", noise defined, inclusive bound |
| t7-0025 | length | trimmed to 2 sentences |
| t7-0027 | ILL-POSED | row 2.5 sits exactly 1.5 from row 1; with strict < the key flips 3 -> 2; inclusive bound now stated |
| t7-0031 | length | trimmed to 2 sentences |
| t7-0032 | length | trimmed to 2 sentences |
| t7-0042 | ILL-POSED(judgment)+format | elbow was a judgment call (k=2 vs k=3); explicit drop rule added, MCQ -> numeric 2 |
| t7-0043 | length | trimmed to 2 sentences |
| t7-0051 | length | trimmed to 2 sentences |
| t7-0052 | length | trimmed to 2 sentences |
| t7-0054 | length | trimmed to 2 sentences |
| t7-0059 | ILL-POSED | "Same $400$ rows" followed a 200-row item; made self-contained |
| t7-0061 | ILL-POSED | bandwidth convention (s vs 2s^2 vs s^2) was unstated; key exp(-d^2/(2 s^2)) now implied |
| t7-0063 | convention | author flag: "before symmetrising" stated; key 15000 stands |
| t7-0069 | format | MCQ -> numeric 1 |
| t7-0070 | length | trimmed to 2 sentences |
| t7-0078 | format | MCQ -> numeric 0.0002 |
| t7-0079 | ILL-POSED | "smoothing weight k" admitted n/(n+k) form; k now defined as pseudo-count |
| t7-0081 | length | probe; trimmed to 2 sentences |
| t7-0096 | format (author flag) | MCQ -> numeric 57 (first-step 20 was recall-level) |
| t7-0097 | wording | removed garbled stub "y=a+c x1+..." |
| t7-0092 | convention | terms defined |
| t7-0094 | convention | terms defined |
| t7-0099 | ILL-POSED | "degree-2 terms" could mean exactly degree 2 (3 terms); now degree at most 2 |
| t7-0101 | convention | tf/idf definition stated |
| t7-0106 | format | MCQ -> numeric 0 |
| t7-0103 | convention+length | tf definition stated; 2 sentences |
| t7-0104 | length | trimmed to 2 sentences |
| t7-0112 | length | probe; trimmed to 2 sentences |
| t7-0115 | length | trimmed to 2 sentences |
| t7-0117 | length | trimmed to 2 sentences |
| t7-0123 | length | trimmed to 2 sentences |
| t7-0124 | format | MCQ -> numeric 0.99 |
| t7-0125 | ILL-POSED | "scaled by 1.4826" could multiply or divide; stated explicitly |
| t7-f023 | long arithmetic (author flag) | N=3 natural-log version needed six logs; now N=4 with log2, integer weights; value 0.2169 |
| t7-f026 | too easy (author flag) | obvious post-discharge billing code replaced with a subtle month-end aggregate; difficulty 2 -> 3 |

Teach cards edited (shape and rules, 14 cards): named every unnamed symbol (kmeans C_j/mu_j; gmm pi_k, f_k, x_i; pca lambda_j; manifold sigma_i and perplexity; embeddings u, v; encoding n, ybar_c, ybar, k; scaling xbar, s, a, b; text-features tf; anomaly mu, sigma), encoding Example now uses the Move formula (smoothed target), manifold Example changed 200 rows -> 120 rows because 19900 duplicated drill t7-0058, feature-select Check variable d renamed p (clashed with coefficient d), gmm Trap and manifold/anomaly Check cut to the one/two-sentence limits. Words excluding math now 108 to 146.

### Left as is
- Probes: exactly one per technique in the T7 set, all tier b numeric: kmeans 0004, pca-practice 0049, encoding 0081, scaling 0085, leakage 0112.
- Micro MCQ with no checkable numeric form kept (concept judgment): 0007, 0024, 0034, 0051, 0060, 0088, 0114.
- t7-0057 "typical t-SNE output dimension" stays as a tier a recall number.
- `pass` is 3 of 4 (75%) on all 28 full items; integer weights cannot reach 70%, as in T1 to T6.
- t7-f005/f006 second tag t6.knn (radius-neighbour counting) and t7-f004 second tag t7.density (chaining) are thin; tags kept to avoid progress-key churn.
- t7-0063 (UMAP): key 15000 stands, prompt now says before symmetrising. t7-0042 elbow rubric made explicit, no judgment left.
- 0113-0123 style micro prompts were trimmed to 2 sentences; remaining 3-sentence regex hits are decimal points, not sentences.

### Checker
```
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T7.ab.json -> OK 126 items
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T7.c.json  -> OK 28 items
engine/answer.js check(): value + all `also` forms ok:true for 66/66 forms (expression items); t7-0061 rejects exp(-d^2/s^2) and exp(-d^2/(2*s)); t7-0125 rejects (x-m)*1.4826/s
tools/render.js renderItem on 154 items and renderTechnique on 14 cards: 0 errors
```

## T8 review (sonnet-5.5)

Counts: T8.ab 126 items (42 recall, 84 micro), T8.c 28 full, T8.teach 14 cards.

Agreement (blind solve, key hidden): T8.ab 126/126 (100%), T8.c 28/28 (100%). No wrong key, no ill-posed key. Author-flagged ids checked: t8-0116 (sin 0.02 = 0.019999, i=1 gives 2i=2, fine), t8-0061 (shortcut, fixed), t8-0125 (fractional m accepted but the closed form is linear, no wrong-but-equal answer), t8-0050, t8-0023 (class 2 has p 0.25 under 0- or 1-indexing), t8-f011 (1.5), t8-f014 (3.25, wording fine), t8-f016 (L=7; lacked a second technique, rewritten).

### Changed items
| id | class | change |
|---|---|---|
| t8-0060 | missing convention | label-smoothing share is eps/K or eps/(K-1) by convention; prompt now says eps is spread uniformly over all K classes, true class included |
| t8-0061 | check is a shortcut | data was 5 epochs so the answer was "the last epoch"; now 7 epochs, answer 5 is not the last, rule stated in the prompt, `check` simulates the stopping rule |
| t8-0018, t8-0107 | edge case | softmax output is not in (0,1) with one class; prompts now say three classes / three or more keys |
| t8-0050 | missing convention | layer norm prompt now says no scale or shift |
| t8-0004, 0007, 0016, 0017, 0024, 0026, 0033, 0036, 0040, 0041, 0042, 0044, 0049, 0051, 0052, 0058, 0059, 0062, 0068, 0094, 0095, 0098, 0103, 0106, 0122, 0123, 0125 | micro prompt > 2 sentences | merged setup and the "give a fraction/decimal" hint into two sentences, all conventions kept |
| t8-f016 | single technique | per-layer factor 0.1 was given; now derived as w*sigma'(0) = 0.4*0.25, so it needs activations + backprop; answer 7 unchanged, rubric, solution, hints, check updated |
| t8-f028 | value type | 30.0 float under exact form, now integer 30 |
| T8.teach optimizers | missing content, wrong trap | Move had momentum only; added RMSprop and the Adam bias-correction divisor; old trap ("every step equals the learning rate") misdescribed Adam, now the momentum accumulation trap |
| T8.teach conv | promise not taught | When listed parameter count and receptive field; added both formulas to the Move |
| T8.teach rnn | missing content | added GRU/LSTM gate names and the n(m+n)+n parameter count |
| T8.teach transformer | missing content | added 4 d^2 attention and 2 d d_ff feed-forward weight counts |
| T8.teach attention | inconsistent example | d_k=4 with 2-dim vectors; example now uses 4-dim vectors, same score 11/2 |
| T8.teach init-norm | factual | "Xavier variance 1/n_in" is the tanh/LeCun choice; reworded. Named mu, sigma, added layer norm |
| T8.teach regularization | muddled trap, missing content | trap was "scale kept units by p"; now dropping the 1/p scaling. Added penalty form, lambda, early-stopping patience. Check no longer claims a step can never cross zero |
| T8.teach transfer | trivial Move | trainable = head + unfrozen backbone |
| T8.teach mlp, activations, softmax-ce, backprop | undefined symbol | named P, z, L, w, x, b |

### Left as is
- Cards: six labelled sections, 130 to 159 words excluding math, examples use numbers unlike the drills, no banned fonts, render errors 0.
- Full items: pass is 3.5 of 5 (70%) for all 28. Rubric lines match solution steps. t8-f001, f017, f020, f025, f027 are mostly one counting technique with a thin second tag; kept. t8-f015 second tag t6.cv is light (restore best epoch); kept.
- t8-0123: 20000/10000000 and 20000/10020000 differ by 0.2%, both accepted by rel 0.02.
- Label smoothing, step decay and LSTM gates appear in drills but are only touched by the cards; prompts supply their formulas.
- Probes: exactly one per CURRICULUM T8 technique, all tier b numeric: softmax-ce 0022, backprop 0031, optimizers 0040, conv 0076, attention 0103.

### Checker
```
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T8.ab.json -> OK 126 items
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T8.c.json  -> OK 28 items
engine/answer.js check(): value + all `also` forms ok:true for 45/45 forms (15 expression items)
tools/render.js renderItem on 154 items, renderText on 14 cards: 0 errors
```

## T9 review (sonnet-5.5)

Agreement: T9.ab 144/144 (100%), T9.c 32/32 (100%). Blind solve of every item before reading the key. No wrong key, no ill-posed item. Author-flagged ids checked: t9-0015 (slope 0.4*0.5/1 = 0.2), t9-0133 (impossibility statement correct, options 1 to 3 clearly false), t9-0070, t9-0079, t9-0047, t9-f012 (4 folds, 8+11+14+17 = 50), t9-f023 (1/72, perplexity 72^(1/4)), t9-f026. All correct.

### Changed items
| id | class | change |
|---|---|---|
| t9-0004, 0005, 0008, 0009, 0013, 0014, 0022, 0023, 0024, 0027, 0049, 0050, 0051, 0053, 0054, 0071, 0072, 0077, 0078, 0087, 0098, 0104, 0107, 0113, 0117, 0122, 0123, 0130, 0131, 0132, 0134, 0140, 0141, 0143, 0144 | micro prompt > 2 sentences | merged setup sentences into two; all numbers and conventions kept |
| t9-0088 | missing convention | prompt now states the loss e^2 + lambda*norm(u)^2 and that the factor 2 is absorbed into eta, so option 0 is the correct step (squared error was unstated) |
| t9-0018, 0021, 0111 | expression domain | domain admitted p or ps above 1 (not probabilities) and n below 1; now p, ps in [0.1, 0.9], n in [1, 30], s in [0.2, 3] |
| T9.teach ts-arima | v2 shape gap | drills need mean, variance, MA(1) rho1 that the card lacked; added the formulas and an example reaching mean 10, variance 1, rho2 0.49; named epsilon, sigma^2, rho_k, c, theta |
| T9.teach causal-po, causal-dag, causal-quasi, ts-decomp, ts-eval, bayes-mcmc, recsys-cf, recsys-mf, ranking-metrics, nlp-ngram, mlops-track, drift, fairness, privacy | v2 shape gaps | named unnamed symbols (Y(1), Y(0), do(t), T/C/0/1 in DiD, gamma_k, nabla, MAE_f, MAE_n, R-hat, s_uv, r_vi, p_u, q_i, k/m/n, rel_i, IDCG, V, s, n, x-bar, s_train, TP/FN/FP/TN, epsilon); recsys-mf reused u as both index and vector, now p_u and q_i; cosine and perplexity moved from inline to display math; ESS formula added to bayes-mcmc; reciprocal rank and Jaccard defined; ranking and nlp wording tightened |

### Left as is
- All 16 cards: six labelled sections, 135 to 159 words excluding math after edits; examples use numbers unlike the drills; no banned fonts; render errors 0.
- Full items: all carry 2 tags and need both; rubrics match solution steps. `pass` is 3.5 of 5 (70%) for all 32 items; with weights 2/1/2 the reachable sums are 1 to 5, so 3.5 means 4 of 5 in practice, as in T1 to T8.
- Cards still do not cover every drill: mean-centred CF (0078), naive Bayes (0107), A/B lift (0121), seasonal indices (f008) are in the drills only; each is a one-line plug-in from the solution text.
- t9-0120, 0121, 0125, 0126 (A/B lift, traffic share) are light arithmetic under t9.drift; kept as tier a/b practice.
- Probes: exactly one per CURRICULUM section 4 technique, all tier b numeric: causal-dag 0015, ts-arima 0042, bayes-conj 0058, ranking-metrics 0094, fairness 0130.
- Every T9 technique has a tier b numeric or expression item in T9.ab.json. validate_pack.js on packs/ds-core still fails only because T9 batches are not merged into items.json yet.

### Checker
```
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T9.ab.json -> OK 144 items
python3 -I tools/check_items.py packs/ds-core --batch=packs/ds-core/batches/T9.c.json  -> OK 32 items
engine/answer.js check(): value + all `also` forms ok:true for 22/22 forms (8 expression items)
tools/render.js renderItem on 176 items, renderTechnique on 16 cards: 0 errors
```
