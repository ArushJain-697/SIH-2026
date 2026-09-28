#!/usr/bin/env bash
# WM-005 — re-runs the cast/assertion adjacency scan
# (framework/seam-linter/cast-adjacency.mjs) against the target's live
# public source at the pinned commit, and captures the verdict as evidence.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-005/evidence"
mkdir -p "$EVIDENCE_DIR"

node framework/seam-linter/cast-adjacency.mjs .cache/worldmonitor-src 2>&1 | tee "$EVIDENCE_DIR/cast-adjacency-output.txt"
cp framework/seam-linter/output/cast-adjacency-report.json "$EVIDENCE_DIR/cast-adjacency-report.json"

echo
echo "WM-005 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
