#!/usr/bin/env node
/**
 * CVSS 4.0 base score calculator — build-map-advanced ticket #B1.
 *
 * A faithful ES-module port of the official FIRST reference implementation
 * (github.com/FIRSTdotorg/cvss-v4-calculator, cvss_score.js, BSD-2-Clause).
 * The three data tables (270-entry macrovector lookup, maxComposed,
 * maxSeverity) are vendored verbatim from that repo into ./data/ — we do NOT
 * hand-reproduce them, because a single wrong table entry would silently
 * produce wrong scores and destroy the rigor the whole assessment depends on.
 *
 * CVSS 4.0 is NOT a closed-form formula like 3.1. It works by mapping the
 * vector to a 6-digit "macrovector" (an equivalence class), looking up that
 * class's score, then interpolating within the class by severity distance to
 * the class's maximal vectors. This module reproduces that algorithm exactly;
 * tests/cvss40.test.mjs pins it against the official FIRST example vectors.
 *
 * Usage: node engine/core/cvss40.mjs "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
 */
import { CVSS_LOOKUP } from './data/cvss40-lookup.mjs';
import { MAX_COMPOSED } from './data/cvss40-maxcomposed.mjs';
import { MAX_SEVERITY } from './data/cvss40-maxseverity.mjs';

// Base (mandatory) metrics and their allowed values.
const BASE_METRICS = {
  AV: ['N', 'A', 'L', 'P'], AC: ['L', 'H'], AT: ['N', 'P'],
  PR: ['N', 'L', 'H'], UI: ['N', 'P', 'A'],
  VC: ['H', 'L', 'N'], VI: ['H', 'L', 'N'], VA: ['H', 'L', 'N'],
  SC: ['H', 'L', 'N'], SI: ['H', 'L', 'N'], SA: ['H', 'L', 'N'],
};
// Optional metric groups that influence the score.
const OPTIONAL_METRICS = {
  E: ['X', 'A', 'P', 'U'],
  CR: ['X', 'H', 'M', 'L'], IR: ['X', 'H', 'M', 'L'], AR: ['X', 'H', 'M', 'L'],
  MAV: ['X', 'N', 'A', 'L', 'P'], MAC: ['X', 'L', 'H'], MAT: ['X', 'N', 'P'],
  MPR: ['X', 'N', 'L', 'H'], MUI: ['X', 'N', 'P', 'A'],
  MVC: ['X', 'H', 'L', 'N'], MVI: ['X', 'H', 'L', 'N'], MVA: ['X', 'H', 'L', 'N'],
  MSC: ['X', 'H', 'L', 'N'], MSI: ['X', 'S', 'H', 'L', 'N'], MSA: ['X', 'S', 'H', 'L', 'N'],
};
// Supplemental metrics — parsed and allowed, but by design do not affect the score.
const SUPPLEMENTAL_METRICS = { S: ['X', 'N', 'P'], AU: ['X', 'N', 'Y'], R: ['X', 'A', 'U', 'I'], V: ['X', 'D', 'C'], RE: ['X', 'L', 'M', 'H'], U: ['X', 'Clear', 'Green', 'Amber', 'Red'] };

const AV_L = { N: 0.0, A: 0.1, L: 0.2, P: 0.3 };
const PR_L = { N: 0.0, L: 0.1, H: 0.2 };
const UI_L = { N: 0.0, P: 0.1, A: 0.2 };
const AC_L = { L: 0.0, H: 0.1 };
const AT_L = { N: 0.0, P: 0.1 };
const VC_L = { H: 0.0, L: 0.1, N: 0.2 };
const VI_L = { H: 0.0, L: 0.1, N: 0.2 };
const VA_L = { H: 0.0, L: 0.1, N: 0.2 };
const SC_L = { H: 0.1, L: 0.2, N: 0.3 };
const SI_L = { S: 0.0, H: 0.1, L: 0.2, N: 0.3 };
const SA_L = { S: 0.0, H: 0.1, L: 0.2, N: 0.3 };
const CR_L = { H: 0.0, M: 0.1, L: 0.2 };
const IR_L = { H: 0.0, M: 0.1, L: 0.2 };
const AR_L = { H: 0.0, M: 0.1, L: 0.2 };

export function parseVector(vector) {
  if (typeof vector !== 'string' || !vector.startsWith('CVSS:4.0/')) {
    throw new Error(`not a CVSS 4.0 vector: ${JSON.stringify(vector)}`);
  }
  const parts = vector.slice('CVSS:4.0/'.length).split('/').filter(Boolean);
  const selected = {};
  for (const part of parts) {
    const [k, v] = part.split(':');
    const allowed = BASE_METRICS[k] || OPTIONAL_METRICS[k] || SUPPLEMENTAL_METRICS[k];
    if (!allowed) throw new Error(`unknown CVSS 4.0 metric "${k}"`);
    if (!allowed.includes(v)) throw new Error(`invalid value "${v}" for metric "${k}"`);
    selected[k] = v;
  }
  for (const m of Object.keys(BASE_METRICS)) {
    if (!(m in selected)) throw new Error(`CVSS 4.0 base vector missing mandatory metric "${m}"`);
  }
  // Default every optional metric to X (the reference m() resolves X per metric).
  for (const m of Object.keys(OPTIONAL_METRICS)) if (!(m in selected)) selected[m] = 'X';
  return selected;
}

// Faithful port of the reference m(): resolves X/modified metrics to effective values.
function m(sel, metric) {
  const selected = sel[metric];
  if (metric === 'E' && selected === 'X') return 'A';
  if (metric === 'CR' && selected === 'X') return 'H';
  if (metric === 'IR' && selected === 'X') return 'H';
  if (metric === 'AR' && selected === 'X') return 'H';
  const mod = 'M' + metric;
  if (Object.prototype.hasOwnProperty.call(sel, mod)) {
    const modSel = sel[mod];
    if (modSel !== 'X') return modSel;
  }
  return selected;
}

function macroVector(sel) {
  let eq1, eq2, eq3, eq4, eq5, eq6;
  const AV = m(sel, 'AV'), PR = m(sel, 'PR'), UI = m(sel, 'UI');
  if (AV === 'N' && PR === 'N' && UI === 'N') eq1 = '0';
  else if ((AV === 'N' || PR === 'N' || UI === 'N') && !(AV === 'N' && PR === 'N' && UI === 'N') && AV !== 'P') eq1 = '1';
  else eq1 = '2';

  eq2 = (m(sel, 'AC') === 'L' && m(sel, 'AT') === 'N') ? '0' : '1';

  const VC = m(sel, 'VC'), VI = m(sel, 'VI'), VA = m(sel, 'VA');
  if (VC === 'H' && VI === 'H') eq3 = '0';
  else if (VC === 'H' || VI === 'H' || VA === 'H') eq3 = '1';
  else eq3 = '2';

  const MSI = m(sel, 'MSI'), MSA = m(sel, 'MSA');
  const SC = m(sel, 'SC'), SI = m(sel, 'SI'), SA = m(sel, 'SA');
  if (MSI === 'S' || MSA === 'S') eq4 = '0';
  else if (SC === 'H' || SI === 'H' || SA === 'H') eq4 = '1';
  else eq4 = '2';

  const E = m(sel, 'E');
  eq5 = E === 'A' ? '0' : E === 'P' ? '1' : '2';

  const CR = m(sel, 'CR'), IR = m(sel, 'IR'), AR = m(sel, 'AR');
  if ((CR === 'H' && VC === 'H') || (IR === 'H' && VI === 'H') || (AR === 'H' && VA === 'H')) eq6 = '0';
  else eq6 = '1';

  return `${eq1}${eq2}${eq3}${eq4}${eq5}${eq6}`;
}

function extractValueMetric(metric, str) {
  let extracted = str.slice(str.indexOf(metric) + metric.length + 1);
  const slash = extracted.indexOf('/');
  return slash > 0 ? extracted.substring(0, slash) : extracted;
}

function getEQMaxes(macro, eq) {
  return MAX_COMPOSED['eq' + eq][macro[eq - 1]];
}

/** Returns the CVSS 4.0 base score (0.0–10.0) for a vector string. */
export function cvss40Score(vector) {
  const sel = parseVector(vector);

  if (['VC', 'VI', 'VA', 'SC', 'SI', 'SA'].every((met) => m(sel, met) === 'N')) return 0.0;

  const macro = macroVector(sel);
  let value = CVSS_LOOKUP[macro];
  if (value === undefined) throw new Error(`macrovector ${macro} not in lookup (should be impossible)`);

  const eq1 = +macro[0], eq2 = +macro[1], eq3 = +macro[2], eq4 = +macro[3], eq5 = +macro[4], eq6 = +macro[5];

  const eq1_next = `${eq1 + 1}${eq2}${eq3}${eq4}${eq5}${eq6}`;
  const eq2_next = `${eq1}${eq2 + 1}${eq3}${eq4}${eq5}${eq6}`;
  let eq3eq6_next, eq3eq6_next_left, eq3eq6_next_right;
  if (eq3 === 1 && eq6 === 1) eq3eq6_next = `${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`;
  else if (eq3 === 0 && eq6 === 1) eq3eq6_next = `${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`;
  else if (eq3 === 1 && eq6 === 0) eq3eq6_next = `${eq1}${eq2}${eq3}${eq4}${eq5}${eq6 + 1}`;
  else if (eq3 === 0 && eq6 === 0) {
    eq3eq6_next_left = `${eq1}${eq2}${eq3}${eq4}${eq5}${eq6 + 1}`;
    eq3eq6_next_right = `${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`;
  } else eq3eq6_next = `${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6 + 1}`;
  const eq4_next = `${eq1}${eq2}${eq3}${eq4 + 1}${eq5}${eq6}`;
  const eq5_next = `${eq1}${eq2}${eq3}${eq4}${eq5 + 1}${eq6}`;

  const score_eq1_next = CVSS_LOOKUP[eq1_next];
  const score_eq2_next = CVSS_LOOKUP[eq2_next];
  let score_eq3eq6_next;
  if (eq3 === 0 && eq6 === 0) {
    const l = CVSS_LOOKUP[eq3eq6_next_left];
    const r = CVSS_LOOKUP[eq3eq6_next_right];
    score_eq3eq6_next = (l ?? -Infinity) > (r ?? -Infinity) ? l : r;
  } else {
    score_eq3eq6_next = CVSS_LOOKUP[eq3eq6_next];
  }
  const score_eq4_next = CVSS_LOOKUP[eq4_next];
  const score_eq5_next = CVSS_LOOKUP[eq5_next];

  const eq1_maxes = getEQMaxes(macro, 1);
  const eq2_maxes = getEQMaxes(macro, 2);
  const eq3_eq6_maxes = getEQMaxes(macro, 3)[macro[5]];
  const eq4_maxes = getEQMaxes(macro, 4);
  const eq5_maxes = getEQMaxes(macro, 5);

  const max_vectors = [];
  for (const a of eq1_maxes) for (const b of eq2_maxes) for (const c of eq3_eq6_maxes) for (const d of eq4_maxes) for (const e of eq5_maxes) max_vectors.push(a + b + c + d + e);

  let sd = {};
  for (const max_vector of max_vectors) {
    sd = {
      AV: AV_L[m(sel, 'AV')] - AV_L[extractValueMetric('AV', max_vector)],
      PR: PR_L[m(sel, 'PR')] - PR_L[extractValueMetric('PR', max_vector)],
      UI: UI_L[m(sel, 'UI')] - UI_L[extractValueMetric('UI', max_vector)],
      AC: AC_L[m(sel, 'AC')] - AC_L[extractValueMetric('AC', max_vector)],
      AT: AT_L[m(sel, 'AT')] - AT_L[extractValueMetric('AT', max_vector)],
      VC: VC_L[m(sel, 'VC')] - VC_L[extractValueMetric('VC', max_vector)],
      VI: VI_L[m(sel, 'VI')] - VI_L[extractValueMetric('VI', max_vector)],
      VA: VA_L[m(sel, 'VA')] - VA_L[extractValueMetric('VA', max_vector)],
      SC: SC_L[m(sel, 'SC')] - SC_L[extractValueMetric('SC', max_vector)],
      SI: SI_L[m(sel, 'SI')] - SI_L[extractValueMetric('SI', max_vector)],
      SA: SA_L[m(sel, 'SA')] - SA_L[extractValueMetric('SA', max_vector)],
      CR: CR_L[m(sel, 'CR')] - CR_L[extractValueMetric('CR', max_vector)],
      IR: IR_L[m(sel, 'IR')] - IR_L[extractValueMetric('IR', max_vector)],
      AR: AR_L[m(sel, 'AR')] - AR_L[extractValueMetric('AR', max_vector)],
    };
    if (Object.values(sd).some((x) => x < 0)) continue;
    break;
  }

  const cur_eq1 = sd.AV + sd.PR + sd.UI;
  const cur_eq2 = sd.AC + sd.AT;
  const cur_eq3eq6 = sd.VC + sd.VI + sd.VA + sd.CR + sd.IR + sd.AR;
  const cur_eq4 = sd.SC + sd.SI + sd.SA;

  const step = 0.1;
  const avail_eq1 = value - score_eq1_next;
  const avail_eq2 = value - score_eq2_next;
  const avail_eq3eq6 = value - score_eq3eq6_next;
  const avail_eq4 = value - score_eq4_next;
  const avail_eq5 = value - score_eq5_next;

  const maxSev_eq1 = MAX_SEVERITY.eq1[eq1] * step;
  const maxSev_eq2 = MAX_SEVERITY.eq2[eq2] * step;
  const maxSev_eq3eq6 = MAX_SEVERITY.eq3eq6[eq3][eq6] * step;
  const maxSev_eq4 = MAX_SEVERITY.eq4[eq4] * step;

  let n = 0;
  let ns1 = 0, ns2 = 0, ns36 = 0, ns4 = 0, ns5 = 0;
  const exists = (x) => x !== undefined && !Number.isNaN(x);
  if (exists(avail_eq1)) { n++; ns1 = avail_eq1 * (cur_eq1 / maxSev_eq1); }
  if (exists(avail_eq2)) { n++; ns2 = avail_eq2 * (cur_eq2 / maxSev_eq2); }
  if (exists(avail_eq3eq6)) { n++; ns36 = avail_eq3eq6 * (cur_eq3eq6 / maxSev_eq3eq6); }
  if (exists(avail_eq4)) { n++; ns4 = avail_eq4 * (cur_eq4 / maxSev_eq4); }
  if (exists(avail_eq5)) { n++; ns5 = 0; }

  const mean = n === 0 ? 0 : (ns1 + ns2 + ns36 + ns4 + ns5) / n;
  value -= mean;
  if (value < 0) value = 0.0;
  if (value > 10) value = 10.0;
  return Math.round(value * 10) / 10;
}

export function cvss40Severity(score) {
  if (score === 0) return 'None';
  if (score < 4.0) return 'Low';
  if (score < 7.0) return 'Medium';
  if (score < 9.0) return 'High';
  return 'Critical';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const vector = process.argv[2];
  if (!vector) { console.error('Usage: node cvss40.mjs "CVSS:4.0/AV:.../..."'); process.exit(1); }
  const s = cvss40Score(vector);
  console.log(`${s} (${cvss40Severity(s)})`);
}
