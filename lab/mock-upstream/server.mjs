#!/usr/bin/env node
/**
 * Mock metered upstream — build-map ticket #10 (SAFETY, Phase 2).
 *
 * A minimal stand-in for a paid third-party API (AviationStack/Finnhub-shape)
 * that our Denial-of-Wallet reproduction (lab/repro-services/dow-mock) calls
 * instead of ANY real vendor. This is the thing that makes GHSA-hcq5-jm84-2395
 * ("MCP daily cost-cap bypass") safe to reproduce: every "expensive call" in
 * the demo hits THIS process on localhost, never a metered vendor. See
 * docs/ROE.md — "mock everything metered" is a hard red line, not a nicety.
 *
 * Every call is logged (timestamp, caller-supplied id, whether it was
 * counted as billable) so a finding's evidence/ folder can cite an exact,
 * inspectable call log rather than an assertion.
 *
 * Usage: node lab/mock-upstream/server.mjs [port]
 */
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] || process.env.MOCK_UPSTREAM_PORT || 4001);

const callLog = []; // { ts, callerId, path, billable, note }

function record(callerId, path, billable, note) {
  const entry = { ts: new Date().toISOString(), callerId: callerId || 'unknown', path, billable, note };
  callLog.push(entry);
  return entry;
}

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const callerId = req.headers['x-caller-id'] || 'anonymous';

  // --- introspection endpoints for evidence capture (not part of the "billable" surface) ---
  if (url.pathname === '/_meta/calls') {
    return json(res, 200, { count: callLog.length, billable: callLog.filter((c) => c.billable).length, calls: callLog });
  }
  if (url.pathname === '/_meta/reset') {
    callLog.length = 0;
    return json(res, 200, { reset: true });
  }

  // --- the metered-API-shaped surface ---
  // Mirrors the shape of a real metered lookup (e.g. AviationStack "flights"):
  // every hit is billable the instant the upstream processes it, regardless
  // of what the CALLER later decides to do with the response. That's the
  // property real vendors have and the one the DoW bug exploits.
  if (url.pathname === '/v1/lookup') {
    const target = url.searchParams.get('target') || '';
    const malformed = url.searchParams.get('malformed') === '1';

    // The upstream does real (billable) work here BEFORE it can know the
    // request will look "malformed" from the caller's later perspective —
    // exactly the "already executed" moment GHSA-hcq5's title names.
    const entry = record(callerId, url.pathname, true, malformed ? 'flagged-malformed-by-caller-AFTER-billing' : 'ok');

    if (malformed) {
      // The upstream still did the billable work; it just also reports a
      // content-level problem. A caller-side "malformed -> refund the quota
      // slot" rule is the exact TOCTOU the finding demonstrates — the
      // refund decision is made from this response, but the billing event
      // (recorded above) already happened.
      return json(res, 200, { billed: true, status: 'content-malformed', target, note: entry.note });
    }
    return json(res, 200, { billed: true, status: 'ok', target, data: { value: Math.random() } });
  }

  return json(res, 404, { error: 'not_found' });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`mock-upstream listening on http://localhost:${PORT} (metered-API stand-in — never a real vendor)`);
  });
}

export { server, callLog };
