# Ground Truth — the ONLY citable source for architecture facts

**Build-map ticket:** #5 (🟥 CORE, FOUNDATION) · **Bible:** §2.1
**Verified:** 2026-09-28 against the live repository and web.

> **Rule:** if an architecture claim in the README, report, or deck is not in this file, it does not ship. Re-verify against your clone before quoting — the repo moves (7,881+ commits, daily velocity).

## Target identity

| Field | Verified value |
| --- | --- |
| Repository | `github.com/koala73/worldmonitor` |
| Author | **Elie Habib** (`@koala73`) |
| License | **AGPL-3.0-only** |
| Stars / forks | **87.5k** / **13.3k** |
| Commits | 7,881+ (last commit 2026-09-28 — actively developed) |
| Live app | `worldmonitor.app` (+ variants: tech, finance, commodity, happy, energy) |
| Disclosure channel | `SECURITY.md` → GitHub Private Vulnerability Reporting |

## Real stack (NOT what the fabricated research claimed — see LANDMINES.md)

| Layer | Verified technology |
| --- | --- |
| **Frontend** | **Vanilla TypeScript + Vite**. No React/Vue/Angular/Preact. |
| Maps | **globe.gl + Three.js** (3D globe); **deck.gl + MapLibre GL** (flat map) |
| i18n | Multi-locale with RTL support |
| **Backend** | **Vercel Edge Functions** under `api/`; domain RPCs via **Sebuf** (proto-first RPC, Protocol Buffers); **Railway relay** |
| **Cache / state** | **Upstash Redis** (KV + rate state); 3-tier cache; CDN; service worker |
| **Objects** | **Cloudflare R2** + **Cloudflare KV** (bootstrap bundles) |
| **App data / auth** | **Convex** |
| **Payments** | **Dodo Payments** (Pro tier) |
| **Desktop** | **Tauri 2 (Rust)** with a **Node.js sidecar**; secrets in OS keychain (consolidated vault) |
| **AI** | Ollama / Groq / OpenRouter; Transformers.js (browser-side) |
| **Agent surface** | **MCP server** at `worldmonitor.app/mcp` (Streamable HTTP; public `tools/list`, authed `tools/call` via `X-WorldMonitor-Key` or OAuth); REST API + OpenAPI; CLI (`npx worldmonitor`); Python/Ruby/Go SDKs |

## The security-defining insight

> **The server's primary job is to hold ~40+ third-party API keys and proxy requests to metered upstreams so the browser never sees the keys.**

Two consequences, and they are the backbone of the threat model:

1. **The proxy is the crown jewel and the primary attack surface.** Anything that leaks an upstream key, turns the proxy into an SSRF pivot, or burns the owner's paid quota is a top-tier finding *for this specific app*.
2. **Denial-of-Wallet is a first-class risk, not a footnote.** `.env.example` defines explicit spend knobs (e.g. `AVIATIONSTACK_MONTHLY_BUDGET`, `AVIATIONSTACK_REQUEST_BUDGET`) — the owner already fears quota exhaustion.

## Controls already present (assess these; don't assume they're broken)

This is a hardened codebase. Part of a credible report is **verifying** these and looking for the gap at the edge of each.

- **SSRF defense:** RSS proxy domain allowlist, re-checked on *every redirect hop* (both the Vercel Edge proxy and the Railway relay). The Pro-gated MCP proxy accepts HTTPS only, resolves and rejects private/reserved A and AAAA answers immediately before each outbound request, and strips cloud-metadata headers. **Accepted residual:** Vercel Edge `fetch` cannot pin its socket to the vetted address → a narrow resolve-vs-connect DNS-rebinding window (`GHSA-887j-p88r-qmm9`).
- **Rate limiting / idempotency:** per-route policies, fallbacks, per-API-key limits, idempotency keys, plus a CI linter asserting endpoints declare a policy.
- **Auth:** `jose`-based sessions, HMAC (timing-safe) for internal/relay endpoints, Redis key-ownership checks.
- **Client hardening:** DOMPurify; **CSP restricts `script-src` to `'self'`** (no unsafe-inline/eval); linters for safe HTML, safe localStorage, and Vite env-secret leakage; no sensitive data in localStorage/sessionStorage per the security policy.
- **Desktop hardening:** IPC origin validation (sensitive commands gated to trusted windows); DevTools disabled in production; per-session CSPRNG `LOCAL_API_TOKEN` authenticating renderer→sidecar; capability isolation for the YouTube login window; documented fetch-patch trust boundary.
- **Edge middleware:** `middleware.ts` bot/UA gate with a documented public-path allowlist, each exception annotated with its auth requirement.
- **CI invariant linters:** dozens of `enforce-*.mjs` / `check-*.mjs` scripts — *these are a pre-built map of the developers' own threat model, and the basis of the seam thesis.*

## Security policy scope (matters for the DoW framing)

`SECURITY.md` declares **in scope**: codebase vulns, Edge function issues (SSRF, injection, auth bypass), XSS via RSS/external data, API-key exposure, Tauri IPC privilege escalation, sidecar auth bypass, dependency vulns with a viable vector.

**Out of scope**: third-party service vulns, social engineering, **denial of service**, issues in forks, user-provided env misconfigurations.

> ⚠️ The explicit DoS exclusion is why the Denial-of-Wallet finding must be framed as **OWASP API4:2023 Unrestricted Resource Consumption — an authorization flaw**, not a volumetric availability attack. See bible §6 for the rebuttal.

## Acknowledged external researcher

**Cody Richard** — credited in the README for three 2026 findings: **IPC command exposure**, **renderer-to-sidecar trust boundary analysis**, and **fetch-patch credential injection architecture**. *(Do not confuse with the fabricated set in LANDMINES.md Tier 3.)*
