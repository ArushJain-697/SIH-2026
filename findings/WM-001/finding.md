# [WM-001] Public query pattern without ownership filter allows cross-tenant read (BOLA)

- **Status:** `REPRODUCED-KNOWN` - validates [`GHSA-r649-4cqj-w93h`](https://github.com/koala73/worldmonitor/security/advisories/GHSA-r649-4cqj-w93h) ("Unauthenticated cross-tenant read of all users' alert rules via public Convex query `getByEnabled`", High)
- **Severity:** CVSS 3.1 **6.5** (Medium) - `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` *(computed by [`framework/schema/cvss31.mjs`](../../framework/schema/cvss31.mjs), not hand-asserted - see `tests/cvss31.test.mjs`)*
  CVSS 4.0 vector: `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N/AU:Y/V:C` - qualitatively High; exact numeric score not computed here (no CVSS 4.0 calculator was implemented in this session - recompute in the official FIRST calculator before it appears on a slide).
- **CWE:** CWE-284, CWE-639 · **WSTG:** WSTG-ATHZ-02 · **OWASP:** API1:2023
- **Component:** minimal reproduction harness (`lab/repro-services/bola-mock/`) · **Trust boundary:** 5 (Convex data/auth layer)
- **Lab commit pinned:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0` (target repo, 2026-09-28)

## ⚠️ Framing - read this before anything else

**This is a reproduction, not a discovery.** `GHSA-r649-4cqj-w93h` is a real, already-published advisory on the target repository. We built a minimal, faithful model of the documented pattern - a "public query" with no per-caller ownership filter - and demonstrated it, to validate our Advisory-Aware Regression Harness and to have a concrete, demoable artifact for the "public functions need access control" class. We did **not** run this against the live WorldMonitor/Convex deployment (we hold no credentials for it and did not attempt to obtain any - see [`docs/ROE.md`](../../docs/ROE.md)).

## Description

The vulnerable variant's `GET /alertRules?enabled=true` filters results **only** on the query parameter, never on caller identity - matching Convex's own documented pitfall (see [`docs/ground-truth.md`](../../docs/ground-truth.md)): *"public functions can be called by anyone, including potentially malicious users."* Any caller who can reach the endpoint receives every seeded user's rows.

## Preconditions

Two synthetic seeded accounts ([`lab/repro-services/bola-mock/seed.mjs`](../../lab/repro-services/bola-mock/seed.mjs)): `user-free-001` (free tier, the attacker/caller) and `user-pro-002` (Pro tier, the victim), each owning distinct alert rules.

## Steps to reproduce (local)

```bash
bash findings/WM-001/reproduce.sh
```

Standalone:
```bash
node lab/repro-services/bola-mock/vulnerable.mjs 4101 &
curl -s -H "X-User-Id: user-free-001" "http://localhost:4101/alertRules?enabled=true"
```

## Proof of concept

Captured evidence: [`evidence/vulnerable-response.json`](./evidence/vulnerable-response.json), [`evidence/patched-response.json`](./evidence/patched-response.json), [`evidence/patched-unauthenticated.txt`](./evidence/patched-unauthenticated.txt).

Attacker `user-free-001` requests `enabled=true` and receives **3 rows**, including `rule-003` and `rule-004` - both owned by `user-pro-002`, a different, Pro-tier account the attacker has no relationship to. The patched variant, given the same request plus valid session credentials, returns exactly **1 row** - only the caller's own.

## Business impact

The real advisory's own title says this exposed "all users' alert rules." For WorldMonitor, alert-rule content can include Pro-tier watch criteria - private keyword lists, entity monitors, executive-itinerary triggers - content that is itself sensitive analyst tradecraft, not just metadata. A cross-tenant leak of *what a Pro subscriber is watching for* undermines the confidentiality guarantee that justifies the Pro tier's price, with direct reputational and revenue consequences.

## Remediation

Filter every public-function result by the caller's authenticated identity (an auth-context equivalent, never a client-supplied field), as shown in [`lab/repro-services/bola-mock/patched.mjs`](../../lab/repro-services/bola-mock/patched.mjs) and prescribed by Convex's own best-practices documentation.

## References

- GHSA-r649-4cqj-w93h (target's own published advisory)
- Convex docs: [Authorization Best Practices](https://stack.convex.dev/authorization), [Best Practices - access control for public functions](https://docs.convex.dev/understanding/best-practices/)
- OWASP API1:2023 - Broken Object Level Authorization
