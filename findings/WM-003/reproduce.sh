#!/usr/bin/env bash
# WM-003 — re-runs the independent rate-limit coverage re-derivation
# (framework/seam-linter/rate-limit-coverage-check.mjs) against the target's
# live public source at the pinned commit, and captures the verdict as
# evidence. Reading public source is explicitly permitted — see docs/ROE.md.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-003/evidence"
mkdir -p "$EVIDENCE_DIR"

node framework/seam-linter/rate-limit-coverage-check.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/rate-limit-coverage-report.json"

echo
echo "WM-003 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/rate-limit-coverage-report.json"
