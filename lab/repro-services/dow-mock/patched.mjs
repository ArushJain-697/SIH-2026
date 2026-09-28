#!/usr/bin/env node
/**
 * PATCHED variant — closes the reserve-then-refund TOCTOU from
 * vulnerable.mjs. The fix (bible §6 / build-map #17): reservation becomes
 * IRREVOCABLE the moment the billable upstream call is dispatched. A refund
 * is only ever permitted for a PRE-FLIGHT failure that happens strictly
 * BEFORE the upstream call is dispatched — never based on the content of a
 * response to a call that already executed and was billed.
 *
 * Usage: node lab/repro-services/dow-mock/patched.mjs [port] [upstreamPort]
 */
import { createServer } from 'node:http';
import { makeQuotaStore } from './quota.mjs';

const PORT = Number(process.argv[2] || process.env.DOW_PATCHED_PORT || 4202);
const UPSTREAM_PORT = Number(process.argv[3] || process.env.MOCK_UPSTREAM_PORT || 4001);
const DAILY_BUDGET = Number(process.env.DOW_DAILY_BUDGET || 3);

const quota = makeQuotaStore(DAILY_BUDGET);

function preflightInvalid(target) {
  // Pre-flight validation that can legitimately reject BEFORE any billable
  // call is dispatched — e.g. empty/oversized target. This is the ONLY
  // path allowed to avoid consuming quota, because it happens before the
  // meter runs, not after.
  return !target || target.length > 200;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const callerId = req.headers['x-caller-id'] || 'anonymous';

  if (url.pathname === '/_meta/quota') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(quota.snapshot(callerId)));
  }

  if (url.pathname !== '/mcp/tool-call') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  const target = url.searchParams.get('target') || 'demo-target';
  const malformed = url.searchParams.get('malformed') === '1';

  // Pre-flight — before quota is touched, before anything is dispatched.
  if (preflightInvalid(target)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'preflight_invalid', quota_snapshot: quota.snapshot(callerId) }));
  }

  // Quota check
  if (quota.remaining(callerId) <= 0) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'quota_exceeded', snapshot: quota.snapshot(callerId) }));
  }

  // RESERVE — atomic and, from this point on, FINAL. No code path below
  // this line is permitted to call quota.refund().
  quota.reserve(callerId);

  let upstreamResult;
  try {
    const upstreamRes = await fetch(
      `http://localhost:${UPSTREAM_PORT}/v1/lookup?target=${encodeURIComponent(target)}&malformed=${malformed ? '1' : '0'}`,
      { headers: { 'X-Caller-Id': callerId } },
    );
    upstreamResult = await upstreamRes.json();
  } catch (e) {
    upstreamResult = { status: 'upstream_unreachable', error: String(e) };
  }

  // THE FIX: no refund path here, regardless of upstreamResult.status. The
  // reservation from before dispatch stands no matter what the response
  // content says — because the meter already ran.
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    variant: 'PATCHED',
    caller: callerId,
    upstream_billed: true,
    refunded_after_execution: false, // structurally impossible in this variant
    quota_snapshot: quota.snapshot(callerId),
    upstream_result: upstreamResult,
  }, null, 2));
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`dow-mock PATCHED listening on http://localhost:${PORT} (upstream: ${UPSTREAM_PORT}, dailyBudget: ${DAILY_BUDGET})`);
  });
}

export { server, quota };
