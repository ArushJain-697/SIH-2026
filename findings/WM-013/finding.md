# [WM-013] Client-bundle secret exposure — independently re-derived, 0 real hits

- **Status:** `VERIFIED-SECURE`
- **PS scope areas:** 5 (Client-side security) and 7 (Data storage & privacy) — a leaked client-bundle secret is both
- **CWE:** CWE-200, CWE-522 · **WSTG:** WSTG-CONF-05
- **Target commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

## The class this targets

Vite inlines every `VITE_`-prefixed environment variable into the built client bundle — a real secret named with that prefix ships to every browser that loads the page. The target already guards against this with its own `scripts/check-vite-env-secrets.mjs`. We re-derive the check independently.

## Method — narrow AND broad, both real

Every git-tracked `.env*` file (`git ls-files -- .env*`, the same discovery method the target's own check uses) and every real `import.meta.env.VITE_*` reference in `src/` (catching a secret-shaped var used in code but never written to `.env.example`) was checked against **two** patterns:

- The target's own **narrow** pattern: requires a prefixed form (`api_key`, `access_token`, `private_key`, etc.)
- Our deliberately **broader** pattern: any bare `KEY`/`SECRET`/`TOKEN`/`PASSWORD`/`CREDENTIAL`/`PRIVATE` segment

## Result

**Narrow pattern: 0 hits**, across all 21 real `VITE_` vars in `.env.example` plus every source usage.

**Broad pattern: exactly 1 hit** — `VITE_CLERK_PUBLISHABLE_KEY`. This is **not** a finding: Clerk's publishable key is, by design, the public counterpart to a separate secret key that is never client-side. "Publishable" is the entire point of the name. The narrow pattern correctly excludes it; our broader check surfaces it anyway, for completeness, and explains exactly why it doesn't count — rather than silently agreeing with the narrow pattern and hiding the near-miss.

## Reproduce

```bash
bash findings/WM-013/reproduce.sh
```

## Evidence

[`evidence/secrets-report.json`](./evidence/secrets-report.json)

## Verdict

**No real client-bundle secret exposure found**, checked with both the target's own pattern and a deliberately broader independent one — and the one broad-only hit is explained, not hidden.
