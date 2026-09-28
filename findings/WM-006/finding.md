# [WM-006] Production security header posture — dynamic + static, hardened

- **Status:** `VERIFIED-SECURE`
- **Control tested:** real HTTP headers from the running instance (dynamic) + real `vercel.json`-declared policy (static), evaluated with an actual CSP directive parser.
- **CWE:** CWE-693, CWE-1021 · **WSTG:** WSTG-CLNT-09
- **PS scope area:** 6 — Secure communication mechanisms
- **Trust boundary:** 6

## The methodological trap this finding avoids

The plain `vite` dev server (`npm run dev`) serves almost no security headers — **1 out of 12** on our weighted scale, captured live from the real running instance:

```
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
Vary: Origin
```

No CSP, no HSTS, no X-Frame-Options, nothing. **A dynamic-only assessment against `npm run dev` would have concluded WorldMonitor ships essentially no security headers — and that would have been wrong.** Vercel applies `vercel.json`'s `headers` block at its own edge network on a real deployment; the plain dev server never passes through that layer. Catching this gap and reporting both passes, rather than trusting the more convenient one, is the entire point of this finding.

## The real, production-declared policy

Parsed directly from `vercel.json` (112 header rules; the catch-all app block was selected as the widest-coverage one): **9 of 12** headers present, evaluated with a real CSP-directive parser rather than a presence checklist:

- **CSP** uses `'strict-dynamic'` **and** nonce/hash-based `script-src` (7 real SHA-256 hashes + a nonce) — not the common `unsafe-inline` shortcut most apps take.
- `object-src 'none'`, `base-uri 'self'`, a restrictive `frame-ancestors` scoped to the app's own variant subdomains only.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.

## The one real issue found

`style-src` allows `'unsafe-inline'`. This is genuine and reported honestly — but it does **not** enable script execution (script-src has no such gap and is properly nonce/hash-gated), so in isolation it permits CSS-based exfiltration/UI-redress techniques only, in the presence of a *separate* injection primitive that doesn't otherwise exist in this assessment. Reported as a defense-in-depth note, not an exploitable finding.

## Not a bug: COOP/COEP in Report-Only mode

`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` are shipped as their `-Report-Only` variants (`report-to="wm-coop-coep"`, pointed at `/api/security/report`, which the app defines as a real endpoint). This is a standard, deliberate progressive-rollout pattern — observe what would break via reports before flipping to enforcing — not an oversight. Recommend confirming the report endpoint is actively monitored and setting a target date to enforce.

## Reproduce

```bash
bash findings/WM-006/reproduce.sh
```
Requires the real instance running on `localhost:3000` (see [`lab/README.md`](../../lab/README.md)) for the dynamic pass; the static pass alone needs only the cloned source.

## Evidence

[`evidence/secure-comms-report.json`](./evidence/secure-comms-report.json), [`evidence/secure-comms-dynamic-headers.json`](./evidence/secure-comms-dynamic-headers.json) — the real captured HAR-like record from the live `localhost:3000` response.

## Verdict

**Hardened, with the dev/prod gap explicitly documented and exactly one real, precisely-scoped, non-exploitable CSP gap.** This is the credibility mix the whole project's methodology is built on: real dynamic evidence, real static evidence, real nuance about which is which, and a finding that neither overclaims a vulnerability nor silently drops a genuine (if minor) observation.
