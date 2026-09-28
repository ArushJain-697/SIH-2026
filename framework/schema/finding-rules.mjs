#!/usr/bin/env node
/**
 * Finding schema validator — build-map ticket #7 (CORE, Phase 1).
 *
 * Deliberately NOT a JSON-Schema/ajv implementation: zero external
 * dependencies, so `node framework/schema/finding-rules.mjs` runs on a bare
 * Node 18+ install with nothing to `npm install`. See FINDING_SCHEMA.md for
 * the human-readable field reference; this file is the single source of
 * truth for what "valid" means.
 *
 * Bible §11 / build-map ticket #7. Cross-checked against register/advisories.json
 * so a REPRODUCED-KNOWN finding without a real GHSA, or a CONFIRMED-NOVEL
 * finding that IS a published advisory, fails loudly — this is the
 * anti-plagiarism / anti-fabrication enforcement point in code.
 */

export const STATUS_VALUES = [
  'REPRODUCED-KNOWN',
  'CONFIRMED-NOVEL',
  'CANDIDATE-UNCONFIRMED',
  'VERIFIED-SECURE',
];

const CVSS31_RE = /^CVSS:3\.1\/AV:[NALP]\/AC:[LH]\/PR:[NLH]\/UI:[NR]\/S:[UC]\/C:[NLH]\/I:[NLH]\/A:[NLH]$/;
const CVSS40_RE = /^CVSS:4\.0\//;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * @param {object} finding
 * @param {object} [opts]
 * @param {Set<string>} [opts.registerIds] - GHSA ids present in register/advisories.json
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateFinding(finding, opts = {}) {
  const errors = [];
  const registerIds = opts.registerIds || new Set();

  if (!finding || typeof finding !== 'object') {
    return { valid: false, errors: ['finding is not an object'] };
  }

  // --- identity ---
  if (!isNonEmptyString(finding.id) || !/^WM-\d{3}$/.test(finding.id)) {
    errors.push(`id must match WM-### (got: ${JSON.stringify(finding.id)})`);
  }
  if (!isNonEmptyString(finding.title)) errors.push('title is required');
  if (!isNonEmptyString(finding.component)) errors.push('component is required');
  if (typeof finding.trust_boundary !== 'number') errors.push('trust_boundary must be a number');

  // --- status (the load-bearing field) ---
  if (!STATUS_VALUES.includes(finding.status)) {
    errors.push(`status must be one of ${STATUS_VALUES.join(', ')} (got: ${JSON.stringify(finding.status)})`);
  }

  const refs = finding.references || {};
  const ghsa = refs.ghsa;

  if (finding.status === 'REPRODUCED-KNOWN') {
    if (!isNonEmptyString(ghsa)) {
      errors.push('REPRODUCED-KNOWN requires references.ghsa (which GHSA does this validate?)');
    } else if (registerIds.size > 0 && !registerIds.has(ghsa)) {
      errors.push(`REPRODUCED-KNOWN references.ghsa "${ghsa}" is not in register/advisories.json — either it is fabricated (see docs/LANDMINES.md) or the register is stale`);
    }
  }

  if (finding.status === 'CONFIRMED-NOVEL' || finding.status === 'CANDIDATE-UNCONFIRMED') {
    if (isNonEmptyString(ghsa) && registerIds.has(ghsa)) {
      errors.push(`status is ${finding.status} but references.ghsa "${ghsa}" IS a published advisory — this must be REPRODUCED-KNOWN instead. Re-reporting prior art as novel is disqualifying (bible §0, §3).`);
    }
  }

  if (finding.status === 'VERIFIED-SECURE') {
    if (!finding.control_tested || !isNonEmptyString(finding.control_tested)) {
      errors.push('VERIFIED-SECURE requires control_tested (what hostile vector was attempted)');
    }
  }

  // --- severity ---
  const sev = finding.severity || {};
  if (finding.status !== 'VERIFIED-SECURE') {
    if (!isNonEmptyString(sev.cvss31_vector) || !CVSS31_RE.test(sev.cvss31_vector)) {
      errors.push(`severity.cvss31_vector must be a well-formed CVSS 3.1 base vector (got: ${JSON.stringify(sev.cvss31_vector)})`);
    }
    if (typeof sev.cvss31_score !== 'number' || sev.cvss31_score < 0 || sev.cvss31_score > 10) {
      errors.push('severity.cvss31_score must be a number 0-10');
    }
    if (!isNonEmptyString(sev.cvss40_vector) || !CVSS40_RE.test(sev.cvss40_vector)) {
      errors.push('severity.cvss40_vector must start with "CVSS:4.0/"');
    }
    if (sev.epss !== undefined && sev.epss !== null) {
      if (typeof sev.epss !== 'number' || sev.epss < 0 || sev.epss > 1) {
        errors.push('severity.epss, if present, must be a number 0-1 (or omitted with epss_note explaining why)');
      }
    } else if (!isNonEmptyString(finding.epss_note)) {
      errors.push('severity.epss is absent — set it or explain why in epss_note (e.g. "no CVE assigned; qualitative EPSS reasoning in report")');
    }
  }

  // --- tags ---
  const tags = finding.tags || {};
  if (!Array.isArray(tags.cwe) || tags.cwe.length === 0 || !tags.cwe.every((c) => /^CWE-\d+$/.test(c))) {
    errors.push('tags.cwe must be a non-empty array of "CWE-###" strings');
  }
  if (!isNonEmptyString(tags.wstg)) errors.push('tags.wstg is required (e.g. "WSTG-ATHZ-02")');
  if (finding.status !== 'VERIFIED-SECURE' && !isNonEmptyString(tags.owasp_api)) {
    errors.push('tags.owasp_api is required for findings (e.g. "API1:2023")');
  }

  // --- evidence discipline ---
  if (finding.status !== 'VERIFIED-SECURE') {
    if (!isNonEmptyString(finding.lab_commit)) {
      errors.push('lab_commit is required — every finding pins the exact target commit it was run against');
    }
    if (!isNonEmptyString(finding.reproduce_script)) {
      errors.push('reproduce_script must point at a deterministic reproduce.sh — "we show our misses" requires "we show our reproductions" too');
    }
  }

  if (!isNonEmptyString(finding.description)) errors.push('description is required');
  if (!isNonEmptyString(finding.business_impact)) errors.push('business_impact is required');
  if (!isNonEmptyString(finding.remediation)) errors.push('remediation is required');

  return { valid: errors.length === 0, errors };
}

export default { validateFinding, STATUS_VALUES };
