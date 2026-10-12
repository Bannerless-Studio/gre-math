#!/bin/sh
# Builds one pack into a site directory (any git checkout), then runs the stale-build guard on it.
#   tools/deploy_pack.sh packs/gre-math .            # gre-math at the repo root (the existing site)
#   tools/deploy_pack.sh packs/gre-physics ../gre-physics-site
# Writes <site-dir>/index.html and <site-dir>/sw.js (build.sh), then runs tools/check_site.sh on them. That check
# fails until the page and sw.js are committed in the site's own git repo, which this script never does.
# Refuses when <site-dir> is this repo's root and the pack is not gre-math: the root site is gre-math only.
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
sh "$ROOT/build.sh" "$PACK" "$SITE/index.html"
sh "$ROOT/tools/check_site.sh" "$PACK" "$SITE/index.html"
