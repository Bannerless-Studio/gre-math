# problem-engine TODO

Milestones: docs/SPEC.md §8. Decisions: docs/DECISIONS.md.

## Pipeline
- [x] M1 Today + recall/micro on T1 (haiku build, sonnet review ACCEPT with 5 fixes, 2026-10-12)
- [x] M2 KaTeX rendering (build-time render, core font subset inline, validator LaTeX and glyph gate; F1, F4, F5 closed in the same change)
- [x] M3 answer checker engine/answer.js (haiku, 276 checks, 2026-10-12); UI wiring + core reconciliation → M4
- [x] M4 progress safety + PWA/service worker (answer.js wired into core and page; store.js + export_checks 43 checks; sw.js per build with update banner; check_site.sh; browser proof: 21 UI checks and 9 offline/banner/kill-switch checks, 2026-10-12)
- [x] M5 full problems + self-grade (core grade rules and wk/fp, Full stage 4, timed card with rubric grade, validator, tests/full_checks.js 64 checks, browser proof 18 checks at 360x780)
- [x] M6 gate exam rule, placement, Progress v2, UI brevity, SPEC §5 leftovers (tests/m6_checks.js 87 checks, browser proof 27 checks at 360x780, 2026-10-12)
- [x] M7 session resume (M1-review F2; tests/session_resume_checks.js 53 checks, browser proof 25 checks at 360x780 on the fixture, 2026-10-12)
- [ ] M8 content T2–T10 (owner go/no-go per batch)
- [ ] M9 ETA calibration, deploy

## Open defects / carry-overs from M1 review
- [x] F1 (med): `in` set at startSession, teach card comes after Review → End during Review leaves tech started but never taught. Fixed in M2: `in` set when the teach card is advanced; teach re-offered for in>0 && r+w==0.
- [x] F4 (low): validator requires ≥1 tier b numeric/expression item per technique with items. Fixed in M2; pickItem now prefers unused-today items before the numeric preference.
- [x] F5 (low): validator warns on answer kinds the engine can't play yet (expression/multi/self without options). Fixed in M2.
- F7 (low): single pre_import backup slot. (`<!--` guard added for pack.json in the M2/M3 review; items/techniques html is escaped.)

## M4 reconciliation (core.js must adopt answer.js semantics) — done
- core.js has no numeric copy; grading goes through answer.check (`PEAnswer`). `itemKind` plays numeric, expression, mcq, multi. `self` waits for M5.
- Expression live feedback is a parsed "Read as" echo (no KaTeX JS in the page). A parse error shows inline, counts no attempt, and keeps the input.
- core.checkNumeric → delegate to answer.check. Differences today: form fraction rejects decimals in answer.js; core compares float vs rational via null `p`.
- Decided: `log` = base 10, authors write `ln` for natural (document in authoring guide). form rejections count as an attempt; parse/spec/too-few-points errors do not.
- form exact + rational target: literal input required (no `sqrt(2)`); fine.

## M2/M3 review changes (2026-10-12)
- Render: KaTeX `output: "html"` (no MathML), wrapper `<span role="math" aria-label="TEX">`, `trust` callback records an error and refuses \href/\url/\htmlClass/\includegraphics (KaTeX otherwise draws them as red text without throwing). Code spans keep `$` literal.
- Size: tag dictionary in shipped JSON (text.js unpack, render.js packHtml). gre-math item data 1.17 MB (MathML+HTML) -> 0.85 MB (html only) -> 0.21 MB (packed) = 1.8 KB/item incl. source fields; dist 1.43 MB -> 0.53 MB (gzip 196 KB). Fixture 388 KB -> 293 KB. Runtime option if packs grow past ~1000 items: ship katex.min.js (275 KB) and render from source (0.7 KB/item).
- Answer: typed side thin/NaN (target fine) is now a wrong answer (attempt counted, error no-valid-points), not a no-attempt error. Exact numeric with rational target accepts typed rational arithmetic ((1/2), 1/3+1/6). `x2`/`(x+1)2` rejected (number must come first). Unicode minus/times/pi and `**` normalised. `2e-1` stays a parse error (ambiguous with scientific notation).
- F1: buildPlan no longer plans Review/Micro for a technique that is started but unanswered (teach card comes first).
- Open (M4 carry-over): `1/2x` parses as (1/2)*x; `sin x` and `sin^2(x)` are parse errors (no attempt).

## Decisions taken on review findings
- F3: after a miss, no credit for that technique for the rest of the session (stricter than SPEC text). Kept: a miss is a miss.

## SPEC §5 status
- Done in M6: 40% production share in Review (typed tier b fallback), 2 new per session below 20 started then 1, pauseNew on Today.
- Open: ETA (M9).

## M4 carry-overs (2026-10-12)
- Single-slot backups: a second unreadable record overwrites `_invalid_backup`, and a second import overwrites `_pre_import_backup` (F7). Multi-slot backups are a later decision.
- The page load order bug (store.js read core.js at load) passed the node suites and only showed in the browser. Add a tier check that runs the built page's scripts in a vm with a fake DOM, or keep the browser checks in the release routine.
- Browser checks are not in the tier: `.cache/m4/browser.js` (Playwright, from the china-harbour install). Run before each publish.
- Build output lives at repo root (index.html + sw.js) for Pages; fixture builds go to .cache/. Pages in one directory share one `sw.js`, so keep one page per directory (README "Offline use").
- Not yet committed: the M4 files are uncommitted, `check_site.sh` reports them untracked until the commit.

## M5 carry-overs (2026-10-12)
- Full items use top-level `rubric` and `pass`; answer kind is mcq (5 options) or numeric. Content must emit that shape; `self` is refused for tier c. Full items with no mastered secondary tag never play.
- Full stage needs 4 techniques with a streak and a mastered secondary tag on the chosen item. Owner call: confirm the 4 and the 0.5 "far below" share (`FULL_NEAR` in core).
- Grade 0 also sets `wk` on the primary, not only the secondaries (SPEC 2.4 says secondaries). Needed so the failed technique leads the next Micro.
- Reload mid-full drops the card (closed in M7: the parked session keeps the committed or uncommitted card and its timer). `fp` is set but the gate does not read it until M6.
- Browser proof is `.cache/m5/browser.js` (seed: `.cache/m5/seed.js`), not in the tier. It covers the grade 0 path in the browser. Grade 2 is covered by core tests only. The hidden-tab step skews `Date.now` in the page, not a real backgrounded tab.


## UI polish (owner rule: in-game text short; surprisal-ui)
- Done in M6: full grade screen is one grade line plus only the surprising facts; reveal shows the note only when there is one; summary folds solutions. Owner rule applied to every reveal.

## M6 carry-overs (2026-10-12)
- STATUS (measured, not promised): seeded gre-math sim, T1 to T2 gate opens at session 20 for 95% right (seeds 20261012, 1, 2, 3, 4: 20, 35, 40, 20, 27); 90% right: 63, 38, 38, 50, 60; 80% right: not within 200 on seeds 20261012 and 4, 171, 111, 129 on seeds 1, 2, 3. Source: `tests/m6_checks.js` output line `SIM gre-math`.
- Learn stalls at about 80% accuracy. Each miss resets the streak (SPEC 2.4), so mastery slows, the prerequisite wait holds Learn, and Full has no mastered secondary tag. Decision needed before M9: keep the reset, or soften it for tier b misses.
- Content gap: every gre-math tier a item is mcq. Review's typed cards come from tier b until M8 adds typed recall items. Remove the fallback in `take` when that lands, or keep it as a documented rule.
- Placement tests T1 only. T2 to T9 skip with "has 0 probe items" until each content batch flags probes (M8).
- Placement state lives only in the page. A reload mid-test drops it, and nothing is written. Placement and exam do not resume (M7 resumes Today only).
- Retake UI is not offered (DECISIONS 9). The core applies forward-only retakes and is tested.
- Level exam needs a tier c item whose secondary tag is mastered. The exam is covered by core checks; the browser proof does not drive it.
- Pack rule to add to the validator: a level with fewer than 4 techniques deadlocks the gate, since fp comes from Full problems and Full needs 4 techniques with a streak. Fixture block 7 in `tests/full_checks.js` opens the gate for this reason.
- Browser proof is `.cache/m6/browser.js` (not in the tier). Screenshots are in `.cache/m6/`.

## Pacing study 2026-10-12
Harness: `tests/pacing_sim.js` (standalone; patches an in-memory copy of core.js, engine defaults untouched). Rerun: `node tests/pacing_sim.js wide=1 acc=95,90,80,70 configs=base,rec_n2` (args or env `PACING_*`; `custom=reset=dec,fpprod=1` for an ad-hoc set; `clone=10` for the whole pack; header comment lists every key). Seeds 20261012,1,2,3,4. Every number below is measured, median of 5 seeds, cap 200 sessions (400 for clone).
Learner model: every card right with probability p, independent. Real learners are streakier. G = T1 fully taught and gate open (T2 can start). M = all 13 T1 techniques mastered at once.

### Why the base is slow (found while measuring)
- A mastered technique still gets Micro cards, so one slip (p=0.9, about 2 typed answers per session) un-masters it. Under the miss-to-zero rule the learner hovers around the 0.7 gate and M is almost never reached at 90% (">200").
- `fp` binds at 95%: `gate_m` (exam rule off) and `fpprod` give the same G (17), so fp, not mastery, is the wait.
- The prereq rule (prereq mastered = 3 credited sessions) makes T1's chain lin-eq, quad, factor, rational, abs-ineq a floor of about 15 sessions even at 100%.
- New-technique cap is 1 per session after 20 started: 120 sessions just to introduce the last 120 techniques of the pack.
- Full is 1 per session, and `session.full` above 1 did nothing before the sim (planFull returns one card). Full costs 5 to 18 minutes of the timer each.

### T1 (13 techniques), G / M median sessions, isolated hypotheses then combined
| config | changes | 95% | 90% | 80% | 70% | fulls/session |
|---|---|---|---|---|---|---|
| base | defaults | 27 / 46 | 50 / >200 | 171 / >200 | >200 / >200 | 0.87 |
| H1 full2 | 2 full per session | 25 / 65 | 44 / >200 | >200 / >200 | >200 / >200 | 1.72 |
| H1 full3 | 3 full per session | 20 / 52 | 35 / >200 | >200 / >200 | >200 / >200 | 2.51 |
| H1 fpprod | fp also from a right typed tier b at streak >= 2 | 17 / 46 | 38 / >200 | 171 / >200 | >200 / >200 | 0.86 |
| H1 full2+fpprod | both | 16 / 65 | 33 / >200 | >200 / >200 | >200 / >200 | 1.72 |
| H2 dec | miss: streak minus 1 (un-masters below 3) | 26 / 19 | 24 / 24 | 38 / 50 | 141 / >200 | 0.82 |
| H2 verdict | per session: credit if right >= 2x wrong, reset if wrong >= right | 38 / 17 | 22 / 21 | 47 / >200 | 165 / >200 | 0.85 |
| H3 new3 | 3 new per session below 20 started | 31 / 54 | 42 / >200 | >200 / >200 | >200 / >200 | 0.90 |
| H3 new_wip | uncapped, WIP cap 6 only | 23 / 54 | 38 / >200 | >200 / >200 | >200 / >200 | 0.88 |
| H4 gate_m | exam rule off | 17 / 46 | 38 / >200 | 171 / >200 | >200 / >200 | 0.86 |
| H4 gate_s2 | known = streak >= 2 | 17 / 46 | 25 / >200 | 91 / >200 | >200 / >200 | 0.86 |
| extra gate_ever | known = ever mastered (a slip does not un-know) | 20 / 46 | 40 / >200 | 66 / >200 | >200 / >200 | 0.86 |
| extra prereq_s1 | prereq counts at streak >= 1 | 31 / 21 | 38 / >200 | >200 / >200 | >200 / >200 | 0.90 |
| combo rec_cons | dec + fpprod | 16 / 19 | 20 / 24 | 30 / 50 | 131 / >200 | 0.76 |
| combo rec | dec + fpprod + prereq s1 | 9 / 11 | 10 / 15 | 18 / 29 | 45 / >200 | 0.71 |
| combo verdict+s2 | verdict + fpprod + gate s2 | 13 / 17 | 13 / 21 | 19 / >200 | 43 / >200 | 0.77 |
| combo c_all | full2 + fpprod + verdict + new3 + gate s2 | 16 / 20 | 15 / 34 | 18 / >200 | 64 / >200 | 1.54 |
Read: no single hypothesis fixes it. Reset severity (H2) is the main lever at 90% and below; fp (fpprod) is the lever at 95%. More Full per session (H1) and a bigger intro cap (H3) barely move G and Full adds a timed problem per session. Gate s2 helps only by making "known" cheaper. `dec` beats `verdict` on simplicity and is never worse on G once fpprod is on.

### Whole pack (10 tiers of 13, T1 cloned; `clone=10`), sessions until every tier has 70% known (K) and until tier 5 / 10 starts
| config | 95% L5 / L10 / K | 90% | 80% | 70% |
|---|---|---|---|---|
| base | 245 / >400 / >400 | 260 / >400 / >400 | >400 | >400 |
| rec_cons (dec + fpprod) | 74 / 156 / 168 | 81 / 189 / 207 | 143 / 294 / 335 | 343 / >400 / >400 |
| rec (+ prereq s1) | 45 / 111 / 122 | 49 / 116 / 129 | 66 / 154 / 168 | 151 / 304 / 331 |
| rec_n2 (rec + 2 new per session after 20 started) | 33 / 74 / 81 | 38 / 87 / 94 | 62 / 128 / 142 | 152 / 295 / 322 |
| rec_fast (rec_n2 + 3 new below 20) | 31 / 72 / 79 | 40 / 88 / 95 | 54 / 125 / 137 | 158 / 279 / 298 |
Cards answered per session (excl. teach cards) in rec_n2: 28.2 at 95%, 28.9 at 80%; base 22.6. Minutes per session are unmeasured. With `rec` (NEW_LATER 1) the last tiers stall (A = all taught not reached at 95%): Learn waits while more than 6 techniques sit at 0 < streak < 3.

### Recommendation (shipped 2026-10-12, owner decision: rec_n2)
Ship `rec_n2`: all four edits are one-liners in core.js.
1. `resetTech`: miss on a technique sets `s = max(0, s - 1)` and `m = s >= 3` instead of `s = 0, m = 0` (also covers critical-tag and grade 0 resets; `prov` still drops).
2. `fp` set when a typed tier b answer is right at streak >= `PRODUCTION_STREAK` (so fp means "proved under production", not strictly a full problem). The full-problem grade 2 path keeps setting fp.
3. Learn prereq counts at streak >= 1 (started and credited once) instead of mastered.
4. `NEW_LATER` 2 (new per session once 20 are started); `NEW_EARLY` 2, `session.learn` 2, `session.full` 1, `WIP_CAP` 6, `gate` 0.7 and the exam rule all unchanged.
Measured effect on T1: gate opens at session 9 / 10 / 18 / 45 for 95 / 90 / 80 / 70% right, from 27 / 50 / 171 / never. Whole pack, every tier at 70% known: 81 / 94 / 142 / 322 sessions, from never.
**STATUS 2026-10-12:** shipped as the engine defaults. `configs=base` reproduces the rec_n2 row exactly.
- T1 gate, G / M sessions at 95 / 90 / 80 / 70%: base 9 / 11, 10 / 15, 18 / 29, 45 / >200 (pre-study: 27 / 46, 50 / >200, 171 / >200, >200).
- Whole pack, `clone=10 max=400`, L5 / L10 / K sessions: 95%: 33 / 74 / 81; 90%: 38 / 87 / 94; 80%: 62 / 128 / 142; 70%: 152 / 295 / 322.
- Pre-study engine (`configs=pre_study`) on the same run: L5 not reached within 200 at 95%.
- Measured with `node tests/pacing_sim.js wide=1 acc=95,90,80,70 configs=base` (T1) and with `clone=10 max=400` (pack).

Why not more: Full x2 or x3 adds a 5 to 18 minute timed problem per session for a small gain; bigger early intro cap and `gate s2` do not help once reset and fp are fixed; `verdict` needs per-session tallies and does worse at 95%.
Risks to weigh: (a) the 70% learner still opens T2 at session 45 because each 3-credit run is easier with `dec`; if that is too lenient, use `rec_cons` (T1 gate 16 / 20 / 30 / 131) and accept a slower pack (K 168 at 95%). (b) fpprod weakens SPEC 2.6's "solve a full problem" wording; the exam rule then only checks typed production. (c) the sim answers every card with the same p, so hard full problems are not modelled. (d) T2 to T10 have no items yet; the whole-pack table clones T1 and says nothing about content difficulty.
