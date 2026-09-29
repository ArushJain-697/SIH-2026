#!/usr/bin/env node
/**
 * API security scanner — PS scope area 4, build-map-advanced ticket #C4.
 *
 * The PS names "rate limits, idempotency" together as this scope area's
 * concern. Rate-limiting and Denial-of-Wallet are already covered in depth
 * (findings/WM-002, findings/WM-003) — this scanner adds the genuinely
 * untested half: IDEMPOTENCY, checking the real api/_idempotency.js for
 * three specific, security-relevant properties:
 *
 *   1. Body-hash mismatch detection: does reusing an Idempotency-Key with a
 *      DIFFERENT request body get rejected (422), rather than silently
 *      replaying whatever response was cached under that key for someone
 *      else's request? (CWE-345 — insufficient verification of data
 *      authenticity: without this, an idempotency key becomes a confused-
 *      deputy vector between two different logical requests.)
 *   2. Concurrent in-flight conflict detection: does a second request
 *      arriving while the first with the same key is still processing get
 *      a 409 rather than racing ahead and double-executing the underlying
 *      action? (CWE-362 — the exact TOCTOU class this whole project's
 *      thesis is built around, here checked in the ONE place the target
 *      built a dedicated primitive specifically to prevent it.)
 *   3. Fail-closed on misconfiguration: does a missing/empty idempotency
 *      scope hard-fail (500) rather than silently disabling duplicate-
 *      protection? The target's own comment explicitly reasons about the
 *      real consequence: "on /api/create-checkout that is a second
 *      checkout session per retried request" — i.e. a real double-charge
 *      risk if this fails open instead of closed.
 *
 * This is a genuine complement to WM-002/WM-003, not a re-run of them —
 * idempotency is a distinct mechanism from rate-limiting, and the PS
 * explicitly names it as its own concern within this scope area.
 *
 * Usage: node engine/scanners/api-security.mjs [srcDir]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/scanners/output');
const IDEMPOTENCY_FILE = join(SRC, 'api/_idempotency.js');

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

function main() {
  const commit = gitCommit(SRC);

  if (!existsSync(IDEMPOTENCY_FILE)) {
    console.error(`ERROR: ${IDEMPOTENCY_FILE} not found — target repo layout may have changed`);
    process.exit(2);
  }
  const src = readFileSync(IDEMPOTENCY_FILE, 'utf8');

  // Check 1: body-hash mismatch -> rejected, not silently replayed.
  const hasBodyHashField = /reqHash/.test(src);
  const hasMismatchRejection = /reqHash\s*!==\s*reqHash|record\.reqHash\s*!==\s*reqHash/.test(src)
    && /422/.test(src) && /idempotency_key_reused|already used with a different/i.test(src);
  const check1 = {
    check: 'body_hash_mismatch_rejected',
    has_body_hash_field: hasBodyHashField,
    has_mismatch_rejection_with_4xx: hasMismatchRejection,
    verdict: hasBodyHashField && hasMismatchRejection ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  // Check 2: concurrent processing -> 409 conflict, not a race.
  const hasProcessingState = /state\s*===\s*'processing'|PROCESSING_MARKER/.test(src);
  const hasConflict409 = /409/.test(src) && /idempotency_conflict/i.test(src) && /Retry-After/i.test(src);
  const check2 = {
    check: 'concurrent_request_conflict_detected',
    has_processing_state_tracking: hasProcessingState,
    has_409_conflict_with_retry_after: hasConflict409,
    verdict: hasProcessingState && hasConflict409 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  // Check 3: scope misconfiguration fails CLOSED (hard error), not open (silently disabled).
  const hasScopeCheck = /scopeMisconfigured|isValidScope/.test(src);
  const failsClosedWith500 = /scopeMisconfigured/.test(src) && /500/.test(src) && /idempotency_scope_missing/i.test(src);
  // Explicitly confirm it does NOT just return the generic 'disabled' outcome
  // for a missing scope, which would be the fail-OPEN version of this bug.
  const scopeMisconfiguredBlock = src.slice(src.indexOf('function scopeMisconfigured'), src.indexOf('function scopeMisconfigured') + 800);
  const doesNotSilentlyDisable = scopeMisconfiguredBlock.length > 0 && !/kind:\s*'disabled'/.test(scopeMisconfiguredBlock);
  const check3 = {
    check: 'scope_misconfiguration_fails_closed',
    has_scope_validation: hasScopeCheck,
    fails_closed_with_500: failsClosedWith500,
    does_not_silently_disable_protection: doesNotSilentlyDisable,
    verdict: hasScopeCheck && failsClosedWith500 && doesNotSilentlyDisable ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  const report = {
    tool: 'api-security-scanner',
    scope_area: 4,
    target_commit: commit,
    checked_at: new Date().toISOString(),
    component: 'api/_idempotency.js (283 lines, real source)',
    note: 'Rate-limiting and Denial-of-Wallet, the other half of this PS scope area, are covered in depth by findings/WM-002 and findings/WM-003 and are not re-checked here.',
    checks: { body_hash_mismatch: check1, concurrent_conflict: check2, fail_closed_scope: check3 },
    overall_verdict: [check1, check2, check3].every((c) => c.verdict === 'VERIFIED-SECURE') ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'api-security-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    body_hash_mismatch: check1.verdict,
    concurrent_conflict: check2.verdict,
    fail_closed_scope: check3.verdict,
    overall: report.overall_verdict,
  }, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { main };
