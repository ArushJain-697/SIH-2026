#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { computePriority, PRIORITY_LEVELS } from '../engine/core/priority.mjs';

test('VERIFIED-SECURE always Tracks regardless of any score', () => {
  const r = computePriority({ status: 'VERIFIED-SECURE', cvss31Score: 9.8, epss: 0.9 });
  assert.equal(r.decision, 'Track');
});

test('CANDIDATE-UNCONFIRMED is always Attend, never Act', () => {
  const r = computePriority({ status: 'CANDIDATE-UNCONFIRMED', cvss31Score: 9.8, epss: 0.99 });
  assert.equal(r.decision, 'Attend');
});

test('REPRODUCED-KNOWN with Critical CVSS -> Act', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 9.2 });
  assert.equal(r.decision, 'Act');
});

test('REPRODUCED-KNOWN High CVSS + high EPSS also escalates to Act', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 7.5, epss: 0.7 });
  assert.equal(r.decision, 'Act');
});

test('REPRODUCED-KNOWN High CVSS with no/low EPSS -> Attend (WM-002 real case)', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 7.2, epss: null });
  assert.equal(r.decision, 'Attend');
});

test('REPRODUCED-KNOWN Medium CVSS with no EPSS -> Track* (WM-001 real case)', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 6.5, epss: null });
  assert.equal(r.decision, 'Track*');
});

test('REPRODUCED-KNOWN Medium CVSS + elevated EPSS escalates to Attend', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 5.0, epss: 0.3 });
  assert.equal(r.decision, 'Attend');
});

test('REPRODUCED-KNOWN Low CVSS -> Track*, never silently dropped', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 2.0 });
  assert.equal(r.decision, 'Track*');
});

test('two findings with equal CVSS but different EPSS can rank differently', () => {
  const low = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 7.5, epss: 0.05 });
  const high = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 7.5, epss: 0.8 });
  assert.notEqual(low.decision, high.decision);
  assert.equal(high.decision, 'Act');
  assert.equal(low.decision, 'Attend');
});

test('reasoning is always non-empty and explains the decision', () => {
  const r = computePriority({ status: 'REPRODUCED-KNOWN', cvss31Score: 6.5 });
  assert.ok(Array.isArray(r.reasoning) && r.reasoning.length > 0);
});

test('PRIORITY_LEVELS exports the four decision labels', () => {
  assert.deepEqual(PRIORITY_LEVELS, ['Act', 'Attend', 'Track*', 'Track']);
});

test('decision is deterministic — same inputs always produce the same output', () => {
  const input = { status: 'REPRODUCED-KNOWN', cvss31Score: 7.2, epss: null };
  const r1 = computePriority(input);
  const r2 = computePriority(input);
  assert.equal(r1.decision, r2.decision);
  assert.deepEqual(r1.reasoning, r2.reasoning);
});
