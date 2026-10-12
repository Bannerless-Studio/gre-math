# GRE Physics Subject Test: curriculum for the `gre-physics` pack

Status: draft v1, 2026-10-13. Owner: problem-engine. Pack path: `packs/gre-physics/`. Mirrors `packs/gre-math/CURRICULUM.md` in structure and schema.

## 1. Target analysis

Source: ETS "GRE Subject Test Content and Structure" page (https://www.ets.org/gre/test-takers/subject-tests/about/content-structure.html), fetched 2026-10-13. The Physics practice book (ETS PDF) was located by search but not read.

| Fact | Value (ETS page, 2026-10-13) |
|---|---|
| Format | About 70 five-choice questions |
| Time | 2 h total (about 1.7 min per question) |
| Classical mechanics | 20% |
| Electromagnetism | 18% |
| Quantum mechanics | 13% |
| Thermodynamics and statistical mechanics | 10% |
| Atomic physics | 10% |
| Specialized topics | 9% (nuclear and particle, condensed matter, miscellaneous) |
| Optics and wave phenomena | 8% |
| Special relativity | 6% |
| Laboratory methods | 6% |

**Discrepancy with the task brief.** The brief assumed about 100 questions in 170 min, quantum mechanics 12% and optics 9%. The ETS page above says about 70 questions in 2 h, quantum 13%, optics 8%. The older 100-question, 170-minute format appears in third-party pages and older practice material. This pack uses the ETS page values. The pace is about 1.7 min per question in both formats, so technique time targets are unaffected. `pack.json` weights use the ETS page percentages. Not verified: current registration or administration schedule; whether the format changed recently. Check ETS before telling the owner a test date exists.

ETS lists "major subtopics" per category but the page does not enumerate them. Topic coverage here follows the standard syllabus for each category (classical mechanics incl. Lagrangian and Hamiltonian formalism; electromagnetism through Maxwell's equations; and so on) and should be cross-checked against the ETS practice book when items are authored.

**Floor and maths prerequisites.** Floor is end-of-O-level physics and maths. Calculus and linear algebra are NOT re-taught in this pack. The learner is expected to carry the matching `gre-math` tiers: T1-T2 algebra and trig, T3 Calculus I, T4 Calculus II, T5 Calculus III and vector calculus, T6 linear algebra, T9 ODE and complex numbers. Each tier below names its `mathPrereq` as a note only. `techniques.json` prereqs stay inside this pack.

**Tier ladder versus exam weights.** Tiers follow the suggested ladder with two adjustments:
- Classical mechanics (20%) is split: Newtonian mechanics (about 14%) is T2, Lagrangian and Hamiltonian (about 6%) shares T6 with special relativity (6%).
- Laboratory methods (6%) is spread: error and graph skills are in T1, statistics and instruments are in T9, and test-mode estimation and checks are in T10. Specialized topics (9%) and atomic (10%) share T9.
- Optics (8%) shares T3 with waves, fluids and thermal basics, since fluids and ideal-gas basics are needed below T7.

Consequences for item mass: T2 (mechanics) and T4-T5 (EM) carry the most; T8 (quantum, 13%) and T9 (atomic 10% + specialized 9% + lab 6%) are the largest single tiers by technique count.

## 2. Tier ladder

Floor: end-of-O-level physics and maths. Tier ids are `t1` to `t10`. Technique ids are `t<tier>.<slug>`. A technique is the SRS unit: it owns a pool of recall, micro, and full items, and has its own schedule state.

Item-count notation: `R/M/F` = recall / micro / full items **per tier** (pool size to author). Per-technique minimum: 2 R, 4 M, plus full items shared across the tier.

Tier-wide mix targets after placement: recall 25%, micro 60%, full 15% of reviews. T10 inverts this.

### T1. Physics fluency: units, vectors, kinematics, estimation
- **Prerequisites:** none (floor: O-level physics and maths)
- **mathPrereq (note only):** gre-math T1, T2 (algebra, trig); T3 for derivative as rate
- **Items (R/M/F):** 30/90/15
- **Techniques (13):** `t1.units`, `t1.sigfig`, `t1.dimanal`, `t1.vec-comp`, `t1.vec-prod`, `t1.kin-1d`, `t1.kin-2d`, `t1.graphs`, `t1.estimate`, `t1.scaling`, `t1.small-angle`, `t1.linearize`, `t1.calc-rates`
- **Own this tier:** Convert units and check dimensions in under 30 s; resolve vectors; solve kinematics and projectile problems; estimate to a power of ten. 85% on a 20-item mixed set at target time.

### T2. Newtonian mechanics: forces, energy, momentum, rotation, oscillations
- **Prerequisites:** t1
- **mathPrereq (note only):** gre-math T3 (derivatives), T4 (integrals), T5 vec-ops
- **Items (R/M/F):** 45/130/25
- **Techniques (16):** `t2.newton`, `t2.fbd`, `t2.friction-drag`, `t2.incline-pulley`, `t2.circular`, `t2.work-energy`, `t2.potential`, `t2.momentum`, `t2.collisions`, `t2.com`, `t2.torque-statics`, `t2.rot-dynamics`, `t2.ang-mom`, `t2.gravitation`, `t2.shm`, `t2.damped-driven`
- **Own this tier:** Set up and solve force, energy, momentum, rotation and SHM problems in under 2 min; pick conservation law before Newton's law. 85% on a 24-item set.

### T3. Waves, optics, fluids and thermal basics
- **Prerequisites:** t1, t2
- **mathPrereq (note only):** gre-math T2 (trig), T3 (derivatives)
- **Items (R/M/F):** 35/100/20
- **Techniques (14):** `t3.wave-basics`, `t3.superpose`, `t3.sound`, `t3.intensity`, `t3.refraction`, `t3.geom-optics`, `t3.interference`, `t3.thin-film`, `t3.diffraction`, `t3.polarization`, `t3.optical-instruments`, `t3.fluid-static`, `t3.fluid-flow`, `t3.ideal-gas`
- **Own this tier:** Solve standing wave, Doppler, lens, slit and thin-film problems; apply Bernoulli and the ideal gas law. 85% on a 20-item set.

### T4. Electrostatics and circuits
- **Prerequisites:** t1, t2
- **mathPrereq (note only):** gre-math T3, T4, T5 (partials, line and surface integrals, divergence, Gauss-type symmetry)
- **Items (R/M/F):** 35/100/20
- **Techniques (14):** `t4.coulomb`, `t4.gauss`, `t4.potential`, `t4.multipole`, `t4.conductors`, `t4.images`, `t4.laplace`, `t4.capacitors`, `t4.dielectrics`, `t4.dc-circuits`, `t4.kirchhoff`, `t4.rc-transient`, `t4.drude`, `t4.em-energy`
- **Own this tier:** Use Gauss's law, potential and symmetry quickly; reduce resistor and RC networks; compute capacitor energy. 85% on a 20-item set.

### T5. Magnetism, induction, Maxwell and EM waves
- **Prerequisites:** t3 (waves), t4
- **mathPrereq (note only):** gre-math T5 (curl, divergence, Stokes), T9 ODE for RLC
- **Items (R/M/F):** 45/120/25
- **Techniques (15):** `t5.lorentz`, `t5.biot-savart`, `t5.ampere`, `t5.mag-materials`, `t5.faraday`, `t5.inductance`, `t5.rl-lc`, `t5.ac-circuits`, `t5.resonance`, `t5.maxwell`, `t5.disp-current`, `t5.em-waves`, `t5.poynting`, `t5.em-boundary`, `t5.radiation`
- **Own this tier:** Apply Ampere and Faraday laws, solve RL, LC, AC problems, read Maxwell's equations, find EM wave properties. 85% on a 24-item set.

### T6. Lagrangian and Hamiltonian mechanics, special relativity
- **Prerequisites:** t2, t5.em-waves (for t6.lorentz-tr only)
- **mathPrereq (note only):** gre-math T3, T5 (partials), T6 (eigenvalues for normal modes), T9 ODE
- **Items (R/M/F):** 40/110/20
- **Techniques (14):** `t6.gen-coords`, `t6.euler-lagrange`, `t6.cyclic`, `t6.hamiltonian`, `t6.central-force`, `t6.eff-potential`, `t6.small-osc`, `t6.rotating`, `t6.lorentz-tr`, `t6.dilation-contraction`, `t6.vel-addition`, `t6.rel-energy`, `t6.invariants`, `t6.rel-collisions`
- **Own this tier:** Derive equations of motion from L, find normal modes, apply Lorentz transforms, energy-momentum relations and invariants. 85% on a 20-item set.

### T7. Thermodynamics and statistical mechanics
- **Prerequisites:** t2, t3.ideal-gas
- **mathPrereq (note only):** gre-math T4 (integrals), T5 (partials), T9 prob-basics and distributions
- **Items (R/M/F):** 40/110/20
- **Techniques (14):** `t7.first-law`, `t7.gas-processes`, `t7.engines`, `t7.entropy`, `t7.second-law`, `t7.potentials`, `t7.phase`, `t7.kinetic`, `t7.equipartition`, `t7.counting`, `t7.canonical`, `t7.quantum-stats`, `t7.blackbody`, `t7.heat-transfer`
- **Own this tier:** Compute work, heat, entropy for standard processes; use partition functions for two-level and oscillator systems; recall FD and BE limits. 85% on a 20-item set.

### T8. Quantum mechanics
- **Prerequisites:** t2, t3.wave-basics, t6.hamiltonian
- **mathPrereq (note only):** gre-math T4 (integrals), T6 (linear algebra, eigenvalues), T9 ODE, complex-arith
- **Items (R/M/F):** 50/140/25
- **Techniques (15):** `t8.born`, `t8.tise`, `t8.inf-well`, `t8.step-tunnel`, `t8.qho`, `t8.operators`, `t8.uncertainty`, `t8.dirac`, `t8.spin-half`, `t8.ang-mom-qm`, `t8.time-evol`, `t8.two-level`, `t8.perturbation`, `t8.variational`, `t8.identical`
- **Own this tier:** Solve well, oscillator and spin problems; use commutators and expectation values; apply first-order perturbation theory. 85% on a 24-item set.

### T9. Atomic, nuclear, particle, condensed matter, lab methods
- **Prerequisites:** t6, t7, t8 (t1 for lab-stats)
- **mathPrereq (note only):** gre-math T9 prob and distributions for counting statistics, T6 for angular momentum addition
- **Items (R/M/F):** 60/170/30
- **Techniques (17):** `t9.hydrogen`, `t9.fine-hyperfine`, `t9.zeeman-stark`, `t9.selection`, `t9.multi-electron`, `t9.xray-spectra`, `t9.early-quantum`, `t9.nuclear-structure`, `t9.decay`, `t9.nuclear-reactions`, `t9.particle-kinematics`, `t9.standard-model`, `t9.crystal-bands`, `t9.semiconductors`, `t9.solid-thermal`, `t9.lab-stats`, `t9.lab-electronics`
- **Own this tier:** Recall atomic spectra rules, nuclear energetics, particle conservation laws, band-theory facts and lab error methods, each in under 2 min. 85% on a 30-item set.

### T10. Test mode: timed mixed sets and full-length practice
- **Prerequisites:** t1 to t9 placed or owned (at least 80% of mass in t2, t4, t5, t8)
- **mathPrereq (note only):** none
- **Items (R/M/F):** 40/120/40
- **Techniques (5):** `t10.pacing`, `t10.elimination`, `t10.dim-limits`, `t10.order-magnitude`, `t10.full-practice`
- **Own this tier:** Full practice test (70 questions in 120 min on the current ETS page) at or above target score on 2 consecutive attempts, with an error log showing no repeated technique miss.

Total items to author: 420 R, 1190 M, 240 F = 1850. Mass per tier follows exam weight: T2 (45/130/25), T5 and T8 (45-50 R, 120-140 M), T9 largest because it covers three ETS categories.

## 3. Rules shared by all tiers

- **Own a technique** = last 3 reviews correct, no hint, micro items under 1.5x target time, and the interval at least 7 days.
- **Own a tier** = at least 85% of its techniques owned, and no technique under 60% rolling accuracy.
- **Unlock rule.** A technique unlocks when every prereq technique in its list is at least "learning" (two correct reviews). A tier opens for new cards when all its prereq tiers are owned or placed out.
- Full items are self-graded against the rubric as in `docs/PACK_SCHEMA.md`. Grade 2 counts as correct for the scheduler.
- Recall items test statements and relations, not names: "state the condition" beats "what is the name of".

## 4. Placement diagnostic

Goal: find the first tier the learner does not own, skipping tiers already owned.

Design:
- 5 probe items per tier for T1 to T9 (rotate which techniques are probed across retakes where a tier has more than 5 candidates). T10 is never probed.
- Probes are tier b (micro) items, one per technique, flagged `probe: true`. Format: MCQ with "I don't know" as an explicit option scoring 0. Time cap 3 min per item. Ascending tier, easy to hard within a tier.

Probe sets (technique slugs, five per tier, all present in `techniques.json`):

- T1: units, dimanal, kin-2d, estimate, small-angle
- T2: newton, work-energy, collisions, rot-dynamics, shm
- T3: superpose, sound, geom-optics, diffraction, fluid-flow
- T4: gauss, potential, capacitors, kirchhoff, rc-transient
- T5: lorentz, ampere, faraday, ac-circuits, em-waves
- T6: euler-lagrange, central-force, small-osc, dilation-contraction, rel-energy
- T7: first-law, engines, entropy, canonical, quantum-stats
- T8: inf-well, qho, operators, spin-half, perturbation
- T9: hydrogen, selection, nuclear-structure, decay, lab-stats

Scoring and stop rule follow the engine (`docs/PACK_SCHEMA.md`, Placement): tier owned at accuracy >= 0.7, stop after the engine's empty-bucket or low-accuracy runs, placed techniques start provisional. Retake allowed after 14 days using unseen probes. Cross-tier note: T6 special relativity techniques need only `t5.em-waves` for the Lorentz transform ordering (a recommendation); the Lagrangian half of T6 needs only T2.

## 5. Item authoring guide

General rules (copied from gre-math, plus physics rules below):
- All items are original, written in ETS style. Never copy or lightly rephrase released ETS or other published test questions. ETS practice book problems are read for style only.
- Markdown plus LaTeX `$...$` inline and `$$...$$` display.
- Every item carries `id`, `tier`, `level`, `tags`, `difficulty` (1-5), `prompt`, `solution`, `answer`, `source` per `docs/PACK_SCHEMA.md`. Original templates in the gre-math document remain the authoring shape; field names are the schema's.
- Every micro item has a machine-checkable `answer`: `numeric`, `mcq`, `expression` or `multi`. At least one `numeric` or `expression` micro item per technique so the production gate can be met.
- MCQ options: four choices for recall and micro items (tiers a, b; the checker enforces 4), five like the real test for full items (tier c). Each distractor is the result of one specific plausible wrong move (wrong formula, dropped factor, unit slip, sign error). Record it in the option's `why`. Never use filler distractors.
- One technique per micro item; secondary techniques go in `tags[1:]`.
- Solutions: worked path under 8 lines for micro, full step list for full, plus the "ETS trap" note when one exists.
- Game text brevity: prompts and solutions are short and concise.

Physics-specific rules:
- **Numeric answers** are a number in a stated SI unit. The prompt says the unit ("Find the speed in m/s."). The learner never types units.
- **Tolerance.** For computed decimals use `form: "decimal"` with `rel: 0.02` unless a tighter value is stated. For exact results (integers, simple fractions) use `form: "exact"` or `"fraction"`.
- **Constants are given in the prompt**, with 3 significant figures: $g=9.8\ \mathrm{m/s^2}$, $c=3.00\times10^{8}\ \mathrm{m/s}$, $h=6.63\times10^{-34}\ \mathrm{J\,s}$, $\hbar=1.05\times10^{-34}\ \mathrm{J\,s}$, $q=1.60\times10^{-19}\ \mathrm C$, $k_B=1.38\times10^{-23}\ \mathrm{J/K}$, $\varepsilon_0=8.85\times10^{-12}\ \mathrm{F/m}$, $\mu_0=4\pi\times10^{-7}\ \mathrm{T\,m/A}$, $m_e=9.11\times10^{-31}\ \mathrm{kg}$, $m_p=1.67\times10^{-27}\ \mathrm{kg}$. Only give those the item uses. Tolerances of 2% absorb rounding differences.
- **Symbolic answers** use kind `expression` with `vars` listing the variable names. Names may be single letters or simple identifiers (`hbar`, `eps0`, `mu0`, `omega`). **Avoid `e` as a variable**, because the parser may read it as Euler's number. Write "elementary charge $q$" in the prompt and use `q`.
- **Figures.** A prompt may carry a `figure` field with inline SVG (engine support is being added in parallel). Use sparingly. Prefer a verbal setup ("a block of mass $m$ on a frictionless $30^\circ$ incline").
- Scale-aware options: when options differ by powers of ten, state in `why` which wrong exponent each distractor represents.

## 6. Ordering and pacing

Pacing uses the same definitions and formulas as gre-math section 6 (`v`, `r`, `k_R`, `k_M`, `k_F`, session length 25 min, `q` = 8 reviews to own, `p_new` = 0.4, ramp 0.15). Measure from the owner's logs, then substitute. Physics problems are slower per item than algebra; start with `k_M` at the upper end of 4x to 8x.

Recommended order: T1, T2, T3, T4, T5, T6, T7, T8, T9, T10. Allowed parallel starts: T6 Lagrangian half beside T3 once T2 is owned; T7 beside T5 once T3 is owned (needs `t3.ideal-gas` and T2). T8 needs `t6.hamiltonian`, so the Lagrangian half of T6 is a hard step before quantum. T10 mixed sets start when T2, T4, T5 and T8 are owned (roughly half of test mass).

Mixed-session interleaving: after 3 tiers are owned, 30% of review slots draw across tiers.

## 7. Technique list


Count: 137 techniques across 10 tiers. `prereq` lists technique ids within this pack; tier-level and maths prereqs are in Section 2. Machine-readable source: `techniques.json`.

```json
[
 {"id": "t1.units", "tier": 1, "name": "SI units and prefixes", "desc": "Convert between units, powers of ten, derived SI units (N, J, W, Pa, T, Hz)", "prereq": []},
 {"id": "t1.sigfig", "tier": 1, "name": "Significant figures and error propagation", "desc": "Sig figs, absolute/relative error, propagation for sums, products, powers", "prereq": []},
 {"id": "t1.dimanal", "tier": 1, "name": "Dimensional analysis", "desc": "Check formulas by dimensions, derive scaling forms, find unknown exponents", "prereq": ["t1.units"]},
 {"id": "t1.vec-comp", "tier": 1, "name": "Vector components and addition", "desc": "Resolve and add vectors, magnitude and direction, unit vectors", "prereq": []},
 {"id": "t1.vec-prod", "tier": 1, "name": "Dot and cross products", "desc": "Work as dot product, torque and field cross products, right-hand rule", "prereq": ["t1.vec-comp"]},
 {"id": "t1.kin-1d", "tier": 1, "name": "One-dimensional kinematics", "desc": "Constant acceleration equations, free fall, v-t and x-t relations", "prereq": ["t1.units"]},
 {"id": "t1.kin-2d", "tier": 1, "name": "Projectile and 2D kinematics", "desc": "Independent components, range, max height, relative velocity", "prereq": ["t1.vec-comp", "t1.kin-1d"]},
 {"id": "t1.graphs", "tier": 1, "name": "Reading physics graphs", "desc": "Slopes as rates, areas as accumulated quantities, area under v-t and F-x", "prereq": ["t1.kin-1d"]},
 {"id": "t1.estimate", "tier": 1, "name": "Order-of-magnitude estimation", "desc": "Fermi estimates with remembered constants and sizes", "prereq": ["t1.units"]},
 {"id": "t1.scaling", "tier": 1, "name": "Scaling and proportional reasoning", "desc": "How a quantity changes when length, mass or frequency is scaled; power laws", "prereq": ["t1.dimanal"]},
 {"id": "t1.small-angle", "tier": 1, "name": "Small-quantity approximations", "desc": "sin x ~ x, (1+x)^n ~ 1+nx, ln(1+x) ~ x, when each applies", "prereq": ["t1.scaling"]},
 {"id": "t1.linearize", "tier": 1, "name": "Linearizing data", "desc": "Log-log and semilog plots, slope and intercept meaning, fit reading", "prereq": ["t1.graphs", "t1.scaling"]},
 {"id": "t1.calc-rates", "tier": 1, "name": "Calculus as rates and sums", "desc": "Derivative as rate of change, integral as accumulation, in physics settings", "prereq": ["t1.graphs"]},
 {"id": "t2.newton", "tier": 2, "name": "Newton's laws", "desc": "Net force and acceleration, action-reaction, inertial frames", "prereq": ["t1.vec-comp", "t1.kin-2d"]},
 {"id": "t2.fbd", "tier": 2, "name": "Free-body diagrams", "desc": "Draw and resolve forces, equilibrium conditions, tension and normal force", "prereq": ["t2.newton"]},
 {"id": "t2.friction-drag", "tier": 2, "name": "Friction and drag", "desc": "Static and kinetic friction, terminal velocity, linear and quadratic drag", "prereq": ["t2.fbd"]},
 {"id": "t2.incline-pulley", "tier": 2, "name": "Inclines, pulleys, constraints", "desc": "Connected bodies, string constraints, Atwood machine", "prereq": ["t2.fbd"]},
 {"id": "t2.circular", "tier": 2, "name": "Circular motion", "desc": "Centripetal acceleration, banking, vertical circles, non-uniform circular motion", "prereq": ["t2.newton"]},
 {"id": "t2.work-energy", "tier": 2, "name": "Work and kinetic energy", "desc": "Work as integral of F dx, work-energy theorem, power", "prereq": ["t1.vec-prod", "t2.newton"]},
 {"id": "t2.potential", "tier": 2, "name": "Potential energy and conservation", "desc": "Force from potential F=-dU/dx, equilibrium types, energy diagrams", "prereq": ["t2.work-energy", "t1.calc-rates"]},
 {"id": "t2.momentum", "tier": 2, "name": "Momentum and impulse", "desc": "Impulse-momentum, conservation, variable-mass idea, rocket equation", "prereq": ["t2.newton"]},
 {"id": "t2.collisions", "tier": 2, "name": "Collisions", "desc": "Elastic and inelastic, center-of-mass frame, coefficient of restitution", "prereq": ["t2.momentum", "t2.work-energy"]},
 {"id": "t2.com", "tier": 2, "name": "Center of mass and two-body motion", "desc": "Center of mass of systems, reduced mass, motion of the CM", "prereq": ["t2.momentum"]},
 {"id": "t2.torque-statics", "tier": 2, "name": "Torque and static equilibrium", "desc": "Torque as cross product, ladders and beams, balance of moments", "prereq": ["t1.vec-prod", "t2.fbd"]},
 {"id": "t2.rot-dynamics", "tier": 2, "name": "Rotational dynamics", "desc": "Moment of inertia, parallel-axis theorem, tau = I alpha, rolling", "prereq": ["t2.torque-statics", "t2.com"]},
 {"id": "t2.ang-mom", "tier": 2, "name": "Angular momentum", "desc": "L = r x p, conservation, rigid-body L = I omega, gyroscope idea", "prereq": ["t2.rot-dynamics", "t2.collisions"]},
 {"id": "t2.gravitation", "tier": 2, "name": "Gravitation and Kepler", "desc": "Inverse-square gravity, escape speed, circular orbits, Kepler's laws", "prereq": ["t2.circular", "t2.potential"]},
 {"id": "t2.shm", "tier": 2, "name": "Simple harmonic motion", "desc": "Springs, pendulums, energy in SHM, period formulas", "prereq": ["t2.potential"]},
 {"id": "t2.damped-driven", "tier": 2, "name": "Damped and driven oscillators", "desc": "Damping regimes, Q factor, resonance amplitude and phase", "prereq": ["t2.shm"]},
 {"id": "t3.wave-basics", "tier": 3, "name": "Wave properties", "desc": "Wave equation, v = f lambda, phase, traveling waves, dispersion idea", "prereq": ["t2.shm"]},
 {"id": "t3.superpose", "tier": 3, "name": "Superposition and standing waves", "desc": "Beats, strings and pipes, harmonics, boundary conditions", "prereq": ["t3.wave-basics"]},
 {"id": "t3.sound", "tier": 3, "name": "Sound and the Doppler effect", "desc": "Speed of sound, Doppler shift for moving source and observer, shock waves", "prereq": ["t3.wave-basics"]},
 {"id": "t3.intensity", "tier": 3, "name": "Intensity and decibels", "desc": "Inverse-square law, decibel scale, energy transport by waves", "prereq": ["t3.sound"]},
 {"id": "t3.refraction", "tier": 3, "name": "Reflection and refraction", "desc": "Snell's law, total internal reflection, critical angle, prisms", "prereq": ["t3.wave-basics"]},
 {"id": "t3.geom-optics", "tier": 3, "name": "Mirrors and thin lenses", "desc": "Thin-lens equation, magnification, image types, lens combinations", "prereq": ["t3.refraction"]},
 {"id": "t3.interference", "tier": 3, "name": "Two-source interference", "desc": "Young's slits, path difference, fringe spacing, phase conditions", "prereq": ["t3.superpose"]},
 {"id": "t3.thin-film", "tier": 3, "name": "Thin-film interference", "desc": "Phase change on reflection, film thickness conditions, Newton's rings", "prereq": ["t3.interference", "t3.refraction"]},
 {"id": "t3.diffraction", "tier": 3, "name": "Diffraction and gratings", "desc": "Single-slit minima, grating maxima, resolving power, Rayleigh criterion", "prereq": ["t3.interference"]},
 {"id": "t3.polarization", "tier": 3, "name": "Polarization", "desc": "Malus's law, Brewster's angle, birefringence, circular polarization", "prereq": ["t3.refraction"]},
 {"id": "t3.optical-instruments", "tier": 3, "name": "Optical instruments", "desc": "Telescopes, microscopes, eye, aperture and resolution limits", "prereq": ["t3.geom-optics", "t3.diffraction"]},
 {"id": "t3.fluid-static", "tier": 3, "name": "Fluid statics", "desc": "Pressure with depth, Pascal, buoyancy, surface tension", "prereq": ["t2.fbd"]},
 {"id": "t3.fluid-flow", "tier": 3, "name": "Fluid dynamics", "desc": "Continuity, Bernoulli, viscosity, Reynolds number scaling", "prereq": ["t3.fluid-static", "t2.work-energy"]},
 {"id": "t3.ideal-gas", "tier": 3, "name": "Ideal gas and heat basics", "desc": "PV = nRT, calorimetry, thermal expansion, specific heat", "prereq": ["t1.units", "t2.work-energy"]},
 {"id": "t4.coulomb", "tier": 4, "name": "Coulomb's law and electric field", "desc": "Point charges, superposition of fields, continuous distributions", "prereq": ["t1.vec-comp", "t2.newton"]},
 {"id": "t4.gauss", "tier": 4, "name": "Gauss's law", "desc": "Flux, symmetric charge distributions, fields in and near conductors", "prereq": ["t4.coulomb"]},
 {"id": "t4.potential", "tier": 4, "name": "Electric potential", "desc": "V from charge, V and E relation, equipotentials, energy of charge systems", "prereq": ["t4.coulomb", "t2.potential"]},
 {"id": "t4.multipole", "tier": 4, "name": "Dipoles and multipoles", "desc": "Dipole field and potential, torque and energy, multipole expansion", "prereq": ["t4.potential"]},
 {"id": "t4.conductors", "tier": 4, "name": "Conductors in electrostatics", "desc": "Zero interior field, induced charge, shielding, surface charge", "prereq": ["t4.gauss"]},
 {"id": "t4.images", "tier": 4, "name": "Method of images", "desc": "Point charge near a grounded plane or sphere, induced charge and force", "prereq": ["t4.conductors", "t4.potential"]},
 {"id": "t4.laplace", "tier": 4, "name": "Laplace's equation and boundaries", "desc": "Uniqueness, separation of variables in simple geometries, boundary conditions", "prereq": ["t4.potential", "t4.conductors"]},
 {"id": "t4.capacitors", "tier": 4, "name": "Capacitors", "desc": "Capacitance of standard geometries, series and parallel, stored energy", "prereq": ["t4.potential", "t4.conductors"]},
 {"id": "t4.dielectrics", "tier": 4, "name": "Dielectrics", "desc": "Polarization, bound charge, D and E fields, capacitors with dielectric", "prereq": ["t4.capacitors"]},
 {"id": "t4.dc-circuits", "tier": 4, "name": "DC circuits", "desc": "Ohm's law, resistor networks, power, internal resistance", "prereq": ["t4.potential"]},
 {"id": "t4.kirchhoff", "tier": 4, "name": "Kirchhoff's rules", "desc": "Loop and node equations, multi-loop networks, Thevenin idea", "prereq": ["t4.dc-circuits"]},
 {"id": "t4.rc-transient", "tier": 4, "name": "RC transients", "desc": "Charging and discharging, time constant, energy accounting", "prereq": ["t4.capacitors", "t4.dc-circuits"]},
 {"id": "t4.drude", "tier": 4, "name": "Conduction and resistivity", "desc": "Current density, drift velocity, Drude model, resistivity and temperature", "prereq": ["t4.dc-circuits"]},
 {"id": "t4.em-energy", "tier": 4, "name": "Electrostatic energy and forces", "desc": "Energy density, force from energy derivative, virtual work", "prereq": ["t4.capacitors", "t4.dielectrics"]},
 {"id": "t5.lorentz", "tier": 5, "name": "Lorentz force and charged-particle motion", "desc": "qv x B, cyclotron radius, crossed E and B, velocity selector, Hall effect", "prereq": ["t4.potential", "t1.vec-prod"]},
 {"id": "t5.biot-savart", "tier": 5, "name": "Biot-Savart law", "desc": "Fields from wires, loops, solenoid axis, superposition", "prereq": ["t5.lorentz"]},
 {"id": "t5.ampere", "tier": 5, "name": "Ampere's law", "desc": "Symmetric current distributions, solenoid and toroid, infinite wire", "prereq": ["t5.biot-savart"]},
 {"id": "t5.mag-materials", "tier": 5, "name": "Magnetic materials", "desc": "Magnetization, B, H and M, dia-, para-, ferromagnetism, boundary conditions", "prereq": ["t5.ampere"]},
 {"id": "t5.faraday", "tier": 5, "name": "Faraday's law", "desc": "Flux change, motional emf, induced fields, eddy currents", "prereq": ["t5.ampere"]},
 {"id": "t5.inductance", "tier": 5, "name": "Inductance and Lenz's law", "desc": "Self and mutual inductance, energy in a magnetic field, direction of induced current", "prereq": ["t5.faraday"]},
 {"id": "t5.rl-lc", "tier": 5, "name": "RL and LC circuits", "desc": "Time constants, LC oscillation, energy exchange, RLC damping", "prereq": ["t5.inductance", "t4.rc-transient"]},
 {"id": "t5.ac-circuits", "tier": 5, "name": "AC circuits and phasors", "desc": "Reactance, impedance, rms values, power factor, phasor arithmetic", "prereq": ["t5.rl-lc"]},
 {"id": "t5.resonance", "tier": 5, "name": "Resonance and filters", "desc": "Series and parallel RLC resonance, Q, bandwidth, simple filters", "prereq": ["t5.ac-circuits"]},
 {"id": "t5.maxwell", "tier": 5, "name": "Maxwell's equations", "desc": "Integral and differential forms, physical content of each, vacuum solutions", "prereq": ["t5.faraday", "t4.gauss"]},
 {"id": "t5.disp-current", "tier": 5, "name": "Displacement current", "desc": "Ampere-Maxwell law, charging capacitor field, continuity equation", "prereq": ["t5.maxwell"]},
 {"id": "t5.em-waves", "tier": 5, "name": "Electromagnetic waves", "desc": "Plane waves in vacuum, E, B and k orthogonality, speed, wave equation from Maxwell", "prereq": ["t5.maxwell", "t3.wave-basics"]},
 {"id": "t5.poynting", "tier": 5, "name": "Energy and momentum of fields", "desc": "Poynting vector, intensity, radiation pressure, field momentum", "prereq": ["t5.em-waves"]},
 {"id": "t5.em-boundary", "tier": 5, "name": "Waves at interfaces and in media", "desc": "Reflection and transmission, refractive index from epsilon and mu, skin depth, dispersion", "prereq": ["t5.em-waves", "t3.polarization"]},
 {"id": "t5.radiation", "tier": 5, "name": "Radiation from charges", "desc": "Larmor formula, dipole radiation pattern, scattering, Thomson/Rayleigh scaling", "prereq": ["t5.poynting"]},
 {"id": "t6.gen-coords", "tier": 6, "name": "Generalized coordinates", "desc": "Degrees of freedom, constraints, choosing coordinates", "prereq": ["t2.ang-mom", "t2.shm"]},
 {"id": "t6.euler-lagrange", "tier": 6, "name": "Lagrange equations", "desc": "L = T - U, derive equations of motion, compare to Newton", "prereq": ["t6.gen-coords"]},
 {"id": "t6.cyclic", "tier": 6, "name": "Cyclic coordinates and conservation", "desc": "Conserved momenta, energy conservation, symmetry and conservation laws", "prereq": ["t6.euler-lagrange"]},
 {"id": "t6.hamiltonian", "tier": 6, "name": "Hamiltonian mechanics", "desc": "Legendre transform, Hamilton's equations, phase space, Poisson bracket idea", "prereq": ["t6.cyclic"]},
 {"id": "t6.central-force", "tier": 6, "name": "Central forces", "desc": "Reduction to one body, angular momentum conservation, areal velocity", "prereq": ["t6.cyclic", "t2.gravitation"]},
 {"id": "t6.eff-potential", "tier": 6, "name": "Effective potential and orbits", "desc": "Turning points, bound and unbound orbits, conic sections, orbit energy", "prereq": ["t6.central-force"]},
 {"id": "t6.small-osc", "tier": 6, "name": "Small oscillations", "desc": "Expand about equilibrium, normal modes of coupled oscillators", "prereq": ["t6.euler-lagrange", "t2.damped-driven"]},
 {"id": "t6.rotating", "tier": 6, "name": "Rotating frames", "desc": "Coriolis and centrifugal terms, Foucault pendulum, effective gravity", "prereq": ["t6.gen-coords", "t2.circular"]},
 {"id": "t6.lorentz-tr", "tier": 6, "name": "Lorentz transformation", "desc": "Postulates, boosts, simultaneity, spacetime diagrams", "prereq": ["t5.em-waves"]},
 {"id": "t6.dilation-contraction", "tier": 6, "name": "Time dilation and length contraction", "desc": "Proper time and length, muon decay, twin-type problems", "prereq": ["t6.lorentz-tr"]},
 {"id": "t6.vel-addition", "tier": 6, "name": "Relativistic velocity addition", "desc": "Composition of velocities, aberration, light in moving media", "prereq": ["t6.lorentz-tr"]},
 {"id": "t6.rel-energy", "tier": 6, "name": "Relativistic energy and momentum", "desc": "E^2 = (pc)^2 + (mc^2)^2, kinetic energy, mass-energy", "prereq": ["t6.dilation-contraction", "t2.collisions"]},
 {"id": "t6.invariants", "tier": 6, "name": "Four-vectors and invariants", "desc": "Invariant interval, four-momentum, invariant mass", "prereq": ["t6.rel-energy"]},
 {"id": "t6.rel-collisions", "tier": 6, "name": "Relativistic decays, collisions, Doppler", "desc": "Threshold energy, two-body decay, relativistic Doppler shift", "prereq": ["t6.invariants", "t6.vel-addition"]},
 {"id": "t7.first-law", "tier": 7, "name": "First law and work", "desc": "Internal energy, heat and work sign conventions, PV work, state functions", "prereq": ["t3.ideal-gas"]},
 {"id": "t7.gas-processes", "tier": 7, "name": "Ideal gas processes", "desc": "Isothermal, adiabatic, isobaric, isochoric paths, Cp and Cv, gamma", "prereq": ["t7.first-law"]},
 {"id": "t7.engines", "tier": 7, "name": "Heat engines and Carnot", "desc": "Efficiency, COP, Carnot bound, cycles on PV diagrams", "prereq": ["t7.gas-processes"]},
 {"id": "t7.entropy", "tier": 7, "name": "Entropy", "desc": "Clausius definition, entropy change in processes, reversible vs irreversible", "prereq": ["t7.engines"]},
 {"id": "t7.second-law", "tier": 7, "name": "Second law and free energy", "desc": "Statements of the second law, availability, Helmholtz and Gibbs conditions", "prereq": ["t7.entropy"]},
 {"id": "t7.potentials", "tier": 7, "name": "Thermodynamic potentials", "desc": "U, H, F, G, differentials, Maxwell relations, response functions", "prereq": ["t7.second-law", "t5.maxwell"]},
 {"id": "t7.phase", "tier": 7, "name": "Phase transitions", "desc": "Latent heat, Clausius-Clapeyron, phase diagrams, critical point", "prereq": ["t7.potentials"]},
 {"id": "t7.kinetic", "tier": 7, "name": "Kinetic theory", "desc": "Pressure from collisions, Maxwell-Boltzmann speeds, mean free path, effusion", "prereq": ["t7.first-law", "t2.collisions"]},
 {"id": "t7.equipartition", "tier": 7, "name": "Equipartition and heat capacity", "desc": "Degrees of freedom, specific heats of gases and solids, freeze-out", "prereq": ["t7.kinetic"]},
 {"id": "t7.counting", "tier": 7, "name": "Microstates and the Boltzmann entropy", "desc": "Counting states, S = k ln W, two-state systems, Stirling", "prereq": ["t7.entropy"]},
 {"id": "t7.canonical", "tier": 7, "name": "Partition function", "desc": "Boltzmann factor, canonical ensemble, average energy, free energy from Z", "prereq": ["t7.counting", "t7.equipartition"]},
 {"id": "t7.quantum-stats", "tier": 7, "name": "Fermi-Dirac and Bose-Einstein", "desc": "Distribution functions, Fermi energy, Bose condensation, photon gas", "prereq": ["t7.canonical"]},
 {"id": "t7.blackbody", "tier": 7, "name": "Blackbody radiation", "desc": "Planck law, Wien, Stefan-Boltzmann, radiative equilibrium", "prereq": ["t7.quantum-stats", "t5.poynting"]},
 {"id": "t7.heat-transfer", "tier": 7, "name": "Conduction, convection, radiation", "desc": "Fourier law, thermal resistance, cooling laws, steady-state temperature", "prereq": ["t7.first-law"]},
 {"id": "t8.born", "tier": 8, "name": "Wavefunction and probability", "desc": "Normalization, Born rule, probability current, superposition", "prereq": ["t3.wave-basics", "t1.calc-rates"]},
 {"id": "t8.tise", "tier": 8, "name": "Schrodinger equation", "desc": "Time-dependent and stationary forms, boundary conditions, parity", "prereq": ["t8.born", "t6.hamiltonian"]},
 {"id": "t8.inf-well", "tier": 8, "name": "Infinite square well", "desc": "Energy levels, eigenfunctions, expectation values, scaling with width", "prereq": ["t8.tise"]},
 {"id": "t8.step-tunnel", "tier": 8, "name": "Steps, barriers, tunneling", "desc": "Reflection and transmission, evanescent waves, tunneling suppression", "prereq": ["t8.tise"]},
 {"id": "t8.qho", "tier": 8, "name": "Quantum harmonic oscillator", "desc": "Energy ladder, ground state, ladder operators, zero-point energy", "prereq": ["t8.inf-well", "t2.shm"]},
 {"id": "t8.operators", "tier": 8, "name": "Operators and commutators", "desc": "Observables, Hermitian operators, commutator algebra, eigenvalues", "prereq": ["t8.tise"]},
 {"id": "t8.uncertainty", "tier": 8, "name": "Uncertainty principle", "desc": "Heisenberg bound, minimum-uncertainty states, estimate energies", "prereq": ["t8.operators"]},
 {"id": "t8.dirac", "tier": 8, "name": "Dirac notation and expectation values", "desc": "Bras and kets, completeness, expectation and variance, change of basis", "prereq": ["t8.operators"]},
 {"id": "t8.spin-half", "tier": 8, "name": "Spin one-half", "desc": "Pauli matrices, spin states, measurement along axes, magnetic moment precession", "prereq": ["t8.dirac"]},
 {"id": "t8.ang-mom-qm", "tier": 8, "name": "Angular momentum in QM", "desc": "L^2, Lz, quantum numbers, addition of angular momenta, spherical harmonics", "prereq": ["t8.operators", "t6.central-force"]},
 {"id": "t8.time-evol", "tier": 8, "name": "Time evolution", "desc": "Stationary states, phases, oscillation of superpositions, Heisenberg picture idea", "prereq": ["t8.dirac", "t8.qho"]},
 {"id": "t8.two-level", "tier": 8, "name": "Two-level systems and measurement", "desc": "Superposition, projective measurement, Rabi oscillation, state collapse", "prereq": ["t8.spin-half", "t8.time-evol"]},
 {"id": "t8.perturbation", "tier": 8, "name": "Perturbation theory", "desc": "First- and second-order energy shifts, degenerate case, time-dependent idea", "prereq": ["t8.dirac", "t8.inf-well"]},
 {"id": "t8.variational", "tier": 8, "name": "Variational and WKB methods", "desc": "Variational upper bound, trial functions, WKB quantization", "prereq": ["t8.qho", "t8.step-tunnel"]},
 {"id": "t8.identical", "tier": 8, "name": "Identical particles", "desc": "Symmetrization, bosons and fermions, exclusion principle, exchange", "prereq": ["t8.spin-half", "t8.inf-well"]},
 {"id": "t9.hydrogen", "tier": 9, "name": "Hydrogen atom", "desc": "Bohr levels, quantum numbers, radial degeneracy, orbital shapes, scaling to hydrogenic ions", "prereq": ["t8.ang-mom-qm", "t8.perturbation"]},
 {"id": "t9.fine-hyperfine", "tier": 9, "name": "Fine and hyperfine structure", "desc": "Spin-orbit coupling, Lamb shift scale, 21 cm line, j and F quantum numbers", "prereq": ["t9.hydrogen"]},
 {"id": "t9.zeeman-stark", "tier": 9, "name": "Zeeman and Stark effects", "desc": "Normal and anomalous Zeeman splitting, Lande g, Stark effect, Paschen-Back", "prereq": ["t9.fine-hyperfine"]},
 {"id": "t9.selection", "tier": 9, "name": "Selection rules and spectra", "desc": "Dipole selection rules, allowed transitions, line intensities, lifetimes", "prereq": ["t9.hydrogen"]},
 {"id": "t9.multi-electron", "tier": 9, "name": "Many-electron atoms", "desc": "Shell filling, Hund's rules, term symbols, screening, periodic trends", "prereq": ["t9.selection", "t8.identical"]},
 {"id": "t9.xray-spectra", "tier": 9, "name": "X-rays and atomic spectra", "desc": "Characteristic lines, Moseley law, bremsstrahlung, absorption edges", "prereq": ["t9.multi-electron"]},
 {"id": "t9.early-quantum", "tier": 9, "name": "Early quantum phenomena", "desc": "Photoelectric effect, Compton scattering, de Broglie, Bohr model, Davisson-Germer", "prereq": ["t7.blackbody", "t8.born"]},
 {"id": "t9.nuclear-structure", "tier": 9, "name": "Nuclear structure", "desc": "Binding energy, semi-empirical mass formula, shell model, nuclear radius", "prereq": ["t6.rel-energy", "t8.inf-well"]},
 {"id": "t9.decay", "tier": 9, "name": "Radioactive decay", "desc": "Exponential decay, half-life, decay chains, alpha, beta, gamma processes", "prereq": ["t9.nuclear-structure"]},
 {"id": "t9.nuclear-reactions", "tier": 9, "name": "Nuclear reactions", "desc": "Q-values, fission and fusion energetics, cross sections, neutron moderation", "prereq": ["t9.decay"]},
 {"id": "t9.particle-kinematics", "tier": 9, "name": "Particle kinematics and detectors", "desc": "Thresholds, invariant mass, decay widths, Cerenkov, detectors, energy loss", "prereq": ["t6.rel-collisions"]},
 {"id": "t9.standard-model", "tier": 9, "name": "Particles and conservation laws", "desc": "Leptons, quarks, hadrons, conserved numbers, force carriers, allowed reactions", "prereq": ["t9.nuclear-structure", "t9.particle-kinematics"]},
 {"id": "t9.crystal-bands", "tier": 9, "name": "Crystals and band theory", "desc": "Lattices, Bragg diffraction, reciprocal lattice idea, free-electron model, bands", "prereq": ["t7.quantum-stats", "t3.diffraction"]},
 {"id": "t9.semiconductors", "tier": 9, "name": "Semiconductors", "desc": "Doping, Fermi level, p-n junction, diode and transistor behavior, Hall measurements", "prereq": ["t9.crystal-bands"]},
 {"id": "t9.solid-thermal", "tier": 9, "name": "Lattice heat capacity and superconductivity", "desc": "Einstein and Debye models, phonons, superconductivity, Meissner effect", "prereq": ["t9.crystal-bands", "t7.equipartition"]},
 {"id": "t9.lab-stats", "tier": 9, "name": "Counting statistics and fitting", "desc": "Poisson and Gaussian errors, chi-squared, weighted means, curve fitting", "prereq": ["t1.sigfig", "t7.counting"]},
 {"id": "t9.lab-electronics", "tier": 9, "name": "Lab electronics and instruments", "desc": "Oscilloscope, op-amps, diodes, logic, noise, lock-in, signal-to-noise", "prereq": ["t5.ac-circuits", "t1.linearize"]},
 {"id": "t10.pacing", "tier": 10, "name": "Pacing and triage", "desc": "About 1.7 minutes per question; skip, flag, return; mid-test checkpoint", "prereq": []},
 {"id": "t10.elimination", "tier": 10, "name": "Option elimination", "desc": "Kill options by sign, units, magnitude, and symmetry before computing", "prereq": []},
 {"id": "t10.dim-limits", "tier": 10, "name": "Dimensions and limiting cases", "desc": "Check candidate formulas by dimensions and by extreme or special parameter values", "prereq": []},
 {"id": "t10.order-magnitude", "tier": 10, "name": "Order-of-magnitude estimation", "desc": "Round constants, use powers of ten, pick the nearest option", "prereq": []},
 {"id": "t10.full-practice", "tier": 10, "name": "Full-length practice and error log", "desc": "Timed 70-question practice sets with a technique-tagged error log", "prereq": []}
]
```
