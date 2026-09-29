#!/usr/bin/env node
/**
 * Structural tests for the Phase C (#C1-#C4) and Phase D (#D1-#D2) scanner
 * outputs. Like tests/endpoints_inventory.test.mjs, these run against
 * already-generated engine/scanners/output/*.json rather than re-cloning
 * the target in CI — regenerate first with the corresponding `npm run
 * scan:*` command if a report is stale or missing; each test skips
 * gracefully (not fails) when its report hasn't been built yet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'engine/scanners/output');

function loadOrSkip(t, filename) {
  const p = join(OUT_DIR, filename);
  if (!existsSync(p)) {
    t.skip(`${filename} not built — run the matching npm run scan:* command (needs the source clone; see lab/README.md)`);
    return null;
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

test('auth-session report (#C1): all three checks present and pass', (t) => {
  const r = loadOrSkip(t, 'auth-session-report.json');
  if (!r) return;
  assert.equal(r.scope_area, 1);
  for (const key of ['jwt', 'oauth', 'cookies']) {
    assert.ok(r.checks[key], `missing check: ${key}`);
    assert.equal(r.checks[key].verdict, 'VERIFIED-SECURE', `${key} did not verify secure`);
  }
  assert.equal(r.overall_verdict, 'VERIFIED-SECURE');
});

test('authz-access report (#C2): real AST parsing found and verified real premium client instances', (t) => {
  const r = loadOrSkip(t, 'authz-access-report.json');
  if (!r) return;
  assert.equal(r.scope_area, 2);
  assert.ok(r.stats.src_files_scanned > 500, 'expected a substantial real file count, not a stub');
  assert.ok(r.stats.service_client_classes_found > 0);
  assert.ok(r.stats.client_instances_calling_a_premium_method > 0, 'expected at least one real premium call site to exist');
  assert.equal(r.stats.unsafe_instances, 0);
  assert.equal(r.verdict, 'VERIFIED-SECURE');
});

test('input-validation report (#C3): gateway wiring + documented exceptions both verified', (t) => {
  const r = loadOrSkip(t, 'input-validation-report.json');
  if (!r) return;
  assert.equal(r.scope_area, 3);
  assert.equal(r.checks.gateway_validation.found, true);
  assert.equal(r.checks.documented_exceptions.exceptions_without_compensating_control, 0);
  assert.equal(r.overall_verdict, 'VERIFIED-SECURE');
});

test('api-security report (#C4): idempotency body-hash, conflict, and fail-closed checks pass', (t) => {
  const r = loadOrSkip(t, 'api-security-report.json');
  if (!r) return;
  assert.equal(r.scope_area, 4);
  for (const key of ['body_hash_mismatch', 'concurrent_conflict', 'fail_closed_scope']) {
    assert.equal(r.checks[key].verdict, 'VERIFIED-SECURE', `${key} did not verify secure`);
  }
  assert.equal(r.overall_verdict, 'VERIFIED-SECURE');
});

test('sca report (#D1): real npm audit + ancestry tracing ran, CVSS cross-validation had 0 mismatches', (t) => {
  const r = loadOrSkip(t, 'sca-report.json');
  if (!r) return;
  assert.ok(r.total_dependencies.total > 1000, 'expected a real, substantial dependency count');
  assert.ok(r.unique_root_advisories > 0);
  assert.ok(Array.isArray(r.findings) && r.findings.length > 0);
  for (const f of r.findings) {
    if (f.cvss) assert.equal(f.cvss.match !== false, true, `CVSS cross-validation mismatch for ${f.advisory_title}`);
  }
});

test('secrets report (#D2): narrow pattern finds 0 real client-bundle secrets', (t) => {
  const r = loadOrSkip(t, 'secrets-report.json');
  if (!r) return;
  assert.equal(r.narrow_pattern_hits, 0);
  assert.equal(r.verdict, 'VERIFIED-SECURE');
});
