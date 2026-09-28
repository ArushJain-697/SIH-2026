#!/usr/bin/env node
/**
 * PATCHED variant — the fix Convex's own documentation prescribes (see
 * docs/ground-truth.md): "use ctx.auth, which cannot be spoofed" and "use
 * access control for all public functions". Same route shape as
 * vulnerable.mjs; the only difference is the ownership filter.
 *
 * Usage: node lab/repro-services/bola-mock/patched.mjs [port]
 */
import { createServer } from 'node:http';
import { ALERT_RULES, isValidSession } from './seed.mjs';

const PORT = Number(process.argv[2] || process.env.BOLA_PATCHED_PORT || 4102);

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const callerId = req.headers['x-user-id'];
  const sessionToken = req.headers['x-session-token'];

  if (url.pathname !== '/alertRules') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  if (!isValidSession(callerId, sessionToken)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'unauthorized', note: 'valid X-User-Id + X-Session-Token required' }));
  }

  // THE FIX: filter is ownership-scoped from ctx.auth-equivalent identity,
  // never trusted from an unauthenticated query parameter alone.
  const enabled = url.searchParams.get('enabled');
  const results = ALERT_RULES.filter(
    (r) => r.ownerId === callerId && (enabled === null || String(r.enabled) === enabled),
  );

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    caller: callerId,
    variant: 'PATCHED',
    note: 'ownership filter applied — only the authenticated caller\'s own rows are returned',
    count: results.length,
    rows: results,
  }, null, 2));
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`bola-mock PATCHED listening on http://localhost:${PORT}`);
  });
}

export { server };
