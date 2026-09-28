#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { cvss31BaseScore } from '../framework/schema/cvss31.mjs';

test('known reference: unauth RCE, scope unchanged, full CIA -> 9.8', () => {
  assert.equal(cvss31BaseScore('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'), 9.8);
});

test('known reference: same but scope changed -> 10.0 (capped)', () => {
  assert.equal(cvss31BaseScore('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H'), 10);
});

test('WM-001 BOLA vector -> 6.5', () => {
  assert.equal(cvss31BaseScore('CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N'), 6.5);
});

test('WM-002 DoW vector -> 7.2', () => {
  assert.equal(cvss31BaseScore('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:L'), 7.2);
});

test('zero-impact vector -> 0.0', () => {
  assert.equal(cvss31BaseScore('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N'), 0);
});

test('missing metric throws', () => {
  assert.throws(() => cvss31BaseScore('CVSS:3.1/AV:N/AC:L'));
});
