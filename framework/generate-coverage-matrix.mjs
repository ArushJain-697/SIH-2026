#!/usr/bin/env node
/**
 * Single source of truth for computing the 7-scope-area coverage matrix
 * from real findings — build-map-advanced ticket #G3. Previously this logic
 * was duplicated inline inside engine/report/build-report-data.mjs; both
 * that generator and tests/coverage_matrix.test.mjs now import it from
 * here, so there is exactly one place that decides what "covered" means.
 *
 * docs/coverage-matrix.md itself stays hand-authored prose (it carries real
 * per-area analytical narrative a mechanical regeneration would flatten),
 * but this module is what proves that prose isn't drifting from what the
 * findings actually say: run `node framework/generate-coverage-matrix.mjs`
 * to print the real, computed verdicts and cross-check them by eye against
 * the doc.
 *
 * Usage: node framework/generate-coverage-matrix.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCOPE_AREAS } from './schema/finding-rules.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const FINDINGS_DIR = join(ROOT, 'findings');

export function loadFindings() {
  if (!existsSync(FINDINGS_DIR)) return [];
  return readdirSync(FINDINGS_DIR)
    .filter((d) => statSync(join(FINDINGS_DIR, d)).isDirectory())
    .map((d) => {
      const p = join(FINDINGS_DIR, d, 'finding.json');
      return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function buildCoverageMatrix(findings) {
  const matrix = {};
  for (let area = 1; area <= 7; area++) {
    const findingsForArea = findings.filter((f) => (f.scope_areas || []).includes(area));
    const statuses = new Set(findingsForArea.map((f) => f.status));
    let verdict = 'NOT_TESTED';
    if (statuses.has('REPRODUCED-KNOWN') || statuses.has('CONFIRMED-NOVEL')) verdict = 'FINDING';
    else if (statuses.has('CANDIDATE-UNCONFIRMED')) verdict = 'CANDIDATE';
    else if (statuses.has('VERIFIED-SECURE')) verdict = 'VERIFIED_SECURE';
    matrix[area] = {
      area_number: area,
      label: SCOPE_AREAS[area],
      verdict,
      finding_ids: findingsForArea.map((f) => f.id),
    };
  }
  return matrix;
}

function main() {
  const findings = loadFindings();
  const matrix = buildCoverageMatrix(findings);
  console.log(`Coverage matrix computed from ${findings.length} real findings:\n`);
  for (const c of Object.values(matrix)) {
    console.log(`  Area ${c.area_number} — ${c.label}: ${c.verdict} (${c.finding_ids.join(', ') || 'no findings'})`);
  }
  const notTested = Object.values(matrix).filter((c) => c.verdict === 'NOT_TESTED').length;
  console.log(`\n${7 - notTested}/7 scope areas have direct evidence.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
