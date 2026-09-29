#!/usr/bin/env node
/**
 * Advisory-Aware Regression Harness — build-map ticket #17 (CORE, Phase 3),
 * generalized to auto-discovery by build-map-advanced ticket #E1 (EVIDENCE,
 * Phase E). Bible §7: "point-in-time audits go stale; this turns an app's
 * whole disclosure history into a permanent test suite."
 *
 * v1 hardcoded two check functions by name. v2: every
 * lab/repro-services/<name>/manifest.mjs exports its own `runCheck()` that
 * starts its own vulnerable+patched pair, drives the attack, asserts, and
 * tears itself down. This harness just discovers and runs every manifest it
 * finds — adding a new reproduction (a new advisory, a new lab service)
 * needs zero edits here, only a new manifest.mjs alongside it.
 *
 * This intentionally tests OUR lab harnesses (lab/repro-services/), not the
 * live target — see docs/ROE.md. What it proves is the CLASS is real and
 * our understanding of the fix is correct and demonstrable, not that the
 * live target is currently patched (it already is, per its own advisory).
 *
 * Usage: node framework/regression-harness/run.mjs
 * Exit code: 0 = every discovered manifest behaves as expected, 1 = a regression found, 2 = no manifests found (misconfiguration, not a pass).
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const REPRO_DIR = join(ROOT, 'lab/repro-services');

function discoverManifests() {
  if (!existsSync(REPRO_DIR)) return [];
  const manifests = [];
  for (const name of readdirSync(REPRO_DIR)) {
    const manifestPath = join(REPRO_DIR, name, 'manifest.mjs');
    if (existsSync(manifestPath)) manifests.push({ name, path: manifestPath });
  }
  return manifests.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  console.log('Advisory-Aware Regression Harness — auto-discovering lab/repro-services/*/manifest.mjs\n');

  const manifests = discoverManifests();
  if (manifests.length === 0) {
    console.error('No manifest.mjs found under lab/repro-services/ — nothing to check. This is a misconfiguration, not a pass.');
    process.exit(2);
  }
  console.log(`Discovered ${manifests.length} reproduction manifest(s): ${manifests.map((m) => m.name).join(', ')}\n`);

  const results = [];
  for (const m of manifests) {
    const mod = await import(m.path);
    if (typeof mod.runCheck !== 'function') {
      results.push({ advisory: `${m.name} (malformed manifest)`, pass: false, detail: `${m.name}/manifest.mjs does not export an async runCheck() function` });
      continue;
    }
    try {
      results.push(await mod.runCheck());
    } catch (e) {
      results.push({ advisory: mod.advisory || m.name, pass: false, detail: `runCheck() threw: ${e.message}` });
    }
  }

  let failures = 0;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.advisory}`);
    console.log(`       ${r.detail}`);
    if (!r.pass) failures++;
  }

  console.log(`\n${results.length} manifest(s) checked, ${failures} regression(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('regression harness crashed:', e);
  process.exit(2);
});
