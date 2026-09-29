#!/usr/bin/env node
/**
 * Build-map-advanced ticket #G3: proves the coverage matrix is provably
 * derived from real findings' scope_areas tags, and that all 7 PS scope
 * areas carry a non-empty verdict — "completeness is provable and
 * self-updating." docs/coverage-matrix.md stays hand-authored prose (see
 * framework/generate-coverage-matrix.mjs's header comment for why), but
 * this test is the automated proof that the doc's claim ("all 7 of 7 PS
 * scope areas now have direct, real evidence") is actually true of the
 * findings as they exist right now, not just true the day it was written.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFindings, buildCoverageMatrix } from '../framework/generate-coverage-matrix.mjs';

test('coverage matrix: every one of the 7 PS scope areas has a non-empty verdict', () => {
  const findings = loadFindings();
  const matrix = buildCoverageMatrix(findings);
  assert.equal(Object.keys(matrix).length, 7, 'matrix must cover exactly 7 scope areas');
  for (let area = 1; area <= 7; area++) {
    const cell = matrix[area];
    assert.ok(cell, `area ${area} missing from matrix`);
    assert.notEqual(cell.verdict, 'NOT_TESTED', `PS scope area ${area} ("${cell.label}") has no real finding evidence — either add coverage or this is an honest, explicit gap`);
    assert.ok(cell.finding_ids.length > 0, `area ${area} verdict is not NOT_TESTED but has no finding_ids — verdict/evidence mismatch`);
  }
});

test('coverage matrix: every real finding\'s scope_areas actually appear in the matrix', () => {
  const findings = loadFindings();
  const matrix = buildCoverageMatrix(findings);
  for (const f of findings) {
    for (const area of f.scope_areas || []) {
      assert.ok(matrix[area].finding_ids.includes(f.id), `${f.id} declares scope_areas includes ${area}, but the computed matrix cell for area ${area} doesn't list it — buildCoverageMatrix logic drifted from the schema`);
    }
  }
});
