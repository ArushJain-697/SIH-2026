#!/usr/bin/env node
/**
 * The single most important test in this platform: proves that
 * engine/probe/safe-http.mjs physically refuses to contact any host other
 * than localhost/127.0.0.1/::1. This is the code-level enforcement of
 * docs/ROE.md's one hard rule. If this test ever fails, nothing downstream
 * can be trusted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeFetch, HostNotAllowedError, boundedBurst, BENIGN_MARKERS } from '../engine/probe/safe-http.mjs';
import { createServer } from 'node:http';

test('refuses the real production target host', async () => {
  await assert.rejects(() => safeFetch('https://worldmonitor.app/'), HostNotAllowedError);
});

test('refuses arbitrary external hosts', async () => {
  await assert.rejects(() => safeFetch('https://example.com/'), HostNotAllowedError);
  await assert.rejects(() => safeFetch('https://api.first.org/'), HostNotAllowedError);
  await assert.rejects(() => safeFetch('http://169.254.169.254/latest/meta-data/'), HostNotAllowedError);
});

test('refuses a hostname that merely CONTAINS "localhost" as a suffix trick', async () => {
  await assert.rejects(() => safeFetch('https://worldmonitor.app.evil.com/'), HostNotAllowedError);
  await assert.rejects(() => safeFetch('https://notlocalhost.evil.com/'), HostNotAllowedError);
});

test('refuses an invalid URL rather than silently no-op-ing', async () => {
  await assert.rejects(() => safeFetch('not a url'));
});

test('permits a real localhost request and captures a HAR-like record', async () => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'X-Test-Header': 'probe-ok' });
    res.end('hello from local test server');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const { record, bodyText } = await safeFetch(`http://127.0.0.1:${port}/ping`);
    assert.equal(record.status, 200);
    assert.equal(record.response_headers['x-test-header'], 'probe-ok');
    assert.equal(bodyText, 'hello from local test server');
    assert.equal(record.method, 'GET');
    assert.ok(record.duration_ms >= 0);
  } finally {
    server.close();
  }
});

test('permits ::1 (IPv6 loopback) as an allowed host', async () => {
  // We don't need a live IPv6 server here — just prove the host check
  // itself passes ::1 through to the actual fetch (which will then fail
  // for connection reasons in a sandboxed test env, not a HostNotAllowedError).
  await assert.rejects(
    () => safeFetch('http://[::1]:1/nonexistent-port-should-fail-to-connect'),
    (err) => !(err instanceof HostNotAllowedError),
  );
});

test('boundedBurst never exceeds the count it is given', async () => {
  const server = createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let hits = 0;
  server.on('request', () => { hits++; });
  try {
    const records = await boundedBurst(`http://127.0.0.1:${port}/x`, {}, 3);
    assert.equal(records.length, 3);
  } finally {
    server.close();
  }
});

test('BENIGN_MARKERS contains no obviously weaponized payload', () => {
  const joined = JSON.stringify(BENIGN_MARKERS).toLowerCase();
  for (const bad of ['rm -rf', 'drop table', 'eval(', 'exec(', 'reverse shell', '/bin/sh']) {
    assert.ok(!joined.includes(bad), `BENIGN_MARKERS unexpectedly contains "${bad}"`);
  }
});
