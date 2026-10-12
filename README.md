# problem-engine

Live: https://bannerless-studio.github.io/gre-math/ (GitHub Pages from the repo root on `main`; publish = rebuild, commit `index.html` + `sw.js` together, push).

Offline trainer for maths problem packs. Each pack builds into one HTML page that opens from `file://`. The GRE Mathematics Subject Test pack is the first one. Rules live in `docs/SPEC.md` and `docs/DECISIONS.md`. Pack format lives in `docs/PACK_SCHEMA.md`.

## Build

```sh
NODE=/path/to/node ./build.sh packs/gre-math index.html
NODE=/path/to/node ./build.sh packs/_fixture .cache/fixture/fixture.html   # one page per directory: sw.js is shared
```

The build runs the pack validator first, then renders the math (`tools/render_pack.js`), then writes one page and `sw.js` beside it. Set `NODE` when `node` is not on PATH. Open the output file in a browser. Nothing is loaded from the network.

## Math rendering (M2)

KaTeX 0.16.11 is vendored in `vendor/katex/` (version, file list and licence in `vendor/katex/VERSION`). The build renders math to HTML at build time, so the page needs only the core font subset as inline CSS. No KaTeX JavaScript ships in the page. Rendering rules and the font subset are in `docs/PACK_SCHEMA.md` under Rendering (M2).

To check a pack's math without a build:

```sh
node tools/validate_pack.js packs/gre-math
node tools/render_pack.js packs/gre-math /tmp/gre-render
```

Rendered copies go to the output directory given. Raw pack files are not changed.

## Progress safety (M4)

Progress lives in localStorage under `pe_<key>`. The rules are in `engine/store.js` and tested by `tests/export_checks.js` with a fake storage.

- A record that cannot be parsed is copied to `pe_<key>_invalid_backup` at startup, and the page opens with a fresh record.
- Import first refuses a file from a newer build, with the vocab wording, and leaves the record and the pre-import backup untouched. Otherwise it writes `pe_<key>_pre_import_backup` and aborts if that write fails.
- Reset writes `pe_<key>_reset_backup` first and aborts if that write fails. Reset and End ask in the page, not with a browser dialog.
- A read error at load, a failed save, or a newer saved record opens the page read-only. Nothing is saved until a reload succeeds.

## Offline use and publishing (M4)

Each built page gets a `sw.js` beside it, from `engine/sw.template.js`. The worker caches that one page under a cache named by the build id, so a second load works with no network. When a rebuilt page is published, the open page shows "Updated, reload for the new version" after the new worker takes over.

- Publish `sw.js` with the page every time. A stale `sw.js` keeps serving the old cached page until a publish changes it.
- Keep one page per output directory, because each build writes its own `sw.js` there.
- Before publishing, run `sh tools/check_site.sh packs/gre-math index.html` from the repo root. It rebuilds into a temp dir, compares the page and `sw.js`, and checks that both are tracked and committed.
- Kill switch: never delete a published `sw.js`. To turn the cache off, copy `engine/sw.disable.js` over `sw.js` after `build.sh` and publish. On the next visit it deletes this page's caches and unregisters itself. `check_site.sh` then reports `sw.js` as stale, by design.
- Rollback: publish the previous page and `sw.js` together. Their build id differs from the live one, so browsers install it.

## Validate a pack

```sh
node tools/validate_pack.js packs/gre-math
```

## Tests

```sh
NODE=/path/to/node tests/run_tier.sh fast
```

Browser checks (Playwright, not in the tier) cover the page at 360x780 and the offline worker. Their scripts and screenshots live in the gitignored `.cache/m4/`. The M6 check (placement walk, Progress v2, Test tab, gate sentence) is `.cache/m6/browser.js` against the page built from `packs/gre-math`.

## Test tab and progress (M6)

- Place me: one attempt per probe, no feedback until the end. Probes are T1 items at first, so the walk stops at the first tier with no probe items and says why.
- Level exam: offered when the gate is held and within 5 points of opening. Pass at 7 of 10 marks the techniques answered right as known.
- Progress: one block per level with a 10-cell bar. Levels under 90 percent known stay open; the levels below the first such level fold into one line. The hero line shows the change since the last visit.
- Today: Pause new techniques stops Learn. Review and Full keep running.

Each suite prints one `RESULT` line. The run exits 0 only when every suite passes.

## Dev loop

No dev server. Edit `engine/` or a pack, rebuild, reload the page. Progress lives in the browser's localStorage under `pe_<key>`, so use a private window for a clean run. `packs/_fixture` is a small pack for tests only.
