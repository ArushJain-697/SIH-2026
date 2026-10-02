# [WM-011] Idempotency-key handling - three real properties confirmed

- **Status:** `VERIFIED-SECURE`
- **PS scope area:** 4 - API security (the PS names "rate limits, **idempotency**" together; this is the idempotency half)
- **CWE:** CWE-345, CWE-362, CWE-636 · **WSTG:** WSTG-BUSL-03 · **OWASP:** API4:2023
- **Target commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

## Why idempotency gets its own finding, separate from WM-002/WM-003

Rate-limiting and Denial-of-Wallet are covered in depth already. Idempotency is a **distinct mechanism** - and the PS names it explicitly as its own concern within this scope area. It hadn't been independently checked before this pass.

## Three checks against the real `api/_idempotency.js`

**1. Body-hash mismatch → rejected, not replayed.** The implementation SHA-256-fingerprints the request body under the caller's `Idempotency-Key`. Reuse the same key with a **different** body → `422 idempotency_key_reused`, not a silent replay of whatever was cached. Without this, an idempotency key becomes a confused-deputy vector: two logically different requests sharing a key could leak one caller's response to another.

**2. Concurrent in-flight requests → conflict, not a race.** A second request arriving while the first (same key) is still `processing` gets `409 idempotency_conflict` with a `Retry-After: 2` header - not a race where both proceed and double-execute the underlying action. This is the exact TOCTOU class this whole project's thesis is built around, checked here in the one place the target built a dedicated primitive specifically to prevent it.

**3. Scope misconfiguration fails closed - with the real stakes stated in the code itself.** A missing/empty idempotency scope is explicitly *not* treated as "disable protection and continue" - it hard-fails with `500 idempotency_scope_missing`. The code's own comment names why:

> *"A missing or empty scope is a server-side wiring bug, not a runtime condition... Fail CLOSED and make it loud... on `/api/create-checkout` that is a second checkout session per retried request."*

That's a real double-charge risk, named explicitly by the developer, and the implementation matches the stated intent exactly - checked directly, not assumed from the comment.

## Reproduce

```bash
bash findings/WM-011/reproduce.sh
```

## Evidence

[`evidence/api-security-report.json`](./evidence/api-security-report.json)

## Verdict

**All three idempotency properties hold.** Combined with WM-002 (Denial-of-Wallet reproduced) and WM-003 (rate-limit coverage independently re-derived), PS scope area 4 - "API security" - now has full coverage of both sub-topics the PS names.
