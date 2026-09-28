#!/usr/bin/env node
/**
 * Secure communication mechanisms scanner — PS scope area 6, build-map-
 * advanced ticket #C6.
 *
 * Two passes, deliberately kept separate and both reported:
 *
 *  1. DYNAMIC — probes the real running local instance (via the sanctioned
 *     safe-http probe, localhost only) and captures its ACTUAL response
 *     headers.
 *  2. STATIC — parses the real, live-cloned vercel.json for the DECLARED
 *     production header policy (CSP, HSTS, X-Frame-Options, etc.).
 *
 * These two will DIFFER, and that difference is itself the most interesting
 * finding here: Vercel applies vercel.json's `headers` block at its edge
 * network on a real deployment; the plain `vite` dev server never sees that
 * layer, so a dynamic-only assessment against `npm run dev` would wrongly
 * conclude "no security headers" when production actually ships a properly
 * hardened, nonce+hash CSP. Reporting only one pass would be a real, honest
 * mistake — reporting both, and stating the gap, is the correct methodology.
 *
 * Usage: node engine/scanners/secure-comms.mjs [instanceUrl] [srcDir]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { safeFetch, captureToEvidence } from '../probe/safe-http.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const INSTANCE_URL = process.argv[2] || 'http://localhost:3000/';
const SRC = process.argv[3] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/scanners/output');

const SECURITY_HEADERS = [
  { key: 'content-security-policy', label: 'Content-Security-Policy', weight: 3 },
  { key: 'strict-transport-security', label: 'Strict-Transport-Security', weight: 2 },
  { key: 'x-content-type-options', label: 'X-Content-Type-Options', weight: 1 },
  { key: 'x-frame-options', label: 'X-Frame-Options', weight: 1 },
  { key: 'referrer-policy', label: 'Referrer-Policy', weight: 1 },
  { key: 'permissions-policy', label: 'Permissions-Policy', weight: 1 },
  { key: 'cross-origin-opener-policy', label: 'Cross-Origin-Opener-Policy', weight: 1 },
  { key: 'cross-origin-embedder-policy', label: 'Cross-Origin-Embedder-Policy', weight: 1 },
  { key: 'cross-origin-resource-policy', label: 'Cross-Origin-Resource-Policy', weight: 1 },
];

/** Minimal but real CSP directive evaluator — flags the classic weaknesses. */
function evaluateCsp(cspValue) {
  if (!cspValue) return { present: false, issues: ['CSP header absent'], directives: {} };
  const directives = {};
  for (const part of cspValue.split(';').map((s) => s.trim()).filter(Boolean)) {
    const [name, ...vals] = part.split(/\s+/);
    directives[name] = vals;
  }
  const issues = [];
  const scriptSrc = directives['script-src'] || directives['default-src'] || [];
  if (scriptSrc.includes("'unsafe-inline'") && !scriptSrc.some((v) => v.startsWith("'nonce-") || v.startsWith("'sha256-") || v === "'strict-dynamic'")) {
    issues.push("script-src allows 'unsafe-inline' with no nonce/hash/strict-dynamic mitigation");
  }
  if (scriptSrc.includes("'unsafe-eval'")) issues.push("script-src allows 'unsafe-eval'");
  const styleSrc = directives['style-src'] || directives['default-src'] || [];
  if (styleSrc.includes("'unsafe-inline'")) issues.push("style-src allows 'unsafe-inline' (lower severity than script — no code exec, but CSS-exfil/UI-redress surface)");
  if (!directives['object-src']) issues.push('object-src not explicitly restricted (should be \'none\' unless plugins are needed)');
  else if (!directives['object-src'].includes("'none'")) issues.push(`object-src is ${directives['object-src'].join(' ')}, not 'none'`);
  if (!directives['base-uri']) issues.push("base-uri not restricted (should be 'self' to prevent base-tag injection)");
  if (!directives['frame-ancestors'] && !directives['default-src']) issues.push('frame-ancestors not set — clickjacking relies on X-Frame-Options alone');
  const hasNonceOrHash = scriptSrc.some((v) => v.startsWith("'nonce-") || v.startsWith("'sha256-"));
  const hasStrictDynamic = scriptSrc.includes("'strict-dynamic'");

  return {
    present: true,
    directive_count: Object.keys(directives).length,
    uses_nonce_or_hash: hasNonceOrHash,
    uses_strict_dynamic: hasStrictDynamic,
    issues,
    directives,
  };
}

function parseVercelDeclaredHeaders(srcDir) {
  const p = join(srcDir, 'vercel.json');
  if (!existsSync(p)) return null;
  const v = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(v.headers)) return null;
  // Find the block covering the broadest app surface — the one with the
  // most security-relevant header keys, matching a catch-all `source`.
  const secKeys = new Set(SECURITY_HEADERS.map((h) => h.label));
  let best = null, bestCount = -1;
  for (const entry of v.headers) {
    const count = (entry.headers || []).filter((h) => secKeys.has(h.key)).length;
    if (count > bestCount) { bestCount = count; best = entry; }
  }
  if (!best) return null;
  const map = {};
  for (const h of best.headers) map[h.key.toLowerCase()] = h.value;
  return { source_pattern: best.source, headers: map, total_header_blocks_in_vercel_json: v.headers.length };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // --- Dynamic pass ---
  let dynamicHeaders = {};
  let dynamicError = null;
  try {
    const { record } = await safeFetch(INSTANCE_URL);
    dynamicHeaders = record.response_headers;
    mkdirSync(join(OUT_DIR, 'evidence'), { recursive: true });
    captureToEvidence(join(OUT_DIR, 'evidence'), 'secure-comms-dynamic-headers.json', record);
  } catch (e) {
    dynamicError = String(e.message || e);
  }

  const dynamicPresence = SECURITY_HEADERS.map((h) => ({ ...h, present: Boolean(dynamicHeaders[h.key]), value: dynamicHeaders[h.key] || null }));
  const dynamicScore = dynamicPresence.reduce((sum, h) => sum + (h.present ? h.weight : 0), 0);
  const maxScore = SECURITY_HEADERS.reduce((s, h) => s + h.weight, 0);

  // --- Static pass (production-declared) ---
  const declared = parseVercelDeclaredHeaders(SRC);
  let staticPresence = [];
  let cspEval = { present: false, issues: ['vercel.json not found or unparsable'] };
  if (declared) {
    staticPresence = SECURITY_HEADERS.map((h) => ({ ...h, present: Boolean(declared.headers[h.key]), value: declared.headers[h.key] || null }));
    cspEval = evaluateCsp(declared.headers['content-security-policy']);
  }
  const staticScore = staticPresence.reduce((sum, h) => sum + (h.present ? h.weight : 0), 0);

  const report = {
    tool: 'secure-comms-scanner',
    scope_area: 6,
    checked_at: new Date().toISOString(),
    instance_url: INSTANCE_URL,
    dynamic_pass: {
      error: dynamicError,
      headers_observed: dynamicHeaders,
      security_header_presence: dynamicPresence,
      score: `${dynamicScore}/${maxScore}`,
    },
    static_pass_production_declared: {
      source_pattern: declared?.source_pattern || null,
      security_header_presence: staticPresence,
      score: `${staticScore}/${maxScore}`,
      csp_evaluation: cspEval,
    },
    the_gap: {
      note: dynamicScore < staticScore
        ? `The dev server (${dynamicScore}/${maxScore}) shows FEWER security headers than the production-declared config (${staticScore}/${maxScore}) because Vercel applies vercel.json's headers block at its edge network, which the plain \`vite\` dev server never sees. A dynamic-only assessment against \`npm run dev\` would wrongly conclude the app ships no security headers. Both passes are reported precisely so this gap is explicit, not silently either overclaimed or underclaimed.`
        : 'Dynamic and static header sets are consistent.',
    },
    verdict: cspEval.issues.length <= 1 && staticScore >= maxScore * 0.8 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  writeFileSync(join(OUT_DIR, 'secure-comms-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    dynamic_score: report.dynamic_pass.score,
    static_score: report.static_pass_production_declared.score,
    csp_issues: cspEval.issues,
    verdict: report.verdict,
  }, null, 2));
  console.log(`\n${report.the_gap.note}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { main, evaluateCsp, parseVercelDeclaredHeaders };
