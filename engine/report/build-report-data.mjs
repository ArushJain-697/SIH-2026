#!/usr/bin/env node
/**
 * Generates report-app/src/data/assessment-data.json — the SINGLE source
 * of data for the React report app (build-map-advanced ticket #F1, pivoted
 * from a static HTML file to a real React frontend per explicit request).
 *
 * The React app never hand-types a finding, a score, or a coverage cell —
 * everything renders from this one generated file, which is itself built
 * straight from every findings/<id>/finding.json plus
 * register/advisories.json, the same sources framework/generate-report.mjs
 * and
 * framework/generate-proof-spine.mjs already use. This keeps the "never
 * fabricate, always regenerate" discipline intact even though the
 * deliverable is now an app, not a document.
 *
 * Usage: node engine/report/build-report-data.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCOPE_AREAS } from '../../framework/schema/finding-rules.mjs';
import { buildCoverageMatrix } from '../../framework/generate-coverage-matrix.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const FINDINGS_DIR = join(ROOT, 'findings');
const REPRO_DIR = join(ROOT, 'lab/repro-services');
const OUT_PATH = join(ROOT, 'report-app/src/data/assessment-data.json');

// Runs the same auto-discovering manifests the real regression harness
// (framework/regression-harness/run.mjs) uses, so the "Regression" panel
// on the dashboard shows real PASS/FAIL results, not staged ones.
async function runRegressionManifests() {
  if (!existsSync(REPRO_DIR)) return [];
  const results = [];
  for (const name of readdirSync(REPRO_DIR).sort()) {
    const manifestPath = join(REPRO_DIR, name, 'manifest.mjs');
    if (!existsSync(manifestPath)) continue;
    try {
      const mod = await import(manifestPath);
      results.push(await mod.runCheck());
    } catch (e) {
      results.push({ advisory: name, pass: false, detail: `runCheck() threw: ${e.message}` });
    }
  }
  return results;
}

function loadFindings() {
  if (!existsSync(FINDINGS_DIR)) return [];
  return readdirSync(FINDINGS_DIR)
    .filter((d) => statSync(join(FINDINGS_DIR, d)).isDirectory())
    .map((d) => {
      const jsonPath = join(FINDINGS_DIR, d, 'finding.json');
      const mdPath = join(FINDINGS_DIR, d, 'finding.md');
      if (!existsSync(jsonPath)) return null;
      const finding = JSON.parse(readFileSync(jsonPath, 'utf8'));
      const markdown = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : null;
      const evidenceDir = join(FINDINGS_DIR, d, 'evidence');
      const evidenceFiles = existsSync(evidenceDir) ? readdirSync(evidenceDir) : [];
      const patchPath = join(FINDINGS_DIR, d, 'remediation.patch');
      const hasRemediationPatch = existsSync(patchPath);
      const remediationPatchDiff = hasRemediationPatch ? readFileSync(patchPath, 'utf8') : null;
      return { dir: d, ...finding, markdown, evidence_files: evidenceFiles, has_remediation_patch: hasRemediationPatch, remediation_patch_diff: remediationPatchDiff };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function loadRegister() {
  const p = join(ROOT, 'register/advisories.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { advisories: [] };
}

function loadInventoryStats() {
  const p = join(ROOT, 'engine/inventory/endpoints.json');
  if (!existsSync(p)) return null;
  const { stats } = JSON.parse(readFileSync(p, 'utf8'));
  return stats || null;
}

function loadProofSpine() {
  const p = join(ROOT, 'docs/proof-spine.md');
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

async function main() {
  const findings = loadFindings();
  const register = loadRegister();
  const proofSpineMarkdown = loadProofSpine();
  const regressionResults = await runRegressionManifests();

  const statusCounts = findings.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {});

  const data = {
    generated_at: new Date().toISOString(),
    generator: 'engine/report/build-report-data.mjs — regenerate, never hand-edit report-app/src/data/assessment-data.json directly',
    summary: {
      total_findings: findings.length,
      status_counts: statusCounts,
      scope_areas_with_evidence: Object.values(buildCoverageMatrix(findings)).filter((c) => c.verdict !== 'NOT_TESTED').length,
      total_scope_areas: 7,
    },
    coverage_matrix: buildCoverageMatrix(findings),
    scope_area_labels: SCOPE_AREAS,
    findings,
    register: {
      verified_on: register.verified_on,
      count_published: register.count_published,
      count_draft: register.count_draft,
      advisories: register.advisories,
      external_researcher_credits: register.external_researcher_credits || [],
    },
    proof_spine_markdown: proofSpineMarkdown,
    regression_results: regressionResults,
    inventory: loadInventoryStats(),
  };

  mkdirSync(join(ROOT, 'report-app/src/data'), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
  console.log(`build-report-data: wrote report-app/src/data/assessment-data.json — ${findings.length} findings, ${register.advisories.length} advisories, ${data.summary.scope_areas_with_evidence}/7 scope areas with evidence, ${regressionResults.length} regression manifest(s)`);
}

main();
