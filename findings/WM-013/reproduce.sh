#!/usr/bin/env bash
# WM-013 — re-runs the secrets scanner (VITE_-prefixed env vars, both
# narrow and broad secret-name patterns, plus real source usage) against
# the real live source.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-013/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/secrets.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/secrets-output.txt"
cp engine/scanners/output/secrets-report.json "$EVIDENCE_DIR/"

echo
echo "WM-013 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
