#!/usr/bin/env node
/**
 * Unit tests for framework/schema/finding-rules.mjs using Node's built-in
 * test runner (node:test) — zero external dependencies.
 *
 * Usage: node --test tests/unit.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFinding } from '../framework/schema/finding-rules.mjs';

const REGISTER_IDS = new Set(['GHSA-r649-4cqj-w93h', 'GHSA-hcq5-jm84-2395']);

const validBase = {
  id: 'WM-001',
  title: 'Convex public query - BOLA',
  status: 'REPRODUCED-KNOWN',
  component: 'bola-mock harness',
  trust_boundary: 5,
  severity: {
    cvss31_vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
    cvss31_score: 6.5,
    cvss40_vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N',
    epss: 0.02,
  },
  tags: { cwe: ['CWE-284', 'CWE-639'], wstg: 'WSTG-ATHZ-02', owasp_api: 'API1:2023' },
  lab_commit: 'a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0',
  reproduce_script: 'findings/WM-001/reproduce.sh',
  description: 'x', business_impact: 'x', remediation: 'x',
  references: { ghsa: 'GHSA-r649-4cqj-w93h' },
};

test('valid REPRODUCED-KNOWN finding passes', () => {
  const { valid, errors } = validateFinding(validBase, { registerIds: REGISTER_IDS });
  assert.equal(valid, true, `expected valid, got errors: ${errors.join('; ')}`);
});

test('REPRODUCED-KNOWN without references.ghsa fails', () => {
  const f = { ...validBase, references: {} };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('requires references.ghsa')));
});

test('REPRODUCED-KNOWN citing a GHSA not in the register fails (anti-fabrication)', () => {
  const f = { ...validBase, references: { ghsa: 'GHSA-4f5g-9h8j-2k1l' } };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('fabricated')));
});

test('CONFIRMED-NOVEL citing a REAL advisory fails (anti-plagiarism — the core rule)', () => {
  const f = {
    ...validBase,
    status: 'CONFIRMED-NOVEL',
    references: { ghsa: 'GHSA-hcq5-jm84-2395' },
  };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('this must be REPRODUCED-KNOWN instead')));
});

test('CONFIRMED-NOVEL with no ghsa reference and full fields passes', () => {
  const f = { ...validBase, id: 'WM-003', status: 'CONFIRMED-NOVEL', references: {} };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, true, errors.join('; '));
});

test('VERIFIED-SECURE requires control_tested, not CVSS', () => {
  const f = {
    id: 'WM-004',
    title: 'CSP header holds',
    status: 'VERIFIED-SECURE',
    component: 'vercel.json',
    trust_boundary: 6,
    control_tested: 'reflected-origin CORS attempt against Pro endpoints',
    tags: { cwe: ['CWE-693'], wstg: 'WSTG-CONF-12' },
    description: 'x', business_impact: 'x', remediation: 'x',
    references: {},
  };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, true, errors.join('; '));
});

test('bad status value is rejected', () => {
  const f = { ...validBase, status: 'PROBABLY_BAD' };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.startsWith('status must be one of')));
});

test('malformed CVSS 3.1 vector is rejected', () => {
  const f = { ...validBase, severity: { ...validBase.severity, cvss31_vector: 'not-a-vector' } };
  const { valid, errors } = validateFinding(f, { registerIds: REGISTER_IDS });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('cvss31_vector')));
});
