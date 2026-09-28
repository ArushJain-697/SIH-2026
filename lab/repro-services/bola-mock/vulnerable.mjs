#!/usr/bin/env node
/**
 * VULNERABLE variant — minimal reproduction of the GHSA-r649-4cqj-w93h
 * pattern: a "public query" that returns every record matching a filter
 * (enabled=true) with NO per-caller ownership check. This is a faithful
 * minimal model of the advisory's own description, not the live Convex
 * deployment. See lab/repro-services/bola-mock/README.md.
 *
 * Usage: node lab/repro-services/bola-mock/vulnerable.mjs [port]
 */
import { createServer } from 'node:http';
import { ALERT_RULES } from './seed.mjs';

const PORT = Number(process.argv[2] || process.env.BOLA_VULN_PORT || 4101);

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const callerId = req.headers['x-user-id'] || 'anonymous';

  if (url.pathname !== '/alertRules') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  // THE BUG: this is the real vulnerable pattern — a Convex-style "public
  // query" (bible/ground-truth: "public functions can be called by anyone")
  // that filters ONLY on the query parameter (enabled), never on caller
  // identity/ownership. Every authenticated caller — regardless of who they
  // are — gets every user's rows back. This is what GHSA-r649's title
  // describes: "unauthenticated cross-tenant read ... via public Convex
  // query getByEnabled".
  const enabled = url.searchParams.get('enabled');
  const results = ALERT_RULES.filter((r) => enabled === null || String(r.enabled) === enabled);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    caller: callerId,
    variant: 'VULNERABLE',
    note: 'no ownership filter applied — every matching row across every user is returned',
    count: results.length,
    rows: results,
  }, null, 2));
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`bola-mock VULNERABLE listening on http://localhost:${PORT}`);
  });
}

export { server };
