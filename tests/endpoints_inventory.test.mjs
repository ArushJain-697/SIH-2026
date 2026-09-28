#!/usr/bin/env node
/**
 * Structural tests for engine/inventory/endpoints.json (build-map-advanced
 * ticket #A2). Runs against the already-generated inventory file rather than
 * re-cloning the target in CI — regenerate first with
 * `node engine/inventory/build-endpoints.mjs` if the file is stale or
 * missing; this test skips gracefully (not fails) when it hasn't been built
 * yet, since the source clone is disposable by design (see lab/README.md).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const INVENTORY_PATH = join(ROOT, 'engine/inventory/endpoints.json');

test('endpoint inventory structure and spot-checks', (t) => {
  if (!existsSync(INVENTORY_PATH)) {
    t.skip('engine/inventory/endpoints.json not built — run: node engine/inventory/build-endpoints.mjs (needs the source clone; see lab/README.md)');
    return;
  }
  const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));

  assert.ok(inv.stats.total_endpoints >= 236, `expected >=236 endpoints, got ${inv.stats.total_endpoints}`);
  assert.ok(inv.stats.gateway_routes >= 236, `expected >=236 gateway routes, got ${inv.stats.gateway_routes}`);
  assert.equal(inv.stats.non_get_gateway_routes_uncovered, 0, 'expected 0 uncovered non-GET gateway routes, matching findings/WM-003');
  assert.ok(Array.isArray(inv.endpoints) && inv.endpoints.length === inv.stats.total_endpoints);

  const byPath = new Map(inv.endpoints.map((e) => [e.path, e]));

  const marketAnalyze = byPath.get('/api/market/v1/analyze-stock');
  assert.ok(marketAnalyze, 'expected /api/market/v1/analyze-stock in the inventory');
  assert.equal(marketAnalyze.premium_gated, true, 'analyze-stock should be premium-gated');
  assert.equal(marketAnalyze.rate_limit.has_endpoint_policy, true);

  const classify = byPath.get('/api/intelligence/v1/classify-event');
  assert.ok(classify);
  assert.equal(classify.premium_gated, true);
  assert.equal(classify.rate_limit.fail_closed_required, true);

  const ask = byPath.get('/api/ask');
  assert.ok(ask, 'expected the /api/ask edge-function exception in the inventory');
  assert.equal(ask.source, 'edge-function-exception');
  assert.equal(ask.rate_limit.has_endpoint_policy, true);

  // Every endpoint has the full expected shape (no partial/malformed records).
  for (const e of inv.endpoints) {
    assert.equal(typeof e.path, 'string');
    assert.ok(Array.isArray(e.methods));
    assert.ok(['gateway', 'edge-function-exception'].includes(e.source));
    assert.equal(typeof e.rate_limit.has_endpoint_policy, 'boolean');
    assert.equal(typeof e.premium_gated, 'boolean');
  }
});
