# WorldMonitor Security Assessment — Report
### SIH 26163 · NTRO · "No Finding Without Proof"

**Generated:** 2026-09-28T18:58:53.547Z (auto-assembled by `framework/generate-report.mjs` from `register/advisories.json` + `findings/*/finding.json` — do not hand-edit this file, edit the sources and regenerate)

---

## 1. Executive summary

This is a time-boxed, authorized security assessment of `github.com/koala73/worldmonitor` (the "World Monitor" real-time intelligence dashboard). All active proof-of-concept work ran against local, minimal, faithful reproduction harnesses we built and controlled — **never against the live `worldmonitor.app` deployment or any real user data** — per `docs/ROE.md`.

**Posture verdict:** WorldMonitor is a hardened, actively-maintained codebase (87.5k★, 7,881+ commits, 30 custom CI security invariants). It has already published 11 security advisories through its own responsible-disclosure process, plus 1 draft advisory — a strong signal of a maintainer who finds and fixes real issues before a third party has to. This assessment's contribution is not "finding bugs a hardened app missed" but demonstrating a **reusable, advisory-aware methodology**: independently re-deriving the target's own CI guardrails from its live source, reproducing documented vulnerability classes in safe local harnesses to validate that methodology, and reporting the honest mix of what we found.

**Findings by status:**

| Status | Count |
| --- | --- |
| REPRODUCED-KNOWN (validates a published advisory) | 2 |
| CONFIRMED-NOVEL (new, confirmed) | 0 |
| CANDIDATE-UNCONFIRMED (framework-surfaced, not independently confirmed) | 0 |
| VERIFIED-SECURE (control tested, held) | 2 |

**Top risks, in business terms:**

1. **Denial-of-Wallet** (validated by WM-002 / `GHSA-hcq5-jm84-2395`) — the app's signature risk class, being a keyed proxy in front of ~40+ paid third-party APIs. A reserve-then-refund quota bug can drain real vendor budget while appearing invisible on the attacker's own quota display.
2. **Cross-tenant data exposure** (validated by WM-001 / `GHSA-r649-4cqj-w93h`) — a public-function pattern without an ownership filter can leak Pro-tier subscribers' private watch criteria to any caller.
3. **Systemic guardrail integrity** — independently re-verified (WM-003, WM-004) rather than assumed; both held, which is itself evidence the target's CI investment is producing real security value.

---

## 2. Scope & authorization

See `docs/ROE.md` in full. Summary: active testing on `localhost` reproduction harnesses only; passive, unauthenticated header observation only on the live site; no real metered upstream ever called; benign markers only; any genuinely novel finding disclosed privately via the target's `SECURITY.md` before any public mention.

---

## 3. Coverage matrix

See [`docs/coverage-matrix.md`](../docs/coverage-matrix.md) for the full 7-scope-area × verdict table (build-map ticket #8).

---

## 4. Findings

### [WM-002] Reserve-then-refund quota logic allows unlimited billable calls after a single reservation (Denial-of-Wallet)

- **Status:** `REPRODUCED-KNOWN` — validates [`GHSA-hcq5-jm84-2395`](https://github.com/koala73/worldmonitor/security/advisories/GHSA-hcq5-jm84-2395)
- **Severity:** High (7.2) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:L`
- **CWE:** CWE-770, CWE-362 · **WSTG:** WSTG-BUSL-02 · **OWASP:** API4:2023
- **Component:** lab/repro-services/dow-mock (minimal reproduction of an MCP tool-call quota gate) · **Trust boundary:** 6
- **Lab commit:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

**Description.** A quota gate reserves one slot BEFORE dispatching a billable upstream call, then refunds that slot AFTER the call returns IF the response is classified as 'malformed' — i.e. the refund decision is made strictly after the metered call already executed and was billed. Any caller who can reliably trigger the 'malformed' classification gets their own quota counter back to zero net cost, while the upstream (owner-paid) side is billed on every single attempt. This is a faithful minimal reproduction of GHSA-hcq5-jm84-2395 ('MCP daily cost-cap bypass: quota slot refunded after the tool already executed'), driven against a real (local) mock-upstream over real HTTP so the billing event is independently observable and not merely asserted.

**Business impact.** This is the app's signature risk class: the server exists to proxy ~40+ paid third-party APIs, and the target's own .env.example defines explicit spend-budget knobs (e.g. AVIATIONSTACK_MONTHLY_BUDGET) precisely because the owner already fears exactly this. Our reproduction drove 10 attack calls against the vulnerable variant for a NET COST TO THE ATTACKER OF ZERO quota, while the (mock) upstream recorded 10 real billable calls — i.e. more than 3x the intended daily budget with no attacker-side signal that anything was wrong. Against a real metered vendor this is a direct, unbounded, and — critically — INVISIBLE-TO-THE-VICTIM'S-OWN-QUOTA-DASHBOARD financial drain.

**Remediation.** Make the reservation irrevocable the instant the billable call is dispatched — no code path after dispatch may increment the quota back up, regardless of the response content. A refund may only be issued for a pre-flight validation failure that happens BEFORE the upstream call is dispatched (i.e. before any money is spent). Demonstrated in lab/repro-services/dow-mock/patched.mjs, which caps billable upstream calls at exactly the daily budget regardless of attack volume against the identical attack.

**Full write-up + evidence:** [`findings/WM-002/finding.md`](../findings/WM-002/finding.md)

### [WM-001] Public query pattern without ownership filter allows cross-tenant read (BOLA)

- **Status:** `REPRODUCED-KNOWN` — validates [`GHSA-r649-4cqj-w93h`](https://github.com/koala73/worldmonitor/security/advisories/GHSA-r649-4cqj-w93h)
- **Severity:** Medium (6.5) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`
- **CWE:** CWE-284, CWE-639 · **WSTG:** WSTG-ATHZ-02 · **OWASP:** API1:2023
- **Component:** lab/repro-services/bola-mock (minimal reproduction of a Convex-style public query) · **Trust boundary:** 5
- **Lab commit:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

**Description.** A 'public query' style endpoint (the pattern Convex's own documentation warns about: 'public functions can be called by anyone, including potentially malicious users') filters results only on a content parameter (enabled=true) and never on caller identity. Any authenticated (or even just any) caller receives every user's rows, not only their own. This is a faithful minimal reproduction of the class described in GHSA-r649-4cqj-w93h ('Unauthenticated cross-tenant read of all users' alert rules via public Convex query getByEnabled'), NOT the live WorldMonitor/Convex deployment — we hold no credentials for the real project and did not attempt to obtain any. See lab/repro-services/bola-mock/README.md for the exact modeling decision.

**Business impact.** In the real advisory's own words this exposed 'all users' alert rules' — for WorldMonitor specifically, alert-rule content can include Pro-tier watch criteria (private keyword lists, entity/itinerary monitors), so the class directly threatens the confidentiality of paying customers' operational focus, which is itself sensitive OSINT/analyst tradecraft. Loss of trust in a Pro-gated feature is a direct revenue and reputational risk.

**Remediation.** Filter every public query result by the caller's authenticated identity (ctx.auth-equivalent, never a client-supplied field) before returning rows — exactly the fix pattern demonstrated in lab/repro-services/bola-mock/patched.mjs and prescribed in Convex's own documentation (see docs/ground-truth.md). The real advisory's own fix (already shipped, per its published status) presumably follows this same pattern; we did not have access to the actual patch diff to confirm the exact implementation.

**Full write-up + evidence:** [`findings/WM-001/finding.md`](../findings/WM-001/finding.md)


---

## 5. Verified controls — "we report our misses"

A report that is all criticals on a hardened app is distrusted. These controls were actively, hostilely tested and held.

### [WM-003] Non-GET gateway route rate-limit/fail-closed coverage guardrail independently re-verified

- **Control tested:** Independent re-derivation (own parser, own extraction method, no dependency on the target's own scripts/enforce-rate-limit-policies.mjs) of the systemic guardrail: 'every generated non-GET (mutation/spend) gateway route must be either rate-limited (ENDPOINT_RATE_POLICIES) or explicitly, justification-carrying exempt (RATE_LIMIT_MUTATION_FALLBACK_EXEMPT)', plus a re-check that every FAIL_CLOSED_ENDPOINT_RATE_POLICY_REQUIRED route actually has a policy, plus an independent grep for failClosed:false escape-hatch call sites in server/ and api/ runtime code.
- **Component:** server/_shared/rate-limit.ts registries vs. all docs/api/*.openapi.json generated routes (real target source)
- **Full write-up + evidence:** [`findings/WM-003/finding.md`](../findings/WM-003/finding.md)

### [WM-004] CORS wildcard usages outside the shared allowlist helper independently audited — no credentialed combination found

- **Control tested:** Programmatic, complete (not hand-sampled) audit of every one of the 24 real files in the target's api/ and server/ directories that mention Access-Control-Allow-Origin, checking specifically for a literal wildcard ('*') or unvalidated-origin pattern co-occurring with Access-Control-Allow-Credentials:'true' or an actual read of an incoming Authorization/X-WorldMonitor-Key/X-Api-Key/X-Pro-Key header (not merely the word appearing in an Access-Control-Allow-Headers allow-list, which an initial broader heuristic pass falsely flagged in 5 files before being narrowed — see the false-positive note below).
- **Component:** api/_cors.js shared helper vs. 24 real files that reference Access-Control-Allow-Origin (real target source)
- **Full write-up + evidence:** [`findings/WM-004/finding.md`](../findings/WM-004/finding.md)


---

## 6. Remediation roadmap

| Finding | Priority | Fix |
| --- | --- | --- |
| WM-001 | Medium (6.5) | Filter every public query result by the caller's authenticated identity (ctx. |
| WM-002 | High (7.2) | Make the reservation irrevocable the instant the billable call is dispatched — no code path after dispatch may increment the quota back up, regardless of the response content. |

---

## 7. Appendices

- **Prior-art register:** [`register/advisories.json`](../register/advisories.json) — 11 published + 1 draft advisories, verified 2026-09-28.
- **Proof spine (platform ↔ authority ↔ advisory):** [`docs/proof-spine.md`](../docs/proof-spine.md) (regenerable: `node framework/generate-proof-spine.mjs`).
- **Landmine register (fabrication guardrail):** [`docs/LANDMINES.md`](../docs/LANDMINES.md).
- **Framework tooling:** [`framework/seam-linter/`](../framework/seam-linter/) (invariant map, rate-limit re-derivation, CORS scan), [`framework/regression-harness/`](../framework/regression-harness/) (advisory-aware CI gate).
- **Not independently re-derived (future work):** `scripts/enforce-premium-fetch.mjs`'s AST-based premium-fetch-wrapper check was read and catalogued (see `framework/seam-linter/output/invariant-coverage-map.md`) but not independently re-implemented in this session — it requires a full TypeScript AST parser, which was out of scope for the time available. Flagged honestly rather than approximated with a misleading regex.
