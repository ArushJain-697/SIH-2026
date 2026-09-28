#!/usr/bin/env bash
# WM-004 — re-runs the CORS wildcard/credentials scan
# (framework/seam-linter/cors-scan.mjs) against the target's live public
# source at the pinned commit, and captures the verdict as evidence.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-004/evidence"
mkdir -p "$EVIDENCE_DIR"

node framework/seam-linter/cors-scan.mjs .cache/worldmonitor-src 2>&1 | tee "$EVIDENCE_DIR/cors-scan-output.txt"
cp framework/seam-linter/output/cors-scan-report.json "$EVIDENCE_DIR/cors-scan-report.json"

echo
echo "WM-004 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
