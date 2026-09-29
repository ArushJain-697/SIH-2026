#!/usr/bin/env node
/**
 * Reproduction manifest — build-map-advanced ticket #E1. See
 * lab/repro-services/bola-mock/manifest.mjs for the pattern this follows.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('../../../', import.meta.url).pathname;

function startProc(scriptRelPath, args = []) {
  const proc = spawn('node', [ROOT + scriptRelPath, ...args], { stdio: 'pipe' });
  proc.stderr.on('data', () => {});
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

export const advisory = 'GHSA-hcq5-jm84-2395 (Denial-of-Wallet)';

export async function runCheck() {
  const procs = [startProc('lab/mock-upstream/server.mjs', ['4401'])];
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

    const vulnExploitable = vulnQuota.used === 0;
    const patchClosed = patchQuota.remaining === 0 && patchQuota.used === patchQuota.dailyBudget;

    const pass = vulnExploitable === true && patchClosed === true;
    return {
      advisory,
      pass,
      detail: `${N} attack calls -> vulnerable quota used=${vulnQuota.used} (expected 0, i.e. exploitable) | patched quota used=${patchQuota.used}/${patchQuota.dailyBudget} (expected fully consumed, i.e. capped) | total upstream billable calls this run: ${upstreamCalls.billable}`,
    };
  } finally {
    await stop(procs);
  }
}
