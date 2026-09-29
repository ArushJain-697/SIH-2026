#!/usr/bin/env node
/**
 * One-command verification — runs every check in this repo and reports a
 * single pass/fail. Matches the reference projects' "one command runs
 * everything" pattern (e.g. SIH-2026's run_phase0_phase1_checks.py).
 *
 * Usage: node tests/run_all.mjs   (or: npm test)
 * Exit code: 0 = everything green, 1 = at least one check failed.
 */
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url).pathname;

const STEPS = [
  // Safety-critical — run FIRST. If the host-allowlist guarantee is broken,
  // nothing downstream can be trusted regardless of what else passes.
  { name: 'SAFETY: safe-http probe host-allowlist', cmd: 'node', args: ['--test', 'tests/safe_http.test.mjs'] },
  { name: 'SAFETY: no raw fetch() in scanners', cmd: 'node', args: ['tests/lint_no_raw_fetch.mjs'] },
  { name: 'unit tests (finding-rules)', cmd: 'node', args: ['--test', 'tests/unit.test.mjs'] },
  { name: 'unit tests (CVSS 3.1 calculator)', cmd: 'node', args: ['--test', 'tests/cvss31.test.mjs'] },
  { name: 'unit tests (CVSS 4.0 calculator)', cmd: 'node', args: ['--test', 'tests/cvss40.test.mjs'] },
  { name: 'unit tests (EPSS client)', cmd: 'node', args: ['--test', 'tests/epss.test.mjs'] },
  { name: 'unit tests (priority engine)', cmd: 'node', args: ['--test', 'tests/priority.test.mjs'] },
  { name: 'endpoint inventory (structural)', cmd: 'node', args: ['--test', 'tests/endpoints_inventory.test.mjs'] },
  { name: 'Phase C scanners (structural)', cmd: 'node', args: ['--test', 'tests/phase_c_scanners.test.mjs'] },
  { name: 'landmine scan', cmd: 'node', args: ['tests/scan_landmines.mjs'] },
  { name: 'finding schema validation', cmd: 'node', args: ['tests/validate_findings.mjs'] },
  { name: 'advisory-aware regression harness', cmd: 'node', args: ['framework/regression-harness/run.mjs'] },
];

let failures = 0;
const results = [];

for (const step of STEPS) {
  process.stdout.write(`\n=== ${step.name} ===\n`);
  const r = spawnSync(step.cmd, step.args, { cwd: ROOT, stdio: 'inherit' });
  const pass = r.status === 0;
  if (!pass) failures++;
  results.push({ name: step.name, pass, status: r.status });
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
for (const r of results) {
  console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
}
console.log(`\n${STEPS.length} step(s), ${failures} failure(s)`);

process.exit(failures === 0 ? 0 : 1);
