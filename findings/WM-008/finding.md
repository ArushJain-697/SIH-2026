# [WM-008] Authentication & session management - three real controls independently verified

- **Status:** `VERIFIED-SECURE`
- **PS scope area:** **1 - Authentication & session management** (the one area the earlier pass of this assessment left untested)
- **CWE:** CWE-347, CWE-362, CWE-1004 · **WSTG:** WSTG-ATHN-04
- **Target commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

## Three checks, three documented attack classes

**1. JWT algorithm pinning.** `server/auth-session.ts` calls jose's `jwtVerify()` with `algorithms: ['RS256']` explicitly pinned. jose enforces exactly whatever algorithm list it's given - an explicit, non-`'none'` pin closes the classic 2015-era "alg confusion" JWT bypass entirely (a caller who accepts an attacker-controlled `alg` header, or omits the option, can be tricked into treating an unsigned or HMAC-forged token as valid). ✅ Confirmed.

**2. OAuth state consumption atomicity.** This is not a generic check - it directly targets the exact class of the target's own published `GHSA-9m4c-824h-m4xw` ("Slack and Discord OAuth state consumption is non-atomic and fail-open"). The current, fixed callback code (`api/discord/oauth/callback.ts`, `api/slack/oauth/callback.ts`) consumes the OAuth `state` parameter via Redis **`GETDEL`** - an atomic get-and-delete in one round trip - rather than a separate `GET` then `DEL`, which is exactly the TOCTOU pattern the advisory's title describes. ✅ Confirmed fixed.

**3. Session cookie attributes.** Every real session cookie-value string found in source (`api/wm-session.js`, 5 constructions) sets `HttpOnly; Secure; SameSite=Lax`. ✅ Confirmed.

## We show our false positives here too (same discipline as WM-004, WM-005)

The cookie-attribute check's first pass flagged **3 files as unsafe** - `api/_api-key.js`, `api/_session.js`, `server/gateway.ts`. Manual read showed each was a **comment** referencing the real HttpOnly cookie implemented in `wm-session.js` (e.g. *"the endpoint stores it in an HttpOnly cookie that API calls send with credentials"*), not a separate, less-secure cookie-setting path. The original heuristic matched the bare word `HttpOnly` appearing anywhere in a file; it was narrowed to anchor strictly on an actual cookie-value string (one containing `Path=/`, an attribute no comment would incidentally include) and re-run - **0 unsafe** on the corrected check, 5/5 real cookie constructions confirmed safe. The fix and the reasoning are kept in the scanner's own source comment, not silently applied and hidden.

## Reproduce

```bash
bash findings/WM-008/reproduce.sh
```

## Evidence

[`evidence/auth-session-report.json`](./evidence/auth-session-report.json) - full per-check findings for all three controls.

## Verdict

**All three controls hold, independently verified against real source, with one honestly-documented false-positive correction along the way.** This closes PS scope area 1 - the assessment now has direct evidence for 7 of 7 scope areas.
