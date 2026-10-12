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
