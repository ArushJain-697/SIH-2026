# SIH 26163 — WorldMonitor Security Assessment · ADVANCED BUILD MAP (v2)
### From "okayish PoC" to a real, running, evidence-graded assessment platform

**Read this if you are building the advanced track.** The original [`WORLDMONITOR-SIH26163-BUILD-MAP.md`](./WORLDMONITOR-SIH26163-BUILD-MAP.md) got us a defensible PoC: an advisory-aware Seam-Linter, two local reproductions, five findings, a generated report. This map supersedes it. It turns that PoC into a **security assessment platform that stands up the real target in a controlled environment, tests all seven PS scope areas with real static + dynamic analysis, scores every finding with CVSS 3.1 + CVSS 4.0 + EPSS, and renders a single-file interactive report a jury can click through.**

Same discipline as before — no re-reporting advisories as novel, no fabricated facts, `localhost` only. Nothing here loosens the ethics; it deepens the engineering.

## Why v2 exists (the honest gap in v1)

| PS requirement | v1 (PoC) | v2 (this map) |
| --- | --- | --- |
| "Demonstrate PoC exploitation **in a controlled environment**" | Minimal mock harnesses modelling two advisory patterns | **The real WorldMonitor app, running on `localhost:3000` from source**, probed safely and dynamically |
| Cover the **7 scope areas** | 4 of 7 had direct evidence | **All 7**, each a real analyzer module (static + dynamic) |
| "Severity rating (e.g. CVSS)" | CVSS 3.1 only | **CVSS 3.1 + CVSS 4.0 + EPSS** (CERT-In dual-scoring, done for real) |
| Deliverable quality | Markdown report | **Interactive, self-contained HTML report** + PS-schema export + remediation patches |
| "Recommend remediation measures" | Prose per finding | Prose **+ actual unified-diff patches** the maintainer could apply |

## Build strategy

**Lock order:** controlled environment (real instance) → scoring core (CVSS4/EPSS) → the safe dynamic probe → the 7 scope-area scanners → supply-chain + secrets → reproductions + remediation patches → the showpiece report → verification.

The one non-negotiable that makes everything else honest: **the safe HTTP probe (A3) hard-allowlists `localhost`/`127.0.0.1` and refuses every other host in code.** Build it before any dynamic ticket, and every dynamic finding inherits its guarantee.

### Priority tags

| Tag | Meaning |
| --- | --- |
| 🟥 **CORE** | The spine. Without it the platform doesn't stand up or doesn't cover the PS. |
| 🟨 **SAFETY** | The code-level guarantee that we never touch production and never fabricate. Non-negotiable. |
| 🟦 **EVIDENCE** | Makes a result reproducible, inspectable, and jury-defensible. |
| 🟩 **SHOWPIECE** | The parts a judge sees and remembers. High polish, high impact. |
| ⬜ **STRETCH** | After every CORE ticket is green. |

### Work-window tags

| Tag | Meaning |
| --- | --- |
| ⚪ **FOUNDATION** | Environment, scoring core, the safe probe. |
| 🌅 **ENGINE** | The seven scope-area scanners + supply-chain/secrets. |
| 🌤️ **EXPLOIT** | Reproductions, controlled dynamic confirmation, remediation patches. |
| 🌇 **DELIVERABLE** | The HTML report, PS-schema export, methodology appendix. |
| 🏁 **VERIFY** | Full test suite, one-command reproducibility, final audit. |

### Ticket rule

No ticket starts until its blockers pass their **Test**. Every dynamic finding must carry a captured request/response pair from the safe probe. Every score must be computed by code (never hand-typed). Every finding keeps its `status` label (`REPRODUCED-KNOWN` / `CONFIRMED-NOVEL` / `CANDIDATE-UNCONFIRMED` / `VERIFIED-SECURE`) and, for `REPRODUCED-KNOWN`, its real GHSA. The landmine scanner and finding validator run in CI (`npm test`) and must stay green.

### Ground rules (carried from v1, still load-bearing)

> **No re-reporting** — the 11 published advisories are prior art; reproduce them (labelled), never claim them. **No fabrication** — every fact traces to `docs/ground-truth.md`, `register/advisories.json`, or the running instance's own captured response. **No prod** — active traffic hits `localhost` only, enforced in code by the A3 probe.

---

## Phase A — The Controlled Environment (the linchpin)

> This is the phase that changes the project's character. Everything downstream that says "dynamic" depends on A1 + A3.

### #A1: Stand up the real WorldMonitor instance
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: —

**Build:** `npm install` + `npm run dev` (Vite) the real cloned source in `.cache/worldmonitor-src` on `localhost:3000`. README confirms it runs with no environment variables. Wrap the launch in `lab/instance/up.sh` / `down.sh` with a health probe (`GET /` returns 200) and a pinned-commit banner. Node 24 per the repo's `.nvmrc`.
**Watch out:** the full production `build` script chains `security:vite-env-secrets`, blog/pro/corpus/sitemap builds, and `tsc` — do NOT run that for the lab; the plain `vite` dev server is the target. If a feature needs an upstream key it will degrade gracefully (the app is designed to); note which panels are inert without keys rather than fighting it.
**Test:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` returns `200`; the dev server log shows Vite ready; `lab/instance/status.sh` prints the pinned commit and the PID.
**Done when:** the real app loads in a browser at `localhost:3000` and its API routes respond locally.

### #A2: Live endpoint inventory
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: #A1

**Build:** Merge the 236 routes from the 38 real `docs/api/*.openapi.json` specs (already parsed in v1) with the top-level `api/*.ts|js` edge functions and `api/api-route-exceptions.json`, into one canonical `engine/inventory/endpoints.json`: path, methods, whether proto-gated, declared rate-limit policy (from `server/_shared/rate-limit.ts`), and whether it appears premium/authenticated from static markers.
**Watch out:** this is the target list every scanner iterates. It must distinguish GET (safe to probe unauthenticated) from non-GET (probe only with benign, side-effect-free payloads, and only against `localhost`).
**Test:** the inventory contains ≥236 routes; a spot-check of five known routes (e.g. `/api/aviation/v1/track-aircraft`) has correct method + policy metadata.
**Done when:** every scanner can iterate a single, trustworthy endpoint list.

### #A3: The safe HTTP probe (the SAFETY primitive)
Priority: 🟨 SAFETY
Window: ⚪ FOUNDATION
Blocked by: #A1

**Build:** `engine/probe/safe-http.mjs` — the ONLY way any dynamic ticket makes a request. Hard guarantees, enforced in code: (1) refuses any URL whose host is not exactly `localhost`/`127.0.0.1`/`[::1]` (throws, does not warn); (2) global token-bucket rate limit (default ≤5 req/s) so we never even locally look like abuse; (3) captures every request/response as a HAR-like JSON record into the finding's evidence dir; (4) benign markers only — a shared constant module of safe payloads (`<img src=x onerror=…console.log>`, `sleep 0`, DOM markers), never a weaponized string.
**Watch out:** this is the code embodiment of the ROE. If a scanner can reach the network any other way, the guarantee is void — route 100% of dynamic traffic through this module and add a lint that fails the build on a raw `fetch(` in `engine/scanners/`.
**Test:** unit test — probing `https://worldmonitor.app/…` throws `HostNotAllowedError`; probing `http://localhost:3000/` succeeds and writes a HAR record; the rate limiter delays the 6th request within a second.
**Done when:** every dynamic request in the platform physically cannot leave `localhost`.

### #A4: Evidence capture v2
Priority: 🟦 EVIDENCE
Window: ⚪ FOUNDATION
Blocked by: #A3

**Build:** Standardize `findings/WM-0XX/evidence/` to hold: the HAR record(s) from the probe, a rendered screenshot (via the built-in browser against `localhost:3000` where a finding is visual), the pinned commit, and a one-line provenance README. A helper `engine/core/evidence.mjs` writes these consistently.
**Watch out:** screenshots of the local instance only; never of the live site.
**Test:** a sample finding's evidence dir contains a valid HAR JSON + a PNG + provenance, and `reproduce.sh` regenerates them.
**Done when:** evidence is uniform, machine-readable, and regenerable across all findings.

---

## Phase B — Scoring & Intelligence Core

### #B1: CVSS 4.0 calculator
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: —

**Build:** `engine/core/cvss40.mjs` — full CVSS 4.0 base (+ optional threat/environmental) score from a vector, implemented from the FIRST v4.0 specification, with the official macrovector lookup table. Pairs with the existing `cvss31.mjs`.
**Watch out:** 4.0 is NOT a formula like 3.1 — it's a 6-dimension macrovector → score interpolation. Implement the real lookup table; verify against FIRST's published examples before trusting a single output.
**Test:** unit tests against ≥6 official FIRST 4.0 reference vectors (known score each); the BOLA and DoW vectors from v1 produce sane, documented 4.0 scores.
**Done when:** every finding can carry a computed (not asserted) 4.0 score alongside its 3.1 score.

### #B2: EPSS client
Priority: 🟦 EVIDENCE
Window: ⚪ FOUNDATION
Blocked by: —

**Build:** `engine/core/epss.mjs` — query the public FIRST EPSS API for a CVE's exploitation-probability + percentile, with an on-disk cache (`.cache/epss/`) and a graceful offline fallback that records "EPSS unavailable, reasoned qualitatively" rather than inventing a number. For findings without a CVE (our reproductions cite GHSAs, not CVEs), record the honest note already used in v1 and, where the advisory maps to a CVE, resolve it.
**Watch out:** EPSS is per-CVE. Do not attach a bogus EPSS to a finding that has no CVE — the honest "N/A + qualitative reasoning" is the correct, defensible output and CERT-In-aligned.
**Test:** a known CVE (e.g. a real MCP CVE from the proof spine) returns a probability in [0,1]; offline mode returns the honest-unavailable record, not a crash or a fake number.
**Done when:** the dual CVSS+EPSS story CERT-In asks for is real, cached, and honest.

### #B3: Finding model v2
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: #B1, #B2

**Build:** Extend the v1 schema/validator: add `cvss40` (computed), `epss` (from #B2), `scope_area` (1–7, mandatory — this is what proves PS coverage), `capec` (attack pattern), `remediation_patch` (path to a unified diff, optional), and `confirmation` (`static` | `dynamic` | `both`). Keep the anti-fabrication register cross-check.
**Watch out:** `scope_area` is mandatory and drives the coverage matrix — a finding that doesn't declare which of the 7 PS areas it belongs to fails validation.
**Test:** existing 5 findings migrate and still validate; a finding missing `scope_area` is rejected; the CVSS 4.0 vector is validated for shape.
**Done when:** every finding self-declares its PS scope area and carries both scores.

### #B4: Severity/priority engine (SSVC-style)
Priority: 🟦 EVIDENCE
Window: ⚪ FOUNDATION
Blocked by: #B3

**Build:** `engine/core/priority.mjs` — combine CVSS (severity) + EPSS (likelihood) + exploitability-in-our-lab into a single prioritized action (`Act` / `Attend` / `Track`), CISA-SSVC-style, so the report ranks by *real risk*, not theoretical max. This is the exact answer to the anticipated judge question "your CVSS is 9.8 but is it actually exploitable?"
**Watch out:** document the decision tree; don't hand-wave a "priority" number.
**Test:** two findings with equal CVSS but different EPSS rank differently; the decision is reproducible from inputs.
**Done when:** the report can order findings by defensible operational risk.

---

## Phase C — The 7-Scope Assessment Engine (cover EVERY word of the PS scope)

> One module per PS scope area. Each runs a **static** pass (against the pinned source) and, where meaningful, a **dynamic** pass (through the A3 probe against the running instance). Each emits schema-valid findings tagged with its `scope_area`. Where a control holds, it emits a `VERIFIED-SECURE` — coverage is the point, not inflated counts.

### #C1: Authentication & session management scanner (scope area 1)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A3, #B3

**Build:** `engine/scanners/auth-session.mjs`. Static: locate the `jose` JWT/JWE verify paths, check for a pinned `alg` allowlist (no `none`/confusion), inspect OAuth token-exchange (`api/_oauth-token.js`, `api/oauth/*`) and the session helper. Dynamic: against `localhost`, inspect real `Set-Cookie` flags (HttpOnly, Secure, SameSite) on session issuance; test whether a state-changing endpoint accepts a cross-site request shape. Map to the register's real auth advisories (`GHSA-f6gj` refresh-token reuse, `GHSA-9m4c` OAuth state fail-open, `GHSA-5j39` MCP SSE replay).
**Watch out:** don't create real accounts on any external IdP; test only the local instance's own session mechanics.
**Test:** the scanner emits ≥1 finding or `VERIFIED-SECURE` for cookie flags and for JWT `alg` pinning, each with evidence.
**Done when:** PS scope area 1 has a real, evidence-backed verdict.

### #C2: Authorization & access control scanner (scope area 2)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A3, #B3

**Build:** `engine/scanners/authz-access.mjs`. Static: the Convex public-function BOLA class (extends v1 WM-001), premium-fetch enforcement (`enforce-premium-fetch.mjs` — the AST check v1 flagged as future work; implement it with a real TS parser here), MCP grant HMAC. Dynamic: against `localhost`, probe GET endpoints unauthenticated vs. with a seeded free-tier identity, and flag any object-scoped route that returns data without an ownership check. Two seeded local identities only.
**Watch out:** this is where the real premium-fetch AST re-derivation lands — the honest v1 gap. Use TypeScript's compiler API, not a regex.
**Test:** the premium-fetch check runs against the real `src/` and agrees with (or defensibly diverges from) the target's own `enforce-premium-fetch.mjs` verdict; the dynamic BOLA probe is evidence-backed.
**Done when:** PS scope area 2 has real static + dynamic coverage.

### #C3: Input validation & data handling scanner (scope area 3)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A3, #B3

**Build:** `engine/scanners/input-validation.mjs`. Static: the cast-adjacency sweep (v1 WM-005) + the Sebuf generated-validation-disabled class (`GHSA-cmj5`) + DOMPurify sink coverage. Dynamic: against `localhost`, fuzz a bounded set of GET query params on inventoried endpoints with benign, marker-based inputs (encoding edge cases, oversized values, type confusion) and observe error handling — never a weaponized payload.
**Watch out:** benign markers only; the goal is to observe *validation behavior*, not to break anything. Bound the fuzz set hard.
**Test:** the fuzzer runs against ≥10 real GET endpoints on `localhost` and classifies each response (validated / reflected / errored) with captured evidence.
**Done when:** PS scope area 3 has real coverage with captured probe evidence.

### #C4: API security scanner (scope area 4)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A2, #A3, #B3

**Build:** `engine/scanners/api-security.mjs`. Static: the rate-limit coverage re-derivation (v1 WM-003) + idempotency + the Denial-of-Wallet class (v1 WM-002). Dynamic: against `localhost`, confirm rate-limit headers appear on real responses (the app advertises IETF `RateLimit-*`), test `X-Forwarded-For`/`cf-connecting-ip` handling for the identity-spoof class (`GHSA-c267`), and do a *bounded* burst (well under any real limit) to observe throttling engage — all local.
**Watch out:** the burst is bounded and local; the point is to see the control *engage*, not to stress anything.
**Test:** real `RateLimit-*` headers are captured from a `localhost` response; the XFF-spoofing probe is evidence-backed.
**Done when:** PS scope area 4 has real static + dynamic coverage, including the DoW money shot.

### #C5: Client-side security controls scanner (scope area 5)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A1, #A3, #B3

**Build:** `engine/scanners/client-side.mjs`. Static: `enforce-safe-html`, `enforce-safe-local-storage`, DOM-sink inventory. Dynamic: load `localhost:3000` in the built-in browser, extract the real CSP from response + meta, evaluate it (script-src, unsafe-inline/eval, frame-ancestors) with a proper CSP evaluator, enumerate what the app actually writes to `localStorage`, and check the `embed.html` / `live-channels.html` surfaces for framing/clickjacking posture.
**Watch out:** read the real DOM/storage via the browser tools; don't assume — the app is vanilla TS, so a lot happens client-side.
**Test:** the real CSP is captured and scored; the actual `localStorage` keys the running app writes are enumerated with evidence.
**Done when:** PS scope area 5 has real, browser-observed coverage.

### #C6: Secure communication mechanisms scanner (scope area 6)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A1, #A3, #B3

**Build:** `engine/scanners/secure-comms.mjs`. Static: parse `vercel.json` for the declared security headers + the per-function CORS config (v1 WM-004 CORS audit + chronological-orphans). Dynamic: capture the real response headers from `localhost:3000` and score the full set — HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/frame-ancestors, `Permissions-Policy`, COOP/COEP/CORP — against a best-practice baseline, with each present/absent/weak verdict evidenced.
**Watch out:** dev-server headers can differ from production `vercel.json` — report both, and say which is which (the honesty beat).
**Test:** a real header table is captured from `localhost` and each header gets a graded verdict with evidence.
**Done when:** PS scope area 6 has a real, graded header posture.

### #C7: Data storage & privacy scanner (scope area 7)
Priority: 🟥 CORE
Window: 🌅 ENGINE
Blocked by: #A1, #B3

**Build:** `engine/scanners/data-storage-privacy.mjs`. Static: Upstash key-ownership (`_redis-key-ownership.js`), the weak-cache-key class (`GHSA-9gp4`), R2 object authz (`_bootstrap-r2.js`), the desktop keychain vault, and what the `SECURITY.md` claims about no-sensitive-data-in-localStorage (cross-checked against C5's real enumeration). Dynamic: confirm, in the running instance, whether anything sensitive is actually persisted client-side, and whether cache keys are attacker-influenceable.
**Watch out:** privacy claims must be checked against observed behavior (C5's real `localStorage` dump), not taken from the docs.
**Test:** the `SECURITY.md` "no sensitive data in localStorage" claim is verified or refuted against the real running app, with evidence either way.
**Done when:** PS scope area 7 has a real, observation-backed verdict.

---

## Phase D — Supply Chain & Secrets (the depth a real pentest has)

### #D1: SCA + SBOM
Priority: 🟦 EVIDENCE
Window: 🌅 ENGINE
Blocked by: #A1

**Build:** `engine/scanners/sca.mjs` — parse the real `package-lock.json`, run `npm audit --json` against the installed tree, and emit a CycloneDX SBOM + a findings list for any known-vuln dependency with a viable vector (which `SECURITY.md` explicitly scopes in). Slopsquatting/hallucinated-dependency check against the register's research anchor (arXiv 2406.10279).
**Watch out:** an advisory in a transitive dev-only dependency with no runtime vector is `Track`, not `Critical` — use the #B4 priority engine, don't inflate.
**Test:** a valid CycloneDX JSON is produced; `npm audit` output is parsed into schema-valid findings with correct severities.
**Done when:** the assessment has a real dependency posture + a machine-readable SBOM.

### #D2: Secrets scanner over the client bundle
Priority: 🟦 EVIDENCE
Window: 🌤️ EXPLOIT
Blocked by: #A1

**Build:** `engine/scanners/secrets.mjs` — build the client bundle (or use the dev bundle) and scan it for high-entropy strings, known key prefixes, and any `VITE_`-inlined secret (the exact risk `check-vite-env-secrets.mjs` exists for). This is a real re-derivation of one of the target's own invariants against real build output.
**Watch out:** the target already guards this; the expected result is `VERIFIED-SECURE`, which is still a real, reportable positive. Any hit is a genuine high-severity finding — triage carefully, disclose privately first.
**Test:** the scanner runs over real build output and produces a verdict; a planted test secret in a fixture is detected (proving the scanner works).
**Done when:** secret-leakage posture is verified against real build artifacts.

### #D3: The AI-seam suite (the intellectual spine, folded in)
Priority: 🟦 EVIDENCE
Window: 🌅 ENGINE
Blocked by: —

**Build:** Adopt the five v1 Seam-Linter tools as first-class engine modules, emitting v2-schema findings. This is the unique thesis — "audit the auditor" — that no other team will have. Keep the empirical proof: 30 real invariants, yet 11 advisories, several living exactly at the control-vs-exception seam.
**Watch out:** don't lose the v1 nuance in the port; the false-positive-elimination stories (WM-004, WM-005) are credibility, keep them.
**Test:** all five tools still run against the real source and produce their v1 verdicts, now in v2 schema.
**Done when:** the intellectual spine is part of the unified engine, not a side artifact.

---

## Phase E — Reproductions & Controlled Exploitation (PS requirement #3 & #4)

### #E1: Reproduction framework v2
Priority: 🟦 EVIDENCE
Window: 🌤️ EXPLOIT
Blocked by: #A3

**Build:** Generalize the v1 vulnerable/patched harness pattern into `lab/repro-services/<name>/` with a manifest, so the regression harness auto-discovers every reproduction. Keep BOLA + DoW; the framework now also supports reproductions confirmed dynamically against the local instance.
**Test:** the regression harness auto-discovers and runs every reproduction; adding a new one needs no harness edit.
**Done when:** reproductions are a pluggable, auto-discovered set.

### #E2: Dynamic confirmations
Priority: ⬜ STRETCH
Window: 🌤️ EXPLOIT
Blocked by: #C1–#C7

**Build:** For any scanner finding that is dynamically confirmable on `localhost`, capture the confirming request/response as a reproduction. This is the literal "PoC exploitation in a controlled environment" the PS names, on the real app.
**Watch out:** only what the A3 probe permits; benign markers; `localhost` only.
**Test:** at least one finding carries a real, replayable `localhost` PoC beyond the modelled reproductions.
**Done when:** the controlled-environment exploitation claim is backed by the real running target.

### #E3: Remediation-patch generator (PS requirement #4)
Priority: 🟩 SHOWPIECE
Window: 🌤️ EXPLOIT
Blocked by: #B3

**Build:** For the top findings, produce an actual unified-diff patch against the pinned source that implements the recommended fix (e.g. the atomic-reservation fix for the DoW class, the ownership-filter for BOLA, a `enforce-cors-policy.mjs` invariant for the CORS-drift gap C6 surfaces). Store as `findings/WM-0XX/remediation.patch`.
**Watch out:** the patch must apply cleanly against the pinned commit (`git apply --check`); a remediation you can't apply is prose, not a fix.
**Test:** each `remediation.patch` passes `git apply --check` against `.cache/worldmonitor-src` at the pinned commit.
**Done when:** "recommend remediation" is backed by applyable patches, not just advice.

---

## Phase F — The Deliverable (the "judges remember this" layer)

### #F1: The interactive HTML report
Priority: 🟩 SHOWPIECE
Window: 🌇 DELIVERABLE
Blocked by: #B4, #C1–#C7

**Build:** `engine/report/build-html.mjs` → a single self-contained `report/assessment.html` (no external deps, works offline): a SOC-dashboard aesthetic with a severity-by-count donut, a **7-scope coverage grid** (green/amber/grey per area — the completeness signal), per-finding cards (CVSS 3.1 + 4.0 vectors, EPSS, priority, evidence links, reproduce command, remediation-patch link), the advisory proof-spine, and the methodology/compliance appendix. Filterable by scope area and severity.
**Watch out:** self-contained and offline (inline CSS/JS, no CDNs) — it must open from a USB stick at a nodal center with no internet. Accessible in light and dark. No fabricated data — it renders only from the validated findings + register.
**Test:** open `report/assessment.html` with the network disabled — it renders fully, the coverage grid shows all 7 areas, filtering works, every evidence link resolves to a real file.
**Done when:** a jury can click through the entire assessment in one offline file.

### #F2: The one-command assessment runner
Priority: 🟥 CORE
Window: 🌇 DELIVERABLE
Blocked by: #C1–#C7, #F1

**Build:** `npm run assess` — stand up the instance (or reuse a running one), run all seven scanners + supply-chain + secrets + the AI-seam suite, compute all scores, regenerate findings, the report, the proof-spine, and the coverage matrix, then tear the instance down. Streams readable progress.
**Watch out:** must be deterministic and idempotent; a second run reproduces the first (modulo EPSS freshness, which is timestamped).
**Test:** `npm run assess` on a clean checkout produces the full report with no manual step.
**Done when:** the entire assessment is one command.

### #F3: PS-schema deliverable export
Priority: 🟩 SHOWPIECE
Window: 🌇 DELIVERABLE
Blocked by: #B3

**Build:** `engine/report/ps-export.mjs` — emit every finding in the **exact** field order the PS names: Vulnerability title · Description · Affected component · Severity (CVSS) · Steps to reproduce · Proof of concept · Business impact · Remediation. This is the literal rubric; hand the jury their own checklist, filled.
**Test:** the export contains every PS field for every finding, in order; a diff against the PS field list is empty.
**Done when:** the deliverable maps 1:1 to the PS's own required schema.

### #F4: Methodology & compliance appendix
Priority: 🟦 EVIDENCE
Window: 🌇 DELIVERABLE
Blocked by: —

**Build:** A generated appendix mapping the engine to OWASP WSTG test IDs, OWASP API Top 10 (2023), ASVS levels, CWE/CAPEC, CVSS 3.1/4.0 + EPSS, CERT-In dual-scoring, and the ISO/IEC 29147/30111 + RVDCP disclosure posture. Plus the RoE and the honest "what we could not test and why."
**Watch out:** verify-before-print the India-specific specifics (CERT-In dual-scoring is confirmed real; the RVDCP PGP key and exact dates are in the landmine "verify" tier — keep them general).
**Test:** the landmine scanner passes over the appendix; every framework cited resolves to a real, dated source.
**Done when:** the assessment reads as the work of a senior, standards-fluent team.

---

## Phase G — Verification & Polish

### #G1: Full test suite
Priority: 🟥 CORE
Window: 🏁 VERIFY
Blocked by: all

**Build:** Extend `npm test`: unit (CVSS 3.1 + 4.0 + EPSS + priority + finding model), integration (each scanner against a fixture + a smoke run against the live local instance), golden-file (report structure), plus the existing landmine scan + finding validation + regression harness + the A3 host-allowlist safety test.
**Test:** `npm test` green on a clean checkout; the A3 safety test proving no request can leave `localhost` is included and passing.
**Done when:** one command proves the whole platform, safety guarantee included.

### #G2: One-command reproducibility + recovery kit
Priority: 🟨 SAFETY
Window: 🏁 VERIFY
Blocked by: #F2, #G1

**Build:** `RECOVERY.md` (instance won't start, port in use, no internet for EPSS, npm install fails) + a `make demo` that runs the assessment and opens the report. Everything works offline except EPSS refresh (which degrades honestly).
**Test:** a teammate on a clean machine runs `npm install && npm run assess` and gets the full report.
**Done when:** the platform is reproducible by someone who didn't build it.

### #G3: Coverage matrix auto-generation
Priority: 🟦 EVIDENCE
Window: 🏁 VERIFY
Blocked by: #C1–#C7

**Build:** Regenerate `docs/coverage-matrix.md` from the real findings' `scope_area` tags — all 7 areas, each with its verdict, finding refs, and confirmation type (static/dynamic/both). No hand-maintained cells.
**Test:** the matrix reflects exactly what the engine produced; all 7 areas have a non-empty verdict.
**Done when:** completeness is provable and self-updating.

---

## Final critical path (if the 5 hours compress)

The irreducible spine that makes this "epic, not kaam chalau":

1. **#A1** real instance up + **#A3** the safe probe (the whole point — a real controlled environment).
2. **#B1** CVSS 4.0 + **#B2** EPSS + **#B3** finding model v2 (real, dual-scored impact).
3. **#C6** secure-comms + **#C5** client-side + **#C4** API-security dynamic passes (real findings from the real app across ≥3 scope areas the mocks never touched).
4. **#D1** SCA + **#D2** secrets (real pentest depth).
5. **#F1** the HTML report + **#F2** one-command runner (the showpiece).
6. **#F3** PS-schema export (hand the jury their own rubric, filled).

That alone is a running-target assessment with dual-scored findings across the real seven areas and a clickable offline report — a different league from the v1 PoC.

## What v2 deliberately still will NOT do (honesty, carried forward)

- No testing against `worldmonitor.app` — `localhost` only, enforced in code (#A3).
- No creating accounts on external identity providers.
- No weaponized payloads, even locally — benign markers only.
- No claiming a published advisory as a novel discovery — the register cross-check stays in CI.
- No fabricated facts — the landmine scanner stays in CI, now covering the HTML report too.

---

*Companion to `WORLDMONITOR-SIH26163-BIBLE-v2.md` (the why) and the original `WORLDMONITOR-SIH26163-BUILD-MAP.md` (the v1 PoC record). This map is the advanced track: a real running target, seven real scope-area scanners, dual CVSS + EPSS scoring, and a report a jury can hold. The ground rules do not move — deeper engineering, same ethics.*
