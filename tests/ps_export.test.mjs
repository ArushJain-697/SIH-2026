#!/usr/bin/env node
/**
 * Build-map-advanced ticket #F3 / #G1: proves the PS-schema export contains
 * every one of the PS's own eight named fields, in the PS's own order, for
 * every real finding — "a diff against the PS field list is empty."
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFindings, buildEntry } from '../engine/report/ps-export.mjs';

const PS_FIELD_ORDER = [
  'Vulnerability title',
  'Description',
  'Affected component',
  'Severity (CVSS)',
  'Steps to reproduce',
  'Proof of concept',
  'Business impact',
  'Remediation',
];

test('ps-export: real findings exist to export', () => {
  const findings = loadFindings();
  assert.ok(findings.length > 0, 'no findings found under findings/ — nothing to export');
});

test('ps-export: every finding renders all 8 PS fields, in the PS\'s exact order', () => {
  const findings = loadFindings();
  for (const f of findings) {
    const entry = buildEntry(f);
    const positions = PS_FIELD_ORDER.map((label) => entry.indexOf(`**${label}**`));
    for (let i = 0; i < positions.length; i++) {
      assert.ok(positions[i] !== -1, `${f.id}: missing PS field "${PS_FIELD_ORDER[i]}"`);
    }
    for (let i = 1; i < positions.length; i++) {
      assert.ok(positions[i] > positions[i - 1], `${f.id}: "${PS_FIELD_ORDER[i]}" is out of order relative to "${PS_FIELD_ORDER[i - 1]}"`);
    }
  }
});

test('ps-export: severity field is honest for VERIFIED-SECURE (no fabricated CVSS)', () => {
  const findings = loadFindings();
  const secure = findings.filter((f) => f.status === 'VERIFIED-SECURE' && !f.severity?.cvss31_vector);
  for (const f of secure) {
    const entry = buildEntry(f);
    assert.ok(entry.includes('N/A -'), `${f.id}: VERIFIED-SECURE finding with no severity block should render an honest N/A, not a fabricated score`);
  }
});
