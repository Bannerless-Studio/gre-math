# GRE Mathematics Subject Test: curriculum for the `gre-math` pack

Status: draft v1, 2026-10-12. Owner: problem-engine. Pack path: `packs/gre-math/`.

## 1. Target analysis

Source: ETS, GRE Mathematics Test fact sheet (ETS 2023 copyright) and ETS "Subject Test Content and Structure" page, both fetched 2026-10-12.

| Fact | Value (ETS) |
|---|---|
| Format | Computer-delivered, about 66 multiple-choice questions |
| Time | 2 h 50 min total, no separately timed sections (about 2.6 min per question) |
| Calculus | About 50% |
| Algebra | About 25% (elementary, linear, abstract algebra, number theory) |
| Additional topics | About 25% |
| Caveat | Percentages are estimates and vary by edition |

Topics ETS names:
- **Calculus (50%).** Usual elementary calculus sequence, differential and integral, one and several variables. Includes applications and links to coordinate geometry, trigonometry, differential equations.
- **Algebra (25%).** Elementary algebra (high-school techniques). Linear algebra: matrix algebra, linear systems, vector spaces, linear transformations, characteristic polynomials, eigenvalues and eigenvectors. Abstract algebra and number theory: elementary group theory, rings and modules, field theory, number theory.
- **Additional topics (25%).** Introductory real analysis: sequences and series of numbers and functions, continuity, differentiability, integrability, elementary topology of R and R^n. Discrete mathematics: logic, set theory, combinatorics, graph theory, algorithms. Other: general topology, geometry, complex variables, probability and statistics, numerical analysis.
- ETS warning: descriptions are not exhaustive, and questions needing only a good precalculus background can be among the hardest. This justifies T1 and T2 as owned tiers, not a skipped warm-up.

Consequences for the pack:
- Calculus tiers (T3 to T5) carry about half the item mass, matching the 50% weight.
- Algebra tiers (T1, T6, T7) carry about a quarter. T1 is a floor tier that also feeds calculus.
- T8 and T9 split the additional-topics quarter. Within T9, weight is probability, complex, ODE, discrete first, then numerical and geometry.
- Not verified: current registration or administration schedule for the Mathematics Test. Check ETS before telling the owner a test date exists. Out of scope for this doc.
- Not verified: the ETS practice book lists finer topic bullets than the fact sheet, and a regional copy files real analysis and discrete under a different heading. The fact sheet grouping is used here.

## 2. Tier ladder

Floor: end-of-O-level maths. Tier ids are `t1` to `t10`. Technique ids are `t<tier>.<slug>`. A technique is the SRS unit: it owns a pool of recall, micro, and full items, and has its own schedule state.

Item-count notation: `R/M/F` = recall / micro / full items **per tier** (pool size to author). Per-technique minimum: 2 R, 4 M, plus full items shared across the tier.

Tier-wide mix targets after placement: recall 25%, micro 60%, full 15% of reviews. T10 inverts this.

### T1. Algebra fluency and functions
- **Prerequisites:** none (floor: O-level maths)
- **Items (R/M/F):** 40/110/20
- **Techniques (13):** `t1.lin-eq`, `t1.sys-eq`, `t1.quad`, `t1.factor`, `t1.poly-div`, `t1.rational-expr`, `t1.exp-rules`, `t1.abs-ineq`, `t1.func-basics`, `t1.compose`, `t1.transforms`, `t1.coord-geom`, `t1.geom-formulas`
- **Own this tier:** Solve any quadratic, rational, or absolute-value problem in under 90 s; compose and invert functions; sketch transformed graphs. 85% accuracy on a 20-item mixed T1 micro set at target time.

### T2. Trig, logs, sequences, proof basics
- **Prerequisites:** t1
- **Items (R/M/F):** 40/100/20
- **Techniques (13):** `t2.unit-circle`, `t2.trig-id`, `t2.trig-eq`, `t2.trig-graph`, `t2.inv-trig`, `t2.tri-laws`, `t2.exp-log`, `t2.log-eq`, `t2.seq-series`, `t2.sigma-binom`, `t2.logic-sets`, `t2.proof-methods`, `t2.induction`
- **Own this tier:** Recite exact trig values; simplify with identities; manipulate logs; sum series; write a clean induction. 85% accuracy on a 20-item mixed set.

### T3. Calculus I
- **Prerequisites:** t1, t2
- **Items (R/M/F):** 50/140/30
- **Techniques (14):** `t3.limit-algebra`, `t3.limit-special`, `t3.continuity`, `t3.deriv-def`, `t3.deriv-rules`, `t3.chain-rule`, `t3.trans-deriv`, `t3.implicit`, `t3.log-diff`, `t3.lhopital`, `t3.related-rates`, `t3.optimize`, `t3.curve-shape`, `t3.mvt-rolle`
- **Own this tier:** Differentiate any elementary expression without error; set up related rates and optimization; evaluate limits including L'Hopital. 85% on a 24-item set, and 2 of 3 full items scored 2+.

### T4. Calculus II: integration and series
- **Prerequisites:** t3
- **Items (R/M/F):** 50/150/35
- **Techniques (16):** `t4.antideriv`, `t4.u-sub`, `t4.by-parts`, `t4.trig-int`, `t4.trig-sub`, `t4.partial-frac`, `t4.ftc`, `t4.improper-int`, `t4.area-volume`, `t4.arc-avg`, `t4.seq-limits`, `t4.series-tests`, `t4.alt-series`, `t4.power-series`, `t4.taylor`, `t4.param-polar`
- **Own this tier:** Pick the right integration method in under 15 s; decide convergence of a series with a named test; write Taylor series from memory for e^x, sin, cos, 1/(1-x), ln(1+x). 85% on a 24-item set.

### T5. Calculus III: multivariable and vector calculus
- **Prerequisites:** t3, t4
- **Items (R/M/F):** 40/110/30
- **Techniques (14):** `t5.vec-ops`, `t5.lines-planes`, `t5.partials`, `t5.mv-chain`, `t5.gradient`, `t5.mv-extrema`, `t5.lagrange`, `t5.double-int`, `t5.coord-change`, `t5.triple-int`, `t5.line-int`, `t5.green`, `t5.div-curl`, `t5.stokes-gauss`
- **Own this tier:** Compute gradients, extrema, Lagrange problems; set up iterated integrals in three coordinate systems; choose between direct computation and Green/Stokes/Gauss. 85% on a 20-item set.

### T6. Linear algebra
- **Prerequisites:** t1, t2, plus t5.vec-ops (dot/cross product)
- **Items (R/M/F):** 50/130/30
- **Techniques (15):** `t6.matrix-ops`, `t6.gauss`, `t6.determinant`, `t6.inverse`, `t6.vector-spaces`, `t6.basis-dim`, `t6.rank-nullity`, `t6.lin-maps`, `t6.change-basis`, `t6.eigen-2x2`, `t6.diagonalize`, `t6.cayley-ham`, `t6.inner-product`, `t6.spectral`, `t6.jordan-nilpotent`
- **Own this tier:** Find eigenvalues, ranks, and nullities by inspection or fast elimination; decide diagonalizability; use trace and determinant shortcuts. 85% on a 24-item set.

### T7. Abstract algebra and number theory
- **Prerequisites:** t2, t6 (basis and quotient ideas)
- **Items (R/M/F):** 60/120/30
- **Techniques (16):** `t7.nt-gcd`, `t7.nt-mod`, `t7.nt-euler`, `t7.group-axioms`, `t7.subgroup-cyclic`, `t7.order-lagrange`, `t7.perm-groups`, `t7.dihedral-small`, `t7.cosets-normal`, `t7.quotient-hom`, `t7.abelian-class`, `t7.sylow-action`, `t7.ring-basics`, `t7.domain-ufd`, `t7.poly-irred`, `t7.field-ext`
- **Own this tier:** State and use Lagrange, the isomorphism theorems, Sylow counting; find element orders and subgroup counts quickly; reduce large powers mod n. 85% on a 24-item set.

### T8. Real analysis and point-set topology
- **Prerequisites:** t2, t3, t4
- **Items (R/M/F):** 60/100/30
- **Techniques (15):** `t8.real-axioms`, `t8.seq-conv`, `t8.cauchy-bw`, `t8.cont-eps`, `t8.unif-cont`, `t8.cont-thms`, `t8.diff-thms`, `t8.riemann`, `t8.series-formal`, `t8.unif-conv`, `t8.metric-open`, `t8.compact-conn`, `t8.top-general`, `t8.cardinality`, `t8.counterexamples`
- **Own this tier:** Decide true/false on analysis statements by recalling the right theorem or counterexample; run an epsilon-delta check; apply compactness and connectedness. 85% on a 20-item set.

### T9. Additional topics: discrete, probability, complex, ODE, numerical
- **Prerequisites:** t2, t3, t4, t6 (t5.partials, t5.line-int, t5.lines-planes for complex and geometry; t8 recommended)
- **Items (R/M/F):** 70/150/30
- **Techniques (19):** `t9.counting`, `t9.incl-excl`, `t9.recurrence`, `t9.graph-basics`, `t9.graph-structure`, `t9.algorithms`, `t9.prob-basics`, `t9.rand-var`, `t9.distributions`, `t9.stats-basics`, `t9.complex-arith`, `t9.complex-analytic`, `t9.contour-residue`, `t9.complex-maps`, `t9.ode-first`, `t9.ode-linear`, `t9.ode-systems`, `t9.numerical`, `t9.geometry-misc`
- **Own this tier:** Count, compute expectations, find residues, solve linear ODEs, apply Newton/Simpson, each in under 2.5 min. 85% on a 30-item set.

### T10. Test mode: timed mixed sets and full-length practice
- **Prerequisites:** t1 to t9 placed or owned (at least 80% of mass in t3, t4, t6)
- **Items (R/M/F):** 40/120/40
- **Techniques (5):** `t10.triage`, `t10.plug-choices`, `t10.special-cases`, `t10.sanity-check`, `t10.time-boxing`
- **Own this tier:** Full practice test of 66 questions in 170 minutes at or above target score on 2 consecutive attempts, with error log showing no repeated technique miss.

## 3. Rules shared by all tiers

- **Own a technique** = last 3 reviews correct, no hint, micro items under 1.5x target time, and the interval at least 7 days.
- **Own a tier** = at least 85% of its techniques owned, and no technique under 60% rolling accuracy.
- **Unlock rule.** A technique unlocks when every prereq technique in its list is at least "learning" (two correct reviews). A tier opens for new cards when all its prereq tiers are owned or placed out.
- Full items are self-graded with a 0-3 rubric score: 3 full marks, 2 right idea with slip, 1 partial, 0 wrong. Score 2 or 3 counts as correct for the scheduler.
- Recall items test statements, not names: "state the condition" beats "what is the name of".

## 4. Placement diagnostic

Goal: find the first tier the learner does not own, skipping tiers already owned.

Design:
- 5 probe items per tier for T1 to T9 (4 for T1 and T2 if time is short, 6 for T3 to T8). T10 is never probed.
- Probes are micro items only, one per technique, drawn from the technique list for that tier. Choose probes that cover each tier's central techniques, listed below. Rotate which techniques are probed across retakes so repeats do not memorize items.
- Format: MCQ with "I don't know" as an explicit option that scores 0 and costs no extra time. Time cap 3 min per item.
- Order: ascending tier. Items within a tier ordered easy to hard.

Probe sets (technique slugs):
- T1: lin-eq, quad, poly-div, abs-ineq, compose
- T2: unit-circle, trig-id, exp-log, seq-series, induction
- T3: limit-algebra, deriv-rules, chain-rule, implicit, optimize, mvt-rolle
- T4: u-sub, by-parts, partial-frac, improper-int, series-tests, taylor
- T5: partials, gradient, lagrange, double-int, line-int, green
- T6: gauss, determinant, rank-nullity, eigen-2x2, diagonalize, spectral
- T7: nt-mod, order-lagrange, perm-groups, quotient-hom, sylow-action, poly-irred
- T8: seq-conv, cont-eps, unif-conv, compact-conn, metric-open, cardinality
- T9: counting, prob-basics, rand-var, complex-arith, ode-linear

Scoring and stop rule:
1. Tier accuracy = correct / probes in that tier. Tier is **owned** if accuracy >= 0.7.
2. Stop after two consecutive tiers fall below 0.7 (or after one if accuracy is 0.2 or less on T1/T2).
3. Start tier = first tier with accuracy < 0.7 that has all its prereq tiers owned. If a later tier scored >= 0.7 but a prereq is unowned, treat that later tier as unplaced and re-probe after the prereq is cleared.
4. Techniques probed correct in an unowned tier start as "learning" instead of "new". Techniques probed correct in an owned tier start as "owned" with a 3-day first interval, so a lucky guess resurfaces quickly.
5. Cross-tier edge case: T6 needs only T1, T2, and the t5.vec-ops technique, so a learner may start T6 before T3 to T5 (vec-ops is then pulled forward alone). T7 needs T2 and T6. Ordering is a recommendation, not a gate.
6. Retake allowed after 14 days, using unseen probe items.

## 5. Item authoring guide

General rules:
- All items are original, written in ETS style. Never copy or lightly rephrase released ETS or other published test questions. ETS practice book problems are read for style only.
- Markdown plus LaTeX `$...$` for inline and `$$...$$` for display. No images required for v1.
- Every item carries `id`, `technique`, `tier`, `type`, `difficulty` (1-5), `time_target_s`, `prompt`, `answer`, `solution`, `tags`.
- Every micro item must have a machine-checkable `answer`. Accepted answer kinds: `mcq` (letter), `numeric` (value plus tolerance), `expr` (expression checked by randomized numeric evaluation at 5 sample points), `int` (exact integer), `set` (unordered list).
- MCQ options use five choices (A to E) like the real test. Each distractor must be the result of a specific plausible wrong technique (sign error, forgotten chain-rule factor, wrong formula). Record that wrong technique in the item's `distractor_notes`. Never use filler distractors.
- One technique per micro item. If the solution uses two techniques, tag the second as `also`.
- Solutions: a worked path under 8 lines for micro, full step list for full, plus the "ETS trap" note when one exists.

### 5.1 Recall template

```yaml
id: t3.chain-rule.r01
type: recall
technique: t3.chain-rule
difficulty: 1
mode: mcq | typed
prompt: <statement or condition to supply>
answer: <letter or short expression>
distractor_notes: <one line per distractor naming the misconception>
explain: <one or two lines on why the true statement holds>
```

### 5.2 Micro template

```yaml
id: t3.<slug>.m<nn>
type: micro
technique: t3.<slug>
difficulty: 1-5
time_target_s: 60-180
prompt: <single-technique problem>
choices: {A: ..., B: ..., C: ..., D: ..., E: ...}   # omit for numeric/expr
answer: {kind: mcq|numeric|expr|int|set, value: ..., tol: 1e-6}
distractor_notes: {A: <wrong technique>, ...}
solution: <worked path>
```

### 5.3 Full template

```yaml
id: t3.<set>.f<nn>
type: full
techniques: [t3.a, t3.b]
difficulty: 3-5
time_target_s: 300-1200
prompt: <multi-step problem, may have parts>
answer: <final result for quick check>
solution: <complete worked solution>
rubric: [{pts: 1, criterion: ...}, ...]   # sums to 3 for the 0-3 scale mapping
common_errors: [..]
```

### 5.4 Worked examples (T3)

**Recall item**

```yaml
id: t3.mvt-rolle.r01
type: recall
technique: t3.mvt-rolle
difficulty: 2
mode: mcq
prompt: |
  Which hypothesis set guarantees a point $c \in (a,b)$ with $f'(c) = \dfrac{f(b)-f(a)}{b-a}$?
choices:
  A: $f$ continuous on $[a,b]$ only
  B: $f$ differentiable on $(a,b)$ only
  C: $f$ continuous on $[a,b]$ and differentiable on $(a,b)$
  D: $f$ differentiable on $[a,b]$ and $f(a)=f(b)$
  E: $f'$ continuous on $(a,b)$
answer: {kind: mcq, value: C}
distractor_notes:
  A: drops differentiability, so $|x|$ on $[-1,2]$ is a counterexample
  B: drops continuity at endpoints, so a jump at $b$ breaks the conclusion
  D: this is Rolle's hypothesis, stronger than needed
  E: confuses $C^1$ with the minimal hypothesis
explain: MVT needs continuity on the closed interval and differentiability on the open interval, nothing more.
```

**Micro item (numeric answer)**

```yaml
id: t3.chain-rule.m07
type: micro
technique: t3.chain-rule
difficulty: 2
time_target_s: 90
prompt: |
  Let $g(x) = \ln\!\big(x^2 + 3\big)$ and $h(x) = e^{2g(x)}$. Find $h'(1)$.
answer: {kind: numeric, value: 16, tol: 1e-9}
solution: |
  $h(x) = (x^2+3)^2$ since $e^{2\ln u}=u^2$, so $h'(x) = 2(x^2+3)\cdot 2x$.
  At $x=1$: $2\cdot 4 \cdot 2 = 16$.
  Chain-rule route: $h' = 2g'\,e^{2g}$, $g'(1)=2/4=1/2$, $e^{2g(1)}=16$, so $h'(1)=2\cdot\tfrac12\cdot16=16$.
distractor_notes_if_converted_to_mcq:
  8: forgot the factor 2 from the inner exponent
  4: used $h' = e^{2g}$ times $g'$ and dropped the 2 and the base power
  32: applied the product rule twice
```

**Full item with rubric**

```yaml
id: t3.opt-ft.f02
type: full
techniques: [t3.optimize, t3.implicit, t3.curve-shape]
difficulty: 4
time_target_s: 600
prompt: |
  A closed cylinder (top and bottom included) has volume $54\pi$. Its total surface area is $S(r)$ for radius $r>0$.
  (a) Express $S$ as a function of $r$.
  (b) Find the $r$ that minimizes $S$ and justify that it is a minimum.
  (c) Find the ratio height : radius at the minimum.
answer: "(a) S = 2*pi*r^2 + 108*pi/r  (b) r = 3  (c) h:r = 2:1"
solution: |
  (a) $h = 54/r^2$, so $S = 2\pi r^2 + 2\pi r h = 2\pi r^2 + 108\pi/r$.
  (b) $S' = 4\pi r - 108\pi/r^2 = 0 \Rightarrow r^3 = 27 \Rightarrow r=3$.
  $S'' = 4\pi + 216\pi/r^3 > 0$ for all $r>0$, so the critical point is the global minimum.
  (c) $h = 54/9 = 6$, so $h/r = 2$.
rubric:
  - {pts: 1, criterion: "Correct S(r) with h eliminated using the volume constraint"}
  - {pts: 1, criterion: "Correct critical point r = 3 from S' = 0"}
  - {pts: 1, criterion: "Minimum justified (second derivative or global sign argument) and h:r = 2:1 stated"}
common_errors:
  - "Omitting the top and bottom, which gives S = 2 pi r h only and no minimum"
  - "Checking only a local test and not noting the domain is open"
```

## 6. Ordering and pacing

Definitions (measure from the owner's vocab trainer logs, then substitute):
- `v` = owner's measured new-card learning rate: new techniques reaching "owned" per 25-minute session, from the vocab trainer.
- `r` = average reviews cleared per minute in that trainer. Problem cards are slower; set a per-type time multiplier `k_R`, `k_M`, `k_F` (recall about 1x, micro about 4x to 8x, full about 15x to 40x the vocab card time).
- `T` = session length = 25 minutes.

Formulas:
- Mean seconds per review `c = (mR*k_R + mM*k_M + mF*k_F) * c_vocab`, where `mR, mM, mF` are the tier's mix fractions (Section 2) and `c_vocab` is measured vocab seconds per card.
- Reviews per session `n = 60*T / c`.
- Sessions to introduce tier i's techniques: `S_new(i) = N_tech(i) * q / (n * p_new)`, where `q` = mean reviews to own one technique (start from 8; measure it) and `p_new` = share of each session given to new cards (start at 0.4).
- Review debt per session once a tier is owned: `D(i) = N_tech(i) / mean_interval_days(i)` cards per day, absorbed into `p_review = 1 - p_new`.
- Total sessions to test-ready: `S_total = sum over placed tiers of S_new(i) * (1 + ramp)`, with `ramp` = 0.15 for the review overhead of earlier tiers, plus T10 at `ceil(F_10 * time_target / (60*T))`, where `F_10` is the number of full-length practice passes planned (recommend 4 to 6).
- Rough shape to expect (relative, not absolute): T3, T4, T7 and T8 are longest; T1 and T2 are shortest and mostly skipped by placement.

Recommended order: T1, T2, T3, T4, T5, T6, T7, T8, T9, T10. Allowed parallel start: T6 beside T5 once T3 is owned (linear algebra needs only T1/T2). T10 mixed sets start as soon as T3 and T6 are owned (about 60% of test mass), as practice for pacing, with later tiers interleaved as they unlock.

Mixed-session interleaving: after 3 tiers are owned, 30% of review slots draw across tiers (interleaved) so retrieval cannot lean on "this is a chapter on X".

## 7. Technique list (JSON)

Count: 140 techniques across 10 tiers. `prereq` lists technique ids; tier-level prereqs are in Section 2.

```json
[
 {"id": "t1.lin-eq", "tier": 1, "name": "Linear equations", "desc": "Solve linear equations and word problems, including literal equations", "prereq": []},
 {"id": "t1.sys-eq", "tier": 1, "name": "Systems of equations", "desc": "Solve 2-3 variable linear systems by substitution/elimination; spot inconsistent or dependent systems", "prereq": ["t1.lin-eq"]},
 {"id": "t1.quad", "tier": 1, "name": "Quadratic solving", "desc": "Factor, complete the square, quadratic formula, discriminant", "prereq": ["t1.lin-eq"]},
 {"id": "t1.factor", "tier": 1, "name": "Factoring patterns", "desc": "Difference of squares/cubes, grouping, sum/product of roots (Vieta)", "prereq": ["t1.quad"]},
 {"id": "t1.poly-div", "tier": 1, "name": "Polynomial division", "desc": "Long/synthetic division, remainder and factor theorems, rational root test", "prereq": ["t1.factor"]},
 {"id": "t1.rational-expr", "tier": 1, "name": "Rational expressions", "desc": "Simplify, combine, solve rational equations; check extraneous roots", "prereq": ["t1.factor"]},
 {"id": "t1.exp-rules", "tier": 1, "name": "Exponent and radical rules", "desc": "Integer/rational exponents, rationalizing, simplifying surds", "prereq": []},
 {"id": "t1.abs-ineq", "tier": 1, "name": "Absolute value and inequalities", "desc": "Solve absolute value equations and inequalities, sign charts, polynomial/rational inequalities", "prereq": ["t1.quad", "t1.rational-expr"]},
 {"id": "t1.func-basics", "tier": 1, "name": "Function notation and domain", "desc": "Evaluate functions, find domain and range, piecewise functions", "prereq": []},
 {"id": "t1.compose", "tier": 1, "name": "Composition and inverse", "desc": "Compose functions, find inverses, test one-to-one", "prereq": ["t1.func-basics"]},
 {"id": "t1.transforms", "tier": 1, "name": "Graph transformations", "desc": "Shifts, stretches, reflections, even/odd symmetry", "prereq": ["t1.func-basics"]},
 {"id": "t1.coord-geom", "tier": 1, "name": "Coordinate geometry", "desc": "Lines, distance, midpoint, circles, parabola/ellipse/hyperbola standard forms", "prereq": ["t1.quad"]},
 {"id": "t1.geom-formulas", "tier": 1, "name": "Plane and solid geometry", "desc": "Area, volume, similar triangles, Pythagorean triples, inscribed angles", "prereq": []},
 {"id": "t2.unit-circle", "tier": 2, "name": "Unit circle values", "desc": "Exact sin/cos/tan at standard angles, radians, reference angles", "prereq": ["t1.geom-formulas"]},
 {"id": "t2.trig-id", "tier": 2, "name": "Trig identities", "desc": "Pythagorean, double/half angle, sum/product formulas", "prereq": ["t2.unit-circle"]},
 {"id": "t2.trig-eq", "tier": 2, "name": "Trig equations", "desc": "Solve trig equations on an interval and in general form", "prereq": ["t2.trig-id"]},
 {"id": "t2.trig-graph", "tier": 2, "name": "Trig graphs", "desc": "Amplitude, period, phase shift, asymptotes", "prereq": ["t2.unit-circle", "t1.transforms"]},
 {"id": "t2.inv-trig", "tier": 2, "name": "Inverse trig", "desc": "Principal values, domain/range, compositions like sin(arccos x)", "prereq": ["t2.unit-circle", "t1.compose"]},
 {"id": "t2.tri-laws", "tier": 2, "name": "Law of sines and cosines", "desc": "Solve general triangles, area formulas", "prereq": ["t2.unit-circle"]},
 {"id": "t2.exp-log", "tier": 2, "name": "Exponentials and logs", "desc": "Log laws, change of base, exponential growth/decay", "prereq": ["t1.exp-rules", "t1.compose"]},
 {"id": "t2.log-eq", "tier": 2, "name": "Log and exponential equations", "desc": "Solve and check equations/inequalities involving logs and exponentials", "prereq": ["t2.exp-log"]},
 {"id": "t2.seq-series", "tier": 2, "name": "Arithmetic and geometric sequences", "desc": "Terms, sums, infinite geometric series", "prereq": ["t1.lin-eq"]},
 {"id": "t2.sigma-binom", "tier": 2, "name": "Sigma notation and binomial theorem", "desc": "Manipulate sums, telescoping, binomial coefficients and expansions", "prereq": ["t2.seq-series"]},
 {"id": "t2.logic-sets", "tier": 2, "name": "Logic and sets", "desc": "Quantifiers, negation, converse/contrapositive, set operations and Venn counting", "prereq": []},
 {"id": "t2.proof-methods", "tier": 2, "name": "Proof methods", "desc": "Direct, contradiction, contrapositive, counterexample, cases", "prereq": ["t2.logic-sets"]},
 {"id": "t2.induction", "tier": 2, "name": "Induction", "desc": "Prove summation and divisibility statements, strong induction", "prereq": ["t2.proof-methods", "t2.seq-series"]},
 {"id": "t3.limit-algebra", "tier": 3, "name": "Algebraic limits", "desc": "Factor/rationalize to evaluate limits, limits at infinity, one-sided limits", "prereq": ["t1.rational-expr"]},
 {"id": "t3.limit-special", "tier": 3, "name": "Special limits and squeeze", "desc": "sin x / x, (1-cos x)/x, e-limit forms, squeeze theorem", "prereq": ["t3.limit-algebra", "t2.trig-id"]},
 {"id": "t3.continuity", "tier": 3, "name": "Continuity", "desc": "Definition, removable/jump/infinite discontinuities, IVT application", "prereq": ["t3.limit-algebra"]},
 {"id": "t3.deriv-def", "tier": 3, "name": "Derivative from definition", "desc": "Difference quotient, derivative as slope and rate, differentiability", "prereq": ["t3.limit-algebra"]},
 {"id": "t3.deriv-rules", "tier": 3, "name": "Power, product, quotient rules", "desc": "Differentiate polynomials, rational and product forms", "prereq": ["t3.deriv-def"]},
 {"id": "t3.chain-rule", "tier": 3, "name": "Chain rule", "desc": "Differentiate compositions, nested chains", "prereq": ["t3.deriv-rules", "t1.compose"]},
 {"id": "t3.trans-deriv", "tier": 3, "name": "Transcendental derivatives", "desc": "Derivatives of trig, exp, log, inverse trig", "prereq": ["t3.chain-rule", "t2.exp-log", "t2.inv-trig"]},
 {"id": "t3.implicit", "tier": 3, "name": "Implicit differentiation", "desc": "dy/dx from relations, second derivatives, tangent lines to curves", "prereq": ["t3.chain-rule"]},
 {"id": "t3.log-diff", "tier": 3, "name": "Logarithmic differentiation", "desc": "Differentiate x^x, products/quotients of many factors", "prereq": ["t3.trans-deriv"]},
 {"id": "t3.lhopital", "tier": 3, "name": "L'Hopital's rule", "desc": "Indeterminate forms 0/0, inf/inf, rewrite 0*inf, 1^inf", "prereq": ["t3.trans-deriv", "t3.limit-special"]},
 {"id": "t3.related-rates", "tier": 3, "name": "Related rates", "desc": "Set up and differentiate geometric/physical relations in time", "prereq": ["t3.implicit"]},
 {"id": "t3.optimize", "tier": 3, "name": "Optimization", "desc": "Closed-interval method, applied max/min with constraints", "prereq": ["t3.deriv-rules"]},
 {"id": "t3.curve-shape", "tier": 3, "name": "Curve shape", "desc": "Monotonicity, concavity, inflection, first/second derivative tests, asymptotes", "prereq": ["t3.optimize"]},
 {"id": "t3.mvt-rolle", "tier": 3, "name": "Rolle and Mean Value Theorem", "desc": "State conditions, apply to inequalities and root counting", "prereq": ["t3.continuity", "t3.curve-shape"]},
 {"id": "t4.antideriv", "tier": 4, "name": "Basic antiderivatives", "desc": "Power, exponential, trig rules, initial value problems", "prereq": ["t3.trans-deriv"]},
 {"id": "t4.u-sub", "tier": 4, "name": "Substitution", "desc": "Choose u, change limits, hidden substitutions", "prereq": ["t4.antideriv"]},
 {"id": "t4.by-parts", "tier": 4, "name": "Integration by parts", "desc": "Standard and tabular/cyclic parts, LIATE choice", "prereq": ["t4.u-sub"]},
 {"id": "t4.trig-int", "tier": 4, "name": "Trigonometric integrals", "desc": "Powers of sin/cos/tan/sec via identities", "prereq": ["t4.u-sub", "t2.trig-id"]},
 {"id": "t4.trig-sub", "tier": 4, "name": "Trigonometric substitution", "desc": "Handle sqrt(a^2-x^2), sqrt(a^2+x^2), sqrt(x^2-a^2)", "prereq": ["t4.trig-int"]},
 {"id": "t4.partial-frac", "tier": 4, "name": "Partial fractions", "desc": "Decompose rational functions, integrate each part", "prereq": ["t4.u-sub", "t1.poly-div"]},
 {"id": "t4.ftc", "tier": 4, "name": "Fundamental theorem of calculus", "desc": "Both parts, differentiate integrals with variable limits (Leibniz)", "prereq": ["t4.u-sub"]},
 {"id": "t4.improper-int", "tier": 4, "name": "Improper integrals", "desc": "Infinite limits and singularities, convergence by comparison", "prereq": ["t4.ftc", "t3.limit-algebra"]},
 {"id": "t4.area-volume", "tier": 4, "name": "Area and volume", "desc": "Area between curves, disks/washers/shells, cross sections", "prereq": ["t4.ftc"]},
 {"id": "t4.arc-avg", "tier": 4, "name": "Arc length, surface area, averages", "desc": "Arc length, surface of revolution, mean value of a function", "prereq": ["t4.area-volume"]},
 {"id": "t4.seq-limits", "tier": 4, "name": "Sequence limits", "desc": "Convergence of sequences, monotone bounded, recursive sequences", "prereq": ["t3.limit-special", "t2.seq-series"]},
 {"id": "t4.series-tests", "tier": 4, "name": "Series convergence tests", "desc": "Geometric, p-series, comparison, limit comparison, ratio, root, integral tests", "prereq": ["t4.seq-limits", "t4.improper-int"]},
 {"id": "t4.alt-series", "tier": 4, "name": "Alternating and conditional convergence", "desc": "Alternating series test, absolute vs conditional, error bound", "prereq": ["t4.series-tests"]},
 {"id": "t4.power-series", "tier": 4, "name": "Power series", "desc": "Radius and interval of convergence, term-by-term operations", "prereq": ["t4.series-tests"]},
 {"id": "t4.taylor", "tier": 4, "name": "Taylor series", "desc": "Maclaurin series of standard functions, Taylor polynomials, remainder estimates", "prereq": ["t4.power-series", "t3.deriv-rules"]},
 {"id": "t4.param-polar", "tier": 4, "name": "Parametric and polar curves", "desc": "Slope, arc length, area in parametric and polar forms", "prereq": ["t4.area-volume", "t2.trig-graph"]},
 {"id": "t5.vec-ops", "tier": 5, "name": "Vector operations", "desc": "Dot/cross product, projection, angle, area/volume via triple product", "prereq": ["t2.tri-laws"]},
 {"id": "t5.lines-planes", "tier": 5, "name": "Lines and planes in R3", "desc": "Equations, distance point-to-plane, intersections", "prereq": ["t5.vec-ops"]},
 {"id": "t5.partials", "tier": 5, "name": "Partial derivatives", "desc": "Compute first/higher partials, Clairaut, limits and continuity in two variables", "prereq": ["t3.chain-rule"]},
 {"id": "t5.mv-chain", "tier": 5, "name": "Multivariable chain rule", "desc": "Chain rule trees, implicit partials", "prereq": ["t5.partials"]},
 {"id": "t5.gradient", "tier": 5, "name": "Gradient and directional derivative", "desc": "Direction of steepest ascent, tangent plane, normal line", "prereq": ["t5.mv-chain", "t5.vec-ops"]},
 {"id": "t5.mv-extrema", "tier": 5, "name": "Multivariable extrema", "desc": "Critical points, second derivative test via Hessian, boundary cases", "prereq": ["t5.gradient"]},
 {"id": "t5.lagrange", "tier": 5, "name": "Lagrange multipliers", "desc": "Constrained optimization with one or two constraints", "prereq": ["t5.mv-extrema"]},
 {"id": "t5.double-int", "tier": 5, "name": "Double integrals", "desc": "Iterated integrals, reversing order, regions", "prereq": ["t4.area-volume", "t5.partials"]},
 {"id": "t5.coord-change", "tier": 5, "name": "Polar, cylindrical, spherical integrals", "desc": "Convert integrals, Jacobian determinant", "prereq": ["t5.double-int", "t4.param-polar"]},
 {"id": "t5.triple-int", "tier": 5, "name": "Triple integrals", "desc": "Volume and mass in 3D with symmetry", "prereq": ["t5.coord-change"]},
 {"id": "t5.line-int", "tier": 5, "name": "Line integrals and conservative fields", "desc": "Scalar/vector line integrals, potential functions, path independence", "prereq": ["t5.gradient", "t5.double-int"]},
 {"id": "t5.green", "tier": 5, "name": "Green's theorem", "desc": "Circulation/area conversion in the plane", "prereq": ["t5.line-int"]},
 {"id": "t5.div-curl", "tier": 5, "name": "Divergence, curl, surface integrals", "desc": "Compute div/curl, flux integrals", "prereq": ["t5.line-int", "t5.triple-int"]},
 {"id": "t5.stokes-gauss", "tier": 5, "name": "Stokes and divergence theorems", "desc": "Choose theorem and surface to simplify an integral", "prereq": ["t5.green", "t5.div-curl"]},
 {"id": "t6.matrix-ops", "tier": 6, "name": "Matrix algebra", "desc": "Multiply, transpose, powers, block structure, non-commutativity", "prereq": ["t1.sys-eq"]},
 {"id": "t6.gauss", "tier": 6, "name": "Row reduction", "desc": "Solve systems, RREF, parametric solution sets", "prereq": ["t6.matrix-ops"]},
 {"id": "t6.determinant", "tier": 6, "name": "Determinants", "desc": "Cofactor expansion, row-operation effects, multiplicativity", "prereq": ["t6.matrix-ops"]},
 {"id": "t6.inverse", "tier": 6, "name": "Matrix inverse", "desc": "Existence criteria, 2x2 formula, adjugate, inverse by row reduction", "prereq": ["t6.gauss", "t6.determinant"]},
 {"id": "t6.vector-spaces", "tier": 6, "name": "Vector spaces and subspaces", "desc": "Axioms, subspace test, standard function and polynomial spaces", "prereq": ["t2.logic-sets"]},
 {"id": "t6.basis-dim", "tier": 6, "name": "Span, independence, basis, dimension", "desc": "Test independence, extend/reduce to a basis", "prereq": ["t6.vector-spaces", "t6.gauss"]},
 {"id": "t6.rank-nullity", "tier": 6, "name": "Rank-nullity", "desc": "Column/row/null space, dimension counting", "prereq": ["t6.basis-dim"]},
 {"id": "t6.lin-maps", "tier": 6, "name": "Linear transformations", "desc": "Matrix of a map, kernel and image, injective/surjective", "prereq": ["t6.rank-nullity"]},
 {"id": "t6.change-basis", "tier": 6, "name": "Change of basis and similarity", "desc": "Coordinate vectors, conjugation, invariants of similarity", "prereq": ["t6.lin-maps", "t6.inverse"]},
 {"id": "t6.eigen-2x2", "tier": 6, "name": "Eigenvalues of small matrices", "desc": "Characteristic polynomial, eigenvectors for 2x2 and 3x3", "prereq": ["t6.determinant", "t1.quad"]},
 {"id": "t6.diagonalize", "tier": 6, "name": "Diagonalization", "desc": "Criteria, compute A^n, matrix exponential intuition", "prereq": ["t6.eigen-2x2", "t6.change-basis"]},
 {"id": "t6.cayley-ham", "tier": 6, "name": "Cayley-Hamilton and minimal polynomial", "desc": "Use characteristic/minimal polynomial to simplify powers and test diagonalizability", "prereq": ["t6.eigen-2x2"]},
 {"id": "t6.inner-product", "tier": 6, "name": "Inner products and Gram-Schmidt", "desc": "Orthogonality, projections, least squares", "prereq": ["t5.vec-ops", "t6.basis-dim"]},
 {"id": "t6.spectral", "tier": 6, "name": "Symmetric matrices and quadratic forms", "desc": "Spectral theorem, definiteness, trace/determinant as eigen sums", "prereq": ["t6.diagonalize", "t6.inner-product"]},
 {"id": "t6.jordan-nilpotent", "tier": 6, "name": "Nilpotent and Jordan structure", "desc": "Nilpotent matrices, Jordan blocks for small sizes, invariants", "prereq": ["t6.cayley-ham"]},
 {"id": "t7.nt-gcd", "tier": 7, "name": "Divisibility and gcd", "desc": "Euclidean algorithm, Bezout, prime factorization, counting divisors", "prereq": ["t2.induction"]},
 {"id": "t7.nt-mod", "tier": 7, "name": "Modular arithmetic", "desc": "Congruences, inverses mod n, linear congruences, CRT", "prereq": ["t7.nt-gcd"]},
 {"id": "t7.nt-euler", "tier": 7, "name": "Fermat, Euler, Wilson", "desc": "Phi function, reduce large powers, units mod n", "prereq": ["t7.nt-mod"]},
 {"id": "t7.group-axioms", "tier": 7, "name": "Group definition and examples", "desc": "Axioms, identity/inverse uniqueness, Z_n, S_n, GL_n, Q8", "prereq": ["t2.proof-methods"]},
 {"id": "t7.subgroup-cyclic", "tier": 7, "name": "Subgroups and cyclic groups", "desc": "Subgroup test, generators, subgroups of Z_n", "prereq": ["t7.group-axioms", "t7.nt-gcd"]},
 {"id": "t7.order-lagrange", "tier": 7, "name": "Element order and Lagrange", "desc": "Orders in Z_n and S_n, Lagrange consequences, order of products", "prereq": ["t7.subgroup-cyclic"]},
 {"id": "t7.perm-groups", "tier": 7, "name": "Permutation groups", "desc": "Cycle notation, parity, order via lcm, conjugacy by cycle type", "prereq": ["t7.order-lagrange"]},
 {"id": "t7.dihedral-small", "tier": 7, "name": "Dihedral and small groups", "desc": "Dihedral relations, classify groups of small order", "prereq": ["t7.perm-groups"]},
 {"id": "t7.cosets-normal", "tier": 7, "name": "Cosets and normal subgroups", "desc": "Left/right cosets, index, normality tests", "prereq": ["t7.order-lagrange"]},
 {"id": "t7.quotient-hom", "tier": 7, "name": "Quotients and homomorphisms", "desc": "Kernel, image, first isomorphism theorem, quotient groups", "prereq": ["t7.cosets-normal"]},
 {"id": "t7.abelian-class", "tier": 7, "name": "Finite abelian groups", "desc": "Classification, count groups of given order, direct products", "prereq": ["t7.quotient-hom", "t7.nt-mod"]},
 {"id": "t7.sylow-action", "tier": 7, "name": "Group actions and Sylow", "desc": "Orbit-stabilizer, class equation, Sylow counting", "prereq": ["t7.quotient-hom", "t7.perm-groups"]},
 {"id": "t7.ring-basics", "tier": 7, "name": "Rings and ideals", "desc": "Units, zero divisors, ideals, quotient rings, Z_n, polynomial rings", "prereq": ["t7.quotient-hom"]},
 {"id": "t7.domain-ufd", "tier": 7, "name": "Domains, PIDs, UFDs", "desc": "Prime vs irreducible, Euclidean domains, Gaussian integers", "prereq": ["t7.ring-basics"]},
 {"id": "t7.poly-irred", "tier": 7, "name": "Irreducible polynomials", "desc": "Eisenstein, rational root, reduction mod p, polynomial rings over fields", "prereq": ["t7.ring-basics", "t1.poly-div"]},
 {"id": "t7.field-ext", "tier": 7, "name": "Field extensions", "desc": "Degree, minimal polynomial, tower law, finite fields F_p and F_q", "prereq": ["t7.poly-irred"]},
 {"id": "t8.real-axioms", "tier": 8, "name": "Real numbers and sup/inf", "desc": "Completeness, supremum, density, Archimedean property", "prereq": ["t2.proof-methods"]},
 {"id": "t8.seq-conv", "tier": 8, "name": "Sequence convergence proofs", "desc": "Epsilon-N, algebra of limits, monotone convergence", "prereq": ["t8.real-axioms", "t4.seq-limits"]},
 {"id": "t8.cauchy-bw", "tier": 8, "name": "Cauchy sequences and Bolzano-Weierstrass", "desc": "Subsequences, limsup/liminf, completeness", "prereq": ["t8.seq-conv"]},
 {"id": "t8.cont-eps", "tier": 8, "name": "Continuity (epsilon-delta)", "desc": "Epsilon-delta proofs and counterexamples, sequential characterization", "prereq": ["t8.seq-conv", "t3.continuity"]},
 {"id": "t8.unif-cont", "tier": 8, "name": "Uniform continuity", "desc": "Definition, compact-domain theorem, Lipschitz, failure examples", "prereq": ["t8.cont-eps"]},
 {"id": "t8.cont-thms", "tier": 8, "name": "Consequences of continuity", "desc": "IVT, extreme value theorem, continuous images of compact sets", "prereq": ["t8.cont-eps"]},
 {"id": "t8.diff-thms", "tier": 8, "name": "Differentiation theory", "desc": "Differentiability vs continuity, Darboux, derivative-based inequalities", "prereq": ["t8.cont-thms", "t3.mvt-rolle"]},
 {"id": "t8.riemann", "tier": 8, "name": "Riemann integrability", "desc": "Darboux sums, integrable classes, integral inequalities", "prereq": ["t8.cont-thms", "t4.ftc"]},
 {"id": "t8.series-formal", "tier": 8, "name": "Series convergence theory", "desc": "Cauchy criterion, rearrangement, products, Abel/Dirichlet intuition", "prereq": ["t8.seq-conv", "t4.series-tests"]},
 {"id": "t8.unif-conv", "tier": 8, "name": "Uniform convergence", "desc": "Pointwise vs uniform, M-test, interchanging limits with integral/derivative", "prereq": ["t8.cont-eps", "t8.series-formal"]},
 {"id": "t8.metric-open", "tier": 8, "name": "Metric spaces and open/closed sets", "desc": "Open, closed, closure, interior, boundary in R^n and metric spaces", "prereq": ["t8.real-axioms"]},
 {"id": "t8.compact-conn", "tier": 8, "name": "Compactness and connectedness", "desc": "Heine-Borel, sequential compactness, connectedness in R", "prereq": ["t8.metric-open", "t8.cauchy-bw"]},
 {"id": "t8.top-general", "tier": 8, "name": "General topology", "desc": "Topology axioms, bases, subspace and product topology, Hausdorff, continuity via preimages", "prereq": ["t8.metric-open"]},
 {"id": "t8.cardinality", "tier": 8, "name": "Countability", "desc": "Countable vs uncountable, diagonal argument, Q and R", "prereq": ["t8.real-axioms"]},
 {"id": "t8.counterexamples", "tier": 8, "name": "Standard counterexamples", "desc": "Weierstrass-type, Dirichlet function, x^2 sin(1/x), pathological sets", "prereq": ["t8.cont-eps", "t8.unif-conv"]},
 {"id": "t9.counting", "tier": 9, "name": "Counting principles", "desc": "Permutations, combinations, stars and bars, circular arrangements", "prereq": ["t2.sigma-binom"]},
 {"id": "t9.incl-excl", "tier": 9, "name": "Inclusion-exclusion and pigeonhole", "desc": "Derangements, surjection counts, pigeonhole arguments", "prereq": ["t9.counting", "t2.logic-sets"]},
 {"id": "t9.recurrence", "tier": 9, "name": "Recurrences", "desc": "Solve linear recurrences, Fibonacci-type, generating functions basics", "prereq": ["t9.counting", "t2.seq-series"]},
 {"id": "t9.graph-basics", "tier": 9, "name": "Graph theory basics", "desc": "Degree sum, paths, connectivity, trees, bipartite", "prereq": ["t9.counting"]},
 {"id": "t9.graph-structure", "tier": 9, "name": "Euler, Hamilton, coloring, planarity", "desc": "Euler circuits, chromatic number, Euler's formula", "prereq": ["t9.graph-basics"]},
 {"id": "t9.algorithms", "tier": 9, "name": "Algorithms and complexity", "desc": "Big-O, sorting, graph search, loop invariants and counting operations", "prereq": ["t9.graph-basics", "t9.recurrence"]},
 {"id": "t9.prob-basics", "tier": 9, "name": "Probability basics", "desc": "Sample spaces, conditional probability, independence, Bayes", "prereq": ["t9.counting"]},
 {"id": "t9.rand-var", "tier": 9, "name": "Random variables", "desc": "Expectation, variance, linearity, indicator variables", "prereq": ["t9.prob-basics", "t4.series-tests"]},
 {"id": "t9.distributions", "tier": 9, "name": "Common distributions", "desc": "Binomial, geometric, Poisson, uniform, normal, exponential", "prereq": ["t9.rand-var", "t4.improper-int"]},
 {"id": "t9.stats-basics", "tier": 9, "name": "Statistics essentials", "desc": "Sample mean, confidence intervals, hypothesis testing, correlation", "prereq": ["t9.distributions"]},
 {"id": "t9.complex-arith", "tier": 9, "name": "Complex arithmetic and polar form", "desc": "Modulus, argument, roots of unity, de Moivre", "prereq": ["t2.trig-id"]},
 {"id": "t9.complex-analytic", "tier": 9, "name": "Analytic functions", "desc": "Cauchy-Riemann, harmonic functions, exp/log/powers, branches", "prereq": ["t9.complex-arith", "t5.partials"]},
 {"id": "t9.contour-residue", "tier": 9, "name": "Contour integrals and residues", "desc": "Cauchy theorem/formula, Laurent series, residue computation", "prereq": ["t9.complex-analytic", "t5.line-int"]},
 {"id": "t9.complex-maps", "tier": 9, "name": "Mobius maps and zeros", "desc": "Mobius transformations, conformal maps, max modulus, counting zeros", "prereq": ["t9.complex-analytic"]},
 {"id": "t9.ode-first", "tier": 9, "name": "First-order ODEs", "desc": "Separable, linear integrating factor, exact, growth models", "prereq": ["t4.ftc"]},
 {"id": "t9.ode-linear", "tier": 9, "name": "Linear ODEs with constant coefficients", "desc": "Characteristic equation, undetermined coefficients, oscillation", "prereq": ["t9.ode-first", "t2.trig-id"]},
 {"id": "t9.ode-systems", "tier": 9, "name": "ODE systems and phase behavior", "desc": "Eigenvalue solutions, stability, equilibria", "prereq": ["t9.ode-linear", "t6.diagonalize"]},
 {"id": "t9.numerical", "tier": 9, "name": "Numerical analysis", "desc": "Newton's method, trapezoid/Simpson, interpolation, error estimates", "prereq": ["t3.optimize", "t4.taylor"]},
 {"id": "t9.geometry-misc", "tier": 9, "name": "Geometry and transformations", "desc": "Isometries, similarity, area by determinant, convexity, conics", "prereq": ["t5.lines-planes"]},
 {"id": "t10.triage", "tier": 10, "name": "Question triage", "desc": "Skip, flag, and return; spend time proportional to payoff", "prereq": []},
 {"id": "t10.plug-choices", "tier": 10, "name": "Plug in the choices", "desc": "Test options, extremes, and small cases instead of deriving", "prereq": []},
 {"id": "t10.special-cases", "tier": 10, "name": "Special-case and symmetry checks", "desc": "Pick n=1,2, simple matrices, or symmetric configurations to eliminate options", "prereq": []},
 {"id": "t10.sanity-check", "tier": 10, "name": "Sanity checks", "desc": "Dimension, sign, limit, and monotonic checks on a candidate answer", "prereq": []},
 {"id": "t10.time-boxing", "tier": 10, "name": "Time-boxing at pace", "desc": "About 2.5 minutes per question with a mid-test checkpoint", "prereq": []}
]
```
