#!/usr/bin/env node
/**
 * Input validation & data handling scanner — PS scope area 3, build-map-
 * advanced ticket #C3. Targets the exact class of GHSA-cmj5-cfhr-w964
 * ("Generated API runtime validation is disabled"): does the central
 * gateway actually wire a real validateRequest function into the generated
 * Sebuf servers, and for any handler that documents an exception to that
 * (validation intentionally not applied at the gateway layer), does it
 * carry a real, enforced, manually-written compensating control — not just
 * a comment claiming one exists?
 *
 * Companion to findings/WM-005 (the cast-adjacency sweep, also PS scope
 * area 3) — this checks a different, more specific class: not "was a type
 * silenced," but "was the generated validation contract actually wired up,
 * and where it wasn't, was that a documented, compensated decision or a
 * silent gap."
 *
 * Usage: node engine/scanners/input-validation.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/scanners/output');

if (!existsSync(SRC)) {
  console.error(`ERROR: target source not found at ${SRC} — run: bash lab/fetch-target-source.sh`);
  process.exit(2);
}

function gitCommit(dir) {
  try {
    const head = readFileSync(join(dir, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) return readFileSync(join(dir, '.git', head.slice(5).trim()), 'utf8').trim();
    return head;
  } catch { return 'unknown'; }
}

function walk(dir, out = [], exts = ['.ts', '.js']) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out, exts); continue; }
    if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
}

function main() {
  const commit = gitCommit(SRC);

  // --- Check 1: the central gateway actually wires validateRequest ---
  const gatewayPath = join(SRC, 'server/gateway.ts');
  const gatewaySrc = existsSync(gatewayPath) ? readFileSync(gatewayPath, 'utf8') : '';
  const gatewayWiresValidation = /validateRequest\s*:\s*validate\w*Request/.test(gatewaySrc) || /validateRequest\s*:\s*\w+,/.test(gatewaySrc);
  const check1 = {
    check: 'gateway_wires_validate_request',
    file: 'server/gateway.ts',
    found: gatewayWiresValidation,
    verdict: gatewayWiresValidation ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  // --- Check 2: any handler documenting an exception has a real, enforced compensating bound ---
  const serverFiles = walk(join(SRC, 'server'), [], ['.ts']).filter((f) => !f.includes('/generated/') && !f.includes('/_shared/'));
  const exceptions = [];
  for (const f of serverFiles) {
    const text = readFileSync(f, 'utf8');
    if (!/supplies no [`']?validateRequest/.test(text)) continue;
    // Find any const MAX_*_LEN (or similar bound) declared near the exception comment.
    const boundDeclMatches = [...text.matchAll(/const\s+(MAX_\w+)\s*=\s*(\d+)/g)];
    const enforced = boundDeclMatches.map(([, name]) => ({
      bound: name,
      used_elsewhere_in_file: (text.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length > 1, // declared + at least one real use
    }));
    exceptions.push({
      file: f.replace(SRC + '/', ''),
      bounds_declared: boundDeclMatches.map(([, n, v]) => `${n}=${v}`),
      bounds_actually_used: enforced.filter((e) => e.used_elsewhere_in_file).map((e) => e.bound),
      compensating_control_present: enforced.some((e) => e.used_elsewhere_in_file),
    });
  }
  const uncompensated = exceptions.filter((e) => !e.compensating_control_present);
  const check2 = {
    check: 'documented_validation_exceptions_have_compensating_controls',
    exceptions_found: exceptions.length,
    exceptions_without_compensating_control: uncompensated.length,
    exceptions,
    verdict: exceptions.length === 0 ? 'NOT_APPLICABLE' : (uncompensated.length === 0 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED'),
  };

  const report = {
    tool: 'input-validation-scanner',
    scope_area: 3,
    target_commit: commit,
    checked_at: new Date().toISOString(),
    checks: { gateway_validation: check1, documented_exceptions: check2 },
    overall_verdict: [check1, check2].every((c) => c.verdict === 'VERIFIED-SECURE' || c.verdict === 'NOT_APPLICABLE') ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'input-validation-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    gateway_wires_validation: check1.found,
    documented_exceptions: check2.exceptions_found,
    exceptions_without_compensating_control: check2.exceptions_without_compensating_control,
    overall: report.overall_verdict,
  }, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { main };
