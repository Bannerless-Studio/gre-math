# Decisions (owner-delegated, 2026-10-12)

Resolves SPEC.md section 9 and reconciles SPEC levels with CURRICULUM tiers.

1. One HTML per pack (vocab-engine model). KaTeX core-font subset inlined per page.
2. Correctness: executable checks + blind solve in the pipeline; owner spot-checks 10% of the first 200 items.
3. Licence: engine MIT, items CC BY-SA 4.0 (same as vocab-engine packs).
4. Full problems: timed 5-option MCQ first, then solution reveal + method self-grade. Micro: free-response where checkable.
5. Expression input: ASCII with live preview; no keypad in v1.
6. Levels = CURRICULUM tiers T1–T10, not SPEC's L0–L6. SPEC level ids are superseded; `pack.levels` lists T1..T10. Technique ids come from CURRICULUM.md JSON.
7. Seed pack for M1 = gre-math T1 (first ~10 techniques), not a throwaway `packs/seed`.
8. Model policy: Haiku 5.5 first-pass builds and recall/micro item generation (answers code-verified); Sonnet 5.5 for full items, reviews, Haiku failures; Opus only after Sonnet fails.
9. Placement (reconciles SPEC §6 with CURRICULUM §4): mechanism = SPEC §6 (vocab-proven adaptive walk: ascending, cumulative accuracy ≥ 0.7 prefix rule, isolated-zero tolerance, early stop on 3 zero buckets, placed techniques `{s:1, prov:1}`, retake only forward, no day-based intervals). Buckets = tiers T1..T9, one bucket each, 5 probe items per tier drawn from the CURRICULUM §4 probe technique lists; probes are tier b items flagged `probe: true` (each content batch must author one probe per listed technique). MCQ probes get an explicit "I don't know" option (scores 0). Cross-tier prereq exception (T6 before T3–T5) is a recommendation only; the gate stays linear.

M6 decisions (resolved on the owner's behalf, to confirm):
- Placement stops: the CURRICULUM 4.2 low run (two buckets under 0.7) is added to SPEC 6's zero run, because SPEC 6 as written closes on the first bucket under 0.7 and then the isolated-zero rule could never apply.
- Placement knowns: provisional techniques count as known for the gate and as prerequisites. Without this a placed learner sees the gate hold on a level they were placed through (SPEC 6 wordKnownP).
- Probes: "I don't know" is offered on every probe, typed ones too, scoring 0 with no attempt. Typed probes would otherwise have no way to decline.
- Review at streak 2: when a tier a recall pool has no typed item, the typed card comes from tier b. Without this, recall MCQ fills the per-technique cap and streaks never move past 2.
- Summary: missed solutions sit behind a fold. The solution already showed at the reveal.
- Retake UI: not offered (decision 9). The core applies forward-only retakes, tested.
10. Numeric tolerance is relative, never an absolute floor (2026-10-13, physics pack prep). Expression sampling and numeric float checks used `1e-9 * max(1, |v|)`, which accepted any value within 1e-9 of a target near 1e-19; the decimal branch had a 1e-12 absolute slack. Both are now relative to the value. `rel` (0 to 0.1) applies to decimal and float targets. Exact rational targets under `exact` still compare exactly. Exception (review fix): exact-zero targets, which have no relative scale, keep a `1e-12` absolute slack (numeric expression input; expression items when one side is identically 0), because float cancellation never lands on 0.
11. Scientific literals (`3e8`, `1.6e-19`) are accepted as typed numeric answers, and still rejected in expressions because `2e-1` is ambiguous there (2026-10-13).
12. Figures are inline SVG on items and teach cards, gated at build time by `tools/figure.js`; the page inserts them as HTML. Allowlist and rules in `docs/PACK_SCHEMA.md` "Figures" (2026-10-13).
