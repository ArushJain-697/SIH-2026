#!/usr/bin/env bash
# WM-006 — re-runs the secure-comms scanner (dynamic pass against the real
# running instance + static pass against the real vercel.json) and captures
# evidence. This finding needs the REAL app running (not just cloned) —
# see lab/README.md for how to stand it up.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching (needed for the static vercel.json pass)..."
  bash lab/fetch-target-source.sh
fi

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
  echo "ERROR: the real instance is not running on localhost:3000."
  echo "Start it first (this needs a one-time 'npm install', ~2.1GB, ~3 min):"
  echo "  cd .cache/worldmonitor-src && npm install && npm run dev"
  echo "Then re-run this script. (The static-only pass would skip this — see engine/scanners/secure-comms.mjs directly if you only need the vercel.json analysis.)"
  exit 1
fi

EVIDENCE_DIR="findings/WM-006/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/secure-comms.mjs http://localhost:3000/ .cache/worldmonitor-src 2>&1 | tee "$EVIDENCE_DIR/secure-comms-output.txt"
cp engine/scanners/output/secure-comms-report.json "$EVIDENCE_DIR/"
cp engine/scanners/output/evidence/secure-comms-dynamic-headers.json "$EVIDENCE_DIR/" 2>/dev/null || true

echo
echo "WM-006 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
