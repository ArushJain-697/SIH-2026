#!/usr/bin/env node
/**
 * VULNERABLE variant — minimal reproduction of GHSA-hcq5-jm84-2395:
 * "MCP daily cost-cap bypass: quota slot refunded after the tool already
 * executed." This is NOT the live WorldMonitor MCP deployment (no
 * credentials, no real infra) — it is a faithful minimal model of the
 * documented reserve-then-refund TOCTOU, driven against a REAL (local)
 * mock-upstream process over real HTTP so the "billable call already
 * happened" moment is independently observable in mock-upstream's own call
 * log, not just asserted by this process.
 *
 * The bug: quota is reserved BEFORE the upstream call, then refunded
 * AFTER the upstream call if the response is classified "malformed" —
 * i.e. the refund decision happens strictly after the expensive call
 * already executed and was billed. An attacker who can always trigger the
 * "malformed" classification gets unlimited billable upstream calls while
 * their own quota counter net-net never moves.
 *
 * Usage: node lab/repro-services/dow-mock/vulnerable.mjs [port] [upstreamPort]
 */
import { createServer } from 'node:http';
import { makeQuotaStore } from './quota.mjs';

const PORT = Number(process.argv[2] || process.env.DOW_VULN_PORT || 4201);
const UPSTREAM_PORT = Number(process.argv[3] || process.env.MOCK_UPSTREAM_PORT || 4001);
const DAILY_BUDGET = Number(process.env.DOW_DAILY_BUDGET || 3);

const quota = makeQuotaStore(DAILY_BUDGET);

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

  // 1. Quota check
  if (quota.remaining(callerId) <= 0) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'quota_exceeded', snapshot: quota.snapshot(callerId) }));
  }

  // 2. RESERVE — before the expensive call (this part is correct)
  quota.reserve(callerId);

  // 3. Dispatch the billable upstream call — this is the moment the tool
  //    "already executed" (GHSA-hcq5's own phrase). mock-upstream records
  //    this independently as billable:true regardless of what happens next.
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

  // 4. THE BUG — refund fires from the response content, AFTER the billable
  //    call already executed. Any caller who can force "content-malformed"
  //    gets a free reservation back every time, net cost to their own
  //    quota = 0, while mock-upstream's call log shows a real billable hit
  //    for every single attempt.
  let refunded = false;
  if (upstreamResult.status === 'content-malformed') {
    quota.refund(callerId);
    refunded = true;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    variant: 'VULNERABLE',
    caller: callerId,
    upstream_billed: true, // mock-upstream always bills on dispatch — see its call log
    refunded_after_execution: refunded,
    quota_snapshot: quota.snapshot(callerId),
    upstream_result: upstreamResult,
  }, null, 2));
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`dow-mock VULNERABLE listening on http://localhost:${PORT} (upstream: ${UPSTREAM_PORT}, dailyBudget: ${DAILY_BUDGET})`);
  });
}

export { server, quota };
