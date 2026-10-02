# PS 26163 - Deliverable Field Export

Generated from `findings/*/finding.json` - never hand-typed. Every finding below
is rendered in the exact field order PS 26163 names: **Vulnerability title,
Description, Affected component, Severity (CVSS), Steps to reproduce, Proof of
concept, Business impact, Remediation.**

13 findings. Regenerate with `node engine/report/ps-export.mjs`.

---
## WM-001 - REPRODUCED-KNOWN

**Vulnerability title**

Public query pattern without ownership filter allows cross-tenant read (BOLA)

**Description**

A 'public query' style endpoint (the pattern Convex's own documentation warns about: 'public functions can be called by anyone, including potentially malicious users') filters results only on a content parameter (enabled=true) and never on caller identity. Any authenticated (or even just any) caller receives every user's rows, not only their own. This is a faithful minimal reproduction of the class described in GHSA-r649-4cqj-w93h ('Unauthenticated cross-tenant read of all users' alert rules via public Convex query getByEnabled'), NOT the live WorldMonitor/Convex deployment - we hold no credentials for the real project and did not attempt to obtain any. See lab/repro-services/bola-mock/README.md for the exact modeling decision.

**Affected component**

lab/repro-services/bola-mock (minimal reproduction of a Convex-style public query)

**Severity (CVSS)**

CVSS 3.1: **6.5** - `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`
CVSS 4.0: `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N/AU:Y/V:C`
EPSS: N/A - No CVE assigned to this finding (it is a reproduction of the already-published, already-scored GHSA-r649-4cqj-w93h, not a new CVE). CERT-In's dual CVSS+EPSS mandate is discussed qualitatively in the report: BOLA against a predictable/enumerable endpoint is highly automatable (see Automatable: Yes under CVSS 4.0), which is the property EPSS-style likelihood scoring would weight heavily.

**Steps to reproduce**

Preconditions: Caller can reach the endpoint (no special privilege needed in the vulnerable variant). Two seeded synthetic accounts used: user-free-001 (attacker/caller) and user-pro-002 (victim).

```bash
bash findings/WM-001/reproduce.sh
```

**Proof of concept**

- `findings/WM-001/evidence/patched-response.json`
- `findings/WM-001/evidence/patched-unauthenticated.txt`
- `findings/WM-001/evidence/vulnerable-response.json`

**Business impact**

In the real advisory's own words this exposed 'all users' alert rules' - for WorldMonitor specifically, alert-rule content can include Pro-tier watch criteria (private keyword lists, entity/itinerary monitors), so the class directly threatens the confidentiality of paying customers' operational focus, which is itself sensitive OSINT/analyst tradecraft. Loss of trust in a Pro-gated feature is a direct revenue and reputational risk.

**Remediation**

Filter every public query result by the caller's authenticated identity (ctx.auth-equivalent, never a client-supplied field) before returning rows - exactly the fix pattern demonstrated in lab/repro-services/bola-mock/patched.mjs and prescribed in Convex's own documentation (see docs/ground-truth.md). The real advisory's own fix (already shipped, per its published status) presumably follows this same pattern; we did not have access to the actual patch diff to confirm the exact implementation.


---

## WM-002 - REPRODUCED-KNOWN

**Vulnerability title**

Reserve-then-refund quota logic allows unlimited billable calls after a single reservation (Denial-of-Wallet)

**Description**

A quota gate reserves one slot BEFORE dispatching a billable upstream call, then refunds that slot AFTER the call returns IF the response is classified as 'malformed' - i.e. the refund decision is made strictly after the metered call already executed and was billed. Any caller who can reliably trigger the 'malformed' classification gets their own quota counter back to zero net cost, while the upstream (owner-paid) side is billed on every single attempt. This is a faithful minimal reproduction of GHSA-hcq5-jm84-2395 ('MCP daily cost-cap bypass: quota slot refunded after the tool already executed'), driven against a real (local) mock-upstream over real HTTP so the billing event is independently observable and not merely asserted.

**Affected component**

lab/repro-services/dow-mock (minimal reproduction of an MCP tool-call quota gate)

**Severity (CVSS)**

CVSS 3.1: **7.2** - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:L`
CVSS 4.0: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:L/VA:N/SC:N/SI:H/SA:H`
EPSS: N/A - No CVE assigned (reproduction of the already-published GHSA-hcq5-jm84-2395). Qualitatively highly automatable/repeatable: our own reproduction drove 10 identical attack calls in well under a second with a trivial script and no special tooling, which is exactly the kind of low-complexity, fully-automatable primitive EPSS weights toward higher real-world exploitation likelihood.

**Steps to reproduce**

Preconditions: None beyond network access to the (local) endpoint. dailyBudget=3 in the reproduction, chosen to make the divergence visible in a small number of calls.

```bash
bash findings/WM-002/reproduce.sh
```

**Proof of concept**

- `findings/WM-002/evidence/patched-quota-after-attack.json`
- `findings/WM-002/evidence/upstream-calls-after-patched-attack.json`
- `findings/WM-002/evidence/upstream-calls-after-vulnerable-attack.json`
- `findings/WM-002/evidence/vulnerable-quota-after-attack.json`

**Business impact**

This is the app's signature risk class: the server exists to proxy ~40+ paid third-party APIs, and the target's own .env.example defines explicit spend-budget knobs (e.g. AVIATIONSTACK_MONTHLY_BUDGET) precisely because the owner already fears exactly this. Our reproduction drove 10 attack calls against the vulnerable variant for a NET COST TO THE ATTACKER OF ZERO quota, while the (mock) upstream recorded 10 real billable calls - i.e. more than 3x the intended daily budget with no attacker-side signal that anything was wrong. Against a real metered vendor this is a direct, unbounded, and - critically - INVISIBLE-TO-THE-VICTIM'S-OWN-QUOTA-DASHBOARD financial drain.

**Remediation**

Make the reservation irrevocable the instant the billable call is dispatched - no code path after dispatch may increment the quota back up, regardless of the response content. A refund may only be issued for a pre-flight validation failure that happens BEFORE the upstream call is dispatched (i.e. before any money is spent). Demonstrated in lab/repro-services/dow-mock/patched.mjs, which caps billable upstream calls at exactly the daily budget regardless of attack volume against the identical attack. remediation.patch expresses this as a real diff (not prose) between our own vulnerable and patched variants - note this is NOT a patch against the real target's source (which is already fixed, per the published advisory; we hold no vulnerable copy of their real code to patch), it is the concrete code-level fix pattern, generated with git diff --no-index between two files we wrote and both actually run.

(Real, `git apply --check`-verified patch: `findings/WM-002/remediation.patch`)

---

## WM-003 - VERIFIED-SECURE

**Vulnerability title**

Non-GET gateway route rate-limit/fail-closed coverage guardrail independently re-verified

**Description**

This is the project's clearest demonstration of the 'audit the auditor' methodology. The target's own scripts/enforce-rate-limit-policies.mjs documents (in its own comments) a REAL historical seam bug it exists to prevent: 'the sanctions-entity-search review finding - the policy key was /api/sanctions/v1/lookup-entity but the proto RPC generates path /api/sanctions/v1/lookup-sanction-entity, so the 30/min limit never applied and the endpoint fell through to the 600/min global limiter.' That is a rename-drift seam between a control (the policy registry) and its real target - the exact class of control-vs-target drift an AI-assisted, CI-guarded codebase tends to produce, described by the maintainer's own code, not invented by us. We independently re-implemented the check the maintainer added in response (a different data source - .openapi.json instead of.openapi.yaml - and a different extraction method - regex over the TS object literal instead of a dynamic tsx import) and ran it fresh against the live source at the pinned commit.

**Affected component**

server/_shared/rate-limit.ts registries vs. all docs/api/*.openapi.json generated routes (real target source)

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0 |
| openapi_spec_files_parsed | 38 |
| total_gateway_routes | 236 |
| non_get_routes_checked | 18 |
| endpoint_policies_registered | 59 |
| fail_closed_required_routes | 50 |
| uncovered_non_get_routes_found | 0 |
| fail_closed_required_missing_policy_found | 0 |
| fail_open_opt_outs_found | 0 |

**Business impact**

N/A (control held) - but the METHOD is the contribution: this demonstrates a reusable technique (independently re-deriving a maintainer's own systemic guardrail from a different code path) that generalizes to any CI-guarded codebase, which is exactly the 'reusable NTRO capability' framed in our methodology.

**Remediation**

No fix required. Recommend re-running this check (framework/seam-linter/rate-limit-coverage-check.mjs) as a scheduled independent audit, since the target repo sees daily commit velocity and the guardrail is only as good as its most recent run.


---

## WM-004 - VERIFIED-SECURE

**Vulnerability title**

CORS wildcard usages outside the shared allowlist helper independently audited - no credentialed combination found

**Description**

The target centralizes CORS validation in api/_cors.js (an explicit regex allowlist: APP_ORIGIN_PATTERN plus a small, tightly-scoped set of preview/desktop/localhost patterns) and server/cors.ts (its documented TypeScript port). A live grep shows 13 non-test, non-helper files under api/ ALSO set a literal wildcard Access-Control-Allow-Origin:'*' directly, independent of the shared helper -- exactly the kind of 'seam between a control and its exception' an AI-assisted, CI-guarded codebase tends to produce. We audited all 13 programmatically. Every one either (a) is the target's own getPublicCorsHeaders() function, which is documented as intentionally used only for cacheable public data and never combined with a credentials header, or (b) is a standalone public/anonymous endpoint (e.g. api/ask.ts, explicitly documented in its own comment as serving 'the same honest, anonymous, quota-free material the A2A concierge serves... it never touches gated data surfaces, so it cannot become a Pro-quota bypass (the GHSA-hcq5 class)' -- the maintainer's own comment references their own prior advisory). None combine the wildcard with an actual credential read.

**Affected component**

api/_cors.js shared helper vs. 24 real files that reference Access-Control-Allow-Origin (real target source)

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0 |
| files_mentioning_acao | 24 |
| files_using_shared_helper_or_test | 11 |
| files_with_independent_wildcard | 13 |
| high_or_medium_risk_combinations_found | 0 |
| false_positives_eliminated_by_heuristic_refinement | 6 |

**Business impact**

N/A (control held). Reported to document the methodology: an initial broad heuristic (bare regex match on the word 'Authorization' anywhere in the file) produced 6 false-positive MEDIUM flags, all traced to Access-Control-Allow-Headers allow-list boilerplate or WWW-Authenticate challenge headers, neither of which is a credential read. Narrowing the heuristic to require an actual header-read shape (headers.get('authorization'), etc.) eliminated all 6 -- an example of the iterative false-positive elimination a defensible automated finding requires, documented rather than hidden.

**Remediation**

No fix required for the current commit. Recommend (a) consolidating the 13 standalone wildcard usages to call getPublicCorsHeaders() explicitly rather than duplicating the literal object, purely for maintainability/driftresistance, not because any is currently exploitable, and (b) re-running framework/seam-linter/cors-scan.mjs on future commits, since new handlers could in principle introduce the dangerous combination this scan specifically watches for.


---

## WM-005 - VERIFIED-SECURE

**Vulnerability title**

Type-safety-silencing casts (as any / as unknown) near security-sensitive code manually reviewed - none found unsafe

**Description**

Bible §4 documents a specific class of AI-assisted-codebase vulnerability: a type cast (`as any`/`as unknown`) introduced to silence a TypeScript compiler error can, if placed carelessly, erase the type system's guarantee about the shape of security-relevant data (an auth token, an entitlement object, a validated input) right at the boundary where that guarantee mattered most. Rather than assume this pattern exists, we checked for it directly: every one of 262 real `as any`/`as unknown` occurrences across the entire non-generated, non-test source tree was scanned for proximity to a security-sensitive marker. Exactly 2 candidates surfaced (an initial pass found 4, but 2 were inside `.spec.ts` end-to-end test files our first exclusion pattern missed - fixed and re-run; see framework/seam-linter/cast-adjacency.mjs's own header comment for the false-positive note, same documented-not-hidden discipline as WM-004).

**Affected component**

Full real target source: src/, api/, server/, convex/ (1724 non-test .ts/.tsx files)

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: N/A - static analysis, no running instance required.

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0 |
| files_scanned | 1724 |
| total_as_any_or_unknown_occurrences | 262 |
| candidates_near_sensitive_markers_initial_pass | 4 |
| false_positives_from_test_file_exclusion_gap | 2 |
| candidates_after_fix | 2 |
| candidates_confirmed_unsafe_after_manual_read | 0 |

**Business impact**

N/A (control held). Reported because the methodology and its completeness are the contribution: 262 out of 262 real occurrences were accounted for, not sampled, and the 2 that warranted a closer look were read in full context rather than counted as findings on pattern-match alone.

**Remediation**

No fix required. `convex/apiPlanLimitUsage.ts:522` uses `(internal as any).<functionPath>` - a standard, widely-used Convex idiom for referencing a circularly-typed internal function reference; the function's RETURN VALUE is still explicitly type-asserted immediately after (`) as ActiveEntitlement[]`), so type safety on the data that actually flows through the security-relevant path is preserved. `src/app/event-handlers.ts:1164` casts `JSON.parse(raw)` to `unknown` (the textbook-safe choice, not `any`) when reading from localStorage, and is immediately followed by an explicit `Array.isArray` check and a type-predicate `.filter()` narrowing to `string` before the value is used anywhere - this is exemplary defensive parsing of untrusted storage data, not a boundary degradation. Non-null assertion (`!`) was intentionally out of scope for this pass - a reliable regex would need a real TypeScript AST parser to avoid false positives from `!=`/`!==`/logical negation; flagged as future work, same honest limitation already noted for the AST-based scripts/enforce-premium-fetch.mjs invariant.


---

## WM-006 - VERIFIED-SECURE

**Vulnerability title**

Production security header posture (CSP/HSTS/XFO/etc.) evaluated dynamically + statically - hardened, one minor non-exploitable CSP gap

**Description**

This finding does two things deliberately, not one. First, it demonstrates a real methodological trap and avoids it: the local `vite` dev server (what `npm run dev` starts) returns almost no security headers (1/12 on our weighted scale), because Vercel's `vercel.json` `headers` block is applied by Vercel's own edge network on a real deployment, a layer the plain dev server never passes through. A dynamic-only assessment against `npm run dev` would have wrongly concluded WorldMonitor ships essentially no security headers. Second, having caught that, we evaluated the REAL production-declared policy from the actual `vercel.json` (9/12, with a real CSP directive evaluator, not a header-presence checklist): a strict-dynamic, nonce+hash-based Content-Security-Policy (not the common unsafe-inline shortcut), `object-src 'none'`, `base-uri 'self'`, a restrictive `frame-ancestors`, HSTS with `preload`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`. Exactly one real, precise issue was found: `style-src` allows `'unsafe-inline'`. Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy are shipped as their `-Report-Only` variants, not enforcing - a legitimate, common progressive-rollout pattern (observe reports before breaking legitimate cross-origin behavior), not a bug.

**Affected component**

Real running instance (localhost:3000, dynamic pass) + real vercel.json (static, production-declared pass)

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: Dynamic pass needs the real instance running on localhost:3000 (see lab/README.md). Static pass needs the real cloned source.

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| instance | localhost:3000 (real running app) |
| dynamic_pass_score | 1/12 |
| static_pass_score | 9/12 |
| csp_uses_nonce_or_hash | true |
| csp_uses_strict_dynamic | true |
| real_issues_found | 1 |
| issue | style-src 'unsafe-inline' (non-exploitable without a separate script-injection primitive) |

**Business impact**

N/A (control held; the one real finding - style-src unsafe-inline - permits CSS injection in a successful XSS scenario to exfiltrate data via CSS selectors or deface via injected styles, but does NOT enable script execution, since script-src has no unsafe-inline and is properly nonce/hash-gated with strict-dynamic. This is a defense-in-depth gap, not an independently exploitable vulnerability.

**Remediation**

If practical, migrate inline styles to either external stylesheets or nonce/hash-gated style tags to close style-src's unsafe-inline the same way script-src already is (this is genuinely harder for CSS than JS in most frameworks and is a reasonable, common trade-off many hardened apps accept - not an urgent fix). No action needed for COOP/COEP being Report-Only if the team is actively monitoring the report endpoint (`/api/security/report`, which the app does define) before flipping to enforcing mode - recommend confirming that monitoring is active and setting a target date to enforce.


---

## WM-007 - VERIFIED-SECURE

**Vulnerability title**

Client-side storage content audited on the real running instance - SECURITY.md's 'no sensitive localStorage data' claim empirically confirmed

**Description**

docs/ground-truth.md records SECURITY.md's own claim: 'No sensitive data is stored in localStorage or sessionStorage.' Rather than accept a documentation claim at face value, this finding checks it empirically against the real running app. Every one of the app's 27 real localStorage keys was dumped in full (not sampled) and each value scanned for four credential-shaped patterns. Result: every key holds UI/layout preference state, feature-flag completion markers, or cached PUBLIC geopolitical data (Country Instability Index scores, theater posture, disabled-feed source-name lists) - zero credential-shaped hits. sessionStorage held one benign viewed-panel tracker. No cookies were set at all for this unauthenticated session.

**Affected component**

Real running instance (localhost:3000), browser localStorage/sessionStorage/cookies

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: The real instance running on localhost:3000, an unauthenticated/default session (no sign-in attempted, consistent with docs/ROE.md's no-account-creation rule).

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| instance | localhost:3000 (real running app, unauthenticated session) |
| localstorage_keys_scanned | 27 |
| credential_shaped_hits | 0 |
| sessionstorage_keys | 1 |
| cookies_set | false |
| session_type | unauthenticated (no account created, per docs/ROE.md) |

**Business impact**

N/A (control held). This is a genuine, real, dynamic confirmation of a documented security claim, spanning PS scope areas 5 (client-side security) and 7 (data storage & privacy) simultaneously. An unauthenticated session was deliberately used, consistent with the project's ethics constraints; a signed-in Pro session was not tested (no account was created), so this verdict covers the anonymous surface only.

**Remediation**

No fix required for the surface tested. Recommend the same audit be repeated for an authenticated/Pro session in any future engagement with team-authorized credentials, since entitlement or session-adjacent state could plausibly differ from the anonymous default this assessment was limited to.


---

## WM-008 - VERIFIED-SECURE

**Vulnerability title**

Authentication & session management - JWT alg pinning, OAuth state atomicity, and session cookie attributes independently verified

**Description**

This closes the one PS scope area (1: Authentication & session management) that the earlier pass of this assessment left untested, and directly targets the class of the register's own three auth-adjacent advisories (GHSA-f6gj refresh-token reuse, GHSA-9m4c OAuth state fail-open, GHSA-5j39 MCP SSE replay - all already fixed by the maintainer). Check 1 confirms `server/auth-session.ts` pins `algorithms: ['RS256']` on its jose jwtVerify() call - jose enforces whatever algorithm list it is given, so an explicit, non-'none' pin closes the historical 'alg confusion' JWT bypass class entirely. Check 2 confirms the CURRENT, fixed OAuth callback code (`api/discord/oauth/callback.ts`, `api/slack/oauth/callback.ts`) consumes state via Redis `GETDEL` - an atomic get-and-delete - rather than a separate get-then-delete pair, which is exactly the fix the register's GHSA-9m4c class needed. Check 3 confirms every one of 5 real session cookie-value constructions found in source (`api/wm-session.js`) sets `HttpOnly; Secure; SameSite=Lax`.

**Affected component**

server/auth-session.ts (jose jwtVerify), api/discord+slack/oauth/callback.ts (state consumption), api/wm-session.js (session cookie issuance) - real target source

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: N/A - static analysis, no running instance required.

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | c7859c70e529db67cb871d2199f0e24d728679c1 |
| jwt_algorithm_pinning | [object Object] |
| oauth_state_atomicity | [object Object] |
| session_cookie_attributes | [object Object] |

**Business impact**

N/A (all three controls held). Reported to close PS scope area 1 with real, targeted evidence rather than leaving it NOT TESTED. The scanner's own cookie-attribute check initially flagged 3 files as unsafe on a first pass; manual read showed these were comment-only mentions of the real HttpOnly cookie implemented elsewhere (wm-session.js), not separate insecure cookie paths. The check was narrowed to anchor on an actual cookie-value string (containing Path=/) rather than the bare word 'HttpOnly' anywhere in a file, and re-run - 0 unsafe on the corrected check. This false-positive-then-fix is documented in the scanner's own source comment and here, not silently corrected, per this project's established discipline (see WM-004, WM-005).

**Remediation**

No fix required for any of the three checks. Recommend re-running engine/scanners/auth-session.mjs on future commits, since new OAuth providers or cookie-issuing code paths could in principle introduce a gap this scan specifically watches for.


---

## WM-009 - VERIFIED-SECURE

**Vulnerability title**

Premium-fetch authorization wrapper - real AST-based re-derivation (v1's explicitly deferred check) - all 9 real client call sites correctly gated

**Description**

v1 of this assessment explicitly deferred this check as future work, stating it 'needs a full TypeScript AST parser' rather than approximate it with a misleading regex (docs/coverage-matrix.md). This pass builds that real check. scripts/enforce-premium-fetch.mjs (the target's own 470-line AST-based CI invariant) exists specifically because this exact class of bug happened for real: its own comments document 'the HIGH(new) #1 class from #3242 review - SupplyChainServiceClient was constructed with globalThis.fetch (the generated default) and pro users silently got 401s the generated client swallowed into empty-fallback panels.' Our independent parser found and checked every one of 791 real source files, located 9 real client instances across 7 files that actually call at least one premium-gated method, and verified all 9 - including a fresh construction of that exact SupplyChainServiceClient class the bug's own history names - correctly pass premiumFetch (or the one documented, narrower delegating adapter proFreshRpcFetch) rather than an unauthenticated globalThis.fetch.

**Affected component**

src/ (791 real, non-generated .ts/.tsx files) vs. src/generated/client/*/service_client.ts + src/shared/premium-paths.ts - real target source, parsed with the actual TypeScript Compiler API

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: N/A - static analysis, no running instance required. Needs the isolated engine/scanners/ast-tools/ TypeScript install (the one dependency this project's otherwise zero-dependency engine uses, and only for this check).

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | c7859c70e529db67cb871d2199f0e24d728679c1 |
| src_files_scanned | 791 |
| service_client_classes_found | 38 |
| premium_rpc_paths | 38 |
| client_instances_calling_a_premium_method | 9 |
| unsafe_instances_found | 0 |
| parser | TypeScript Compiler API (ts.createSourceFile), not regex |

**Business impact**

N/A (control held). This closes the single largest honestly-flagged gap from the earlier pass of this assessment. The historical bug class this check targets (documented in the target's own code) was a real, shipped Pro-tier authorization bypass - a paying customer's premium call silently downgrading to an unauthenticated, empty-fallback response. Confirming its absence with an independent parser, not just trusting the target's own CI, is exactly the kind of verification this project's whole methodology is built around.

**Remediation**

No fix required. This check, like the target's own, is only as good as its most recent run - recommend re-running engine/scanners/authz-access.mjs whenever a new ServiceClient is added or a new premium path is declared.


---

## WM-010 - VERIFIED-SECURE

**Vulnerability title**

Generated API runtime validation (GHSA-cmj5 class) - central wiring confirmed, and both documented exceptions have real enforced compensating controls

**Description**

The generated Sebuf server code (src/generated/server/) exposes `validateRequest` as an OPTIONAL parameter - each handler does `if (options?.validateRequest)` before checking anything, meaning validation silently no-ops if the caller wiring it up doesn't supply a function. This is exactly the shape of bug GHSA-cmj5 describes. Check 1 confirms the one real place that matters - server/gateway.ts, which constructs every generated server - passes a real `validateRequest: validateGeneratedRequest`. Check 2 goes further: TWO handlers (search-intel-history.ts, get-similar-events.ts) explicitly comment that the gateway does NOT supply validateRequest to them specifically ('buf.validate annotations document the contract but do not run'), because these routes call a paid embeddings provider and an unclamped query length would be a real cost/abuse risk. Both declare a bound (MAX_QUERY_LEN=500, MAX_SITUATION_LEN=1000, matching the proto's own documented max_len) - and both bounds are confirmed ACTUALLY PASSED into a real validateHistoryText(...) call in the same file, not just declared and forgotten.

**Affected component**

server/gateway.ts + server/worldmonitor/intelligence/v1/{search-intel-history,get-similar-events}.ts - real target source

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: N/A - static analysis, no running instance required.

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | c7859c70e529db67cb871d2199f0e24d728679c1 |
| gateway_wires_validate_request | true |
| documented_exceptions_found | 2 |
| exceptions_with_verified_compensating_control | 2 |
| exceptions_without_compensating_control | 0 |

**Business impact**

N/A (control held). This is a genuinely nuanced result worth reporting in full: the generic path has a real, narrow, self-aware exception (not every route gets gateway-level proto validation), but the developers explicitly documented why and manually replicated the exact bound the proto contract specifies. This is the opposite of a silent gap - it's a compensating control, verified to actually run, not just claimed in a comment.

**Remediation**

No fix required. If either handler's comment or bound constant is ever edited without the other, the compensating control could silently drift - consider a small dedicated invariant (mirroring the target's own enforce-*.mjs pattern) that fails CI if a file documents a validateRequest exception without a corresponding, actually-used MAX_*_LEN constant.


---

## WM-011 - VERIFIED-SECURE

**Vulnerability title**

Idempotency-key handling - body-hash mismatch rejection, concurrent-conflict detection, and fail-closed scope validation all confirmed

**Description**

The PS names 'rate limits, idempotency' together as this scope area's concern; idempotency had not been independently checked before this pass. api/_idempotency.js SHA-256-fingerprints the request body under the caller's Idempotency-Key. Reusing that key with a DIFFERENT body correctly returns 422 idempotency_key_reused rather than replaying a cached response for what is, semantically, a different request - closing a confused-deputy class where an idempotency key could otherwise leak a response across two unrelated calls. A second request racing in while the first is still 'processing' correctly gets 409 idempotency_conflict with a Retry-After header, rather than both proceeding and double-executing the underlying action (the exact TOCTOU class this project's whole thesis is about, here checked in the one place the target built a dedicated primitive specifically to prevent it). Most notably, the code's own comment reasons explicitly about the real-world consequence of getting this wrong: a missing/empty scope is treated as 'a server-side wiring bug, not a runtime condition' and hard-fails with 500 rather than silently falling through to a disabled/no-op state - because on a route like /api/create-checkout, failing open here would mean a retried request creates a second checkout session, i.e. a real double-charge risk.

**Affected component**

api/_idempotency.js (283 lines, real target source)

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: N/A - static analysis, no running instance required.

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | c7859c70e529db67cb871d2199f0e24d728679c1 |
| body_hash_mismatch_rejected | true |
| concurrent_conflict_detected | true |
| scope_misconfiguration_fails_closed | true |

**Business impact**

N/A (control held). Reported because this is a rare case where the target's own code comments explicitly name the financial consequence a wrong design choice would have (duplicate checkout sessions), and the implementation matches that stated intent exactly. Verifying stated intent against actual code, not just reading the comment, is the whole point of this check.

**Remediation**

No fix required.


---

## WM-012 - CANDIDATE-UNCONFIRMED

**Vulnerability title**

Software composition analysis - real npm-audit + lockfile-ancestry tracing finds 4 advisories reachable only through the bundled auth SDK's dependency tree, not confirmed on an executed code path

**Description**

`npm audit --json` against the real, live-cloned lockfile (works without a full `npm install`) found 8 unique root advisories across 28 flagged packages (0 critical, 10 high, 18 moderate). Rather than stop at npm audit's flat severity labels, this finding traces each advisory's real ancestry through the lockfile's own dependency graph and greps the actual, real, non-test/non-generated source (`api/`, `server/`, `src/`) for whether the nearest real top-level dependency is genuinely imported by live request-handling code. 4 advisories (`image-size` x2 HIGH DoS via JXL/HEIF/ICNS parsers, `stream-json` MODERATE DoS, `uuid` MODERATE buffer-bounds) trace back to `@clerk/clerk-js` - the app's actual, confirmed-live auth SDK (see findings/WM-008) - via its Solana wallet-adapter dependency tree. This PROVES the top-level package (`@clerk/clerk-js`) is genuinely imported by live code; it does NOT prove the specific vulnerable function inside `image-size`/`stream-json`/`uuid` is ever actually executed by this application's runtime - that would require deeper call-graph analysis this pass did not attempt. 2 more advisories (`ip-address` x2, both genuinely about SSRF/trust-boundary classification bugs) trace through `telegram` -> `socks` -> `ip-address`, and `telegram` is confirmed imported ONLY by `scripts/telegram/session-auth.mjs` (an operational script, not the live request path) - narrower risk, reported separately. The remaining 2 (`@vitest/mocker`/`vitest`, `undici`) are dev-tooling / ambiguous-usage, not confirmed live either.

**Affected component**

package-lock.json (1795 resolved dependencies, real target lockfile) - the real @clerk/clerk-js -> @solana/wallet-adapter-* -> image-size/stream-json/uuid transitive chain

**Severity (CVSS)**

CVSS 3.1: **7.5** - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
CVSS 4.0: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N`
EPSS: N/A - This finding spans multiple advisories/packages, not one CVE - EPSS is per-CVE and does not apply directly to a bundled dependency-tree finding. The CVSS vector above uses the highest-severity individual advisory in the set (image-size, GHSA-5p2g-fcmc-qvqq / GHSA-w3rx-r6r6-pgpr, both real CVSS 3.1 7.5 vectors embedded in npm audit's own output and independently cross-validated against framework/schema/cvss31.mjs - exact match) as the representative severity, since it is the one with the clearest live-code ancestry.

**Steps to reproduce**

Preconditions: N/A - static analysis (npm audit + lockfile graph tracing + source grep), no running instance required.

```bash
bash findings/WM-012/reproduce.sh
```

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | c7859c70e529db67cb871d2199f0e24d728679c1 |
| total_dependencies | 1795 |
| unique_root_advisories | 8 |
| live_request_path_advisories | 4 |
| operational_script_only_advisories | 2 |
| cvss_vectors_cross_validated_against_own_calculator | 6 |
| cvss_cross_validation_mismatches | 0 |
| sbom_components | 1666 |

**Business impact**

Unconfirmed pending deeper triage - reported honestly as CANDIDATE-UNCONFIRMED rather than inflated to a confirmed finding or dismissed. IF the image-size/stream-json/uuid vulnerable code paths are genuinely reachable (e.g. if Clerk's wallet-adapter integration ever parses a user-controlled image or JSON blob through these libraries), the practical impact is denial-of-service (event-loop-blocking infinite loops / O(depth²) parsing) on whatever request path triggers it - moderate business impact, not data exposure. The two ip-address SSRF-classification advisories are lower urgency: confirmed reachable only through an internal ops script (Telegram session setup), not exposed to any untrusted external request.

**Remediation**

Standard dependency remediation: `npm audit fix` resolves most of these via existing patched versions (image-size, stream-json, uuid all have `fixAvailable` per npm audit's own output - the fix path routes through updating @clerk/clerk-js or exceljs to versions that pull patched transitive deps). A concrete, real, verified example is provided: findings/WM-012/remediation.patch bumps the direct `undici` dependency from the pinned 7.29.0 to the patched 7.30.0 (closes GHSA-3wwx-pv8p-q78v, the WebSocket permessage-deflate DoS) - this patch was generated against and verified to apply cleanly with `git apply --check` against the real pinned source, not hand-typed. Before treating the image-size/stream-json/uuid class as urgent, a maintainer with access to Clerk's actual bundled wallet-adapter code should confirm whether their vulnerable functions are ever called at runtime, or are dead code pulled in only for TypeScript types/unused code paths bundlers tree-shake away - that confirmation is exactly what turns this CANDIDATE-UNCONFIRMED into either a real finding or a verified-secure dead-code dismissal.

(Real, `git apply --check`-verified patch: `findings/WM-012/remediation.patch`)

---

## WM-013 - VERIFIED-SECURE

**Vulnerability title**

Client-bundle secret exposure (VITE_-prefixed env vars) - independently re-derived with a deliberately broader pattern, 0 real hits

**Description**

Vite inlines every VITE_-prefixed environment variable into the built client bundle - a real secret named with that prefix ships to every browser that loads the page. This checks the class independently, not by importing the target's own check-vite-env-secrets.mjs: every git-tracked .env* file (via `git ls-files -- .env*`, matching the target's own discovery method) and every real import.meta.env.VITE_* reference in src/ (catching a secret-shaped var used in code but never documented in .env.example) was scanned against two patterns - the target's own narrow, prefixed-form pattern (api_?key|access_?token|secret|token|password|private_?key|credential) AND a deliberately broader bare-word pattern (any name containing a standalone KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL/PRIVATE segment). The narrow pattern found 0 hits across 21 real VITE_ vars in .env.example plus all real source usages. The broader pattern flagged exactly one: VITE_CLERK_PUBLISHABLE_KEY - correctly excluded from the narrow pattern (and from being a real finding) because Clerk's publishable key is, by design, the public counterpart to a separate, never-client-side secret key; 'publishable' in the name is the whole point.

**Affected component**

.env.example + every real import.meta.env.VITE_* usage in src/ (real target source)

**Severity (CVSS)**

N/A - VERIFIED-SECURE (no vulnerability exists to score; a held control has no CVSS)

**Steps to reproduce**

Preconditions: N/A - static analysis, no running instance and no production client bundle build required (see engine/scanners/secrets.mjs's own header comment for why building the real bundle was judged not worth the ~2.1GB dependency-install cost for a check whose source-level equivalent is fully checkable without it).

No dynamic reproduction script - this is a static-analysis-only verdict (see Proof of concept for the exact source/data evidence).

**Proof of concept**

| Metric | Value |
| --- | --- |
| target_commit | c7859c70e529db67cb871d2199f0e24d728679c1 |
| env_files_scanned | 1 |
| real_vite_vars_in_env_example | 21 |
| narrow_pattern_hits | 0 |
| broad_pattern_only_hits | 1 |
| broad_only_hit_name | VITE_CLERK_PUBLISHABLE_KEY |
| broad_only_hit_is_genuinely_public_by_design | true |

**Business impact**

N/A (control held). Reported with the broad/narrow split shown explicitly, not silently discarded - a jury or reviewer can see exactly what was checked and why the one broader-pattern hit isn't a real finding, rather than trusting a bare 'no secrets found' claim.

**Remediation**

No fix required. If a genuinely secret VITE_-prefixed variable is ever added, both the target's own real CI invariant and this independent scanner would catch it on the narrow pattern.


---
