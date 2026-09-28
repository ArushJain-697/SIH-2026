#!/usr/bin/env bash
# WM-008 — re-runs the auth-session scanner (JWT alg pinning, OAuth state
# atomicity, session cookie attributes) against the real live source.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-008/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/auth-session.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/auth-session-output.txt"
cp engine/scanners/output/auth-session-report.json "$EVIDENCE_DIR/"

echo
echo "WM-008 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
