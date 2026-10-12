#!/bin/sh
# Builds one self-contained HTML page for a pack: engine/text.js, core.js, app.css, app.js and the
# pack's JSON inlined into engine/app.html, plus KaTeX CSS with the core font subset inlined (M2).
# Math in prompts, options, solutions, hints and teach cards is pre-rendered to HTML at build time, so the
# page needs no KaTeX JavaScript. Opens from file://.
#
# Also writes sw.js next to <out.html> (engine/sw.template.js with the build id and the page file name). The page
# carries the marker <!--pe-build:<id>--> that sw.js checks before caching it. Publish sw.js together with the page;
# the page registers it for offline use (README "Offline use"). One page per output directory: sw.js is per directory.
#
# Usage: ./build.sh <packdir> <out.html>
#   e.g. ./build.sh packs/_fixture .cache/fixture/fixture.html (one page per directory: sw.js is shared)
# The pack must pass tools/validate_pack.js (schema, LaTeX, font subset); the build stops otherwise.
# Node is needed: set NODE=/path/to/node when `node` is not on PATH.
set -e
if [ $# -ne 2 ]; then echo "usage: $0 <packdir> <out.html>" >&2; exit 2; fi
ROOT="$(cd "$(dirname "$0")" && pwd)"
PACKDIR="${1%/}"
OUT="$2"
PAGE="$(basename "$OUT")"
case "$PAGE" in *[!A-Za-z0-9._-]*) echo "build.sh: output file name '$PAGE' must be [A-Za-z0-9._-] (it goes into sw.js)" >&2; exit 1;; esac
NODE="${NODE:-$(command -v node || true)}"
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then echo "build.sh: node not found; set NODE=/path/to/node" >&2; exit 1; fi
for f in "$ROOT/engine/app.html" "$ROOT/engine/text.js" "$ROOT/engine/answer.js" "$ROOT/engine/store.js" "$ROOT/engine/core.js" \
         "$ROOT/engine/app.css" "$ROOT/engine/app.js" "$ROOT/engine/sw.template.js" \
         "$ROOT/vendor/katex/katex.min.js" "$ROOT/vendor/katex/katex.min.css" \
         "$PACKDIR/pack.json" "$PACKDIR/techniques.json" "$PACKDIR/items.json"; do
  if [ ! -f "$f" ]; then echo "build.sh: missing $f" >&2; exit 1; fi
done
"$NODE" "$ROOT/tools/validate_pack.js" "$PACKDIR"
# JSON goes inside a <script>; a literal closing tag there would end the script early.
if grep -l '</script' "$PACKDIR/pack.json" "$PACKDIR/techniques.json" "$PACKDIR/items.json" >/dev/null 2>&1; then
  echo "build.sh: pack JSON contains a closing script tag; refusing to build" >&2; exit 1
fi
# Same for an HTML comment opener: "<!--" followed by "<script" switches the parser into double-escaped state.
if grep -l '<!--' "$PACKDIR/pack.json" >/dev/null 2>&1; then
  echo "build.sh: pack.json contains an HTML comment opener; refusing to build" >&2; exit 1
fi
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
"$NODE" "$ROOT/tools/render_pack.js" "$PACKDIR" "$WORK"
if grep -l '</script' "$WORK/items.json" "$WORK/techniques.json" "$WORK/tags.json" >/dev/null 2>&1; then
  echo "build.sh: rendered JSON contains a closing script tag; refusing to build" >&2; exit 1
fi
mkdir -p "$(dirname "$OUT")"
TMP="$OUT.tmp.$$"
BUILD_ID="$(cat "$ROOT/engine/app.html" "$ROOT/engine/text.js" "$ROOT/engine/answer.js" "$ROOT/engine/store.js" "$ROOT/engine/core.js" \
  "$ROOT/engine/app.css" "$ROOT/engine/app.js" "$PACKDIR/pack.json" \
  "$WORK/katex.css" "$WORK/items.json" "$WORK/techniques.json" "$WORK/tags.json" | cksum | awk '{ printf "%s-%s", $1, $2 }')"
export PE_ROOT="$ROOT" PE_PACK="$PACKDIR" PE_BUILD="$BUILD_ID" PE_WORK="$WORK"
awk '
  function emit(f,   line) { while ((getline line < f) > 0) print line; close(f) }
  BEGIN {
    root = ENVIRON["PE_ROOT"]; pack = ENVIRON["PE_PACK"]; build = ENVIRON["PE_BUILD"]; work = ENVIRON["PE_WORK"]
  }
  /^<!--PE_KATEX-->$/ { print "<style>"; emit(work "/katex.css"); print "</style>"; next }
  /^<!--PE_CSS-->$/  { print "<style>"; emit(root "/engine/app.css"); print "</style>"; next }
  /^<!--PE_TEXT-->$/ { print "<script>"; emit(root "/engine/text.js"); print "</script>"; next }
  /^<!--PE_ANSWER-->$/ { print "<script>"; emit(root "/engine/answer.js"); print "</script>"; next }
  /^<!--PE_STORE-->$/ { print "<script>"; emit(root "/engine/store.js"); print "</script>"; next }
  /^<!--PE_CORE-->$/ { print "<script>"; emit(root "/engine/core.js"); print "</script>"; next }
  /^<!--PE_APP-->$/  { print "<script>"; emit(root "/engine/app.js"); print "</script>"; next }
  /^<!--PE_DATA-->$/ {
    printf "<script>window.PE_DATA={\"pack\":"; emit(pack "/pack.json")
    printf ",\"techniques\":"; emit(work "/techniques.json")
    printf ",\"items\":"; emit(work "/items.json")
    printf ",\"tags\":"; emit(work "/tags.json")
    print "};</script>"; next
  }
  { gsub(/__PE_BUILD__/, build); print }
' "$ROOT/engine/app.html" > "$TMP"
mv "$TMP" "$OUT"
# sw.js next to the page: the cache name is the build id, and only this page is cached (sw.template.js).
SW="$(dirname "$OUT")/sw.js"
SWTMP="$SW.tmp.$$"
PE_BUILD="$BUILD_ID" PE_PAGE="$PAGE" awk '
  BEGIN { b = ENVIRON["PE_BUILD"]; p = ENVIRON["PE_PAGE"] }
  { gsub(/__PE_BUILD__/, b); gsub(/__PE_PAGE__/, p); print }
' "$ROOT/engine/sw.template.js" > "$SWTMP" || { rm -f "$SWTMP"; exit 1; }
mv "$SWTMP" "$SW"
echo "built $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes, build $BUILD_ID) and $SW"
