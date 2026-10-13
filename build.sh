#!/bin/sh
# Builds one self-contained HTML page for a pack: engine/text.js, core.js, app.css, app.js and the pack's JSON inlined
# into engine/app.html, plus KaTeX 0.16.11 (JS and CSS; the CSS has the core font subset inlined) from vendor/katex/.
# Math is rendered in the page at run time from the Markdown-lite source (M2 pre-rendering was replaced 2026-10-12;
# docs/SPEC.md section 4). The build only validates math: tools/render_pack.js fails the build on any LaTeX error.
# Opens from file://.
#
# Also writes sw.js next to <out.html> (engine/sw.template.js with the build id and the page file name). The page
# carries the marker <!--pe-build:<id>--> that sw.js checks before caching it. Publish sw.js together with the page;
# the page registers it for offline use (README "Offline use"). One page per output directory: sw.js is per directory.
#
# Packs with a code answer item or a ladder counterexample stage also get engine/pyworker.js and engine/pyharness.py inlined as inert text blocks
# (docs/SPEC.md 3.4); the page loads Pyodide from jsdelivr at run time, cached by sw.js.
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
         "$ROOT/engine/pyworker.js" "$ROOT/engine/pyharness.py" \
         "$ROOT/vendor/katex/katex.min.js" "$ROOT/vendor/katex/katex.min.css" \
         "$PACKDIR/pack.json" "$PACKDIR/techniques.json" "$PACKDIR/items.json"; do
  if [ ! -f "$f" ]; then echo "build.sh: missing $f" >&2; exit 1; fi
done
"$NODE" "$ROOT/tools/validate_pack.js" "$PACKDIR"
# JSON and KaTeX JS go inside <script>; a literal closing tag there would end the script early.
if grep -il '</script' "$PACKDIR/pack.json" "$PACKDIR/techniques.json" "$PACKDIR/items.json" "$ROOT/vendor/katex/katex.min.js" >/dev/null 2>&1; then
  echo "build.sh: pack JSON or katex.min.js contains a closing script tag; refusing to build" >&2; exit 1
fi
# Same for an HTML comment opener: "<!--" followed by "<script" switches the parser into double-escaped state.
if grep -l '<!--' "$PACKDIR/pack.json" "$PACKDIR/techniques.json" "$PACKDIR/items.json" "$ROOT/vendor/katex/katex.min.js" >/dev/null 2>&1; then
  echo "build.sh: pack JSON or katex.min.js contains an HTML comment opener; refusing to build" >&2; exit 1
fi
# Code answers (Python in the browser): the worker and harness sources go into the page as inert text blocks, only for
# packs that have a code item. Same two guards as above for the text blocks.
PE_CODE=0
if grep -Eq '"kind"[[:space:]]*:[[:space:]]*"code"|"type"[[:space:]]*:[[:space:]]*"counterexample"' "$PACKDIR/items.json"; then
  PE_CODE=1
  if grep -il '</script' "$ROOT/engine/pyworker.js" "$ROOT/engine/pyharness.py" >/dev/null 2>&1 || grep -l '<!--' "$ROOT/engine/pyworker.js" "$ROOT/engine/pyharness.py" >/dev/null 2>&1; then
    echo "build.sh: pyworker.js or pyharness.py contains a closing script tag or an HTML comment opener; refusing to build" >&2; exit 1
  fi
fi
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
"$NODE" "$ROOT/tools/render_pack.js" "$PACKDIR" "$WORK"
mkdir -p "$(dirname "$OUT")"
TMP="$OUT.tmp.$$"
BUILD_ID="$(cat "$ROOT/engine/app.html" "$ROOT/vendor/katex/katex.min.js" "$ROOT/engine/text.js" "$ROOT/engine/answer.js" "$ROOT/engine/store.js" "$ROOT/engine/core.js" \
  "$ROOT/engine/app.css" "$ROOT/engine/app.js" "$ROOT/engine/pyworker.js" "$ROOT/engine/pyharness.py" "$PACKDIR/pack.json" \
  "$WORK/katex.css" "$PACKDIR/items.json" "$PACKDIR/techniques.json" | cksum | awk '{ printf "%s-%s", $1, $2 }')"
PE_PACKKEY="$(sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PACKDIR/pack.json" | head -1)"
export PE_ROOT="$ROOT" PE_PACK="$PACKDIR" PE_BUILD="$BUILD_ID" PE_WORK="$WORK" PE_CODE PE_PACKKEY
awk '
  function emit(f,   line) { while ((getline line < f) > 0) print line; close(f) }
  BEGIN {
    root = ENVIRON["PE_ROOT"]; pack = ENVIRON["PE_PACK"]; build = ENVIRON["PE_BUILD"]; work = ENVIRON["PE_WORK"]
  }
  /^<!--PE_KATEX-->$/ { print "<style>"; emit(work "/katex.css"); print "</style>"; next }
  /^<!--PE_KATEX_JS-->$/ { print "<script>"; emit(root "/vendor/katex/katex.min.js"); print "</script>"; next }
  /^<!--PE_CSS-->$/  { print "<style>"; emit(root "/engine/app.css"); print "</style>"; next }
  /^<!--PE_TEXT-->$/ { print "<script>"; emit(root "/engine/text.js"); print "</script>"; next }
  /^<!--PE_ANSWER-->$/ { print "<script>"; emit(root "/engine/answer.js"); print "</script>"; next }
  /^<!--PE_STORE-->$/ { print "<script>"; emit(root "/engine/store.js"); print "</script>"; next }
  /^<!--PE_CORE-->$/ { print "<script>"; emit(root "/engine/core.js"); print "</script>"; next }
  /^<!--PE_APP-->$/  { print "<script>"; emit(root "/engine/app.js"); print "</script>"; next }
  /^<!--PE_PYCODE-->$/ {
    if (ENVIRON["PE_CODE"] == "1") {
      print "<script type=\"text/plain\" id=\"pe-pyworker\">"; emit(root "/engine/pyworker.js"); print "</script>"
      print "<script type=\"text/plain\" id=\"pe-pyharness\">"; emit(root "/engine/pyharness.py"); print "</script>"
    }
    next
  }
  /^<!--PE_DATA-->$/ {
    printf "<script>window.PE_DATA={\"pack\":"; emit(pack "/pack.json")
    printf ",\"techniques\":"; emit(pack "/techniques.json")
    printf ",\"items\":"; emit(pack "/items.json")
    print "};</script>"; next
  }
  { gsub(/__PE_BUILD__/, build); gsub(/__PE_PACKKEY__/, ENVIRON["PE_PACKKEY"]); print }
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
