# Algorithmic Discovery: curriculum for the `algo-discovery` pack

Status: draft v1, 2026-10-13. Pack path: `packs/algo-discovery/`. Schema: `docs/PACK_SCHEMA.md` (ladder items). The pack trains the mental moves behind competitive-programming problems from Codeforces rating 1400 to 1700. Each item is a ladder: a staged walk from the statement to the algorithm, built from a real coaching session, whose wrong options and counterexample claims are the learner's actual mistakes. Techniques are moves, not algorithm names. Statements are paraphrased with a source citation, and every sample answer and counterexample was verified by brute force.

| Item | Source | Band | Move | Stages (C choose, X counterexample, T typed) | Hints at |
|---|---|---|---|---|---|
| ld.1490e | Codeforces 1490E | 1400 | mv.monotone-boundary | C C X C C | s2 |
| ld.1462d | Codeforces 1462D | 1400 | mv.final-state | X X C T C C | s4 |
| ld.1201c | Codeforces 1201C | 1400 | mv.threshold-search | C X T C C | s3 |
| ld.1610c | Codeforces 1610C | 1500 | mv.fix-the-unknown | C C T C C | s3 |
| ld.977e | Codeforces 977E | 1500 | mv.local-condition | X C C C C | - |
| ld.1519d | Codeforces 1519D | 1600 | mv.incremental-eval | X C C T X C | s4 |
| ld.1213g | Codeforces 1213G | 1700 | mv.offline-merge | C C X C C C T | s6,s7 |
