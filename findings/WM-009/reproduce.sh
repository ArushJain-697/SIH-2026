#!/usr/bin/env bash
# WM-009 — re-runs the real AST-based premium-fetch scanner (requires
# TypeScript, isolated in engine/scanners/ast-tools/) against the real
# live source.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

if [ ! -d "engine/scanners/ast-tools/node_modules/typescript" ]; then
  echo "installing the isolated TypeScript sub-package (one-time, ~23MB)..."
  (cd engine/scanners/ast-tools && npm install --no-audit --no-fund)
fi

EVIDENCE_DIR="findings/WM-009/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/authz-access.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/authz-access-output.txt"
cp engine/scanners/output/authz-access-report.json "$EVIDENCE_DIR/"

echo
echo "WM-009 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
