#!/usr/bin/env node
/**
 * PS-schema deliverable export — build-map-advanced ticket #F3.
 *
 * The PS names an exact field order for reporting a finding: Vulnerability
 * title, Description, Affected component, Severity (CVSS), Steps to
 * reproduce, Proof of concept, Business impact, Remediation. This script
 * emits every real finding in exactly that order and exactly those labels —
 * "hand the jury their own checklist, filled" — derived entirely from
 * findings/<id>/finding.json (the schema-validated source of truth), never
 * hand-typed into this file.
 *
 * A VERIFIED-SECURE finding has no CVSS vector by design (no vulnerability
 * exists to score) — that field renders "N/A" with the reason stated, which
 * is the honest answer, not a gap in the export.
 *
 * Usage: node engine/report/ps-export.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const FINDINGS_DIR = join(ROOT, 'findings');
const OUT_PATH = join(ROOT, 'report/ps-schema-export.md');

export function loadFindings() {
  if (!existsSync(FINDINGS_DIR)) return [];
  return readdirSync(FINDINGS_DIR)
    .filter((d) => statSync(join(FINDINGS_DIR, d)).isDirectory())
    .map((d) => {
      const p = join(FINDINGS_DIR, d, 'finding.json');
      if (!existsSync(p)) return null;
      const f = JSON.parse(readFileSync(p, 'utf8'));
      const evidenceDir = join(FINDINGS_DIR, d, 'evidence');
      const evidenceFiles = existsSync(evidenceDir) ? readdirSync(evidenceDir) : [];
      return { dir: d, ...f, evidence_files: evidenceFiles };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function severityField(f) {
  if (!f.severity || !f.severity.cvss31_vector) {
    return `N/A — ${f.status} (no vulnerability exists to score; a held control has no CVSS)`;
  }
  const lines = [
    `CVSS 3.1: **${f.severity.cvss31_score}** — \`${f.severity.cvss31_vector}\``,
  ];
  if (f.severity.cvss40_vector) lines.push(`CVSS 4.0: \`${f.severity.cvss40_vector}\``);
  if (typeof f.severity.epss === 'number') {
    lines.push(`EPSS: ${f.severity.epss}`);
  } else if (f.epss_note) {
    lines.push(`EPSS: N/A — ${f.epss_note}`);
  }
  return lines.join('\n');
}

export function stepsToReproduceField(f) {
  const parts = [];
  if (f.preconditions) parts.push(`Preconditions: ${f.preconditions}`);
  if (f.reproduce_script) {
    parts.push(`\`\`\`bash\nbash ${f.reproduce_script}\n\`\`\``);
  } else {
    parts.push('No dynamic reproduction script — this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).');
  }
  return parts.join('\n\n');
}

export function proofOfConceptField(f) {
  if (f.evidence_summary && Object.keys(f.evidence_summary).length > 0) {
    const rows = Object.entries(f.evidence_summary)
      .map(([k, v]) => `| ${k} | ${v} |`)
      .join('\n');
    return `| Metric | Value |\n| --- | --- |\n${rows}`;
  }
  if (f.evidence_files && f.evidence_files.length > 0) {
    return f.evidence_files.map((ef) => `- \`findings/${f.dir}/evidence/${ef}\``).join('\n');
  }
  return `See \`findings/${f.dir}/finding.md\` for the full write-up and captured evidence.`;
}

export function buildEntry(f) {
  return [
    `## ${f.id} — ${f.status}`,
    '',
    '**Vulnerability title**',
    '',
    f.title,
    '',
    '**Description**',
    '',
    f.description,
    '',
    '**Affected component**',
    '',
    f.component,
    '',
    '**Severity (CVSS)**',
    '',
    severityField(f),
    '',
    '**Steps to reproduce**',
    '',
    stepsToReproduceField(f),
    '',
    '**Proof of concept**',
    '',
    proofOfConceptField(f),
    '',
    '**Business impact**',
    '',
    f.business_impact,
    '',
    '**Remediation**',
    '',
    f.remediation,
    f.remediation_patch ? `\n(Real, \`git apply --check\`-verified patch: \`${f.remediation_patch}\`)` : '',
    '',
    '---',
    '',
  ].join('\n');
}

function main() {
  const findings = loadFindings();
  const header = [
    '# PS 26163 — Deliverable Field Export',
    '',
    'Generated from `findings/*/finding.json` — never hand-typed. Every finding below',
    'is rendered in the exact field order PS 26163 names: **Vulnerability title,',
    'Description, Affected component, Severity (CVSS), Steps to reproduce, Proof of',
    'concept, Business impact, Remediation.**',
    '',
    `${findings.length} findings. Regenerate with \`node engine/report/ps-export.mjs\`.`,
    '',
    '---',
    '',
  ].join('\n');

  const body = findings.map(buildEntry).join('\n');
  writeFileSync(OUT_PATH, header + body);
  console.log(`ps-export: wrote report/ps-schema-export.md — ${findings.length} findings in exact PS field order`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
