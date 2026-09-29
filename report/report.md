# WorldMonitor Security Assessment — Report
### SIH 26163 · NTRO · "No Finding Without Proof"

**Generated:** 2026-09-29T06:32:40.991Z (auto-assembled by `framework/generate-report.mjs` from `register/advisories.json` + `findings/*/finding.json` — do not hand-edit this file, edit the sources and regenerate)

---

## 1. Executive summary

This is a time-boxed, authorized security assessment of `github.com/koala73/worldmonitor` (the "World Monitor" real-time intelligence dashboard). All active proof-of-concept work ran against either (a) the real application, built from source and running on `localhost:3000` — a genuine controlled environment, not a mock — or (b) minimal, faithful reproduction harnesses for the two advisory classes that needed a dynamic demonstration the real instance's default config couldn't safely provide. **Nothing ever touched the live `worldmonitor.app` deployment or any real user data**, enforced in code (`engine/probe/safe-http.mjs` refuses any host that is not `localhost`/`127.0.0.1`/`::1` — see `docs/ROE.md`).

**Posture verdict:** WorldMonitor is a hardened, actively-maintained codebase (87.5k★, 7,881+ commits, 30 custom CI security invariants). It has already published 11 security advisories through its own responsible-disclosure process, plus 1 draft advisory — a strong signal of a maintainer who finds and fixes real issues before a third party has to. This assessment's contribution is not "finding bugs a hardened app missed" but demonstrating a **reusable, advisory-aware methodology**: independently re-deriving the target's own CI guardrails from its live source, reproducing documented vulnerability classes in safe local harnesses to validate that methodology, and reporting the honest mix of what we found.

**Findings by status:**

| Status | Count |
| --- | --- |
| REPRODUCED-KNOWN (validates a published advisory) | 2 |
| CONFIRMED-NOVEL (new, confirmed) | 0 |
| CANDIDATE-UNCONFIRMED (framework-surfaced, not independently confirmed) | 1 |
| VERIFIED-SECURE (control tested, held) | 10 |

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

### [WM-012] Software composition analysis — real npm-audit + lockfile-ancestry tracing finds 4 advisories reachable only through the bundled auth SDK's dependency tree, not confirmed on an executed code path

- **Status:** `CANDIDATE-UNCONFIRMED`
- **Severity (CVSS 3.1):** High (7.5) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
- **Severity (CVSS 4.0):** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N`
- **CWE:** CWE-835, CWE-1104 · **WSTG:** WSTG-CONF-09 · **OWASP:** API9:2023
- **Component:** package-lock.json (1795 resolved dependencies, real target lockfile) — the real @clerk/clerk-js -> @solana/wallet-adapter-* -> image-size/stream-json/uuid transitive chain · **Trust boundary:** 4
- **Lab commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

**Description.** `npm audit --json` against the real, live-cloned lockfile (works without a full `npm install`) found 8 unique root advisories across 28 flagged packages (0 critical, 10 high, 18 moderate). Rather than stop at npm audit's flat severity labels, this finding traces each advisory's real ancestry through the lockfile's own dependency graph and greps the actual, real, non-test/non-generated source (`api/`, `server/`, `src/`) for whether the nearest real top-level dependency is genuinely imported by live request-handling code. 4 advisories (`image-size` x2 HIGH DoS via JXL/HEIF/ICNS parsers, `stream-json` MODERATE DoS, `uuid` MODERATE buffer-bounds) trace back to `@clerk/clerk-js` — the app's actual, confirmed-live auth SDK (see findings/WM-008) — via its Solana wallet-adapter dependency tree. This PROVES the top-level package (`@clerk/clerk-js`) is genuinely imported by live code; it does NOT prove the specific vulnerable function inside `image-size`/`stream-json`/`uuid` is ever actually executed by this application's runtime — that would require deeper call-graph analysis this pass did not attempt. 2 more advisories (`ip-address` x2, both genuinely about SSRF/trust-boundary classification bugs) trace through `telegram` -> `socks` -> `ip-address`, and `telegram` is confirmed imported ONLY by `scripts/telegram/session-auth.mjs` (an operational script, not the live request path) — narrower risk, reported separately. The remaining 2 (`@vitest/mocker`/`vitest`, `undici`) are dev-tooling / ambiguous-usage, not confirmed live either.

**Business impact.** Unconfirmed pending deeper triage — reported honestly as CANDIDATE-UNCONFIRMED rather than inflated to a confirmed finding or dismissed. IF the image-size/stream-json/uuid vulnerable code paths are genuinely reachable (e.g. if Clerk's wallet-adapter integration ever parses a user-controlled image or JSON blob through these libraries), the practical impact is denial-of-service (event-loop-blocking infinite loops / O(depth²) parsing) on whatever request path triggers it — moderate business impact, not data exposure. The two ip-address SSRF-classification advisories are lower urgency: confirmed reachable only through an internal ops script (Telegram session setup), not exposed to any untrusted external request.

**Remediation.** Standard dependency remediation: `npm audit fix` resolves most of these via existing patched versions (image-size, stream-json, uuid all have `fixAvailable` per npm audit's own output — the fix path routes through updating @clerk/clerk-js or exceljs to versions that pull patched transitive deps). A concrete, real, verified example is provided: findings/WM-012/remediation.patch bumps the direct `undici` dependency from the pinned 7.29.0 to the patched 7.30.0 (closes GHSA-3wwx-pv8p-q78v, the WebSocket permessage-deflate DoS) — this patch was generated against and verified to apply cleanly with `git apply --check` against the real pinned source, not hand-typed. Before treating the image-size/stream-json/uuid class as urgent, a maintainer with access to Clerk's actual bundled wallet-adapter code should confirm whether their vulnerable functions are ever called at runtime, or are dead code pulled in only for TypeScript types/unused code paths bundlers tree-shake away — that confirmation is exactly what turns this CANDIDATE-UNCONFIRMED into either a real finding or a verified-secure dead-code dismissal.

**Full write-up + evidence:** [`findings/WM-012/finding.md`](../findings/WM-012/finding.md)

### [WM-002] Reserve-then-refund quota logic allows unlimited billable calls after a single reservation (Denial-of-Wallet)

- **Status:** `REPRODUCED-KNOWN` — validates [`GHSA-hcq5-jm84-2395`](https://github.com/koala73/worldmonitor/security/advisories/GHSA-hcq5-jm84-2395)
- **Severity (CVSS 3.1):** High (7.2) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:L`
- **Severity (CVSS 4.0):** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:L/VA:N/SC:N/SI:H/SA:H`
- **CWE:** CWE-770, CWE-362 · **WSTG:** WSTG-BUSL-02 · **OWASP:** API4:2023
- **Component:** lab/repro-services/dow-mock (minimal reproduction of an MCP tool-call quota gate) · **Trust boundary:** 6
- **Lab commit:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

**Description.** A quota gate reserves one slot BEFORE dispatching a billable upstream call, then refunds that slot AFTER the call returns IF the response is classified as 'malformed' — i.e. the refund decision is made strictly after the metered call already executed and was billed. Any caller who can reliably trigger the 'malformed' classification gets their own quota counter back to zero net cost, while the upstream (owner-paid) side is billed on every single attempt. This is a faithful minimal reproduction of GHSA-hcq5-jm84-2395 ('MCP daily cost-cap bypass: quota slot refunded after the tool already executed'), driven against a real (local) mock-upstream over real HTTP so the billing event is independently observable and not merely asserted.

**Business impact.** This is the app's signature risk class: the server exists to proxy ~40+ paid third-party APIs, and the target's own .env.example defines explicit spend-budget knobs (e.g. AVIATIONSTACK_MONTHLY_BUDGET) precisely because the owner already fears exactly this. Our reproduction drove 10 attack calls against the vulnerable variant for a NET COST TO THE ATTACKER OF ZERO quota, while the (mock) upstream recorded 10 real billable calls — i.e. more than 3x the intended daily budget with no attacker-side signal that anything was wrong. Against a real metered vendor this is a direct, unbounded, and — critically — INVISIBLE-TO-THE-VICTIM'S-OWN-QUOTA-DASHBOARD financial drain.

**Remediation.** Make the reservation irrevocable the instant the billable call is dispatched — no code path after dispatch may increment the quota back up, regardless of the response content. A refund may only be issued for a pre-flight validation failure that happens BEFORE the upstream call is dispatched (i.e. before any money is spent). Demonstrated in lab/repro-services/dow-mock/patched.mjs, which caps billable upstream calls at exactly the daily budget regardless of attack volume against the identical attack. remediation.patch expresses this as a real diff (not prose) between our own vulnerable and patched variants — note this is NOT a patch against the real target's source (which is already fixed, per the published advisory; we hold no vulnerable copy of their real code to patch), it is the concrete code-level fix pattern, generated with git diff --no-index between two files we wrote and both actually run.

**Full write-up + evidence:** [`findings/WM-002/finding.md`](../findings/WM-002/finding.md)

### [WM-001] Public query pattern without ownership filter allows cross-tenant read (BOLA)

- **Status:** `REPRODUCED-KNOWN` — validates [`GHSA-r649-4cqj-w93h`](https://github.com/koala73/worldmonitor/security/advisories/GHSA-r649-4cqj-w93h)
- **Severity (CVSS 3.1):** Medium (6.5) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`
- **Severity (CVSS 4.0):** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N/AU:Y/V:C`
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

### [WM-005] Type-safety-silencing casts (as any / as unknown) near security-sensitive code manually reviewed — none found unsafe

- **Control tested:** Complete (not sampled) scan of every `as any` / `as unknown` occurrence in the real, live-cloned source for proximity (within 5 lines) to a curated list of security-sensitive markers (auth header reads, rate-limit calls, CORS headers, localStorage access, HTML sinks, premium-fetch/entitlement checks, JSON.parse of untrusted input). Every candidate surfaced was individually read in full context.
- **Component:** Full real target source: src/, api/, server/, convex/ (1724 non-test .ts/.tsx files)
- **Full write-up + evidence:** [`findings/WM-005/finding.md`](../findings/WM-005/finding.md)

### [WM-006] Production security header posture (CSP/HSTS/XFO/etc.) evaluated dynamically + statically — hardened, one minor non-exploitable CSP gap

- **Control tested:** Dynamic: real HTTP response headers captured from the actual running app via the sanctioned safe-http probe. Static: the real, live-cloned vercel.json's declared production header policy, parsed and evaluated with a real CSP-directive evaluator (not just presence/absence) covering unsafe-inline/unsafe-eval, object-src, base-uri, frame-ancestors, and nonce/hash/strict-dynamic usage.
- **Component:** Real running instance (localhost:3000, dynamic pass) + real vercel.json (static, production-declared pass)
- **Full write-up + evidence:** [`findings/WM-006/finding.md`](../findings/WM-006/finding.md)

### [WM-007] Client-side storage content audited on the real running instance — SECURITY.md's 'no sensitive localStorage data' claim empirically confirmed

- **Control tested:** Full content dump (not just key-name inspection) of all 27 real localStorage keys plus sessionStorage and cookies from the actual running app, each VALUE pattern-scanned for JWT shape, the target's own 'wm_<hex>' API-key format (seen in api/a2a.ts's own documentation), Bearer tokens, and generic secret/password/token assignment patterns.
- **Component:** Real running instance (localhost:3000), browser localStorage/sessionStorage/cookies
- **Full write-up + evidence:** [`findings/WM-007/finding.md`](../findings/WM-007/finding.md)

### [WM-008] Authentication & session management — JWT alg pinning, OAuth state atomicity, and session cookie attributes independently verified

- **Control tested:** Three independent, targeted static checks, each against a documented real attack class: (1) every jose jwtVerify() call site pins an explicit, non-empty algorithms array excluding 'none' (closes the classic alg-confusion/none-algorithm JWT bypass, CWE-347); (2) OAuth callback state consumption uses an atomic Redis GETDEL rather than a check-then-delete pair (closes exactly the TOCTOU class the target's own GHSA-9m4c-824h-m4xw was); (3) every real session cookie-value construction found in source includes Secure + SameSite, and HttpOnly unless it is an explicit non-session clear-cookie.
- **Component:** server/auth-session.ts (jose jwtVerify), api/discord+slack/oauth/callback.ts (state consumption), api/wm-session.js (session cookie issuance) — real target source
- **Full write-up + evidence:** [`findings/WM-008/finding.md`](../findings/WM-008/finding.md)

### [WM-009] Premium-fetch authorization wrapper — real AST-based re-derivation (v1's explicitly deferred check) — all 9 real client call sites correctly gated

- **Control tested:** Real AST parsing (not regex) of every non-generated source file to find every `new <X>ServiceClient(...)` construction, trace every method call made on that bound instance within the same file, cross-reference each called method against the real premium-path registry (via the same generated-client method->path extraction the target's own enforcement script uses), and verify the constructing options object's `fetch:` property is the literal `premiumFetch` identifier or the one documented delegating adapter (`proFreshRpcFetch`) whenever a premium method is actually called.
- **Component:** src/ (791 real, non-generated .ts/.tsx files) vs. src/generated/client/*/service_client.ts + src/shared/premium-paths.ts — real target source, parsed with the actual TypeScript Compiler API
- **Full write-up + evidence:** [`findings/WM-009/finding.md`](../findings/WM-009/finding.md)

### [WM-010] Generated API runtime validation (GHSA-cmj5 class) — central wiring confirmed, and both documented exceptions have real enforced compensating controls

- **Control tested:** (1) Confirms the central gateway (server/gateway.ts) actually wires a real validateRequest implementation into the generated Sebuf servers — the exact thing GHSA-cmj5-cfhr-w964 ('Generated API runtime validation is disabled') was about. (2) Enumerates every handler that explicitly documents itself as an exception to that gateway-level validation, and verifies each one's claimed compensating bound (a MAX_*_LEN constant) is not just declared but actually passed into a real validation call in the same file.
- **Component:** server/gateway.ts + server/worldmonitor/intelligence/v1/{search-intel-history,get-similar-events}.ts — real target source
- **Full write-up + evidence:** [`findings/WM-010/finding.md`](../findings/WM-010/finding.md)

### [WM-011] Idempotency-key handling — body-hash mismatch rejection, concurrent-conflict detection, and fail-closed scope validation all confirmed

- **Control tested:** Three checks against the real idempotency-key implementation, complementing WM-002/WM-003 (rate-limiting/DoW) with the other half of this PS scope area the PS itself names: (1) reusing an Idempotency-Key with a different request body is rejected with 422, not silently replayed; (2) a second request arriving while the first with the same key is still processing gets a 409 with Retry-After, not a race; (3) a missing/empty idempotency scope hard-fails with 500 rather than silently disabling duplicate-write protection.
- **Component:** api/_idempotency.js (283 lines, real target source)
- **Full write-up + evidence:** [`findings/WM-011/finding.md`](../findings/WM-011/finding.md)

### [WM-013] Client-bundle secret exposure (VITE_-prefixed env vars) — independently re-derived with a deliberately broader pattern, 0 real hits

- **Control tested:** Independent re-derivation of the class scripts/check-vite-env-secrets.mjs guards against (any VITE_-prefixed name — which Vite inlines into the client bundle for every browser to see — that looks secret-shaped), using both the target's own narrow, prefixed-form pattern AND a deliberately broader bare-word pattern for an independent second opinion, across every git-tracked .env* file and every real import.meta.env.VITE_* reference in src/.
- **Component:** .env.example + every real import.meta.env.VITE_* usage in src/ (real target source)
- **Full write-up + evidence:** [`findings/WM-013/finding.md`](../findings/WM-013/finding.md)


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
- **CVSS 4.0 engine:** [`engine/core/cvss40.mjs`](../engine/core/cvss40.mjs) — a faithful port of the official FIRST reference algorithm, cross-validated against the unmodified official implementation across 2000 randomly-generated vectors (0 mismatches) before use. See `tests/cvss40.test.mjs`.
- **EPSS engine:** [`engine/core/epss.mjs`](../engine/core/epss.mjs) — live queries to the public FIRST EPSS API, cached, with an honest `not_applicable`/`unavailable` fallback rather than a fabricated number when a finding has no CVE or the API is unreachable.
- **The safe HTTP probe:** [`engine/probe/safe-http.mjs`](../engine/probe/safe-http.mjs) — the sole sanctioned path for any dynamic request in this project; refuses any non-localhost host at the code level (`tests/safe_http.test.mjs`), rate-limits itself, and captures every request/response as evidence.
- **Real controlled-environment testing:** findings WM-006 and WM-007 were produced against the actual WorldMonitor application, built from source and run locally on `localhost:3000` (see `lab/README.md`) — not a mock or a reproduction, the real app, satisfying the PS's "controlled environment" requirement directly.
- **Local dev environment limitation, stated honestly:** the local instance runs with no Redis/Upstash backing store (the app's own default, zero-env-var mode). This means `RateLimit-*` response headers and live rate-limit-counting behavior cannot be dynamically observed against the local instance — some endpoints correctly return `503` (fail-closed on missing seed data) while others return `200` with an explicit `"source":"none"` marker (honest graceful degradation), but neither behavior lets us dynamically confirm request-counting throttle mechanics locally. WM-003's independent static re-derivation of the rate-limit coverage guardrail remains the authoritative check for policy *coverage*; dynamically confirming throttle *behavior* would need a Redis-backed local environment, which is future work, not a finding.
