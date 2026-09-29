#!/usr/bin/env node
/**
 * Reproduction manifest — build-map-advanced ticket #E1 (EVIDENCE, Phase E).
 * Every lab/repro-services/<name>/manifest.mjs exports one async
 * `runCheck()` that starts its own vulnerable+patched pair, drives the
 * attack, asserts, and tears itself down — the harness
 * (framework/regression-harness/run.mjs) auto-discovers and runs every
 * manifest it finds, so adding a new reproduction never needs a harness edit.
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

export const advisory = 'GHSA-r649-4cqj-w93h (BOLA)';

export async function runCheck() {
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
      advisory,
      pass,
      detail: `vulnerable variant leaked cross-tenant rows: ${vulnLeaked} (expected true) | patched variant leaked: ${patchLeaked} (expected false)`,
    };
  } finally {
    await stop(procs);
  }
}
