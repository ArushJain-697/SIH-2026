#!/usr/bin/env bash
# WM-010 — re-runs the input-validation scanner (gateway validateRequest
# wiring + documented-exception compensating-control check) against the
# real live source.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-010/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/input-validation.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/input-validation-output.txt"
cp engine/scanners/output/input-validation-report.json "$EVIDENCE_DIR/"

echo
echo "WM-010 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
