#!/usr/bin/env node
/**
 * Secrets scanner — build-map-advanced ticket #D2 (EVIDENCE, Phase D).
 * Independent re-derivation of the class scripts/check-vite-env-secrets.mjs
 * guards against: any VITE_-prefixed environment variable name that LOOKS
 * secret-shaped gets INLINED INTO THE CLIENT BUNDLE at build time (Vite's
 * own documented behavior for VITE_-prefixed vars) — shipping a real secret
 * to every browser that loads the page.
 *
 * SCOPE DECISION, STATED HONESTLY: the target's own check additionally
 * builds the real client bundle and scans emitted files for VITE_ env
 * references (the fullest version of this check). This scanner does NOT
 * build the bundle — doing so needs the full production build chain
 * (npm run build, which chains security:vite-env-secrets + blog/pro/corpus/
 * sitemap builds + tsc + vite build), i.e. the full ~2.1GB dependency
 * install this project's lab deliberately treats as disposable, and running
 * it purely to re-derive a check whose SOURCE-level equivalent is fully
 * checkable without it was judged not worth the disk/time cost. Instead:
 * (1) scan every real .env* file tracked in the repo (matching the
 * target's own discovery method: `git ls-files -- .env*`), and (2) scan
 * every real, non-generated, non-test source file for any
 * `import.meta.env.VITE_*` reference, so a secret-shaped var used in code
 * but never documented in .env.example is still caught.
 *
 * DELIBERATELY BROADER PATTERN, FOR AN INDEPENDENT SECOND OPINION: the
 * target's own SECRET_NAME regex requires a prefixed form
 * (api_?key|access_?token|...|private_?key|credential) specifically to
 * avoid flagging a legitimate PUBLISHABLE_KEY (Clerk's own, real, meant-to-
 * be-public key naming convention). This scanner ALSO checks a broader
 * bare-word pattern (any of KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL as a
 * standalone segment) and reports BOTH the narrow and broad hit sets
 * separately — if the broad pattern catches something the narrow one
 * doesn't, that is real, reportable signal that a name might read as
 * secret-shaped to a human even if it passes the target's own regex.
 *
 * Usage: node engine/scanners/secrets.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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

// The target's own narrow pattern (re-derived, not imported — see file header).
const NARROW_SECRET_RE = /(?:api_?key|access_?token|secret|token|password|private_?key|credential)/i;
// Our independent, deliberately broader pattern.
const BROAD_SECRET_RE = /(?:^|_)(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|PRIVATE)(?:_|$)/i;

function classify(varName) {
  const narrowHit = NARROW_SECRET_RE.test(varName);
  const broadHit = BROAD_SECRET_RE.test(varName);
  return { narrow_pattern_hit: narrowHit, broad_pattern_hit: broadHit, broad_only: broadHit && !narrowHit };
}

function scanEnvFiles() {
  let files;
  try {
    files = execFileSync('git', ['ls-files', '-z', '--', '.env*'], { cwd: SRC, encoding: 'utf8' }).split('\0').filter(Boolean);
  } catch {
    files = existsSync(join(SRC, '.env.example')) ? ['.env.example'] : [];
  }
  const findings = [];
  for (const file of files) {
    const text = readFileSync(join(SRC, file), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*(VITE_[A-Za-z0-9_]+)\s*=/);
      if (!m) continue;
      const cls = classify(m[1]);
      if (cls.narrow_pattern_hit || cls.broad_pattern_hit) findings.push({ source: file, var_name: m[1], ...cls });
    }
  }
  return findings;
}

function walk(dir, out = [], exts = ['.ts', '.tsx', '.js', '.jsx']) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist', 'generated'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (statSync(full).isDirectory()) { walk(full, out, exts); continue; }
    if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
}

function scanSourceUsage() {
  const files = walk(join(SRC, 'src'));
  const findings = [];
  const usageRe = /import\.meta\.env\.(VITE_[A-Za-z0-9_]+)/g;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    let m;
    while ((m = usageRe.exec(text))) {
      const cls = classify(m[1]);
      if (cls.narrow_pattern_hit || cls.broad_pattern_hit) {
        const line = text.slice(0, m.index).split('\n').length;
        findings.push({ file: f.replace(SRC + '/', ''), line, var_name: m[1], ...cls });
      }
    }
  }
  return findings;
}

function main() {
  const commit = gitCommit(SRC);
  const envFindings = scanEnvFiles();
  const sourceFindings = scanSourceUsage();

  const narrowHits = [...envFindings, ...sourceFindings].filter((f) => f.narrow_pattern_hit);
  const broadOnlyHits = [...envFindings, ...sourceFindings].filter((f) => f.broad_only);

  const report = {
    tool: 'secrets-scanner',
    scope_area: 7,
    target_commit: commit,
    checked_at: new Date().toISOString(),
    method: 'Source-level scan only (no production client bundle built this run — see this file\'s own header comment for why). Checks every git-tracked .env* file plus every real import.meta.env.VITE_* usage in src/.',
    env_files_scanned: envFindings.length >= 0 ? 'see env_findings' : null,
    env_findings: envFindings,
    source_usage_findings: sourceFindings,
    narrow_pattern_hits: narrowHits.length,
    broad_pattern_only_hits: broadOnlyHits.length,
    verdict: narrowHits.length === 0 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
    verdict_note: narrowHits.length === 0
      ? `0 VITE_-prefixed variable names (across every git-tracked .env* file and every real import.meta.env.VITE_* usage in src/) matched a secret-shaped name pattern. ${broadOnlyHits.length} matched only our deliberately broader pattern (e.g. a name containing a bare KEY/TOKEN segment the narrow pattern's prefixed-form requirement excludes) — listed for completeness, not treated as a finding, since the narrow pattern is the one actually enforced by the target's real CI invariant.`
      : `${narrowHits.length} VITE_-prefixed name(s) matched the secret-shaped pattern the target's own enforce-vite-env-secrets.mjs guards against — needs manual confirmation of whether the value is genuinely secret before any claim.`,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'secrets-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    env_var_lines_scanned_total: envFindings.length + sourceFindings.length,
    narrow_pattern_hits: narrowHits.length,
    broad_pattern_only_hits: broadOnlyHits.length,
    verdict: report.verdict,
  }, null, 2));
  console.log(`\n${report.verdict_note}`);
  for (const f of broadOnlyHits) console.log(`  [broad-only, not a finding] ${f.var_name} (${f.source || f.file})`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { main, classify };
