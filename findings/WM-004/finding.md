# [WM-004] CORS wildcard usages outside the shared helper — independently audited, no credentialed combination found

- **Status:** `VERIFIED-SECURE`
- **Control tested:** complete programmatic audit (not hand-sampling) of every one of 24 real files referencing `Access-Control-Allow-Origin`, for the specific dangerous combination — wildcard/unvalidated origin **+** credentials or an actual auth-header read.
- **CWE:** CWE-942 (Overly Permissive CORS), CWE-346 (Origin Validation Error) · **WSTG:** WSTG-CLNT-07
- **Lab commit pinned:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

## The seam, found for real

The target centralizes CORS in [`api/_cors.js`](https://github.com/koala73/worldmonitor/blob/main/api/_cors.js) — a tight, explicit regex allowlist (`APP_ORIGIN_PATTERN` plus a small set of preview/desktop/localhost patterns), never a bare wildcard for credentialed responses. But a live grep shows **13 real, non-test files** under `api/` **also** set a literal `Access-Control-Allow-Origin: '*'` directly, independent of that shared helper. That is exactly the "control-vs-exception seam" this project's thesis predicts — a centralized control exists, and individual handlers can (and 13 of them do) bypass it.

## We audited all 13, not a sample

Every file was checked programmatically for: does the wildcard co-occur with `Access-Control-Allow-Credentials:'true'`, or with an actual **read** of an incoming credential header (`headers.get('authorization')`, `X-WorldMonitor-Key`, `X-Api-Key`, `X-Pro-Key`, session/auth validation calls)?

**Result: zero.** Every wildcard usage falls into one of two safe categories:
- **`getPublicCorsHeaders()`** — the target's own function, whose docblock states it is *"safe to use when `isDisallowedOrigin()` has already blocked unauthorized origins"* and — critically — it never sets `Access-Control-Allow-Credentials`.
- **Standalone anonymous endpoints**, e.g. `api/ask.ts`, whose own comment states it serves *"the same honest, anonymous, quota-free material the A2A concierge serves... it never touches gated data surfaces, so it cannot become a Pro-quota bypass (the GHSA-hcq5 class)"* — the maintainer citing their own prior advisory in the code comment.

## We show our false positives too (this is the point of the discipline)

The first pass of this scanner used a **broad** heuristic — any occurrence of the word `Authorization` anywhere in the file — and flagged **6 files as MEDIUM risk**: `api/a2a.ts`, `api/agent-auth.ts`, `api/ask.ts`, `api/docs-mcp.ts`, `api/oauth/authorize.js`, `api/oauth-authorization-server.ts`. Manual inspection of every one showed the match was inside an `Access-Control-Allow-Headers` allow-list string (boilerplate declaring which headers a CORS *preflight* permits) or a `WWW-Authenticate` challenge header (the mechanism for telling an *unauthenticated* client how to authenticate) — neither is a credential read. The heuristic was narrowed to require an actual read shape (`headers.get('authorization')`, etc.); all 6 false positives cleared. See [`framework/seam-linter/cors-scan.mjs`](../../framework/seam-linter/cors-scan.mjs)'s header comment for the full before/after.

This is deliberately documented rather than hidden: **a report that shows how a false positive was eliminated is more credible than one that shows only clean output.**

## Reproduce

```bash
bash findings/WM-004/reproduce.sh
```

## Evidence

[`evidence/cors-scan-report.json`](./evidence/cors-scan-report.json), [`evidence/cors-scan-output.txt`](./evidence/cors-scan-output.txt) — full per-file verdicts for all 24 files.

## Verdict

**Control holds.** All 13 independent wildcard usages are safe by construction (no credentials, or explicitly documented as anonymous-only). Recommended (non-urgent) maintainability improvement: consolidate the 13 duplications to call `getPublicCorsHeaders()` explicitly, reducing future drift risk — not because any current instance is exploitable.
