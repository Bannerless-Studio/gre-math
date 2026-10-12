#!/bin/sh
# Stale-build guard for a published pack page and its sw.js. Run from the repo root (or any directory: paths
# are resolved from the current directory, so pass the page relative to where you run it):
#   sh tools/check_site.sh packs/gre-math dist/index.html     # page; sw.js is written beside it
#   sh tools/check_site.sh packs/gre-math                        # page defaults to index.html
# Fails when:
#   - a fresh build (into a private mktemp -d, same file name) differs from the page or sw.js on disk
#     (forgot ./build.sh, or rebuilt one file without the other);
#   - the page or sw.js is not tracked by git (never published);
#   - the page or sw.js has uncommitted changes (built but not committed).
# A stale sw.js is the dangerous case: the installed worker keeps serving its cached page until a publish
# changes sw.js. A site running the kill switch (engine/sw.disable.js copied over sw.js) fails the sw.js
# comparison by design; see README "Offline use".
set -e
if [ $# -lt 1 ] || [ $# -gt 2 ]; then echo "usage: $0 <packdir> [page]" >&2; exit 2; fi
PACKDIR="$1"
PAGE="${2:-index.html}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGEDIR="$(cd "$(dirname "$PAGE")" && pwd)"
PAGEFILE="$(basename "$PAGE")"
PAGEPATH="$PAGEDIR/$PAGEFILE"
SWPATH="$PAGEDIR/sw.js"
TMPD="$(mktemp -d "${TMPDIR:-/tmp}/pe_check_site.XXXXXX")"
trap 'rm -rf "$TMPD"' EXIT
sh "$ROOT/build.sh" "$PACKDIR" "$TMPD/$PAGEFILE" > /dev/null
fail=0
for f in "$PAGEPATH" "$SWPATH"; do
  name="$(basename "$f")"
  if [ ! -f "$f" ]; then
    echo "FAIL $name is missing: run ./build.sh and commit $PAGEFILE and sw.js." >&2; fail=1; continue
  fi
  if ! cmp -s "$TMPD/$name" "$f"; then
    echo "FAIL $name is stale: a fresh build differs. Run build.sh and commit $PAGEFILE and sw.js together." >&2; fail=1
  fi
  if ! git -C "$PAGEDIR" ls-files --error-unmatch -- "$f" > /dev/null 2>&1; then
    echo "FAIL $name is not tracked by git: add and commit it (it must be published)." >&2; fail=1
  fi
done
if ! git -C "$PAGEDIR" diff --quiet HEAD -- "$PAGEPATH" "$SWPATH" 2> /dev/null; then
  echo "FAIL $PAGEFILE / sw.js have uncommitted changes: commit them together." >&2; fail=1
fi
[ "$fail" -eq 0 ] || exit 1
echo "OK $PAGEFILE and sw.js match a fresh build and are committed ($(wc -c < "$PAGEPATH" | tr -d ' ') bytes)"
