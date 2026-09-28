#!/usr/bin/env node
/**
 * Severity/priority engine — build-map-advanced ticket #B4 (EVIDENCE,
 * Phase B). Combines CVSS (severity) + EPSS (likelihood) + our own lab
 * confirmation status into a single prioritized action, in the spirit of
 * CISA's Stakeholder-Specific Vulnerability Categorization (SSVC) decision
 * trees. This is a DELIBERATE SIMPLIFICATION of real SSVC (which also
 * weighs mission prevalence and public well-being impact, dimensions this
 * project has no basis to assess for a third party's application) — it is
 * described honestly as "SSVC-inspired," never as an implementation of the
 * official SSVC methodology. The published, worked example decision trees
 * are at https://www.cisa.gov/stakeholder-specific-vulnerability-categorization-ssvc.
 *
 * WHY THIS EXISTS: the exact anticipated judge question this project's own
 * bible prepares for is "your CVSS is 9.8, but is it actually exploitable?"
 * A priority label that folds in EPSS (real-world exploitation likelihood)
 * and our own lab confirmation (did we actually reproduce it, or is the
 * control verified secure) answers that question with a defensible,
 * reproducible decision rather than a single scary number.
 *
 * Decision outputs (borrowing SSVC's own vocabulary):
 *   Act    — high confidence this needs attention now.
 *   Attend — needs timely investigation/response, not an emergency.
 *   Track  — monitor; no immediate action needed (includes everything we
 *            verified secure).
 *   Track* — track, but flag for the next scheduled review (a "Track" that
 *            still carries residual real-world likelihood worth watching).
 *
 * Usage: node engine/core/priority.mjs findings/WM-002/finding.json
 */
import { readFileSync } from 'node:fs';

export const PRIORITY_LEVELS = ['Act', 'Attend', 'Track*', 'Track'];

function cvssBand(score) {
  if (score === null || score === undefined) return null;
  if (score >= 9.0) return 'Critical';
  if (score >= 7.0) return 'High';
  if (score >= 4.0) return 'Medium';
  return 'Low';
}

/**
 * @param {object} input
 * @param {'REPRODUCED-KNOWN'|'CONFIRMED-NOVEL'|'CANDIDATE-UNCONFIRMED'|'VERIFIED-SECURE'} input.status
 * @param {number|null} [input.cvss31Score]
 * @param {number|null} [input.epss] - 0-1, or null/undefined if not applicable
 * @returns {{decision: string, reasoning: string[], inputs: object}}
 */
export function computePriority({ status, cvss31Score = null, epss = null }) {
  const reasoning = [];
  const band = cvssBand(cvss31Score);

  // 1. VERIFIED-SECURE always Tracks — the control held, there is nothing to act on.
  if (status === 'VERIFIED-SECURE') {
    reasoning.push('status is VERIFIED-SECURE: a hostile vector was attempted and the control held. No CVSS applies. Track only, to catch a future regression.');
    return { decision: 'Track', reasoning, inputs: { status, cvss31Score, epss, band } };
  }

  // 2. CANDIDATE-UNCONFIRMED is inherently uncertain — never Act on unconfirmed
  //    work, but never silently drop it either.
  if (status === 'CANDIDATE-UNCONFIRMED') {
    reasoning.push('status is CANDIDATE-UNCONFIRMED: the framework surfaced this but it was not independently confirmed against real infrastructure. Acting on an unconfirmed candidate would risk a false claim — Attend (investigate further), never Act.');
    return { decision: 'Attend', reasoning, inputs: { status, cvss31Score, epss, band } };
  }

  // 3. REPRODUCED-KNOWN / CONFIRMED-NOVEL — we have real proof it works.
  //    Now the question is how urgently, weighing severity AND likelihood.
  reasoning.push(`status is ${status}: this was actually reproduced/confirmed, not merely scored. Real exploitability confirmed in the lab.`);

  const hasEpss = typeof epss === 'number';
  if (hasEpss) reasoning.push(`EPSS = ${epss} (${(epss * 100).toFixed(2)}% estimated real-world exploitation probability within 30 days, per FIRST).`);
  else reasoning.push('EPSS not applicable/available for this finding — likelihood reasoned from CVSS band and lab-exploitability alone (CERT-In-aligned qualitative fallback).');

  if (band === 'Critical' || (band === 'High' && hasEpss && epss >= 0.5)) {
    reasoning.push(`CVSS band is ${band}${hasEpss && epss >= 0.5 ? ' and EPSS indicates high real-world likelihood' : ''} — Act.`);
    return { decision: 'Act', reasoning, inputs: { status, cvss31Score, epss, band } };
  }

  if (band === 'High' || (band === 'Medium' && hasEpss && epss >= 0.2)) {
    reasoning.push(`CVSS band is ${band}${hasEpss && epss >= 0.2 ? ' with meaningful EPSS likelihood' : ' (reproduced, so this is not a purely theoretical Medium)'} — Attend.`);
    return { decision: 'Attend', reasoning, inputs: { status, cvss31Score, epss, band } };
  }

  if (band === 'Medium' || band === 'Low') {
    reasoning.push(`CVSS band is ${band} and EPSS (if available) does not elevate real-world likelihood — Track*, since it was reproduced and confirmed real, not dismissed outright.`);
    return { decision: 'Track*', reasoning, inputs: { status, cvss31Score, epss, band } };
  }

  reasoning.push('No CVSS score available to band — defaulting to Attend so a confirmed-but-unscored finding is never silently under-prioritized.');
  return { decision: 'Attend', reasoning, inputs: { status, cvss31Score, epss, band } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) { console.error('Usage: node priority.mjs findings/WM-0XX/finding.json'); process.exit(1); }
  const f = JSON.parse(readFileSync(path, 'utf8'));
  const result = computePriority({
    status: f.status,
    cvss31Score: f.severity?.cvss31_score ?? null,
    epss: f.severity?.epss ?? null,
  });
  console.log(JSON.stringify(result, null, 2));
}
