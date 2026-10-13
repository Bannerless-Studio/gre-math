# Data Science core (O-level maths to MS level): curriculum for the `ds-core` pack

Status: draft v1, 2026-10-13. Owner: problem-engine. Pack path: `packs/ds-core/`. Mirrors `packs/gre-physics/CURRICULUM.md` in structure and schema.

## 1. Target analysis

No standardised exam exists for data science. The syllabus is a composite of two published MS Data Science curricula, cross-checked against each other.

| Program | Source (fetched 2026-10-13) | What was read |
|---|---|---|
| NYU Center for Data Science, MS Data Science (US) | https://cds.nyu.edu/masters-curriculum/ | Core: DS-GA 1001 Intro to Data Science, 1002 Probability and Statistics for DS, 1003 Machine Learning, 1004 Big Data, 1006 Capstone. Elective menu: 1005 Inference and Representation, 1008 Deep Learning, 1011 NLP, 1012 LLMs, 1013 Mathematical Tools, 1014 Optimization and Computational Linear Algebra, 1015 Text as Data, 1017 Responsible DS, 1018 Probabilistic Time Series, 1020 Mathematical Statistics, 1021 Probability and Statistics 2. General electives include 1007 Programming for DS, 1019 Advanced Python. |
| University of Edinburgh, MSc Data Science, School of Informatics (UK) | https://informatics.ed.ac.uk/taught-students/msc-students/taught-msc-handbook-202526/degree-programmes-and-courses/data-science (2025/26 handbook) | Compulsory: Informatics Project Proposal, MSc Dissertation. Breadth areas: (1) Machine Learning, Statistics and Optimization, (2) Databases and Data Management Systems, (3) Unstructured Data and Applications (NLP, vision, bioinformatics). The page lists no course titles, so the area names are the evidence. |

Failed fetches, for the record: cds.nyu.edu/ms-data-science/ (404), msds.cmu.edu (DNS failure), ucl.ac.uk MSc Data Science page and module catalogue (403), ETH Zurich Data Science page (404), study.ed.ac.uk programme page (course lists absent). NYU was the first choice and succeeded. Edinburgh succeeded on the second candidate path after UCL and ETH failed. Course-level detail for Edinburgh is by area only. Not verified: current-year course availability at either school.

**Mapping of courses and areas to tiers.**

| Source course or area | Tiers |
|---|---|
| NYU 1013 Mathematical Tools (prerequisite-style maths) | T1, T4 |
| NYU 1002 Probability and Statistics for DS; 1020, 1021 | T2, T3 |
| NYU 1014 Optimization and Computational Linear Algebra | T4 |
| NYU 1001 Intro to DS; 1007 Programming; 1004 Big Data | T5, T6 (wrangling, SQL, evaluation basics) |
| NYU 1003 Machine Learning; Edinburgh area 1 | T6, T7 |
| Edinburgh area 2 Databases and Data Management | T5 |
| NYU 1005 Inference and Representation; 1008 Deep Learning | T7, T8 |
| NYU 1011 NLP, 1012 LLMs, 1015 Text as Data; Edinburgh area 3 | T7 (text features), T8 (attention, transformers), T9 (language models) |
| NYU 1018 Probabilistic Time Series; 1017 Responsible DS | T9 |
| NYU 1006 Capstone; Edinburgh Project Proposal and Dissertation | T10 |

**Floor and maths prerequisites.** Floor is end-of-O-level maths. Python basics assumed (variables, loops, functions, lists, dicts). No statistics, linear algebra or calculus assumed. This pack stands alone and teaches the needed subset: T1 holds calculus as rates, derivative rules, optima and integral as accumulation. T4 holds linear algebra and multivariable gradients. Nothing points to `gre-math`.

**Tier ladder versus the sources.** The suggested ladder was kept with these adjustments, each argued by the sources:
- Databases are a full Edinburgh breadth area and NYU Big Data and Intro to DS stress SQL and data handling, so T5 (wrangling and SQL) stays a full tier and sits before ML so that later code items have data semantics to build on.
- Both programs make evaluation and generalisation central to the ML course, so cross-validation, tuning and metrics are in T6, and leakage is a named technique in T7 rather than a T10 aside.
- NYU offers responsible DS, time series and NLP as separate electives and Edinburgh has an unstructured-data area. T9 therefore packs causal inference, time series, Bayesian methods, recommenders, NLP, MLOps and ethics, with 16 techniques.
- Both ends are the same: Edinburgh and NYU finish on a project or dissertation, so T10 is a case-study test mode, not new content.

**Item mass.** T2, T3, T4 and T6 carry the most items because they have the most machine-checkable derivation (counting, Bayes, intervals, eigenvalues, gradients, metrics). T10 mixes judgement items and leans on full items.

## 2. Tier ladder

Tier ids are `t1` to `t10`. Technique ids are `t<tier>.<slug>`. A technique is the SRS unit: it owns a pool of recall, micro, and full items and has its own schedule state.

Item-count notation: `R/M/F` = recall / micro / full items **per tier** (pool size to author). Per-technique minimum: 2 R, 4 M, plus full items shared across the tier. **Code share** is the expected share of the tier's R+M+F items that use `answer.kind = "code"`. Code items are authored only after the engine supports them.

Tier-wide mix targets after placement: recall 25%, micro 60%, full 15% of reviews. T10 inverts this.

### T1. Maths for data science I: sets, functions, logs, calculus as rates, vectors
- **Prerequisites:** none (floor: O-level maths, Python basics)
- **Items (R/M/F):** 30/90/12
- **Code share:** 0%
- **Techniques (14):** `t1.sets`, `t1.functions`, `t1.inequalities`, `t1.sigma`, `t1.geom-series`, `t1.exp-log`, `t1.log-scale`, `t1.derivative`, `t1.deriv-rules`, `t1.critical-points`, `t1.integral`, `t1.vectors`, `t1.dot-norm`, `t1.linear-approx`
- **Own this tier:** Fluent set, log, derivative and vector work; 85% on a 20-item mixed set at target time.

### T2. Probability: events, random variables, distributions, limit theorems
- **Prerequisites:** t1
- **Items (R/M/F):** 45/140/25
- **Code share:** 5%
- **Techniques (15):** `t2.counting`, `t2.axioms`, `t2.conditional`, `t2.bayes`, `t2.independence`, `t2.discrete-rv`, `t2.expectation`, `t2.variance`, `t2.discrete-dists`, `t2.pdf-cdf`, `t2.normal`, `t2.cont-dists`, `t2.joint-cov`, `t2.tail-bounds`, `t2.lln-clt`
- **Own this tier:** Set up and solve counting, Bayes, expectation and distribution problems in under 2 min; 85% on a 24-item set.

### T3. Statistics and inference: estimation, tests, bootstrap, regression, experiments
- **Prerequisites:** t1, t2
- **Items (R/M/F):** 45/140/25
- **Code share:** 10%
- **Techniques (15):** `t3.descriptive`, `t3.sampling`, `t3.estimators`, `t3.mle`, `t3.ci`, `t3.hypothesis`, `t3.t-tests`, `t3.proportions`, `t3.chisq`, `t3.multiple`, `t3.power`, `t3.ab-design`, `t3.bootstrap`, `t3.ols-simple`, `t3.ols-multi`
- **Own this tier:** Pick the right estimator, interval or test, compute it, and state what it means; 85% on a 24-item set.

### T4. Linear algebra and optimisation for ML: matrices, decompositions, gradients, descent
- **Prerequisites:** t1
- **Items (R/M/F):** 45/140/25
- **Code share:** 15%
- **Techniques (15):** `t4.matrix-ops`, `t4.linear-systems`, `t4.inverse-det`, `t4.span-rank`, `t4.projection`, `t4.normal-eq`, `t4.eigen`, `t4.spectral`, `t4.svd`, `t4.pca`, `t4.gradient`, `t4.matrix-calc`, `t4.convexity`, `t4.grad-descent`, `t4.lagrange`
- **Own this tier:** Compute with matrices, eigen and SVD facts, gradients and descent steps; 85% on a 24-item set.

### T5. Data wrangling and SQL: relational model, joins, windows, pandas semantics, cleaning
- **Prerequisites:** t1 (t4.matrix-ops for pandas-vector only)
- **Items (R/M/F):** 35/100/15
- **Code share:** 40%
- **Techniques (14):** `t5.relational`, `t5.sql-select`, `t5.sql-null`, `t5.sql-joins`, `t5.sql-agg`, `t5.sql-sub`, `t5.sql-window`, `t5.pandas-index`, `t5.pandas-vector`, `t5.pandas-merge`, `t5.tidy`, `t5.missing`, `t5.cleaning`, `t5.complexity`
- **Own this tier:** Predict the exact result table of a SQL or pandas operation, including NULL, join and window effects; 85% on a 20-item set.

### T6. Supervised machine learning: models, bias-variance, evaluation
- **Prerequisites:** t3, t4
- **Items (R/M/F):** 50/150/28
- **Code share:** 30%
- **Techniques (16):** `t6.ml-setup`, `t6.bias-variance`, `t6.ridge-lasso`, `t6.logistic`, `t6.loss`, `t6.knn`, `t6.naive-bayes`, `t6.trees`, `t6.bagging`, `t6.boosting`, `t6.svm`, `t6.cv`, `t6.clf-metrics`, `t6.roc-pr`, `t6.reg-metrics`, `t6.tuning`
- **Own this tier:** Diagnose bias-variance, choose and evaluate a supervised model correctly; 85% on a 24-item set.

### T7. Unsupervised learning and feature engineering: clustering, embeddings, encoding, leakage
- **Prerequisites:** t4, t6
- **Items (R/M/F):** 35/100/16
- **Code share:** 35%
- **Techniques (14):** `t7.kmeans`, `t7.hierarchical`, `t7.density`, `t7.gmm-em`, `t7.cluster-eval`, `t7.pca-practice`, `t7.manifold`, `t7.embeddings`, `t7.encoding`, `t7.scaling`, `t7.feature-select`, `t7.text-features`, `t7.leakage`, `t7.anomaly`
- **Own this tier:** Run clustering and reduction by hand at small scale, encode features, and spot leakage; 85% on a 20-item set.

### T8. Deep learning: backprop, CNNs, sequence models, attention, training dynamics
- **Prerequisites:** t4, t6
- **Items (R/M/F):** 35/100/16
- **Code share:** 25%
- **Techniques (14):** `t8.mlp`, `t8.activations`, `t8.softmax-ce`, `t8.backprop`, `t8.optimizers`, `t8.init-norm`, `t8.regularization`, `t8.training-diag`, `t8.conv`, `t8.cnn-arch`, `t8.rnn`, `t8.attention`, `t8.transformer`, `t8.transfer`
- **Own this tier:** Compute a forward and backward pass, shapes and parameter counts, attention by hand, and read training curves; 85% on a 20-item set.

### T9. Advanced topics: causal inference, time series, Bayesian methods, recommenders, NLP, MLOps, fairness
- **Prerequisites:** t3, t6, t7 (per technique)
- **Items (R/M/F):** 40/110/18
- **Code share:** 25%
- **Techniques (16):** `t9.causal-po`, `t9.causal-dag`, `t9.causal-quasi`, `t9.ts-decomp`, `t9.ts-arima`, `t9.ts-eval`, `t9.bayes-conj`, `t9.bayes-mcmc`, `t9.recsys-cf`, `t9.recsys-mf`, `t9.ranking-metrics`, `t9.nlp-ngram`, `t9.mlops-track`, `t9.drift`, `t9.fairness`, `t9.privacy`
- **Own this tier:** Reason about causal, time-series, Bayesian, recommender, NLP, deployment and fairness cases; 85% on a 24-item set.

### T10. Test mode: case studies, metric choice, pipelines, model selection, communication
- **Prerequisites:** t1 to t9 placed or owned (at least 80% of mass in t2, t3, t4, t6)
- **Items (R/M/F):** 30/90/30
- **Code share:** 30%
- **Techniques (5):** `t10.case-framing`, `t10.metric-choice`, `t10.pipeline`, `t10.model-selection`, `t10.communicate`
- **Own this tier:** Case-study set of 10 mixed items in 40 min at or above 85% on 2 consecutive attempts, with an error log showing no repeated technique miss.

Total items to author: 390 R, 1160 M, 210 F = 1760. Total techniques: 138.

| Tier | Label | Techniques | R/M/F | Code share |
|---|---|---|---|---|
| T1 | Maths I | 14 | 30/90/12 | 0% |
| T2 | Probability | 15 | 45/140/25 | 5% |
| T3 | Statistics | 15 | 45/140/25 | 10% |
| T4 | Linear algebra | 15 | 45/140/25 | 15% |
| T5 | Wrangling and SQL | 14 | 35/100/15 | 40% |
| T6 | Supervised ML | 16 | 50/150/28 | 30% |
| T7 | Unsupervised and features | 14 | 35/100/16 | 35% |
| T8 | Deep learning | 14 | 35/100/16 | 25% |
| T9 | Advanced topics | 16 | 40/110/18 | 25% |
| T10 | Test mode | 5 | 30/90/30 | 30% |

`pack.json` weights over the nine content tiers: math 0.06, prob 0.13, stats 0.13, linalg 0.13, data 0.09, ml 0.15, unsup 0.09, dl 0.10, adv 0.12 (sum 1). They are a design choice from the course mapping in section 1, not exam percentages.

## 3. Rules shared by all tiers

- **Own a technique** = last 3 reviews correct, no hint, micro items under 1.5x target time, and the interval at least 7 days.
- **Own a tier** = at least 85% of its techniques owned, and no technique under 60% rolling accuracy.
- **Unlock rule.** A technique unlocks when every prereq technique in its list is at least "learning" (two correct reviews). A tier opens for new cards when all its prereq tiers are owned or placed out.
- Full items are self-graded against the rubric as in `docs/PACK_SCHEMA.md`. Grade 2 counts as correct for the scheduler.
- Recall items test statements and relations, not names: "state the condition" beats "what is the name of".

## 4. Placement diagnostic

Goal: find the first tier the learner does not own, skipping tiers already owned.

Design:
- 5 probe items per tier for T1 to T9. T10 is never probed.
- Probes are tier b (micro) items, one per technique, flagged `probe: true`, with a playable answer kind (numeric, mcq, expression, multi). MCQ carries "I don't know" as an explicit option scoring 0. Time cap 3 min per item. Ascending tier, easy to hard within a tier. Probes never use the `code` kind.

Probe sets (technique slugs, five per tier, all present in `techniques.json`):

- T1: sets, exp-log, derivative, critical-points, dot-norm
- T2: bayes, expectation, discrete-dists, normal, lln-clt
- T3: ci, hypothesis, t-tests, power, ols-multi
- T4: inverse-det, eigen, svd, gradient, grad-descent
- T5: sql-null, sql-joins, sql-window, pandas-index, tidy
- T6: bias-variance, ridge-lasso, trees, cv, clf-metrics
- T7: kmeans, pca-practice, encoding, scaling, leakage
- T8: softmax-ce, backprop, optimizers, conv, attention
- T9: causal-dag, ts-arima, bayes-conj, ranking-metrics, fairness

Scoring and stop rule follow the engine (`docs/PACK_SCHEMA.md`, Placement): tier owned at accuracy >= 0.7, stop after the engine's empty-bucket or low-accuracy runs, placed techniques start provisional. Retake allowed after 14 days using unseen probes. Cross-tier note: T5 can be started beside T3 once T1 is owned, since only `t5.pandas-vector` needs `t4.matrix-ops`.

## 5. Item authoring guide

General rules (copied from gre-physics):
- All items are original. Never copy or lightly rephrase published exam, textbook or course questions.
- Markdown plus LaTeX `$...$` inline and `$$...$$` display.
- Every item carries `id`, `tier`, `level`, `tags`, `difficulty` (1-5), `prompt`, `solution`, `answer`, `source` per `docs/PACK_SCHEMA.md`.
- Every micro item has a machine-checkable `answer`: `numeric`, `mcq`, `expression`, `multi` (or `code`, below). At least one `numeric` or `expression` micro item per technique so the production gate can be met.
- MCQ options: four choices for recall and micro items, five for full items (tier c). Each distractor is the result of one specific plausible wrong move (wrong formula, dropped factor, unit or scale slip, sign error, confusing two concepts). Record it in the option's `why`. Never use filler distractors.
- One technique per micro item; secondary techniques go in `tags[1:]`.
- Solutions: worked path under 8 lines for micro, full step list for full, plus a "trap" note when one exists.
- Game text brevity: prompts and solutions are short and concise.

Data-science rules:
- **Numeric answers state the scale.** Probabilities are decimals in 0 to 1 and the prompt says so. Percentages are plain numbers and the prompt says "in percent". Counts, ratios and dollar amounts say their unit. The learner never types units or a percent sign.
- **Tolerance.** Computed decimals use `form: "decimal"` with `rel: 0.02` unless a tighter value is stated. Exact results (counts, simple fractions) use `form: "exact"` or `"fraction"`.
- **Data inline.** Data is given as a small Markdown table of at most 6 rows. Larger data is summarised in the prompt (n, mean, sd).
- **SQL and pandas semantics.** Until the `code` kind lands, give the table(s) and the query or expression in a fenced block, and ask for the result as a `numeric` (row count, a cell value) or a `multi` (which rows or columns appear). Never ask the learner to type SQL or pandas code in a non-code item.
- **No memorised library signatures.** Items test semantics (what happens to NULL, what the join returns), not argument names or function spelling. Where a parameter matters, the prompt states what it does.
- **Symbolic answers** use kind `expression` with `vars` listing the names. **Avoid `e` as a variable**, because the parser may read it as Euler's number. Spell Greek letters as `lam`, `mu`, `sigma`, `theta`.
- **Randomness.** An item that involves random output must be deterministic by construction (fixed small cases, expected values, exact probabilities), never "run it and see".
- **Figures.** Use sparingly; prefer a verbal or tabular setup.

**The `code` answer kind (authored only after the engine supports it).** Python runs in the browser via Pyodide against hidden tests. Authoring shape:

```json
"answer": {"kind": "code", "lang": "python", "entry": "<function name>",
  "tests": [{"args": [ ... ], "expect": <json>}],
  "setup": "<optional python prelude>", "packages": ["numpy"]}
```

- `entry` is the function the learner defines; the prompt states its signature and return type in words. `tests` run in order; `args` is the positional argument list as JSON; `expect` is the JSON value returned. Floats are compared with a tolerance set by the engine; state the rounding in the prompt when it matters.
- `setup` is a Python prelude that defines helper data (for example a small table as a list of dicts) and is not shown to the learner unless the prompt quotes it. `packages` lists what Pyodide must load (`numpy`, `pandas`, `scipy`).
- Keep functions short (under 8 lines in the model solution), the hidden tests few (3 to 6) with at least one edge case, and the run time under 1 s.
- Code items are authored in a second pass once the engine lands. T5 to T9 micro items will use them heavily (see the code share in section 2). Until then those tiers are authored with the non-code kinds, and the code pass adds items without replacing the existing ones. Probes never use `code`.

## 6. Ordering and pacing

Pacing uses the same definitions and formulas as gre-math section 6 (`v`, `r`, `k_R`, `k_M`, `k_F`, session length 25 min, `q` = 8 reviews to own, `p_new` = 0.4, ramp 0.15). Measure from the owner's logs, then substitute. Derivation-heavy tiers (T2 to T4) are slower per item; start with `k_M` at the upper end of 4x to 8x.

Recommended order: T1, T2, T3, T4, T5, T6, T7, T8, T9, T10. Allowed parallel starts: T5 beside T3 once T1 is owned; T7 text-feature and encoding techniques beside T6 once `t6.ml-setup` is learned; T9 causal and time-series techniques beside T8 once T6 is owned. T8 needs T4 (matrix calculus) as a hard step. T10 mixed sets start when T2, T3, T4 and T6 are owned (roughly half of the test mass).

Mixed-session interleaving: after 3 tiers are owned, 30% of review slots draw across tiers.

## 7. Technique list

Count: 138 techniques across 10 tiers. `prereq` lists technique ids within this pack. Machine-readable source: `techniques.json` (this table also carries a short description that the JSON schema has no field for).

```json
[
 {"id": "t1.sets", "tier": 1, "name": "Sets and logic", "desc": "Union, intersection, complement, Venn counts, quantifiers and implication", "prereq": []},
 {"id": "t1.functions", "tier": 1, "name": "Functions and graphs", "desc": "Domain and range, composition, inverse, piecewise, reading graph shapes", "prereq": ["t1.sets"]},
 {"id": "t1.inequalities", "tier": 1, "name": "Inequalities and absolute value", "desc": "Solve linear and quadratic inequalities, |x| conditions, interval notation", "prereq": ["t1.functions"]},
 {"id": "t1.sigma", "tier": 1, "name": "Sums and products", "desc": "Sigma and pi notation, index shifts, sum of first n integers and squares", "prereq": ["t1.functions"]},
 {"id": "t1.geom-series", "tier": 1, "name": "Geometric series", "desc": "Finite and infinite geometric sums, convergence condition, discounting", "prereq": ["t1.sigma"]},
 {"id": "t1.exp-log", "tier": 1, "name": "Exponentials and logarithms", "desc": "Exponent and log laws, change of base, solve for the exponent", "prereq": ["t1.functions"]},
 {"id": "t1.log-scale", "tier": 1, "name": "Log scales and log tricks", "desc": "Products to sums, log-ratio, orders of magnitude, sigmoid and softplus identities", "prereq": ["t1.exp-log"]},
 {"id": "t1.derivative", "tier": 1, "name": "Derivative as rate", "desc": "Slope, average versus instantaneous rate, units of a derivative", "prereq": ["t1.functions"]},
 {"id": "t1.deriv-rules", "tier": 1, "name": "Differentiation rules", "desc": "Power, product, quotient, chain rule, derivatives of exp and log", "prereq": ["t1.derivative", "t1.exp-log"]},
 {"id": "t1.critical-points", "tier": 1, "name": "Maxima and minima", "desc": "Stationary points, second-derivative test, optimise a one-variable function", "prereq": ["t1.deriv-rules"]},
 {"id": "t1.integral", "tier": 1, "name": "Integral as accumulation", "desc": "Area under a curve, definite integral, simple antiderivatives, average value", "prereq": ["t1.deriv-rules"]},
 {"id": "t1.vectors", "tier": 1, "name": "Vectors", "desc": "Components, addition, scaling, vectors as rows of a data table", "prereq": ["t1.functions"]},
 {"id": "t1.dot-norm", "tier": 1, "name": "Dot product and norms", "desc": "Dot product, L1, L2 and max norms, angle and cosine similarity", "prereq": ["t1.vectors"]},
 {"id": "t1.linear-approx", "tier": 1, "name": "Linear and Taylor approximation", "desc": "Tangent-line approximation, second-order Taylor, when it is accurate", "prereq": ["t1.deriv-rules"]},
 {"id": "t2.counting", "tier": 2, "name": "Counting", "desc": "Multiplication rule, permutations, combinations, with and without replacement", "prereq": ["t1.sigma"]},
 {"id": "t2.axioms", "tier": 2, "name": "Probability rules", "desc": "Sample space, complement, addition rule, equally likely outcomes", "prereq": ["t1.sets", "t2.counting"]},
 {"id": "t2.conditional", "tier": 2, "name": "Conditional probability", "desc": "Definition, multiplication rule, tree diagrams, law of total probability", "prereq": ["t2.axioms"]},
 {"id": "t2.bayes", "tier": 2, "name": "Bayes' rule", "desc": "Posterior from prior and likelihood, base-rate effects, test accuracy problems", "prereq": ["t2.conditional"]},
 {"id": "t2.independence", "tier": 2, "name": "Independence", "desc": "Independent versus mutually exclusive, conditional independence, product rule", "prereq": ["t2.conditional"]},
 {"id": "t2.discrete-rv", "tier": 2, "name": "Discrete random variables", "desc": "PMF, CDF, support, functions of a random variable", "prereq": ["t2.axioms", "t1.functions"]},
 {"id": "t2.expectation", "tier": 2, "name": "Expectation", "desc": "Definition, linearity, indicator-variable trick, expectation of a function", "prereq": ["t2.discrete-rv", "t1.sigma"]},
 {"id": "t2.variance", "tier": 2, "name": "Variance and standard deviation", "desc": "Definition, shortcut formula, scaling, variance of independent sums", "prereq": ["t2.expectation"]},
 {"id": "t2.discrete-dists", "tier": 2, "name": "Standard discrete distributions", "desc": "Bernoulli, binomial, geometric, Poisson: mean, variance, when each applies", "prereq": ["t2.variance", "t2.independence", "t2.counting"]},
 {"id": "t2.pdf-cdf", "tier": 2, "name": "Continuous random variables", "desc": "PDF, CDF, probability as area, quantiles, expectation by integral", "prereq": ["t2.variance", "t1.integral"]},
 {"id": "t2.normal", "tier": 2, "name": "Normal distribution", "desc": "Standardisation, z-scores, 68-95-99.7 rule, sums of normals", "prereq": ["t2.pdf-cdf"]},
 {"id": "t2.cont-dists", "tier": 2, "name": "Other continuous distributions", "desc": "Uniform, exponential, memorylessness, gamma and beta as families", "prereq": ["t2.pdf-cdf", "t2.discrete-dists"]},
 {"id": "t2.joint-cov", "tier": 2, "name": "Joint distributions and covariance", "desc": "Joint and marginal, covariance, correlation, variance of a sum", "prereq": ["t2.variance", "t2.independence"]},
 {"id": "t2.tail-bounds", "tier": 2, "name": "Markov and Chebyshev bounds", "desc": "Tail bounds from mean and variance, when they are loose", "prereq": ["t2.variance", "t2.pdf-cdf"]},
 {"id": "t2.lln-clt", "tier": 2, "name": "Law of large numbers and CLT", "desc": "Sample mean behaviour, standard error, normal approximation to binomial", "prereq": ["t2.normal", "t2.tail-bounds", "t2.joint-cov"]},
 {"id": "t3.descriptive", "tier": 3, "name": "Descriptive statistics", "desc": "Mean, median, quantiles, IQR, skew, robust versus sensitive summaries", "prereq": ["t2.variance"]},
 {"id": "t3.sampling", "tier": 3, "name": "Sampling and sampling distributions", "desc": "Random sampling, bias sources, distribution of the sample mean and proportion", "prereq": ["t3.descriptive", "t2.lln-clt"]},
 {"id": "t3.estimators", "tier": 3, "name": "Estimators: bias, variance, MSE", "desc": "Unbiasedness, n versus n-1, bias-variance of an estimator, consistency", "prereq": ["t3.sampling"]},
 {"id": "t3.mle", "tier": 3, "name": "Maximum likelihood", "desc": "Likelihood, log-likelihood, solve for the MLE in Bernoulli, Poisson, normal", "prereq": ["t3.estimators", "t1.critical-points", "t1.log-scale"]},
 {"id": "t3.ci", "tier": 3, "name": "Confidence intervals", "desc": "Construct and interpret z and t intervals, margin of error, width versus n", "prereq": ["t3.estimators", "t2.normal"]},
 {"id": "t3.hypothesis", "tier": 3, "name": "Hypothesis testing logic", "desc": "Null and alternative, p-value, type I and II error, significance level", "prereq": ["t3.ci"]},
 {"id": "t3.t-tests", "tier": 3, "name": "t-tests", "desc": "One-sample, two-sample, paired, degrees of freedom, assumptions", "prereq": ["t3.hypothesis"]},
 {"id": "t3.proportions", "tier": 3, "name": "Tests for proportions", "desc": "One- and two-proportion z-tests, pooled standard error", "prereq": ["t3.hypothesis"]},
 {"id": "t3.chisq", "tier": 3, "name": "Chi-square tests", "desc": "Goodness of fit and independence, expected counts, degrees of freedom", "prereq": ["t3.hypothesis"]},
 {"id": "t3.multiple", "tier": 3, "name": "Multiple testing", "desc": "Family-wise error, Bonferroni, false discovery rate, p-hacking", "prereq": ["t3.hypothesis"]},
 {"id": "t3.power", "tier": 3, "name": "Power and sample size", "desc": "Effect size, power curve, sample size for a target power", "prereq": ["t3.t-tests", "t3.proportions"]},
 {"id": "t3.ab-design", "tier": 3, "name": "Experiment design and A/B tests", "desc": "Randomisation, unit of analysis, guardrails, peeking, novelty effects", "prereq": ["t3.power", "t3.multiple"]},
 {"id": "t3.bootstrap", "tier": 3, "name": "Bootstrap and resampling", "desc": "Percentile bootstrap, standard error by resampling, permutation tests", "prereq": ["t3.ci", "t3.hypothesis"]},
 {"id": "t3.ols-simple", "tier": 3, "name": "Simple linear regression", "desc": "Slope and intercept, R-squared, residuals, interpretation, extrapolation", "prereq": ["t3.descriptive", "t2.joint-cov"]},
 {"id": "t3.ols-multi", "tier": 3, "name": "Multiple regression and inference", "desc": "Coefficients with others fixed, t-tests on coefficients, multicollinearity, assumptions", "prereq": ["t3.ols-simple", "t3.t-tests"]},
 {"id": "t4.matrix-ops", "tier": 4, "name": "Matrix operations", "desc": "Shapes, product, transpose, matrix as linear map, data matrix X", "prereq": ["t1.dot-norm"]},
 {"id": "t4.linear-systems", "tier": 4, "name": "Linear systems", "desc": "Row reduction, unique, none or infinitely many solutions, geometric view", "prereq": ["t4.matrix-ops"]},
 {"id": "t4.inverse-det", "tier": 4, "name": "Inverse and determinant", "desc": "Inverse of 2x2, determinant as volume scale, singular matrices", "prereq": ["t4.linear-systems"]},
 {"id": "t4.span-rank", "tier": 4, "name": "Span, independence, rank", "desc": "Linear independence, basis, rank, null space, dimension count", "prereq": ["t4.linear-systems"]},
 {"id": "t4.projection", "tier": 4, "name": "Orthogonality and projection", "desc": "Projection onto a vector or subspace, orthonormal bases, Gram-Schmidt idea", "prereq": ["t4.matrix-ops", "t4.span-rank"]},
 {"id": "t4.normal-eq", "tier": 4, "name": "Least squares and normal equations", "desc": "Fit by projection, (X'X)^-1 X'y, why it fails when columns are dependent", "prereq": ["t4.projection", "t4.inverse-det", "t3.ols-simple"]},
 {"id": "t4.eigen", "tier": 4, "name": "Eigenvalues and eigenvectors", "desc": "Av = lambda v, characteristic polynomial, trace and determinant link", "prereq": ["t4.inverse-det"]},
 {"id": "t4.spectral", "tier": 4, "name": "Symmetric matrices and quadratic forms", "desc": "Spectral theorem, positive definite, covariance matrix properties", "prereq": ["t4.eigen", "t4.projection"]},
 {"id": "t4.svd", "tier": 4, "name": "Singular value decomposition", "desc": "A = U S V', singular values, low-rank approximation, Eckart-Young", "prereq": ["t4.spectral"]},
 {"id": "t4.pca", "tier": 4, "name": "PCA by linear algebra", "desc": "Covariance eigenvectors, variance explained, projection onto components", "prereq": ["t4.svd", "t3.descriptive"]},
 {"id": "t4.gradient", "tier": 4, "name": "Partial derivatives and gradients", "desc": "Gradient direction, steepest ascent, gradient of a loss in several variables", "prereq": ["t1.deriv-rules", "t4.matrix-ops"]},
 {"id": "t4.matrix-calc", "tier": 4, "name": "Gradients of matrix expressions", "desc": "Chain rule for vectors, gradient of squared error, Jacobian shapes", "prereq": ["t4.gradient"]},
 {"id": "t4.convexity", "tier": 4, "name": "Convexity", "desc": "Convex sets and functions, second-derivative and Hessian tests, why local equals global", "prereq": ["t4.gradient", "t4.spectral"]},
 {"id": "t4.grad-descent", "tier": 4, "name": "Gradient descent", "desc": "Update rule, step size, divergence, convergence on a quadratic, momentum idea", "prereq": ["t4.convexity", "t4.matrix-calc"]},
 {"id": "t4.lagrange", "tier": 4, "name": "Constrained optimisation", "desc": "Lagrange multipliers, equality constraints, regularisation as constraint", "prereq": ["t4.grad-descent"]},
 {"id": "t5.relational", "tier": 5, "name": "Relational model and keys", "desc": "Tables, rows, primary and foreign keys, cardinality, normalisation idea", "prereq": ["t1.sets"]},
 {"id": "t5.sql-select", "tier": 5, "name": "SELECT, WHERE, ORDER BY", "desc": "Projection, filtering, ordering, LIMIT, DISTINCT, expressions and CASE", "prereq": ["t5.relational"]},
 {"id": "t5.sql-null", "tier": 5, "name": "NULL and three-valued logic", "desc": "NULL in comparisons, AND/OR, COUNT(col) versus COUNT(*), COALESCE", "prereq": ["t5.sql-select"]},
 {"id": "t5.sql-joins", "tier": 5, "name": "Joins", "desc": "Inner, left, right, full, cross, join keys, row-count effects and duplicates", "prereq": ["t5.sql-select", "t2.counting"]},
 {"id": "t5.sql-agg", "tier": 5, "name": "GROUP BY and aggregates", "desc": "Aggregates, grouping, HAVING versus WHERE, aggregate over joins", "prereq": ["t5.sql-joins", "t5.sql-null"]},
 {"id": "t5.sql-sub", "tier": 5, "name": "Subqueries and CTEs", "desc": "Scalar, correlated and EXISTS subqueries, CTEs, anti-joins", "prereq": ["t5.sql-agg"]},
 {"id": "t5.sql-window", "tier": 5, "name": "Window functions", "desc": "PARTITION BY, ORDER BY, ranks, running sums, LAG and LEAD, frames", "prereq": ["t5.sql-agg"]},
 {"id": "t5.pandas-index", "tier": 5, "name": "Indexing and selection", "desc": "Label versus position, boolean masks, chained-assignment pitfalls, index alignment", "prereq": ["t5.relational"]},
 {"id": "t5.pandas-vector", "tier": 5, "name": "Vectorised operations and broadcasting", "desc": "Column arithmetic, broadcasting, apply versus vectorised, NaN propagation", "prereq": ["t5.pandas-index", "t4.matrix-ops"]},
 {"id": "t5.pandas-merge", "tier": 5, "name": "Merge, groupby, reshape in pandas", "desc": "merge how=, groupby-transform versus agg, pivot, melt, concat", "prereq": ["t5.pandas-vector", "t5.sql-joins"]},
 {"id": "t5.tidy", "tier": 5, "name": "Tidy data", "desc": "One variable per column, one observation per row, wide versus long, reshaping", "prereq": ["t5.pandas-merge"]},
 {"id": "t5.missing", "tier": 5, "name": "Missing data", "desc": "MCAR, MAR, MNAR, deletion versus imputation, effect on estimates", "prereq": ["t5.tidy", "t3.sampling"]},
 {"id": "t5.cleaning", "tier": 5, "name": "Cleaning and validation", "desc": "Duplicates, outliers, types, dates and time zones, units, invariants and checks", "prereq": ["t5.tidy"]},
 {"id": "t5.complexity", "tier": 5, "name": "Computational cost", "desc": "Big-O, hashing and sorting, index use, join cost, memory versus time", "prereq": ["t5.sql-window", "t5.pandas-merge"]},
 {"id": "t6.ml-setup", "tier": 6, "name": "Supervised learning setup", "desc": "Features and targets, train/validation/test split, empirical risk, generalisation", "prereq": ["t3.ols-multi", "t4.matrix-calc"]},
 {"id": "t6.bias-variance", "tier": 6, "name": "Bias-variance and fit", "desc": "Under- and overfitting, learning curves, complexity versus error", "prereq": ["t6.ml-setup", "t3.estimators"]},
 {"id": "t6.ridge-lasso", "tier": 6, "name": "Regularised linear models", "desc": "Ridge and lasso penalties, shrinkage, sparsity, effect of the penalty strength", "prereq": ["t6.bias-variance", "t4.lagrange"]},
 {"id": "t6.logistic", "tier": 6, "name": "Logistic regression", "desc": "Log-odds, sigmoid, cross-entropy loss, interpreting coefficients", "prereq": ["t6.ml-setup", "t3.mle", "t1.log-scale"]},
 {"id": "t6.loss", "tier": 6, "name": "Loss functions", "desc": "Squared, absolute, Huber, 0-1, hinge, log loss: sensitivity and use", "prereq": ["t6.ml-setup"]},
 {"id": "t6.knn", "tier": 6, "name": "k-nearest neighbours", "desc": "Distance, k and bias-variance, scaling dependence, curse of dimensionality", "prereq": ["t6.bias-variance", "t1.dot-norm"]},
 {"id": "t6.naive-bayes", "tier": 6, "name": "Naive Bayes", "desc": "Conditional independence assumption, class posterior, Laplace smoothing", "prereq": ["t6.ml-setup", "t2.bayes"]},
 {"id": "t6.trees", "tier": 6, "name": "Decision trees", "desc": "Gini and entropy, best split, depth and overfitting, interpretability", "prereq": ["t6.bias-variance"]},
 {"id": "t6.bagging", "tier": 6, "name": "Bagging and random forests", "desc": "Bootstrap aggregation, variance reduction, out-of-bag error, feature subsampling", "prereq": ["t6.trees", "t3.bootstrap"]},
 {"id": "t6.boosting", "tier": 6, "name": "Boosting", "desc": "AdaBoost weights, gradient boosting residual fitting, learning rate, shrinkage", "prereq": ["t6.trees", "t6.loss"]},
 {"id": "t6.svm", "tier": 6, "name": "Support vector machines", "desc": "Margin, support vectors, hinge loss, C, kernel trick idea", "prereq": ["t6.logistic", "t6.loss", "t4.lagrange"]},
 {"id": "t6.cv", "tier": 6, "name": "Cross-validation", "desc": "k-fold, stratified, grouped and time-series splits, nested CV, what not to tune on", "prereq": ["t6.bias-variance"]},
 {"id": "t6.clf-metrics", "tier": 6, "name": "Classification metrics", "desc": "Confusion matrix, accuracy, precision, recall, F1, class imbalance", "prereq": ["t6.logistic"]},
 {"id": "t6.roc-pr", "tier": 6, "name": "Thresholds, ROC and PR curves", "desc": "ROC AUC meaning, PR versus ROC under imbalance, threshold choice by cost", "prereq": ["t6.clf-metrics"]},
 {"id": "t6.reg-metrics", "tier": 6, "name": "Regression metrics", "desc": "MSE, RMSE, MAE, R-squared, MAPE pitfalls, residual diagnostics", "prereq": ["t6.ml-setup", "t6.loss"]},
 {"id": "t6.tuning", "tier": 6, "name": "Hyperparameter tuning and calibration", "desc": "Grid versus random search, validation leakage, probability calibration", "prereq": ["t6.cv", "t6.roc-pr"]},
 {"id": "t7.kmeans", "tier": 7, "name": "k-means", "desc": "Lloyd's algorithm, inertia, initialisation, choosing k, failure modes", "prereq": ["t6.knn", "t4.pca"]},
 {"id": "t7.hierarchical", "tier": 7, "name": "Hierarchical clustering", "desc": "Linkage types, dendrogram reading, cutting at a height", "prereq": ["t7.kmeans"]},
 {"id": "t7.density", "tier": 7, "name": "Density-based clustering", "desc": "DBSCAN core, border and noise points, eps and min points", "prereq": ["t7.kmeans"]},
 {"id": "t7.gmm-em", "tier": 7, "name": "Mixture models and EM", "desc": "Soft assignment, E and M steps by hand, likelihood increases", "prereq": ["t7.kmeans", "t3.mle"]},
 {"id": "t7.cluster-eval", "tier": 7, "name": "Evaluating clusters", "desc": "Silhouette, elbow, stability, external indices, no ground truth", "prereq": ["t7.kmeans"]},
 {"id": "t7.pca-practice", "tier": 7, "name": "PCA in practice", "desc": "Centering and scaling, scree plots, loadings, reconstruction error", "prereq": ["t4.pca"]},
 {"id": "t7.manifold", "tier": 7, "name": "Nonlinear dimension reduction", "desc": "t-SNE and UMAP: what the picture means and does not mean", "prereq": ["t7.pca-practice"]},
 {"id": "t7.embeddings", "tier": 7, "name": "Embeddings and similarity", "desc": "Dense vectors, cosine similarity, nearest-neighbour search, learned versus hand-built", "prereq": ["t7.pca-practice", "t1.dot-norm"]},
 {"id": "t7.encoding", "tier": 7, "name": "Encoding categorical features", "desc": "One-hot, ordinal, target and frequency encoding, high cardinality", "prereq": ["t6.ml-setup"]},
 {"id": "t7.scaling", "tier": 7, "name": "Scaling and transforms", "desc": "Standardise, min-max, log and power transforms, which models need it", "prereq": ["t6.ml-setup", "t1.log-scale"]},
 {"id": "t7.feature-select", "tier": 7, "name": "Feature selection and construction", "desc": "Filter, wrapper and embedded selection, interactions, polynomial features", "prereq": ["t7.scaling", "t6.ridge-lasso"]},
 {"id": "t7.text-features", "tier": 7, "name": "Text features", "desc": "Bag of words, TF-IDF computation, n-grams, sparsity", "prereq": ["t7.scaling"]},
 {"id": "t7.leakage", "tier": 7, "name": "Data leakage", "desc": "Target and train-test leakage, fit-on-train-only, time leakage, leaky pipelines", "prereq": ["t7.encoding", "t7.scaling", "t6.cv"]},
 {"id": "t7.anomaly", "tier": 7, "name": "Anomaly detection", "desc": "Z-score, isolation forest idea, density methods, evaluating rare events", "prereq": ["t7.density", "t3.descriptive"]},
 {"id": "t8.mlp", "tier": 8, "name": "Neural network basics", "desc": "Neurons, layers, forward pass by hand, parameter counts, universal approximation idea", "prereq": ["t4.matrix-ops", "t6.logistic"]},
 {"id": "t8.activations", "tier": 8, "name": "Activation functions", "desc": "Sigmoid, tanh, ReLU and variants, saturation, vanishing gradients", "prereq": ["t8.mlp"]},
 {"id": "t8.softmax-ce", "tier": 8, "name": "Softmax and cross-entropy", "desc": "Softmax computation, cross-entropy, gradient softmax minus onehot, numerical stability", "prereq": ["t8.mlp", "t1.log-scale"]},
 {"id": "t8.backprop", "tier": 8, "name": "Backpropagation", "desc": "Computation graph, chain rule backward, gradients of a tiny network", "prereq": ["t8.mlp", "t4.matrix-calc"]},
 {"id": "t8.optimizers", "tier": 8, "name": "Optimisers", "desc": "SGD, minibatch, momentum, RMSprop, Adam updates, learning-rate effects", "prereq": ["t8.backprop", "t4.grad-descent"]},
 {"id": "t8.init-norm", "tier": 8, "name": "Initialisation and normalisation", "desc": "Xavier and He scale, batch and layer norm, why they stabilise training", "prereq": ["t8.backprop", "t8.activations"]},
 {"id": "t8.regularization", "tier": 8, "name": "Regularisation in deep nets", "desc": "Weight decay, dropout, early stopping, augmentation, label smoothing", "prereq": ["t8.backprop", "t6.ridge-lasso"]},
 {"id": "t8.training-diag", "tier": 8, "name": "Reading training curves", "desc": "Over- and underfitting from curves, lr too high or low, debugging a flat loss", "prereq": ["t8.optimizers", "t8.regularization"]},
 {"id": "t8.conv", "tier": 8, "name": "Convolution arithmetic", "desc": "Output size, stride, padding, parameter count, receptive field", "prereq": ["t8.mlp"]},
 {"id": "t8.cnn-arch", "tier": 8, "name": "CNN architectures", "desc": "Pooling, residual connections, feature hierarchy, 1x1 convolutions", "prereq": ["t8.conv", "t8.init-norm"]},
 {"id": "t8.rnn", "tier": 8, "name": "Recurrent networks", "desc": "Hidden state, unrolling, BPTT, vanishing gradient, gating in LSTM and GRU", "prereq": ["t8.backprop"]},
 {"id": "t8.attention", "tier": 8, "name": "Attention", "desc": "Queries, keys, values, scaled dot-product attention computed by hand, masking", "prereq": ["t8.softmax-ce", "t4.matrix-ops"]},
 {"id": "t8.transformer", "tier": 8, "name": "Transformer architecture", "desc": "Positional encoding, multi-head, residual and norm, parameter and cost scaling", "prereq": ["t8.attention", "t8.init-norm"]},
 {"id": "t8.transfer", "tier": 8, "name": "Transfer learning and fine-tuning", "desc": "Pretrained features, freezing, fine-tuning, when little data is available", "prereq": ["t8.cnn-arch", "t7.embeddings"]},
 {"id": "t9.causal-po", "tier": 9, "name": "Potential outcomes", "desc": "ATE, randomised effect estimate, selection bias, SUTVA", "prereq": ["t3.ab-design"]},
 {"id": "t9.causal-dag", "tier": 9, "name": "Confounding and causal graphs", "desc": "Confounder, mediator, collider, back-door adjustment, Simpson's paradox", "prereq": ["t9.causal-po", "t2.conditional"]},
 {"id": "t9.causal-quasi", "tier": 9, "name": "Observational causal methods", "desc": "Matching, propensity scores, difference-in-differences, instrumental variables", "prereq": ["t9.causal-dag", "t3.ols-multi"]},
 {"id": "t9.ts-decomp", "tier": 9, "name": "Time series structure", "desc": "Trend, seasonality, stationarity, differencing, autocorrelation", "prereq": ["t3.ols-simple", "t2.joint-cov"]},
 {"id": "t9.ts-arima", "tier": 9, "name": "Autoregressive and moving-average models", "desc": "AR(1) properties, MA, ARIMA orders, reading ACF and PACF", "prereq": ["t9.ts-decomp"]},
 {"id": "t9.ts-eval", "tier": 9, "name": "Forecast evaluation", "desc": "Rolling-origin split, naive baselines, MASE, prediction intervals", "prereq": ["t9.ts-decomp", "t6.cv"]},
 {"id": "t9.bayes-conj", "tier": 9, "name": "Bayesian updating", "desc": "Prior, likelihood, posterior, beta-binomial, credible interval, MAP", "prereq": ["t2.bayes", "t3.mle"]},
 {"id": "t9.bayes-mcmc", "tier": 9, "name": "Bayesian computation", "desc": "Metropolis acceptance step, MCMC diagnostics, posterior predictive check", "prereq": ["t9.bayes-conj"]},
 {"id": "t9.recsys-cf", "tier": 9, "name": "Collaborative filtering", "desc": "User and item similarity, cold start, implicit versus explicit feedback", "prereq": ["t7.embeddings"]},
 {"id": "t9.recsys-mf", "tier": 9, "name": "Matrix factorisation for recommenders", "desc": "Latent factors, ALS and SGD objectives, regularisation, predicted rating by hand", "prereq": ["t9.recsys-cf", "t4.svd"]},
 {"id": "t9.ranking-metrics", "tier": 9, "name": "Ranking and retrieval metrics", "desc": "Precision at k, recall at k, MAP, NDCG, MRR computed on short lists", "prereq": ["t9.recsys-cf", "t6.clf-metrics"]},
 {"id": "t9.nlp-ngram", "tier": 9, "name": "Language models and NLP basics", "desc": "N-gram probabilities, smoothing, perplexity, tokenisation, text classification", "prereq": ["t7.text-features", "t2.conditional"]},
 {"id": "t9.mlops-track", "tier": 9, "name": "Experiment tracking and reproducibility", "desc": "Seeds, versioned data and code, run comparison, leaderboards that mislead", "prereq": ["t6.tuning"]},
 {"id": "t9.drift", "tier": 9, "name": "Deployment and drift", "desc": "Train-serve skew, data and concept drift, monitoring, A/B rollouts", "prereq": ["t9.mlops-track", "t7.leakage"]},
 {"id": "t9.fairness", "tier": 9, "name": "Fairness metrics", "desc": "Demographic parity, equalised odds, impossibility, base-rate effects", "prereq": ["t6.roc-pr", "t9.causal-dag"]},
 {"id": "t9.privacy", "tier": 9, "name": "Privacy and responsible use", "desc": "Re-identification, k-anonymity, differential privacy intuition, consent and governance", "prereq": ["t9.fairness"]},
 {"id": "t10.case-framing", "tier": 10, "name": "Case-study framing", "desc": "Turn a vague business question into a target, population, unit and decision", "prereq": []},
 {"id": "t10.metric-choice", "tier": 10, "name": "Metric choice", "desc": "Match metric to cost structure, imbalance, and stakeholder; offline versus online metrics", "prereq": []},
 {"id": "t10.pipeline", "tier": 10, "name": "End-to-end pipeline", "desc": "Order of steps: split, clean, features, model, evaluate; spot the leaky or missing step", "prereq": []},
 {"id": "t10.model-selection", "tier": 10, "name": "Model selection under constraints", "desc": "Pick a model given data size, latency, interpretability and budget limits", "prereq": []},
 {"id": "t10.communicate", "tier": 10, "name": "Communicating results", "desc": "State effect with uncertainty, caveats, and a recommendation in plain words", "prereq": []}
]
```
