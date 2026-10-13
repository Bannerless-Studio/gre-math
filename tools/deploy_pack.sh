#!/bin/sh
# Builds one pack into a site directory (any git checkout), then runs the stale-build guard on it.
#   tools/deploy_pack.sh packs/gre-math .            # gre-math at the repo root (the existing site)
#   tools/deploy_pack.sh packs/gre-physics ../gre-physics-site
# Writes <site-dir>/index.html and <site-dir>/sw.js (build.sh), then runs tools/check_site.sh on them. That check
# fails until the page and sw.js are committed in the site's own git repo, which this script never does.
# Refuses when <site-dir> is this repo's root and the pack is not gre-math (the root site is gre-math only), and when
# the site's existing index.html carries a <!--pe-pack:key--> marker for a different pack.
# Node: set NODE=/path/to/node when `node` is not on PATH.
set -e
usage() { echo "usage: $0 <packdir> <site-dir>" >&2; exit 2; }
[ $# -eq 2 ] || usage
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
[ -d "$1" ] || { echo "deploy_pack: pack directory $1 not found" >&2; exit 2; }
[ -d "$2" ] || { echo "deploy_pack: site directory $2 not found (check out the site repo first)" >&2; exit 2; }
PACK="$(cd "$1" && pwd -P)"
SITE="$(cd "$2" && pwd -P)"
PACK_NAME="$(basename "$PACK")"
if [ "$SITE" = "$ROOT" ] && [ "$PACK_NAME" != "gre-math" ]; then
  echo "deploy_pack: refusing to write $PACK_NAME into the repo root; the root site is gre-math only" >&2
  exit 1
fi
# The other direction (T2): refuse when the site already holds a page built from a different pack.
NEW_KEY="$(sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PACK/pack.json" | head -1)"
OLD_KEY=""
[ -f "$SITE/index.html" ] && OLD_KEY="$(sed -n 's/^<!--pe-pack:\(.*\)-->$/\1/p' "$SITE/index.html" | head -1)"
# Pages built before the marker existed: read the key of the pack JSON inlined in the page instead.
if [ -z "$OLD_KEY" ] && [ -f "$SITE/index.html" ]; then
  OLD_KEY="$(grep -A3 'window.PE_DATA={"pack":' "$SITE/index.html" | sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi
if [ -n "$OLD_KEY" ] && [ "$OLD_KEY" != "$NEW_KEY" ]; then
  echo "deploy_pack: $SITE holds a $OLD_KEY page; refusing to overwrite it with $NEW_KEY" >&2
  exit 1
fi
sh "$ROOT/build.sh" "$PACK" "$SITE/index.html"
sh "$ROOT/tools/check_site.sh" "$PACK" "$SITE/index.html"
