#!/usr/bin/env node
/**
 * Seam-Linter — cast/assertion adjacency scan. Build-map ticket #16
 * (STRETCH, Phase 3). Bible §4: "a common and highly exploitable pattern...
 * involves defining strict interfaces and validation functions at the
 * controller level, but subsequently subverting those very protections by
 * casting variables to any, unknown... deeper in the service layer to
 * forcefully resolve compilation errors... The boundary degradation occurs
 * because the agent prioritizes resolving the immediate TypeScript compiler
 * error over maintaining the semantic integrity of the security boundary."
 *
 * SCOPE, STATED HONESTLY: this checks `as any` and `as unknown` only —
 * both are unambiguous to find with a regex. Non-null assertion (`!`) was
 * deliberately NOT included: a reliable regex for it (distinguishing a real
 * non-null assertion from `!=`, `!==`, logical negation `!x`, or a factorial-
 * style expression) needs real TypeScript AST parsing, the same limitation
 * already noted for scripts/enforce-premium-fetch.mjs in
 * framework/seam-linter/output/invariant-coverage-map.md. Flagged honestly
 * as future work rather than shipped as a noisy, low-precision regex.
 *
 * METHOD: every `as any`/`as unknown` occurrence in the real, live-cloned
 * source (excluding src/generated/, tests, and node_modules) is checked
 * against a curated list of security-sensitive patterns within a small
 * line window. A cast near ordinary business logic is normal TypeScript and
 * not interesting; a cast next to an auth check, a credential read, a
 * rate-limit call, or a CORS header is exactly the "boundary degradation"
 * class the thesis predicts, because it is a plausible point where the type
 * system's guarantee about the shape of an auth/entitlement object was
 * silenced to make a compile error go away.
 *
 * Usage: node framework/seam-linter/cast-adjacency.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'framework/seam-linter/output');
const WINDOW = 5; // lines of context on each side to check for a security-sensitive pattern

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

const EXCLUDE_DIR_SEGMENTS = ['node_modules', '.git', '.next', 'dist', 'generated', 'e2e', '__tests__'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIR_SEGMENTS.includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); continue; }
    if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.[jt]sx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Security-sensitive markers, grouped for a readable report. Deliberately
// narrower/more precise than the AUTH_MARKERS in cors-scan.mjs where
// possible, since false positives here are more numerous with a wider net.
const SENSITIVE_PATTERNS = [
  { name: 'auth-read', re: /headers\s*(\.get\(|\[)\s*['"]authorization['"]|headers\s*(\.get\(|\[)\s*['"]x-worldmonitor-key['"]|getUserIdentity\s*\(|ctx\.auth\b|verifySession|requireAuth|validateApiKey/i },
  { name: 'rate-limit', re: /checkEndpointRateLimit|checkScopedRateLimit|checkIpScopedEdgeProof/ },
  { name: 'cors-header', re: /Access-Control-Allow-(Origin|Credentials)/ },
  { name: 'local-storage', re: /localStorage\s*\.(get|set|remove)Item/ },
  { name: 'html-sink', re: /\.innerHTML\s*=|insertAdjacentHTML|dangerouslySetInnerHTML/ },
  { name: 'premium-fetch', re: /premiumFetch|proFreshRpcFetch|entitlement/i },
  { name: 'json-parse-untrusted', re: /JSON\.parse\s*\(\s*(req|request|body|input|payload)/i },
];

function scanFile(fullPath) {
  const text = readFileSync(fullPath, 'utf8');
  const lines = text.split('\n');
  const rel = fullPath.replace(SRC + '/', '');
  const findings = [];

  const castRe = /\bas\s+(any|unknown)\b/g;
  lines.forEach((line, idx) => {
    let m;
    castRe.lastIndex = 0;
    while ((m = castRe.exec(line))) {
      const lineNo = idx + 1;
      const windowStart = Math.max(0, idx - WINDOW);
      const windowEnd = Math.min(lines.length, idx + WINDOW + 1);
      const windowText = lines.slice(windowStart, windowEnd).join('\n');

      const hits = SENSITIVE_PATTERNS.filter((p) => p.re.test(windowText)).map((p) => p.name);
      if (hits.length > 0) {
        findings.push({
          file: rel,
          line: lineNo,
          cast_kind: m[1],
          snippet: line.trim().slice(0, 160),
          nearby_sensitive_patterns: hits,
        });
      }
    }
  });

  return findings;
}

function main() {
  const files = walk(SRC);
  let totalCasts = 0;
  const allFindings = [];

  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const castMatches = text.match(/\bas\s+(any|unknown)\b/g);
    if (castMatches) totalCasts += castMatches.length;
    const findings = scanFile(f);
    allFindings.push(...findings);
  }

  const report = {
    tool: 'cast-adjacency',
    target_commit: gitCommit(SRC),
    checked_at: new Date().toISOString(),
    scope_note: 'Checks "as any" / "as unknown" only. Non-null assertion (!) excluded — needs a real TS AST parser to avoid false positives from !=, !==, and logical negation; see this file\'s header comment.',
    files_scanned: files.length,
    total_as_any_or_unknown_occurrences: totalCasts,
    window_lines: WINDOW,
    findings_near_sensitive_code: allFindings,
    verdict: allFindings.length === 0 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
    verdict_note: allFindings.length === 0
      ? `${totalCasts} total "as any"/"as unknown" occurrences across ${files.length} files, NONE within ${WINDOW} lines of an auth/rate-limit/CORS/localStorage/HTML-sink/premium-fetch/untrusted-JSON.parse marker.`
      : `${allFindings.length} of ${totalCasts} total "as any"/"as unknown" occurrences fall within ${WINDOW} lines of a security-sensitive marker — each needs a manual read to determine if the cast is benign (e.g. a known-safe library type gap) or actually silences a meaningful check.`,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'cast-adjacency-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    files_scanned: report.files_scanned,
    total_casts: totalCasts,
    findings_near_sensitive_code: allFindings.length,
    verdict: report.verdict,
  }, null, 2));
  console.log(`\n${report.verdict_note}`);
  for (const f of allFindings) {
    console.log(`  [${f.cast_kind}] ${f.file}:${f.line} (near: ${f.nearby_sensitive_patterns.join(', ')}) — ${f.snippet}`);
  }
}

main();
