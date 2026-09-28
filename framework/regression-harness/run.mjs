#!/usr/bin/env node
/**
 * Advisory-Aware Regression Harness — build-map ticket #17 (CORE, Phase 3).
 * Bible §7: "point-in-time audits go stale; this turns an app's whole
 * disclosure history into a permanent test suite."
 *
 * For each encoded advisory, this starts the lab's VULNERABLE and PATCHED
 * reproduction harness, drives the same attack through both, and asserts:
 * the vulnerable variant exhibits the documented failure, and the patched
 * variant does not. Exit non-zero if either assertion fails — i.e. this is
 * a CI gate a real pipeline could run on every commit to the reproduction
 * harnesses themselves, catching a regression in our own fix modeling.
 *
 * This intentionally tests OUR lab harnesses (lab/repro-services/), not the
 * live target — see docs/ROE.md. What it proves is the CLASS is real and
 * our understanding of the fix is correct and demonstrable, not that the
 * live target is currently patched (it already is, per its own advisory).
 *
 * Usage: node framework/regression-harness/run.mjs
 * Exit code: 0 = both advisories behave as expected, 1 = regression found.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('../../', import.meta.url).pathname;

function startProc(scriptRelPath, args = []) {
  const proc = spawn('node', [ROOT + scriptRelPath, ...args], { stdio: 'pipe' });
  proc.stderr.on('data', () => {}); // swallow startup noise; failures surface via HTTP assertions below
  return proc;
}

async function stop(procs) {
  for (const p of procs) { try { p.kill(); } catch {} }
  await sleep(150);
}

async function waitReady(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status) return true;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error(`service at ${url} did not become ready`);
}

async function checkGHSA_r649() {
  const label = 'GHSA-r649-4cqj-w93h (BOLA)';
  const procs = [
    startProc('lab/repro-services/bola-mock/vulnerable.mjs', ['4301']),
    startProc('lab/repro-services/bola-mock/patched.mjs', ['4302']),
  ];
  try {
    await waitReady('http://localhost:4301/alertRules');
    await waitReady('http://localhost:4302/alertRules');

    const vulnRes = await fetch('http://localhost:4301/alertRules?enabled=true', { headers: { 'X-User-Id': 'user-free-001' } });
    const vuln = await vulnRes.json();
    const vulnLeaked = vuln.rows.some((r) => r.ownerId !== 'user-free-001');

    const patchRes = await fetch('http://localhost:4302/alertRules?enabled=true', {
      headers: { 'X-User-Id': 'user-free-001', 'X-Session-Token': 'valid-free-001' },
    });
    const patch = await patchRes.json();
    const patchLeaked = patch.rows.some((r) => r.ownerId !== 'user-free-001');

    const pass = vulnLeaked === true && patchLeaked === false;
    return {
      advisory: label,
      pass,
      detail: `vulnerable variant leaked cross-tenant rows: ${vulnLeaked} (expected true) | patched variant leaked: ${patchLeaked} (expected false)`,
    };
  } finally {
    await stop(procs);
  }
}

async function checkGHSA_hcq5() {
  const label = 'GHSA-hcq5-jm84-2395 (Denial-of-Wallet)';
  const procs = [
    startProc('lab/mock-upstream/server.mjs', ['4401']),
  ];
  await sleep(200);
  procs.push(startProc('lab/repro-services/dow-mock/vulnerable.mjs', ['4402', '4401']));
  procs.push(startProc('lab/repro-services/dow-mock/patched.mjs', ['4403', '4401']));

  try {
    await waitReady('http://localhost:4401/_meta/calls');
    await waitReady('http://localhost:4402/_meta/quota');
    await waitReady('http://localhost:4403/_meta/quota');

    const N = 10;
    for (let i = 0; i < N; i++) {
      await fetch('http://localhost:4402/mcp/tool-call?target=x&malformed=1', { headers: { 'X-Caller-Id': 'attacker-vuln' } });
    }
    const vulnQuota = await (await fetch('http://localhost:4402/_meta/quota', { headers: { 'X-Caller-Id': 'attacker-vuln' } })).json();

    for (let i = 0; i < N; i++) {
      await fetch('http://localhost:4403/mcp/tool-call?target=x&malformed=1', { headers: { 'X-Caller-Id': 'attacker-patch' } });
    }
    const patchQuota = await (await fetch('http://localhost:4403/_meta/quota', { headers: { 'X-Caller-Id': 'attacker-patch' } })).json();

    const upstreamCalls = await (await fetch('http://localhost:4401/_meta/calls')).json();

    // Expected: vulnerable quota never depletes (net-zero reserve/refund)
    // despite N attack calls; patched quota depletes to 0 and stays capped
    // at its dailyBudget regardless of attack volume.
    const vulnExploitable = vulnQuota.used === 0; // N calls, quota untouched net
    const patchClosed = patchQuota.remaining === 0 && patchQuota.used === patchQuota.dailyBudget;

    const pass = vulnExploitable === true && patchClosed === true;
    return {
      advisory: label,
      pass,
      detail: `${N} attack calls -> vulnerable quota used=${vulnQuota.used} (expected 0, i.e. exploitable) | patched quota used=${patchQuota.used}/${patchQuota.dailyBudget} (expected fully consumed, i.e. capped) | total upstream billable calls this run: ${upstreamCalls.billable}`,
    };
  } finally {
    await stop(procs);
  }
}

async function main() {
  console.log('Advisory-Aware Regression Harness — running encoded checks against lab reproduction harnesses\n');
  const results = [];
  results.push(await checkGHSA_r649());
  results.push(await checkGHSA_hcq5());

  let failures = 0;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.advisory}`);
    console.log(`       ${r.detail}`);
    if (!r.pass) failures++;
  }

  console.log(`\n${results.length} advisor${results.length === 1 ? 'y' : 'ies'} checked, ${failures} regression(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('regression harness crashed:', e);
  process.exit(2);
});
