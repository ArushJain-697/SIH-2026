#!/usr/bin/env node
/**
 * CVSS 3.1 base-score calculator, implemented from the official FIRST
 * specification (https://www.first.org/cvss/v3.1/specification-document
 * §7.1-7.4), not copied from any report. Used so every score in this
 * project's findings is COMPUTED from its vector, not hand-asserted —
 * "recompute every CVSS vector in the official FIRST calculator before
 * printing" (bible §6) done in code instead of by hand.
 *
 * Usage: node framework/schema/cvss31.mjs "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N"
 */
const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC = { L: 0.77, H: 0.44 };
const PR_UNCHANGED = { N: 0.85, L: 0.62, H: 0.27 };
const PR_CHANGED = { N: 0.85, L: 0.68, H: 0.5 };
const UI = { N: 0.85, R: 0.62 };
const CIA = { N: 0.0, L: 0.22, H: 0.56 };

function roundUp(input) {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) return intInput / 100000;
  return (Math.floor(intInput / 10000) + 1) / 10;
}

export function cvss31BaseScore(vector) {
  const parts = Object.fromEntries(
    vector.replace(/^CVSS:3\.1\//, '').split('/').map((kv) => kv.split(':')),
  );
  const { AV: av, AC: ac, PR: pr, UI: ui, S: s, C: c, I: i, A: a } = parts;
  for (const [k, v] of Object.entries({ AV: av, AC: ac, PR: pr, UI: ui, S: s, C: c, I: i, A: a })) {
    if (v === undefined) throw new Error(`vector missing metric ${k}`);
  }

  const prVal = (s === 'C' ? PR_CHANGED : PR_UNCHANGED)[pr];
  const exploitability = 8.22 * AV[av] * AC[ac] * prVal * UI[ui];

  const iss = 1 - (1 - CIA[c]) * (1 - CIA[i]) * (1 - CIA[a]);
  let impact;
  if (s === 'U') {
    impact = 6.42 * iss;
  } else {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  }

  if (impact <= 0) return 0;

  const base = s === 'U'
    ? roundUp(Math.min(impact + exploitability, 10))
    : roundUp(Math.min(1.08 * (impact + exploitability), 10));

  return base;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const vector = process.argv[2];
  if (!vector) {
    console.error('Usage: node cvss31.mjs "CVSS:3.1/AV:.../..."');
    process.exit(1);
  }
  console.log(cvss31BaseScore(vector));
}
