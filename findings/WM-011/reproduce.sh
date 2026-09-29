#!/usr/bin/env bash
# WM-011 — re-runs the idempotency scanner (body-hash mismatch, concurrent
# conflict, fail-closed scope) against the real live source.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-011/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/api-security.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/api-security-output.txt"
cp engine/scanners/output/api-security-report.json "$EVIDENCE_DIR/"

echo
echo "WM-011 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
