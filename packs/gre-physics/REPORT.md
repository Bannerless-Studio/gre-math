# gre-physics content report

## Skeleton (2026-10-13)
- `CURRICULUM.md`, `pack.json`, `techniques.json` (137 techniques, T1-T10), `attribution.json` written. `items.json` is `[]`; no batches yet.
- `teach` cards: `TODO: teach card` for T1-T9, written for T10.

## Content T1–T9 merged (2026-10-13)
- 1,452 items (396 recall, 792 micro, 264 full; kinds numeric 674, mcq 471, expression 224, multi 83), 132 teach cards; 137 techniques, T10 has no items (test mode milestone).
- Pipeline per tier: Haiku ab+teach, Sonnet full, Sonnet blind-solve review, merge. Keys wrong after author checks: 1 (t2-0042). Build-time LaTeX fix applied across batches: superscript after `\,` or `\ ` glue gets an empty base (`\,{}^1S_0`), 38 sites in T7.c/T9.c.
- Owner spot-check: each tier's review section lists least-sure / left-as-is ids.
- Not verified: ETS question count and time (see CURRICULUM section 1 for the conflict).

## T1 review (sonnet-5.5)
- Scope: `T1.ab.json` 117 items (30 recall a, 87 micro b), `T1.c.json` 26 full, `T1.teach.json` 13 cards. All solved blind, then compared with the key.
- Agreement: ab 117/117 (100%), c 26/26 (100%). No wrong keys. Checker: both files `OK`; 46 expression forms (value + every `also`) pass `check` with ok:true.
- Probes: exactly 5, one per technique (units 0004, dimanal 0022, kin-2d 0058, estimate 0076, small-angle 0094), all tier b, playable.
- Full items: all 3 rubric lines, total 5, pass 3.5 (70%).
- Teach cards: all <= 80 words; one factual error fixed (small-angle trap).

| id | class | change |
|---|---|---|
| t1-0017 | two defensible options | option A `3000` has ambiguous sig figs; replaced by `3.0e3` |
| t1-0047 | sign convention | prompt now states "Take up as positive" |
| t1-0060 | not self-contained, constant missing | referred to "the same ball" and omitted g; prompt rewritten standalone with g |
| t1-0078, t1-0080 | rounding convention | prompt now says "to the nearest power of ten" |
| t1-0025 | technique mismatch | was plain algebra rearrangement; now `P=C rho^a v^b` dimensional analysis, key `C*rho*v^2` |
| t1-0099 | micro as pure recall | now asks `tan/sin` ratio to first order (one step) |
| t1-f007 | second technique nominal | legs now in km, m, cm so unit conversion is needed; rubric/solution updated |
| t1-f009 | second technique nominal | dropped `t1.units` tag (vec-prod + vec-comp remain) |
| t1-f011 | graphs nominal | prompt is now given as a v-t graph; rubric uses areas |
| t1-f012 | graphs nominal | prompt is now a v-t graph, catch-up by equal areas; answer unchanged |
| t1-f023 | implausible value | slope 0.050 -> 0.070 so mu = 0.729 (was 1.02); value, check, solution updated |
| teach t1.small-angle | factual error | degrees-as-radians makes theta ~57x too large, not 0.017x |

Left as is:
- t1-f001 (units + dimanal) and t1-f019 (scaling + estimate): second tag is weak; no cheap honest rewrite.
- Micro items close to formula recall: t1-0034, 0043, 0053, 0062, 0098. Each still takes one substitution or sign/form choice.
- Author-flagged ids 0035, 0068, 0069, 0093, f012, f014, f017: keys correct, options distinct, no ambiguity beyond the fixes above. 0069 option D (stopped at t=2) is plainly false, so no second defensible choice.
- CURRICULUM section 5 says five MCQ options; schema and `check_items.py` require exactly four for tiers a and b (tier c has five). Left per the checker.
- Estimate items 0078/0080 keys depend on log10 rounding; both also hold under linear nearest.
- Micro prompts with 3-4 short sentences (0078, 0080, 0087, 0105) are mostly "Type a number." plus constants; left.

## T2 review (sonnet-5.5)

Blind-solved all items with key hidden; no commits.

| File | Items | Agree | Rate |
|---|---|---|---|
| T2.ab.json | 144 | 143 | 99.3% |
| T2.c.json | 32 | 32 | 100% |
| T2.teach.json | 16 cards | n/a | all <= 72 words, no errors |

Probes: 5 (newton, work-energy, collisions, rot-dynamics, shm), one each, tier b, numeric. Full items: all need >= 2 techniques, rubric lines match solution steps, total 4 / pass 3 (75%).

### Changed items

| id | class | change |
|---|---|---|
| t2-0042 | KEY WRONG | 59.2 -> 14.8 (v=1.5pi, not 3pi) |
| t2-0016 | rounding | value to full precision |
| t2-0027 | rounding | value to full precision |
| t2-0035 | rounding | value to full precision |
| t2-0044 | rounding | value to full precision |
| t2-0051 | rounding | value to full precision |
| t2-0058 | rounding | value to full precision |
| t2-0060 | rounding | value to full precision |
| t2-0078 | rounding | value to full precision |
| t2-0121 | rounding | value to full precision |
| t2-0130 | rounding | value to full precision |
| t2-0133 | rounding | value to full precision |
| t2-0134 | rounding | value to full precision |
| t2-0140 | rounding | value to full precision |
| t2-0143 | rounding | value to full precision |
| t2-f005 | rounding | value to full precision |
| t2-f010 | rounding | value to full precision |
| t2-0023 | dangling ref | 'previous item' removed, self-contained |
| t2-0033 | dangling ref | 'same setup' removed |
| t2-0077 | dangling ref | 'same carts' removed |
| t2-0115 | dangling ref | 'previous item' removed; setup stated |
| t2-0132 | dangling ref | 'same oscillator' removed |
| t2-0141 | convention + dangling | Q definition stated; self-contained |
| t2-0107 | geometry assumed | stated string is wound on pulley, other end not fixed |
| t2-0097 | geometry assumed | cable direction stated (up toward wall) |
| t2-f022 | geometry assumed | cable direction stated (up toward wall) |
| t2-0034 | geometry assumed+domain | force direction stated; theta in [0.1,1.4] avoids the tan pole at pi/2 and the non-physical range |
| t2-0007 | wording | prompt 4 -> 3 short sentences |
| t2-f015 | direction/magnitude | asks magnitude |
| t2-f019 | direction/magnitude+tag | asks distance explicitly; options are magnitudes; dropped t2.torque-statics (no torque step in solution) |
| t2-0137 | filler distractor | option D 'period equals 2 pi m' -> plausible rate/frequency mix-up |
| teach t2.work-energy | weak trap | trap reworded (was vacuous "total vs net force") |

### Left as is

- t2-0054, t2-0117, t2-0135 are near pure formula recall at tier b. Kept as the expression-kind micro for their techniques; an author pass may add a setup step.
- Micro prompts with setup + constants + question run 3 sentences (about 25 items). Constants sentence counted as data, not trimmed. Only t2-0007 was shortened; t2-0015, 0022, 0041, 0078 stay at 4 short sentences.
- Recall MCQs carry 4 options (schema requires 5 only for tier c); all tier c keys sit at index 0 and rely on default shuffle.
- t2-0063 multi and t2-0081 mcq numeric-style are playable; no change.
- Numeric keys 0.2%-0.4% off true values were reset to full precision; none sat at the 2% edge.
- Checkers: `check_items.py` OK 144 (ab), OK 32 (c); 84 expression forms (value + also) all ok:true via engine/answer.js.

## T3 review (sonnet-5.5)

Blind-solved all items with key, solution, check and also hidden; no commits.

| File | Items | Key agrees | Rate |
|---|---|---|---|
| T3.ab.json | 126 | 126 | 100% |
| T3.c.json | 28 | 28 | 100% |
| T3.teach.json | 14 cards | n/a | all <= 76 words, one edge fix |

No wrong key, no MY ERROR. All defects were prompt-quality, convention, constant or key-precision issues. Author-flagged ids: t3-0071 and t3-0062 rewritten for convention; t3-0021 fine (odd harmonics, distractors distinct); t3-0122 fine (constant V and n stated); t3-0053 fine (do < f, virtual image, magnitude asked); t3-f016 fine (150.5 sits mid-order, 151 correct); t3-f014 fine (14 = 12 + 2 for m=0 at +-90 deg); t3-f010 fine (5.99 rounds to 6.0, every distractor traced to one wrong move).

Probes: 5 (superpose t3-0014, sound t3-0022, geom-optics t3-0049, diffraction t3-0076, fluid-flow t3-0112), one each, tier b, numeric.
Full items: rubric steps match solutions; totals 4/pass 3 (75%) or 5/pass 4 (80%).

### Changed items

| id | class | change |
|---|---|---|
| t3-0012 | leak | stem gave f1 = v/2L while asking for it; formula removed |
| t3-0018 | sign/domain | added 0 <= phi <= pi (amplitude 2A cos(phi/2) goes negative past pi) |
| t3-0032 | constant | I0 stated |
| t3-0035 | constant | I0 stated |
| t3-0062 | convention | "second dark fringe" counting stated (first dark nearest centre) |
| t3-0069 | convention | "order m=1" replaced by "longest wavelength transmitted" (same key 750) |
| t3-0071 | convention | "second constructive reflection, thinnest-film maximum first" replaced by "second longest wavelength" (same key 480) |
| t3-0075 | edge | options say "below d/lambda" (m = d/lambda is 90 deg, not seen); solution strict |
| t3-0095 | contradiction | "eye relaxed" vs "image at 25 cm"; key 400 is image at infinity, prompt now says infinity |
| t3-0120 | tolerance | rel 1e-4 rejected typed -273; now 2e-3 |
| t3-f003 | rounding | key 237.17082 (was 237.2) |
| t3-f005 | rounding | key 695.2381 (was 695.2) |
| t3-f007 | rounding | key 105.0285 (was 105) |
| t3-f009 | rounding | key 32.5827 (was 32.6) |
| t3-f013 | rounding + convention | key 9.02256 (was 9.023); "third bright fringe on one side, central not counted" |
| t3-f021 | rounding | key 3220.8 (was 3220) |
| t3-f027 | rounding | key 3.110448 (was 3.11) |
| t3-f011 | solution | final line added: larger magnification 60/30 = 2 |
| t3-f028 | near options | key 1.53 vs distractor 1.50 (ignore temperature) differed 2%; final T now 500 K, key 2.19, options 2.19 / 1.50 / 2.00 / 1.31 / 4.38, distractor logic unchanged |
| teach t3.diffraction | edge | "largest integer not exceeding" -> "below" d/lambda |

### Left as is

- Micro expression items that are near pure formula recall: t3-0008, 0036, 0045, 0054, 0063, 0081, 0099, 0117. Kept as the expression-kind micro per technique.
- Full items with weak second technique: t3-f005 (double Doppler), t3-f007, t3-f012, t3-f019 (the small-angle tag is unused). Rubrics and solutions still fit; an author pass could retag.
- t3-f016 options 151/150 and 76/75 are adjacent counts by design (off-by-one trap); not rounding-tuned.
- All tier c keys sit at index 0 and rely on default shuffle (same as T2).
- Numeric keys re-serialised by JSON (4.0 -> 4); no semantic change.
- Checkers: `check_items.py` OK 126 (ab), OK 28 (c); 68 expression forms (value + also) all ok:true via engine/answer.js.

## T4 review (sonnet-5.5)

Blind solve of all items, key hidden on first pass. `check` fields ignored as evidence.

| File | Items | Key agreement | Keys wrong | Ill-posed or ambiguous |
|---|---|---|---|---|
| T4.ab.json | 126 | 126/126 | 0 | 6 |
| T4.c.json | 28 | 28/28 | 0 | 2 |

Probes: exactly one per T4 probe technique (gauss t4-0013, potential t4-0022, capacitors t4-0067, kirchhoff t4-0094, rc-transient t4-0103), all tier b numeric. Teach cards: 14, all under 80 words; two fixed.
Checker: `check_items.py` OK 126 items (ab) and OK 28 items (c). Engine `check()` run on `value` and every `also` form of all expression items, plus every numeric value: 132 checks, 0 failures.

### Changed items

| id | class | change |
|---|---|---|
| t4-0015 | sign/domain ambiguity | asked at distance $x$ from midplane, $0<x<d$; key $\rho x/\varepsilon_0$ was wrong for negative $x$ |
| t4-0033 | sign ambiguity + pure recall | potential sign depends on axis side and was bare formula recall; now asks for the $+q$ side, from $q$, $d$ with $d\ll r$ (key $qd/(4\pi\varepsilon_0r^2)$) |
| t4-0087 | exact-form trap | $8/3$ A under `exact` rejected typed decimals; now `decimal`, rel 0.02 |
| t4-0095 | geometry left to assumption + exact-form trap | states loops sit side by side with the shared resistor as common wall; $12/13$ now `decimal`, rel 0.02 |
| t4-0108 | defensible-option | "capacitor current can jump instantly to any value" is arguable (resistor current jumps at switch-on); replaced by "capacitor voltage jumps to the source voltage" |
| t4-0115 | pure formula recall | $R=L/(\sigma A)$ only; now Drude $\sigma$ plus resistance from $n,q,\tau,m,L,A$ |
| t4-f003 | symmetry-guessable (ratio 1) | ratio is now $E(R/2)/E(3R)=9/4$; options, whys, solution, check rewritten |
| t4-f014 | idealisation unstated | prompt says gaps at the edges are negligible |
| teach t4.images | factual error | image charge at the mirror point holds for a plane only; sphere image differs. Card now plane only |
| teach t4.multipole | incomplete trap | trap now names the point-charge falloffs |

### Left as is

- t4-0022, t4-0031, t4-0053, t4-0123, t4-f022 re-solved: keys correct (-1.798e4 V; 1.15 N/C far-field error 3e-5; 3.5368e-6 full precision; 1.0e-4 J; 6/13 A with right battery opposed).
- t4-0031 dipole far-field: exact value differs by 3e-5 relative, inside 0.5%.
- t4-f019 is d2 with effectively one technique (series-parallel plus voltage division). Kept as an easy full item.
- t4-f007 uses the exact expansion value 1.798e-3 vs key 1.80e-3, inside tolerance.
- t4-f001..f028 pass is 67-75% of rubric weight (integer weights cannot hit 70% exactly).
- Micro items 0043 (pressure $\sigma^2/2\varepsilon_0$), 0088 and 0097 (dividers) lean on a single formula but need a one-step derivation or setup; kept.
- t4-0042 wire "long thin" and spheres "isolated" imply negligible mutual capacitance; kept.

## T5 review (sonnet-5.5)

Scope: `T5.ab.json` (135 items: recall + micro), `T5.c.json` (30 full), `T5.teach.json` (15 cards). Blind solve of every item before reading the key.

| File | Items | Key agreement | Key wrong | Ill-posed or unit-range defects fixed |
|---|---|---|---|---|
| T5.ab | 135 | 135/135 (one initial mismatch on t5-0071 was my error, key confirmed) | 0 | 14 |
| T5.c | 30 | 30/30 | 0 | 3 (1 solution text error, 2 unit rescales) |
| T5.teach | 15 | no errors found, all <= 80 words, each states move + trap | 0 | 0 |

Probes: exactly one per technique in the CURRICULUM T5 list (lorentz t5-0004, ampere t5-0022, faraday t5-0040, ac-circuits t5-0067, em-waves t5-0103), all tier b numeric.
Full items: every item needs >= 2 techniques; rubric lines match solution steps; `pass` is 75% of total weight (70% on t5-f007).

### Changed items

| id | class | change |
|---|---|---|
| t5-0005 | unit range | answer 3.28e-7 s rescaled to ns (327.9) |
| t5-0085 | unit range | 1.77e-7 A rescaled to nA (177) |
| t5-0088 | unit range + geometry | rate raised to 2.0e13 V/(m s), answer in uT (5.56); fringing, plate width and circle orientation stated |
| t5-0099 | unit range | answer was 2.8e12 V/(m s); now A = 0.20 m^2, I = 1.0 mA, answer 5.65e8 |
| t5-0103 | unit range | 2e-8 T rescaled to nT (20) |
| t5-0108 | unit range | 6e14 Hz rescaled to THz (600) |
| t5-0113 | unit range | 6.4e-10 J/m^3 rescaled to nJ/m^3 |
| t5-0117 | unit range | 1.77e-9 Pa rescaled to nPa |
| t5-0130 | unit range | 5.68e-24 W stated in units of 1e-24 W |
| t5-f025 | unit range | 2.04e-9 kg rescaled to micrograms (2.04) |
| t5-f029 | unit range | 2.09e-25 W stated in units of 1e-25 W |
| t5-0086 | var name | dPhidt replaced by single symbol F, defined in prompt |
| t5-0092 | var name | dEdt replaced by G, defined in prompt |
| t5-0095 | var name | dqdt replaced by J, defined in prompt |
| t5-0105 | convention | phase fixed: field is maximum (Amp) at z=0, t=0, so sin forms are excluded and cos forms are unique |
| t5-0089 | wording | "same on any loop" replaced by "any surface bounded by a given loop" |
| t5-0015 | pure formula recall | now an N-turn coil (mu0*N*I/(2R)), keeps the typed micro for the technique |
| t5-f001 | solution error | speed in solution read 3.1e5 m/s, correct 6.2e5 m/s (key 0.0646 m was right) |

### Left as is

- Author-flagged ids t5-0044 (Lenz viewpoint stated, option 3 is a wrong-sense distractor), t5-0051 (series-aiding convention stated), t5-0027 (5/12 of the current enclosed, key right), t5-0090, t5-f019 (longitudinal option 1 and option 4's y-propagating y-component both violate div E = 0, only option 0 survives), t5-f007 (gap fixed at 0.001 m, B continuous, key 0.1548 T right).
- Expression items keep the default domain [0.3, 2.7]; no wrong-but-sample-equal form found, no variable named `e`.
- Remaining tier b expression items that are close to formula recall (t5-0006, 0033, 0042, 0069, 0078, 0114, 0123, 0132) kept: they supply the typed-answer production gate and a twist would need new content.
- t5-0111 (4.5e-6 Pa) and t5-0112 (3.3e-6 Pa) sit above the 1e-6 floor, kept.
- Checker lines: `OK 135 items` (T5.ab), `OK 30 items` (T5.c). Expression check: 83 forms (value + also) pass `engine/answer.js`.
- JSON number formatting in the two item files was normalised by the rewrite (e.g. 2.2775e-05 became 0.000022775); values unchanged.

## T6 review (sonnet-5.5)

Blind solve of all 154 T6 items (126 in T6.ab, 28 in T6.c) plus 14 teach cards. Answers derived independently by hand and numeric solves (spherical-pendulum turning point, Fizeau shift, apsides, normal modes, boosts).

| file | items | blind agreement with key | key wrong | ill-posed / wording | my error |
|---|---|---|---|---|---|
| T6.ab.json | 126 | 126/126 (100%) | 0 | 3 | 0 |
| T6.c.json | 28 | 28/28 (100%) | 0 | 0 | 0 |

### Changed items

| id | class | change |
|---|---|---|
| t6-0122 | physically odd process | single-final-particle threshold replaced by p + target -> original two + new particle X (1.0 GeV/c^2); threshold sqrt(s) = 3.0 GeV, key 2.5 GeV unchanged; solution and hint reworded |
| t6-0057 | convention | in-phase mode defined in the prompt (equal displacements, small motion along the line) |
| t6-0059 | geometry + convention | row of two masses between fixed walls with three springs stated; out-of-phase mode defined as equal and opposite displacements |
| teach t6.cyclic | wording | trap line said phidot changes "when m or q does" (m is constant); now "changes as r changes" |
| teach t6.hamiltonian | error | trap said the wrong sign "flips the energy"; L + sum p qdot = 3T - V, now stated |
| teach t6.rel-collisions | missing content | card named Doppler shift in "When" but gave no formula; approach formula added (66 words) |

### Left as is

- Author-flagged ids: t6-0005 (T = mR^2(thd^2 + w^2 sin^2 th)/2 verified, wrong forms such as the missing-w term are rejected), t6-0075 (S' at +v: t' = -gamma v x/c^2, larger x is earlier, key right), t6-0107 (gamma = 2, v = 0.866c, distractors 0.50 and 0.71 are distinct slips), t6-f011 (U'' = 6 lambda r0^2 = 27, omega^2 = 54, omega = 7.348, key right), t6-f022 (exact Fizeau excess 4.3468 m/s, key right), t6-f020 (ship frame: 100 m / 0.8c = 417 ns, wording already says ship observers; the round() in `check` is needed because check_items compares it with the numeric option label, MCQ only).
- t6-f024 and t6-f028 keep round(,2) in `check` for the same reason.
- Rubric pass is 75-80% of weight, not 70%: the checker forces total weight 4-6 with integer-ish weights, so 70% is unreachable. No change.
- Weak secondary technique in t6-f001 (t2.com not used; pure constraint counting) and t6-f017 (invariants appears only as a spacelike check). Kept; replacing them needs new content.
- Probes: exactly one per curriculum T6 technique (0014, 0040, 0058, 0085, 0103), all tier b numeric. No probe in T6.c.
- Expression items: 28 items, every value and also form passes `engine/answer.js` (ok:true); spot checks of near-miss wrong forms (wrong sign, dropped factor, v vs V) fail as expected. Default domains fine; no variable `e`; `c` is a declared var or fixed in the prompt everywhere (t6-0123 states c = 1).
- No numeric key rounded; no magnitude below 1e-6 or above 1e9 (largest 2.9e8 m/s). No MCQ options within 2%. No LaTeX outside core fonts reported by the checker.
- Checker lines: `OK 126 items` (T6.ab), `OK 28 items` (T6.c).

## T7 review (sonnet-5.5)

Blind-solved all 154 items (ab 126, c 28, plus 14 teach cards, 5 probes). Key agreement before edits: ab 126/126, c 28/28 (one apparent mismatch, t7-f017, was reviewer error: the mixture has 3 mol, so Cp-Cv = 3R). No key was wrong. All fixes are presentation and precision. Checker: both item files `OK` (126 and 28); 61 expression forms (value plus every `also`) pass `engine/answer.js`; four wrong near-forms spot-checked and rejected.

| id | class | change |
|---|---|---|
| t7-0013, 0015, 0032, 0033, 0035, 0058, 0059, 0061, 0062, 0067, 0068, 0077, 0085, 0089, 0094, 0095, 0097, 0103, 0104, 0106, 0107, 0122, 0125 | rounded key | `value` reset to full precision from `check` (rel unchanged) |
| t7-0071 | range + rounded key | answer was 2.9e27; prompt now asks in units of 1e27 m^-2 s^-1, value 2.8753, check and solution updated |
| t7-0115 | range + rounded key | answer was 3.95e26 W; now in units of 1e26 W, value 3.9509 |
| t7-0065 | two defensible options | option 3 (`sqrt(T)`) was also true at fixed m; now "sqrt(T), with no dependence on m" |
| t7-0078 | defensible distractor | option 0 "three quadratic terms, each R" read as 3 oscillator modes each R; now "three kinetic terms, each R" |
| t7-0108 | LaTeX | prompt had `\\mu` (line break, broken render); now `\mu` |
| t7-0034 | convention | prompt now says thermally isolated gas, so "Q=0, S rises" is unambiguous |
| t7-f007 | small difference | log terms differ by 0.0157 of ~0.12; 2-sf rounding failed 2%. rel 0.02 -> 0.04 |
| t7-f015 | convention | prompt now says ideal gas, Maxwell speeds, count every atom hitting the wall (fixes the n v/4 vs other factors ambiguity without giving the formula) |
| t7-f022 | tags | dropped unused `t3.ideal-gas` tag |
| t7-f004, f014, f020 | check null | `check` set to rounded recomputation (round(...,2)) matching the plain-number correct option |
| teach t7.heat-transfer | convention | radiation line now says blackbody surface, emissivity 1 |

Left as is
- Author-flagged t7-0058, 0062: constant-L Clausius-Clapeyron and ideal vapor already stated; 3-sf rounding of 1/T stays inside 2%.
- t7-0071: wall-flux rule is stated in the prompt, so the factor 1/4 is convention-safe.
- t7-f007: widened rel instead of restructuring; wrong answers (0, 1121) are far outside.
- t7-f018: 2-D film is standard enough (two quadratic terms, Cp = 2R); work form and phi A = NkT are given.
- t7-f002: really one technique (state-function first law) with a distractor path; `t2.work-energy` tag is loose. Kept, weak on the 2-technique test.
- t7-f025: Wien then Stefan-Boltzmann, effectively one technique (blackbody); `t7.heat-transfer` and `t1.scaling` tags are loose. Kept.
- Rubrics: weights 4 or 5, pass 3 or 4; effective pass is 70-80% of total because weights are coarse. Rubric lines match solution steps on all 28.
- Probes: exactly one per first-law (0004), engines (0023), entropy (0032), canonical (0094), quantum-stats (0104); all tier b numeric.
- No numeric MCQ options within 2% of each other; no `e` variables; teach cards all 41-73 words, no errors.

## T8 review (sonnet-5.5)

Blind-solved all 165 items (sympy and direct computation) before viewing keys; teach cards read for errors.

| File | Items | Key agreement |
|---|---|---|
| T8.ab.json | 135 | 135/135 (100%) |
| T8.c.json | 30 | 30/30 (100%) |
| T8.teach.json | 15 cards | all <= 80 words, no errors found |

Probes: one per technique for inf-well, qho, operators, spin-half, perturbation; all tier b numeric. Correct.
Full items: all pass/total between 0.67 and 0.80; rubric lines match solution steps.

### Changed items

| id | class | change |
|---|---|---|
| t8-0004,0016,0022,0025,0027,0031,0032,0034,0036,0041,0059,0061,0083,0085,0090,0094,0095,0097,0103,0104,0113,0122 | rounded key | value reset to full precision from check (0031 was 0.01633 vs 0.016347) |
| t8-f025 | float noise | 0.6000000000000001 -> 0.6 |
| t8-0023 | pure formula recall | now asks E(n+1)-E(n) of infinite well |
| t8-0042 | pure formula recall | now oscillator from spring constant k (needs omega=sqrt(k/m)) |
| t8-0050 | pure recall, undefined symbol | now d2<x>/dt2 for H=p^2/2m+Fx (two Ehrenfest steps), answer -F/m |
| t8-0087 | pure recall | now eigenvalue of Lx^2+Ly^2 on |l,m> (domain l 1-3, m 0.3-0.9) |
| t8-0096 | pure recall | now beat frequency of n=1,2 infinite-well superposition |
| t8-0062 | ambiguous | "nonzero bound" depends on state; now "commutator is nonzero" |
| t8-0086 | wording | dropped misleading "smallest"; key 45 deg stays, 2% = 0.9 deg adequate |
| t8-0113 | convention | states well occupies 0<x<L |
| t8-0132 | convention | states orbitals orthonormal |
| t8-f017 | ambiguity | states second analyser keeps the minus output and probability is per particle entering the first (key 3/16, rival reading 1/4) |
| t8-f029 | ambiguity | "lowest nonzero excitation energy, spin flips ignored" (key 5E1) |
| t8-f027 | check null on decimal MCQ | check = round(0.75*0.75**(1/3), 2) = 0.68 (exact 0.6814) |

### Left as is
- t8-f027: 0.72 and 0.75 are 5.7% and 10% from key; outside the 2% rule.
- t8-f028: prompt already says WKB; key 5^(2/3)=2.92 is WKB (exact Airy ratio is 3.19, no option near it).
- t8-f016: prompt fixes sign of <0|x|1> and standard phase convention; key l/(2 sqrt2) correct.
- t8-0031, 0061, 0121: re-solved, keys correct (0121 = 10, exact 9.87).
- t8-f013 (d2) is essentially one technique; second tag t1.estimate thin. t8-f006 (t1.units), f018 (t5.lorentz), f020 (t2.rot-dynamics) second tags are weak padding; not changed, tags would need an author decision.
- Expression items without domain use the engine default [0.3, 2.7]; no wrong-but-equal forms found. Negative probes on the rewritten items reject the plausible wrong forms.
- Checker: check_items.py OK 135 items and OK 30 items; 63 expression forms (value plus every also) all ok:true.

## T9 review (sonnet-5.5)

Blind solve: 153 ab items, 34 full, 17 teach cards. Keys agreed on 153/153 (ab) and 34/34 (c). No key was wrong or ill-posed. Teach cards: all 17 within 80 words, no errors, unchanged. Probes: exactly one per hydrogen, selection, nuclear-structure, decay, lab-stats; all tier b numeric.

### Changed items
| id | class | change |
|---|---|---|
| t9-0068 | data inconsistency | atomic mass 4.00260 u mixed with proton mass (electron mass error, ~1 MeV); now gives nucleus mass 4.00151 u, key 27.27 -> 28.29 MeV |
| t9-0036 | convention | "ignore fine structure" added (key 2) |
| t9-0053 | pure recall | duplicate of recall t9-0046; now asks f_max = qV/h (expression) |
| t9-0098 | pure recall | T=(g-1)mc^2 recall; now asks pc = mc^2 sqrt(g^2-1) |
| t9-0134 | pure recall | prompt already contained the answer; now numeric, theta_D = 320 K from given v, k_D |
| t9-0152 | pure recall | prompt already contained the answer; now numeric, 4.7 kOhm and 22 nF, 228 us |
| 41 numeric ab ids (0005, 0014, 0023, 0031, 0033, 0049, 0050, 0057-0059, 0061, 0062, 0067, 0075, 0077, 0078, 0083, 0085-0087, 0090, 0093-0096, 0112-0114, 0120, 0124, 0128, 0130-0132, 0139, 0141, 0148-0150, 0153) | rounded key | value reset to full precision from check; 0077 was a string, now a number |
| t9-f005 | overlong | asks one named component (m_J +1/2 -> -1/2); key 48.25 unchanged; rubric line 3, solution, hint updated |
| t9-f006 | missing datum | Stark shifts 0 and +-3qa0F now given; key 6.30 kV |
| t9-f010 | convention | defines "level" as each allowed (L,S,J); key 10 |

### Left as is
- t9-0041: Slater weights stated in the prompt; key 2.2 correct.
- t9-0086: nonrelativistic stated; key 2.667. t9-0096: key 2.303 GeV correct; t9-0151: key correct (99.995%). t9-f019: Q = -1.192 MeV from given 7-digit masses is exact arithmetic, threshold 1.53 within 2%.
- Micro expression items that are formula recall but need a small step: t9-0008, 0021, 0035, 0039, 0047, 0147. Kept; each technique still has numeric micros.
- Thin second technique: t9-f027 (ln(N_D/n_i) only), t9-f034 (Johnson noise formula), t9-f003. Tags not changed.
- Rubric pass is 67%-80% of weight (integer weights); no change.
- Checker: check_items.py OK 153 items and OK 34 items; 91 expression forms (value plus every also) all ok:true; wrong forms for 0053 and 0098 rejected.

## Audit fixes (2026-10-13)

Source: `packs/gre-physics/AUDIT-2026-10-13.md`. Edits made in batches, then `tools/merge_batches.py`.

| Id | Class | Change |
|---|---|---|
| t2-0014, t2-0015, t2-0023, t2-0025, t2-0032, t2-0033, t2-0040, t2-0052, t2-0096, t2-0107 | `form: exact` on data-computed value | `form: decimal`, `rel: 0.02`, `tol` = 0.02 × value, value at full precision; `check` unchanged |
| t1.graphs | Teach card 80+ words | Trimmed to 63 words (whitespace count); move and trap kept |
| t6-0021, t7-0011, t7-0029, t7-0037, t7-0038 | `why` blank or shifted | Realigned, one reason per option; correct option says "correct" |

Scan results: no other exact numeric item with a non-integer decimal value of 4+ significant digits; no other teach cards over 80 words by whitespace count; no other mcq `why` blank or misaligned.

Open: with `rel: 0.02`, typed two-significant-figure roundings of t2-0015 (15), t2-0025 and t2-0032 (2.5), and t2-0096 (2.2 or 2.3) fall outside tolerance.

## Teach cards v2 review (T1–T10, sonnet-5.5)

Checked all 137 cards in `batches/T1..T10.teach.json`: recomputed every Example, compared each card with the technique's drill prompts, and ran the shape script. Edits are in place, ids and six-paragraph shape kept. No commit, no merge.

Cards changed: 106 of 137. Per class (a card can carry two classes): teaching 71, overlap 62, shape 11, factual 6.

Verification: JSON loads under `python3 -I` for all ten files. `renderText` succeeds and `glyphIssues` is empty for all 137. Word count 90–160 (excluding math and code), six labels in order, display math in Move and Example, no headings, no "note that", no banned font commands. Overlap script flags only `t1.graphs` against t1-f024, which shares three small numbers in an unrelated setting (log-log moon periods); left as is.

Overlap rule used: Example numbers that are not in the rest of the card must not match one drill item on 3 or more values, or on 2 values making up most of the Example. Several cards were exact copies of a drill (t5.maxwell, t6.dilation-contraction, t7.blackbody, t7.gas-processes, t9.xray-spectra, t9.nuclear-structure, t4.gauss, t8.born, t8.operators).

Real factual errors found: `t2.damped-driven` gave Q = ω0τ, which is twice the correct Q = ω0 m/b (drill uses ω0/(b/m)); `t7.canonical` Example rounded p_up to 0.020 where 3.86 gives 0.021. Author-flagged cards: t8.variational verified numerically (⟨H⟩ = 0.70711 ħω at b² = 1/√2, Riemann sum agrees); t7.phase Clapeyron sign correct (ΔV = V_final − V_initial, ice ΔV<0); t9.solid-thermal constants correct (12π⁴/5, 1.76 k_BT_c, M^-1/2); t5.mag-materials correct; t3.thin-film correct but lacked dark conditions and transmission = reflection-dark, added; t4.images force correct but energy, field at the plane and induced charge density were missing, and the work to remove the charge is kq²/4d, now stated; t5.maxwell correct but Example duplicated drill t5-0087, replaced; t10.pacing: about 70 questions in 2 h confirmed from the ETS practice book; ETS reports percent correct for tests since September 2023, so no wrong-answer penalty (only a test-prep site states this outright, card says to confirm in the bulletin).

### Changed cards

| id | class | change |
|---|---|---|
| t1.sigfig | teaching | added power rule for delta z/z = n delta x/x (drill: % uncertainty in t^2) |
| t1.kin-2d | shape | range formula moved to display math |
| t1.small-angle | teaching | added angular size theta = d/D (drills use it) |
| t1.vec-comp | overlap | Example numbers changed (shared 4.0,5.0,1.0 with t1-0033); Example B changed to 3.5 (3.0/4.0 matched t1-0033) |
| t1.graphs | overlap | Example numbers changed (answer 21 and 3.0 matched t1-f016); Example changed again to avoid t1-f012 numbers; Example set to 0->8.0 m/s in 2.0 s, hold 5.0 s (answer 48 m; earlier 36 matched t1-0067) |
| t2.newton | overlap, teaching | Example 5.0 kg, 3.0 N and 4.0 N (matched t2-0004); added system-then-isolate step for contact forces |
| t2.fbd | overlap | Example 6.0 kg, 25 N at 37 deg (matched t2-f007 numbers) |
| t2.friction-drag | overlap | Example mu_s 0.45, mu_k 0.35, 100 N (matched t2-0022); N=mg shown |
| t2.incline-pulley | overlap | Example 37 deg, mu 0.25 (30 deg and g matched frictionless-incline drill) |
| t2.circular | factual, shape | period renamed P (T clashed with tension in drills); omega=2pi/P added |
| t2.work-energy | overlap | Example 5.0 kg, 40 N at 37 deg over 5.0 m (matched t2-f013 numbers) |
| t2.momentum | overlap | Example 0.25 kg, 14 -> 6.0 m/s, 0.020 s (matched t2-f015) |
| t2.collisions | overlap, teaching | Example 1.5 kg at 8.0 m/s into 2.5 kg (matched t2-f025); added elastic result and ballistic pendulum step |
| t2.com | overlap | Example 6.0 kg at 0, 3.0 kg at 9.0 m; Example changed again to 5.0 kg at 0, 15 kg at 8.0 m |
| t2.rot-dynamics | overlap, teaching | Example hoop 3.0 kg, 0.20 m, 0.60 N m (matched t2-0103); added rolling rotational-energy fraction |
| t2.ang-mom | overlap, teaching | Example I 6.0->2.0 kg m^2 at 1.5 rad/s (matched t2-f025); added L=mvr |
| t2.gravitation | teaching | added GM = gR^2 for drills giving g and R |
| t2.shm | teaching | added a_max = A omega^2 |
| t2.damped-driven | factual, teaching | Q = omega0 tau was off by 2 (Q = omega0 m/b = omega0 tau/2); added steady-state driven amplitude and energy decay used by drills; Example gains Q and resonance amplitude |
| t3.wave-basics | teaching | added phase difference over distance (drill t3-0006) |
| t3.sound | overlap, teaching | added beats and closed-pipe index; Example 600 Hz at 25 m/s (800 Hz/20 matched t3-0023) |
| t3.refraction | teaching | added apparent depth (drill t3-0042) |
| t3.geom-optics | teaching | state d_o>0 real object, diverging f<0 |
| t3.interference | teaching | added phase difference from path difference (drill t3-0060) |
| t3.thin-film | factual, overlap, teaching | added dark conditions for both flip cases and reflection-dark = transmission-bright (drills 0068, 0069); Example 560 nm |
| t3.polarization | overlap | Example axes 20 deg (60 matched t3-0085) |
| t3.optical-instruments | overlap, teaching | added microscope total magnification; Example telescope 90/3.0 cm, 0.12 m, 500 nm |
| t3.fluid-static | overlap, shape | Example made coherent (floating block 750 kg/m^3, gauge pressure at 6.0 m) |
| t3.ideal-gas | teaching | added v_rms and named n (drill t3-0123) |
| t4.coulomb | overlap | Example 8.0 nC at 0.20 m, 3.0 uC test charge (matched t4-0005) |
| t4.gauss | overlap, teaching | Example lambda 3.5 uC/m at 0.80 m (was identical to t4-0013); added standard results and enclosed charge for uniform volume |
| t4.potential | teaching | added energy gain K = q dV (drill proton through 500 V) |
| t4.multipole | overlap, teaching | added far-field dipole potential and field (drills 0031, 0033); Example +-3.0 nC, 2.0 mm, 5.0e3 N/C |
| t4.conductors | overlap, teaching | added cavity-charge bookkeeping and joined-spheres rule (drills 0041, 0042); Example R=0.15 m, 6.0 nC |
| t4.images | factual, shape, teaching | card lacked energy, field at foot and induced charge density that drills 0050, 0051, 0053, f011, f012 ask; clarified work-to-remove is kq^2/4d; dropped unused sphere; new Example; trimmed to 160 words |
| t4.laplace | overlap, teaching | generalised to E = -grad V and test of Laplace; Example 200 V across 0.050 m (120, 30 matched t4-f014) |
| t4.capacitors | overlap, teaching | added charge sharing between connected capacitors (drill 0069); Example 3.0 and 12 uF series across 15 V |
| t4.dielectrics | overlap | Example C0 2.0 uF at 12 V, kappa 5.0 (kappa 4.0, 2.5 matched drills) |
| t4.dc-circuits | overlap, shape, teaching | words 88 -> in range; power formulas added (drill 0086); Example 18 V, r=0.50 ohm (was near-copy of t4-0087); Example changed again: 30 V, r=0.50, 8.0 in series with 20 // 5.0 (avoid t4-f019 numbers) |
| t4.kirchhoff | overlap | Example 9.0 V/1.0 ohm, 4.0 V/2.0 ohm, shared 3.0 ohm; now shows a negative current (structure matched t4-0095 and numbers t5-f016); Example 7.0 V/2.0 ohm, 1.0 V/2.0 ohm, shared 3.0 ohm (avoid t4-f022 numbers) |
| t4.rc-transient | shape, teaching | words 89 -> in range; added solving for time (drills 0103, 0105); words 89 -> in range |
| t4.drude | teaching | added v_d = (q tau/m) E (drill t4-0114) |
| t5.lorentz | overlap, teaching | added F = qvB sin(theta) for angled motion (drill 0006); Example 3.0e6 m/s in 2.0 mT (electron 2.0e6 matched t5-0004) |
| t5.biot-savart | overlap, teaching | coil of N turns (drill 0015); Example 20 turns, R=0.25 m, 2.0 A (0.10 m matched t5-0014) |
| t5.ampere | overlap, teaching | Example radius 5.0 mm, 20 A, r=3.0 mm (matched t5-0022 numbers); named n; Example radius 6.0 mm, 18 A, r=3.0 mm (avoid t5-f021 numbers) |
| t5.mag-materials | overlap | Example n=400/m, 0.60 A, mu_r=500 (mu_r=200 and 0.5 A drills); factual re-check ok |
| t5.faraday | overlap | Example 80 turns, 0.015 m^2, 0 to 0.30 T in 0.060 s (0.40 T matched t5-0040) |
| t5.inductance | overlap, teaching | added series coupling and mutual inductance (drill 0051); Example N=300, A=5.0e-4, 0.15 m, 2.0 A (A=2.0e-4 matched t5-0050) |
| t5.rl-lc | teaching | added solving for time (drill 0059) |
| t5.ac-circuits | overlap | Example R=60, L=80 mH, C=6.25 uF at 1000 rad/s, 200 V (R=40, L=0.20 matched t5-0067) |
| t5.resonance | teaching | added f0 = w0/2pi and low-pass gain (drills 0076, 0078) |
| t5.maxwell | overlap, teaching | Example duplicated drill 0087 (c from eps0, mu0); integral forms (drills 0085/0086) added; new Example: induced E in a rising B |
| t5.em-waves | teaching | added travelling-wave form and intensity (drills 0104, 0105) |
| t5.poynting | shape, teaching | average energy density and point-source intensity (drills 0113, 0114) |
| t5.em-boundary | overlap, teaching | Example n=1.40 (n=1.50 matched Brewster drill); added v = 1/sqrt(eps mu) (drill 0123); Check not tied to glass |
| t6.gen-coords | shape, teaching | 163 words -> in range; added how to write T from chosen coordinates (drills 0004-0006 ask for T) |
| t6.cyclic | teaching | added p_phi = m r^2 phidot for polar L (drills 0022-0024) |
| t6.central-force | teaching | added circular-orbit speed for gravity (drill 0040) |
| t6.eff-potential | overlap, teaching | Example m=1.0, k=9.0, l=3.0 (answer 2.25 m matched t6-0049); added circular speed and energy formulas (drills 0050, 0051) |
| t6.small-osc | teaching | effective mass and normal-mode determinant (drills 0059, 0060) |
| t6.rotating | overlap | Example omega 0.30, v 4.0, r 2.0 (omega 3.0 matched drill) |
| t6.lorentz-tr | overlap | Example event x=6.0e8 m, t=5.0 s at 0.60c (matched t6-0077 values); Example event x=9.0e8 m, t=6.0 s (avoid t6-f026) |
| t6.dilation-contraction | overlap | Example duplicated drill 0086 (100 m at 0.80c); now 75 m at 0.60c |
| t6.vel-addition | overlap | Example 0.70c + 0.40c (0.90c and 0.50c matched drill 0096) |
| t6.rel-energy | teaching | added gamma definition (drills 0103, 0104) |
| t6.rel-collisions | teaching | added two-body decay at rest energy (drill 0121) |
| t7.first-law | overlap, teaching | Example 300 J on gas, 120 J lost (200/50/150 matched t7-0004); added C_V for monatomic and constant-volume Q = Delta U (drill 0005) |
| t7.gas-processes | overlap, teaching | Example duplicated drill 0015 (monatomic 300 K, volume halved); now 400 K, volume x8; added PV^gamma and isobaric Q (drill 0014); Example now compression from 250 K to 1/8 volume (expansion 400->300 K matched t7-0017) |
| t7.engines | overlap | Example 800 K / 400 K, 1500 J; refrigerator 250/300 K (500/300/2000 and 270/300 matched drills 0022, 0024) |
| t7.entropy | teaching | added two-reservoir irreversible heat flow formula (drill 0032) |
| t7.potentials | teaching | defined H, F, G (drill 0049 needs G = H - TS) |
| t7.phase | overlap, teaching | added Delta S = nL/T and dP/dT = PL/(RT^2) (drills 0061, 0063); Example changed to boiling ethanol (273 K, 6.0 kJ matched t7-0061) |
| t7.kinetic | teaching | added N_A, molar form of v_rms, total translational energy (drills 0067, 0068) |
| t7.equipartition | overlap, teaching | added solid f=6 so C=3R (drill 0078); Example 3.0 mol, 15 K (2.0 mol diatomic matched t7-0077) |
| t7.canonical | factual | Example rounding: eps/kT = 3.86 gives p_up = 0.021, not 0.020; Check extended with hot and cold limits (drill 0096) |
| t7.blackbody | overlap | Example duplicated drills 0113/0115 (7.0e8 m, 5800 K); now R=2.0e8 m, T=3500 K |
| t7.heat-transfer | overlap | Example concrete 0.15 m k=1.0 + wood 0.030 m k=0.15, A=5.0, 30 K |
| t7.second-law | overlap | Example dH=+42 kJ, dS=+0.12 kJ/K (was same numbers as t7-0044); shows the high-T case |
| t8.born | overlap | Example duplicated drill 0006 (psi = A exp(-x/a)); now psi = A x^2 on 0..2.0 nm |
| t8.step-tunnel | overlap, teaching | added step reflection formula (drill 0032); Example E=0.50 eV, V0=2.0 eV, a=0.40 nm |
| t8.qho | teaching | added ground-state <x^2> and omega = sqrt(k/m) (drills 0041, 0042) |
| t8.operators | overlap, teaching | Example [x,p^2] (was the same commutator as drill 0049); added Ehrenfest rule (drill 0050) |
| t8.uncertainty | teaching | added energy-time bound named in When |
| t8.ang-mom-qm | teaching | added L_x^2+L_y^2 and angle to z (drills 0086, 0087); trimmed |
| t8.two-level | overlap | Example Omega=3.0e6 s^-1 for 0.40 us (Omega=2.0e12 matched drill 0104) |
| t8.perturbation | teaching | stated how to evaluate the diagonal element with the well wavefunction (drills 0112-0114) |
| t8.variational | shape, teaching | added <T> from /psi'/^2 (no second derivative at a cusp); numerics confirmed 0.7071 hbar omega; kinetic-energy formula moved to display math |
| t8.identical | teaching | added spinless fermions and symmetric/antisymmetric two-orbital states (drills 0130, 0132) |
| t9.hydrogen | teaching | added photon wavelength lambda = 1240 eV nm / dE (drill 0005) |
| t9.fine-hyperfine | teaching | added hc and interval rule (drills 0014, 0015) |
| t9.zeeman-stark | overlap, teaching | added Lande g_J formula (drill 0023); Example B=0.80 T (0.50 T matched 0022) |
| t9.selection | shape | grammar: An allowed line |
| t9.multi-electron | teaching | added Slater screening constants (drill 0041) |
| t9.xray-spectra | overlap | Example Mo (Z=42); copper Z=29 duplicated drill 0050 |
| t9.early-quantum | overlap, teaching | added threshold wavelength; Example Compton at 60 deg (90 deg matched drill 0062) |
| t9.nuclear-structure | overlap, shape | Example 12C (He-4 mass defect duplicated drill 0068); removed stray A=27 sentence |
| t9.decay | overlap, teaching | Example T=20 min, 960 Bq, 2.0 h; added solving for time (drill 0078) |
| t9.nuclear-reactions | overlap | second reaction Delta m = 0.0050 u (0.0189 u gave 17.6 MeV, near drill 0085 answer) |
| t9.particle-kinematics | teaching | added fixed-target threshold energy (drill 0096) |
| t9.standard-model | teaching | named quark charges and strangeness (drills 0103, 0105) |
| t9.crystal-bands | overlap, teaching | Example lambda 0.071 nm, d 0.25 nm (0.154/0.200 matched drill 0113); added atoms per cell, number density and nearest-neighbour distance (drills 0112, 0114) |
| t9.semiconductors | overlap | Example N_D = 5.0e16, mu_n = 1400 (1350 matched drill 0122) |
| t9.solid-thermal | teaching | gave the Debye T^3 prefactor (flagged card; checked: 12 pi^4/5 R, BCS 1.76 kB Tc, isotope M^-1/2 all correct) |
| t9.lab-stats | overlap, teaching | Example 3600/1600 counts in 200 s; added weighted mean (drill 0140) |
| t9.lab-electronics | overlap, teaching | Example C=33 nF, Rf 100k/Ri 5.0k (47k/4.7k matched drill 0149); added non-inverting gain (drill 0149) |
| t10.pacing | factual | scoring line now states what ETS reports (about 70 questions / 2 h confirmed via ETS practice book; percent-correct reporting since Sept 2023, so no wrong-answer penalty; confirm in current bulletin) |

### Left as is

Cards with no edit are those whose Example, formulas and drill coverage all passed. Notes: `t3.diffraction` and `t5.em-waves` share a constant (550 nm, c) with items, not treated as overlap. `t6.*` cards keep the older spacing style in math; renders fine. `t2.sound` uses v = 343 m/s while drills give 340; the card says "unless told otherwise".

### Still doubtful

- `t10.pacing` scoring sentence depends on ETS policy; reconfirm against the current Information Bulletin.
- `t9.zeeman-stark` Stark paragraph is qualitative; drills do not test it numerically.
- Longest cards after edits are under 140 words; the densest for a cold reader are `t4.images`, `t6.gen-coords` and `t8.identical`.
