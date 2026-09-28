#!/usr/bin/env node
/**
 * Unit tests for engine/core/epss.mjs. Network-independent by design (mocks
 * globalThis.fetch) so `npm test` stays deterministic and fast offline —
 * the real live-fetch + cache-write path is exercised manually via
 * `node engine/core/epss.mjs <CVE>`, not in CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getEpss } from '../engine/core/epss.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const CACHE_DIR = join(ROOT, '.cache/epss');

test('null CVE returns an honest not_applicable record, no fetch attempted', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error('should not be called'); };
  try {
    const r = await getEpss(null);
    assert.equal(r.status, 'not_applicable');
    assert.equal(r.epss, null);
    assert.equal(fetchCalled, false);
    assert.match(r.note, /No CVE is assigned/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('undefined CVE also returns not_applicable', async () => {
  const r = await getEpss(undefined);
  assert.equal(r.status, 'not_applicable');
});

test('a pre-seeded fresh cache entry is served without calling fetch', async () => {
  mkdirSync(CACHE_DIR, { recursive: true });
  const fakeCve = 'CVE-9999-00001';
  writeFileSync(join(CACHE_DIR, `${fakeCve}.json`), JSON.stringify({
    status: 'scored', cve: fakeCve, epss: 0.42, percentile: 0.9, date: '2026-01-01',
    note: 'seeded fixture', fetched_at_ms: Date.now(),
  }));
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error('should not be called — cache should serve this'); };
  try {
    const r = await getEpss(fakeCve);
    assert.equal(r.status, 'scored');
    assert.equal(r.epss, 0.42);
    assert.equal(r.source, 'cache');
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(join(CACHE_DIR, `${fakeCve}.json`), { force: true });
  }
});

test('a network failure returns an honest unavailable record, never a fabricated number', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('simulated network failure'); };
  try {
    const r = await getEpss('CVE-9999-00002');
    assert.equal(r.status, 'unavailable');
    assert.equal(r.epss, null);
    assert.match(r.note, /unreachable|Reasoned qualitatively/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a CVE with no EPSS record returns unavailable, not a fabricated score', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: [] }) });
  try {
    const r = await getEpss('CVE-9999-00003');
    assert.equal(r.status, 'unavailable');
    assert.equal(r.epss, null);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(join(CACHE_DIR, 'CVE-9999-00003.json'), { force: true });
  }
});

test('a scored response is parsed and cached correctly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ data: [{ cve: 'CVE-9999-00004', epss: '0.123450000', percentile: '0.876540000', date: '2026-02-02' }] }),
  });
  try {
    const r = await getEpss('CVE-9999-00004');
    assert.equal(r.status, 'scored');
    assert.equal(r.epss, 0.12345);
    assert.equal(r.percentile, 0.87654);
    assert.equal(r.source, 'live');
    assert.ok(existsSync(join(CACHE_DIR, 'CVE-9999-00004.json')), 'expected a cache file to be written');
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(join(CACHE_DIR, 'CVE-9999-00004.json'), { force: true });
  }
});
