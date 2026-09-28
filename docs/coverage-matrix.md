# Coverage Matrix — 7 PS scope areas × verdict

**Build-map ticket:** #8 (🟦 EVIDENCE, FOUNDATION) · **Bible:** §12
**Target commit assessed:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0` (2026-09-28)

This one table signals completeness better than anything else in the report. **Honesty is the point** — a "not tested, here's why" cell is a strength. All-green with no misses reads as severity inflation and a jury distrusts it.

**Verdict vocabulary** (matches the finding `status` enum):
- `FINDING` — confirmed novel issue, written up in `findings/`
- `REPRODUCED-KNOWN` — published advisory class reproduced in a local harness to validate the framework (cites its GHSA)
- `VERIFIED-SECURE` — hostile attempt made, control held, evidence recorded
- `NOT TESTED` — with an explicit reason and a future-work note

---

| # | PS scope area | WorldMonitor surface | Verdict | Evidence ref | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | **Authentication & session management** | `jose` JWT/JWE sessions, OAuth token exchange, MCP OAuth / `X-WorldMonitor-Key` | NOT TESTED | — | Register has `GHSA-f6gj` (refresh-token reuse), `GHSA-9m4c` (OAuth state fail-open), `GHSA-5j39` (SSE replay binding), all already fixed by the maintainer. We did not build a session/JWT reproduction harness within the time available — flagged as the top future-work item. |
| 2 | **Authorization & access control** | Convex public functions, Pro tier (Dodo Payments), MCP grant HMAC, premium-fetch enforcement | **REPRODUCED-KNOWN** | [`findings/WM-001`](../findings/WM-001/) | BOLA class validated against `GHSA-r649-4cqj-w93h` in a minimal local harness. The AST-based premium-fetch enforcement (`scripts/enforce-premium-fetch.mjs`) was catalogued but not independently re-derived (needs a full TS AST parser — out of scope this session). |
| 3 | **Input validation & data handling** | Zod schemas, Sebuf proto contracts, DOMPurify | **VERIFIED-SECURE (partial)** | [`findings/WM-005`](../findings/WM-005/) | Type-safety-silencing casts (`as any`/`as unknown`) checked across the ENTIRE real source (262/262 occurrences, not sampled) for proximity to security-sensitive code — 2 candidates found, both manually confirmed benign on full read. Register has `GHSA-cmj5` (generated runtime validation disabled, already fixed) — not independently reproduced. |
| 4 | **API security** | Vercel Edge functions, ~40+ upstream proxies, rate limits, idempotency | **REPRODUCED-KNOWN + VERIFIED-SECURE** | [`findings/WM-002`](../findings/WM-002/), [`findings/WM-003`](../findings/WM-003/) | Money shot: Denial-of-Wallet (`GHSA-hcq5`) reproduced in WM-002. The systemic non-GET rate-limit/fail-closed coverage guardrail was independently re-derived from the real, live-cloned source (236 real gateway routes, 18 non-GET, 0 gaps found) and held — WM-003. |
| 5 | **Client-side security** | Vanilla-TS SPA, DOM sinks, localStorage, `embed.html` / `live-channels.html` | NOT TESTED | — | No client-side reproduction built this session. CSP `script-src 'self'` (per `docs/ground-truth.md`, from `SECURITY.md`) was read but not independently re-verified against the live source — future work. |
| 6 | **Secure communication** | HTTPS, per-function CORS, security headers, SSRF allowlist on redirect hops | **VERIFIED-SECURE** | [`findings/WM-004`](../findings/WM-004/) | All 24 real files referencing `Access-Control-Allow-Origin` in the live-cloned source were programmatically audited; the 13 that bypass the shared helper were individually checked for a wildcard+credentials combination — none found. `GHSA-887j` (the accepted Edge DNS-rebinding residual) was read and catalogued (see `docs/proof-spine.md`) but not independently reproduced. |
| 7 | **Data storage & privacy** | Upstash Redis, Cloudflare R2/KV, OS keychain (desktop), Convex | NOT TESTED | — | Register has `GHSA-9gp4` (weak cache key), `GHSA-gxj5` (baseline poisoning), `GHSA-5458` (desktop secret cache), all already fixed. No independent reproduction built this session. |

---

## Summary

| Verdict | Count |
| --- | --- |
| REPRODUCED-KNOWN | 2 (WM-001, WM-002) |
| VERIFIED-SECURE | 3 (WM-003, WM-004, WM-005) |
| CONFIRMED-NOVEL | 0 |
| CANDIDATE-UNCONFIRMED | 0 |
| NOT TESTED (with reason) | 3 of 7 areas |

## Honest framing for the deck

**4 of 7 scope areas have direct evidence** (areas 2, 3, 4, 6 — with area 4 carrying both a reproduction and a verified control). The remaining 3 areas are explicitly marked `NOT TESTED` with a named reason (time budget, not avoidance) rather than left blank or silently claimed. This is the deliberate trade under a hard time constraint per `docs/WORLDMONITOR-SIH26163-BUILD-MAP.md`'s critical path — depth on fewer areas, each with real, re-runnable evidence, rather than shallow claims across all seven.

## Ticket #15 / #16 extension (chronological orphans, cast adjacency)

Two more Seam-Linter tools were built and run against the real source after the initial pass:
- **#15 (chronological orphans):** real GitHub API data shows all 13 files independently bypassing the shared CORS helper (WM-004) were created AFTER that helper already existed, over a 6-month span — a genuine, ongoing pattern, not historical debt. Folded into WM-004 as an addendum rather than treated as a separate finding, since it doesn't change WM-004's verdict (still safe) but strengthens the "no CI invariant watches this surface" observation.
- **#16 (cast/assertion adjacency):** produced its own standalone finding, WM-005 — a complete (not sampled) sweep of all 262 real `as any`/`as unknown` occurrences, 2 candidates near security-sensitive code, both manually confirmed benign.

**No `CONFIRMED-NOVEL` finding was produced.** This is reported honestly rather than manufactured: the two areas we investigated most deeply (rate-limit coverage, CORS configuration) both held. Per build-map ticket #21's own guidance, when nothing new verifies, the honest move is exactly this — report the reproduced + verified-secure mix, and name the gap as future work, not force a finding to exist.

## Out-of-scope by declaration

The desktop/Tauri surface (`GHSA-2x6r`, `GHSA-5458`) remains **out of scope** for this pass — no Tauri build/runtime was stood up.
