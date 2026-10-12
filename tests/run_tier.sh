#!/usr/bin/env bash
# Usage: tests/run_tier.sh fast|full
# Runs every suite; one RESULT line per suite; exit 0 only when all pass.
# Node: set NODE=/path/to/node when `node` is not on PATH.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
NODE="${NODE:-$(command -v node || true)}"
[ -n "$NODE" ] || { echo "run_tier: node not found; set NODE" >&2; exit 2; }
TIER="${1:-}"
case "$TIER" in fast|full) ;; *) echo "usage: tests/run_tier.sh fast|full" >&2; exit 2 ;; esac

fail=0
run() {
  local label="$1"; shift
  local out
  out="$("$@" 2>&1)"; local code=$?
  local line
  line="$(printf '%s\n' "$out" | grep '^RESULT ' | tail -1)"
  if [ $code -ne 0 ] || [ -z "$line" ]; then
    echo "FAIL $label (exit $code)"; printf '%s\n' "$out" | tail -40; fail=1
  else
    echo "$line"
  fi
}
validate_ok() {
  local dir="$1"
  local out; out="$("$NODE" tools/validate_pack.js "$dir" 2>&1)"; local code=$?
  if [ $code -eq 0 ]; then echo "RESULT validate $(basename "$dir") ok=1 failed=0"; else echo "FAIL validate $dir"; echo "$out"; fail=1; fi
}

run engine_checks "$NODE" tests/engine_checks.js
run answer_checks "$NODE" tests/answer_checks.js
run sim_checks "$NODE" tests/sim_checks.js
run full_checks "$NODE" tests/full_checks.js
run validate_checks "$NODE" tests/validate_checks.js
run render_checks "$NODE" tests/render_checks.js
run build_checks env NODE="$NODE" "$NODE" tests/build_checks.js
run export_checks "$NODE" tests/export_checks.js
run m6_checks "$NODE" tests/m6_checks.js
run pacing_checks "$NODE" tests/pacing_checks.js
run session_resume_checks "$NODE" tests/session_resume_checks.js
validate_ok packs/_fixture
[ -f packs/gre-math/items.json ] && validate_ok packs/gre-math

if [ $fail -eq 0 ]; then echo "ALL PASS ($TIER)"; else echo "FAILURES ($TIER)"; fi
exit $fail
