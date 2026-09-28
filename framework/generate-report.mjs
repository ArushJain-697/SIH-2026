#!/usr/bin/env node
/**
 * Assembles report/report.md from register/advisories.json + findings/*.json
 * — build-map ticket #24 (CORE, Phase 5). CERT-In-aligned structure (bible
 * §7): exec summary, coverage matrix, findings by severity, verified
 * controls, remediation roadmap, appendices.
 *
 * Usage: node framework/generate-report.mjs
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;

function loadFindings() {
  const dir = join(ROOT, 'findings');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => statSync(join(dir, d)).isDirectory())
    .map((d) => {
      const jsonPath = join(dir, d, 'finding.json');
      if (!existsSync(jsonPath)) return null;
      return { dir: d, ...JSON.parse(readFileSync(jsonPath, 'utf8')) };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function severityLabel(f) {
  if (f.status === 'VERIFIED-SECURE') return 'N/A (control verified)';
  const s = f.severity?.cvss31_score;
  if (s === undefined || s === null) return 'unscored';
  if (s >= 9.0) return `Critical (${s})`;
  if (s >= 7.0) return `High (${s})`;
  if (s >= 4.0) return `Medium (${s})`;
  return `Low (${s})`;
}

function main() {
  const findings = loadFindings();
  const register = JSON.parse(readFileSync(join(ROOT, 'register/advisories.json'), 'utf8'));

  const reproduced = findings.filter((f) => f.status === 'REPRODUCED-KNOWN');
  const novel = findings.filter((f) => f.status === 'CONFIRMED-NOVEL');
  const candidates = findings.filter((f) => f.status === 'CANDIDATE-UNCONFIRMED');
  const secure = findings.filter((f) => f.status === 'VERIFIED-SECURE');

  const md = [];
  const p = (s = '') => md.push(s);

  p('# WorldMonitor Security Assessment — Report');
  p('### SIH 26163 · NTRO · "No Finding Without Proof"');
  p('');
  p(`**Generated:** ${new Date().toISOString()} (auto-assembled by \`framework/generate-report.mjs\` from \`register/advisories.json\` + \`findings/*/finding.json\` — do not hand-edit this file, edit the sources and regenerate)`);
  p('');
  p('---');
  p('');

  // 1. Executive summary
  p('## 1. Executive summary');
  p('');
  p(`This is a time-boxed, authorized security assessment of \`github.com/koala73/worldmonitor\` (the "World Monitor" real-time intelligence dashboard). All active proof-of-concept work ran against local, minimal, faithful reproduction harnesses we built and controlled — **never against the live \`worldmonitor.app\` deployment or any real user data** — per \`docs/ROE.md\`.`);
  p('');
  p(`**Posture verdict:** WorldMonitor is a hardened, actively-maintained codebase (87.5k★, 7,881+ commits, 30 custom CI security invariants). It has already published ${register.count_published} security advisories through its own responsible-disclosure process, plus ${register.count_draft} draft advisory — a strong signal of a maintainer who finds and fixes real issues before a third party has to. This assessment's contribution is not "finding bugs a hardened app missed" but demonstrating a **reusable, advisory-aware methodology**: independently re-deriving the target's own CI guardrails from its live source, reproducing documented vulnerability classes in safe local harnesses to validate that methodology, and reporting the honest mix of what we found.`);
  p('');
  p('**Findings by status:**');
  p('');
  p('| Status | Count |');
  p('| --- | --- |');
  p(`| REPRODUCED-KNOWN (validates a published advisory) | ${reproduced.length} |`);
  p(`| CONFIRMED-NOVEL (new, confirmed) | ${novel.length} |`);
  p(`| CANDIDATE-UNCONFIRMED (framework-surfaced, not independently confirmed) | ${candidates.length} |`);
  p(`| VERIFIED-SECURE (control tested, held) | ${secure.length} |`);
  p('');
  p('**Top risks, in business terms:**');
  p('');
  p('1. **Denial-of-Wallet** (validated by WM-002 / `GHSA-hcq5-jm84-2395`) — the app\'s signature risk class, being a keyed proxy in front of ~40+ paid third-party APIs. A reserve-then-refund quota bug can drain real vendor budget while appearing invisible on the attacker\'s own quota display.');
  p('2. **Cross-tenant data exposure** (validated by WM-001 / `GHSA-r649-4cqj-w93h`) — a public-function pattern without an ownership filter can leak Pro-tier subscribers\' private watch criteria to any caller.');
  p('3. **Systemic guardrail integrity** — independently re-verified (WM-003, WM-004) rather than assumed; both held, which is itself evidence the target\'s CI investment is producing real security value.');
  p('');
  p('---');
  p('');

  // 2. Scope & authorization
  p('## 2. Scope & authorization');
  p('');
  p('See `docs/ROE.md` in full. Summary: active testing on `localhost` reproduction harnesses only; passive, unauthenticated header observation only on the live site; no real metered upstream ever called; benign markers only; any genuinely novel finding disclosed privately via the target\'s `SECURITY.md` before any public mention.');
  p('');
  p('---');
  p('');

  // 3. Coverage matrix (link, not duplicate — keep single source of truth)
  p('## 3. Coverage matrix');
  p('');
  p('See [`docs/coverage-matrix.md`](../docs/coverage-matrix.md) for the full 7-scope-area × verdict table (build-map ticket #8).');
  p('');
  p('---');
  p('');

  // 4. Findings
  p('## 4. Findings');
  p('');
  const bySeverity = [...reproduced, ...novel, ...candidates].sort(
    (a, b) => (b.severity?.cvss31_score || 0) - (a.severity?.cvss31_score || 0),
  );
  for (const f of bySeverity) {
    p(`### [${f.id}] ${f.title}`);
    p('');
    p(`- **Status:** \`${f.status}\`${f.references?.ghsa ? ` — validates [\`${f.references.ghsa}\`](https://github.com/koala73/worldmonitor/security/advisories/${f.references.ghsa})` : ''}`);
    p(`- **Severity:** ${severityLabel(f)} — \`${f.severity?.cvss31_vector || 'n/a'}\``);
    p(`- **CWE:** ${(f.tags?.cwe || []).join(', ')} · **WSTG:** ${f.tags?.wstg || 'n/a'} · **OWASP:** ${f.tags?.owasp_api || 'n/a'}`);
    p(`- **Component:** ${f.component} · **Trust boundary:** ${f.trust_boundary}`);
    p(`- **Lab commit:** \`${f.lab_commit}\``);
    p('');
    p(`**Description.** ${f.description}`);
    p('');
    p(`**Business impact.** ${f.business_impact}`);
    p('');
    p(`**Remediation.** ${f.remediation}`);
    p('');
    p(`**Full write-up + evidence:** [\`findings/${f.dir}/finding.md\`](../findings/${f.dir}/finding.md)`);
    p('');
  }
  if (bySeverity.length === 0) p('_No REPRODUCED-KNOWN, CONFIRMED-NOVEL, or CANDIDATE-UNCONFIRMED findings on record yet._');
  p('');
  p('---');
  p('');

  // 5. Verified controls
  p('## 5. Verified controls — "we report our misses"');
  p('');
  p('A report that is all criticals on a hardened app is distrusted. These controls were actively, hostilely tested and held.');
  p('');
  for (const f of secure) {
    p(`### [${f.id}] ${f.title}`);
    p('');
    p(`- **Control tested:** ${f.control_tested}`);
    p(`- **Component:** ${f.component}`);
    p(`- **Full write-up + evidence:** [\`findings/${f.dir}/finding.md\`](../findings/${f.dir}/finding.md)`);
    p('');
  }
  if (secure.length === 0) p('_No verified-secure controls on record yet._');
  p('');
  p('---');
  p('');

  // 6. Remediation roadmap
  p('## 6. Remediation roadmap');
  p('');
  p('| Finding | Priority | Fix |');
  p('| --- | --- | --- |');
  for (const f of [...reproduced, ...novel]) {
    p(`| ${f.id} | ${severityLabel(f)} | ${f.remediation.split('.')[0]}. |`);
  }
  p('');
  p('---');
  p('');

  // 7. Appendices
  p('## 7. Appendices');
  p('');
  p(`- **Prior-art register:** [\`register/advisories.json\`](../register/advisories.json) — ${register.count_published} published + ${register.count_draft} draft advisories, verified ${register.verified_on}.`);
  p('- **Proof spine (platform ↔ authority ↔ advisory):** [`docs/proof-spine.md`](../docs/proof-spine.md) (regenerable: `node framework/generate-proof-spine.mjs`).');
  p('- **Landmine register (fabrication guardrail):** [`docs/LANDMINES.md`](../docs/LANDMINES.md).');
  p('- **Framework tooling:** [`framework/seam-linter/`](../framework/seam-linter/) (invariant map, rate-limit re-derivation, CORS scan), [`framework/regression-harness/`](../framework/regression-harness/) (advisory-aware CI gate).');
  p('- **Not independently re-derived (future work):** `scripts/enforce-premium-fetch.mjs`\'s AST-based premium-fetch-wrapper check was read and catalogued (see `framework/seam-linter/output/invariant-coverage-map.md`) but not independently re-implemented in this session — it requires a full TypeScript AST parser, which was out of scope for the time available. Flagged honestly rather than approximated with a misleading regex.');
  p('');

  const outDir = join(ROOT, 'report');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'report.md'), md.join('\n'));
  console.log(`generate-report: wrote report/report.md (${findings.length} findings: ${reproduced.length} reproduced-known, ${novel.length} novel, ${candidates.length} candidate, ${secure.length} verified-secure)`);
}

main();
