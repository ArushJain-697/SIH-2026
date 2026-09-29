#!/usr/bin/env bash
# WM-012 — re-runs the SCA scanner (npm audit + real lockfile ancestry
# tracing + live-code reachability grep) and the SBOM generator against the
# real live source.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d ".cache/worldmonitor-src" ]; then
  echo "target source not cached — fetching..."
  bash lab/fetch-target-source.sh
fi

EVIDENCE_DIR="findings/WM-012/evidence"
mkdir -p "$EVIDENCE_DIR"

node engine/scanners/sca.mjs .cache/worldmonitor-src | tee "$EVIDENCE_DIR/sca-output.txt"
node engine/scanners/generate-sbom.mjs .cache/worldmonitor-src
cp engine/scanners/output/sca-report.json "$EVIDENCE_DIR/"
cp engine/scanners/output/sbom.cyclonedx.json "$EVIDENCE_DIR/"

echo
echo "--- verifying findings/WM-012/remediation.patch applies cleanly against the real pinned source (build-map-advanced #E3) ---"
(cd .cache/worldmonitor-src && git apply --check ../../findings/WM-012/remediation.patch && echo "git apply --check: OK, patch applies cleanly")

echo
echo "WM-012 reproduce.sh: verdict captured above and in $EVIDENCE_DIR/"
