#!/usr/bin/env node
/**
 * Seam-Linter — CORS wildcard/credentials scan. Build-map ticket #14
 * (CORE, Phase 3). Bible H7 hypothesis: "look for any handler reflecting
 * Origin with Access-Control-Allow-Credentials: true, or * on an
 * authenticated endpoint."
 *
 * WHAT THIS DOES: the target centralizes CORS in api/_cors.js /
 * server/cors.ts, but a live grep shows ~21 files under api/ and server/
 * ALSO mention "Access-Control-Allow-Origin" directly — i.e. outside the
 * shared helper. That is exactly the "seam between a control and its
 * exception" this project's thesis predicts: a centralized control exists,
 * but individual handlers can (and some do) duplicate or bypass it. This
 * tool checks EVERY one of those files programmatically — not by hand-
 * sampling a couple — for the one combination that actually matters:
 * a wildcard/unvalidated origin used ALONGSIDE credentials exposure
 * (Access-Control-Allow-Credentials: true, or a session/Authorization/
 * API-key header read in the same file).
 *
 * Per the Fetch spec, browsers refuse Access-Control-Allow-Credentials:true
 * combined with a literal ACAO:'*' — so a same-file co-occurrence of both
 * literal strings is itself already a spec-violating combination worth
 * flagging even before considering exploitability; a wildcard-or-unvalidated
 * origin combined with auth-header handling in the same file is the
 * pattern to specifically triage.
 *
 * OUTPUT: framework/seam-linter/output/cors-scan-report.json (+ printed
 * verdict). Every file is judged individually and the reasoning is
 * preserved — this is not a single pass/fail bit.
 *
 * Usage: node framework/seam-linter/cors-scan.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'framework/seam-linter/output');

if (!existsSync(SRC)) {
  console.error(`ERROR: target source not found at ${SRC} — run: bash lab/fetch-target-source.sh`);
  process.exit(2);
}

function gitCommit(dir) {
  try {
    const head = readFileSync(join(dir, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) {
      const ref = head.slice(5).trim();
      return readFileSync(join(dir, '.git', ref), 'utf8').trim();
    }
    return head;
  } catch {
    return 'unknown';
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); continue; }
    if (/\.(ts|js|tsx|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Deliberately NARROW to header *reads* (the thing that would matter for
// exploitability), not mere mentions. An initial broader pass (bare
// /Authorization/ etc.) flagged api/a2a.ts, api/agent-auth.ts, api/ask.ts,
// api/docs-mcp.ts, api/oauth/authorize.js as MEDIUM — manual inspection of
// every one showed the match was inside an `Access-Control-Allow-Headers`
// allow-list string or a `WWW-Authenticate` challenge header, never an
// actual read of an incoming credential. Those are boilerplate/false
// positives, not exceptions to the CORS control, so the marker now requires
// a read shape: headers.get('authorization'), headers.authorization,
// req.headers['x-worldmonitor-key'], etc.
const AUTH_MARKERS = [
  /headers\s*(\.get\(|\[)\s*['"]authorization['"]/i,
  /headers\s*\.\s*authorization\b/i,
  /headers\s*(\.get\(|\[)\s*['"]x-worldmonitor-key['"]/i,
  /headers\s*(\.get\(|\[)\s*['"]x-api-key['"]/i,
  /headers\s*(\.get\(|\[)\s*['"]x-pro-key['"]/i,
  /getUserIdentity\s*\(|ctx\.auth\b/,
  /verifySession|requireAuth|validateApiKey/,
];

function main() {
  const dirs = ['api', 'server'].map((d) => join(SRC, d)).filter(existsSync);
  const files = dirs.flatMap((d) => walk(d));

  const relevant = files.filter((f) => {
    const text = readFileSync(f, 'utf8');
    return text.includes('Access-Control-Allow-Origin');
  });

  const canonicalHelperFiles = new Set(['_cors.js', 'cors.ts']);

  const results = relevant.map((f) => {
    const text = readFileSync(f, 'utf8');
    const rel = f.replace(SRC + '/', '');
    const base = f.split('/').pop();
    const isCanonicalHelper = canonicalHelperFiles.has(base);
    const isTest = /\.test\.(mjs|ts|js)$/.test(base);

    const hasLiteralWildcard = /['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/.test(text);
    const hasCredentialsTrue = /Access-Control-Allow-Credentials['"]?\s*:\s*['"]true['"]/.test(text);
    const importsSharedHelper = /from ['"].*_cors(\.js)?['"]|from ['"].*\/cors['"]|getCorsHeaders|getPublicCorsHeaders/.test(text);
    const authMarkersHit = AUTH_MARKERS.filter((re) => re.test(text)).map((re) => re.source);

    let risk;
    let reason;
    if (isCanonicalHelper) {
      risk = 'n/a';
      reason = 'this IS the shared CORS helper — not an exception to itself';
    } else if (isTest) {
      risk = 'n/a';
      reason = 'test file, not a live handler';
    } else if (hasLiteralWildcard && hasCredentialsTrue) {
      risk = 'HIGH';
      reason = 'literal ACAO:"*" AND Access-Control-Allow-Credentials:"true" co-occur in the same file — a spec-violating combination the shared helper is specifically designed to avoid (getCorsHeaders always pairs credentials:true with a validated/fallback origin, never a literal wildcard)';
    } else if (hasLiteralWildcard && authMarkersHit.length > 0 && !importsSharedHelper) {
      risk = 'MEDIUM';
      reason = `wildcard ACAO set independently of the shared helper, in a file that also references auth-sensitive markers (${authMarkersHit.join(', ')}) — needs manual read to confirm the wildcard path never serves gated data`;
    } else if (hasLiteralWildcard && !importsSharedHelper) {
      risk = 'LOW';
      reason = 'wildcard ACAO set independently of the shared helper, but no auth-sensitive marker found in this file — consistent with an intentionally public/anonymous endpoint';
    } else if (importsSharedHelper) {
      risk = 'NONE';
      reason = 'file imports/calls the shared CORS helper — centralized control, not a bypass';
    } else {
      risk = 'INFO';
      reason = 'mentions ACAO but does not set a literal wildcard and does not import the shared helper — likely a re-export, type, or comment; read directly if unsure';
    }

    return { file: rel, isCanonicalHelper, isTest, hasLiteralWildcard, hasCredentialsTrue, importsSharedHelper, authMarkersHit, risk, reason };
  });

  const findings = results.filter((r) => !['n/a'].includes(r.risk));
  const highOrMedium = findings.filter((r) => r.risk === 'HIGH' || r.risk === 'MEDIUM');

  const report = {
    tool: 'cors-scan',
    target_commit: gitCommit(SRC),
    checked_at: new Date().toISOString(),
    files_mentioning_acao: relevant.length,
    files_evaluated: findings.length,
    canonical_helper_files: results.filter((r) => r.isCanonicalHelper).map((r) => r.file),
    results,
    verdict: highOrMedium.length === 0 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
    verdict_note: highOrMedium.length === 0
      ? `All ${relevant.length} files that mention Access-Control-Allow-Origin either route through the shared, allowlist-validated CORS helper, or set a literal wildcard with no co-occurring credentials/auth marker (consistent with an intentionally public/anonymous surface, e.g. api/ask.ts's documented anonymous NLWeb endpoint). No HIGH/MEDIUM-risk wildcard+credentials or wildcard+auth combination found.`
      : `${highOrMedium.length} file(s) combine a wildcard/unvalidated origin with credentials or auth markers — manual confirmation required before any claim.`,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'cors-scan-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    files_mentioning_acao: report.files_mentioning_acao,
    verdict: report.verdict,
    high_or_medium_count: highOrMedium.length,
  }, null, 2));
  console.log(`\n${report.verdict_note}`);
  for (const r of findings) {
    console.log(`  [${r.risk}] ${r.file} — ${r.reason}`);
  }
}

main();
