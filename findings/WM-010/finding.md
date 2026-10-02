# [WM-010] Generated API runtime validation - central wiring confirmed, exceptions genuinely compensated

- **Status:** `VERIFIED-SECURE`
- **PS scope area:** 3 - Input validation & data handling
- **CWE:** CWE-20, CWE-1173 · **WSTG:** WSTG-INPV-01 · **OWASP:** API8:2023
- **Target commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

## The class this targets

`GHSA-cmj5-cfhr-w964` - "Generated API runtime validation is disabled." The generated Sebuf server code exposes `validateRequest` as an *optional* parameter (`options?.validateRequest`) - if whatever wires up the server doesn't pass one, validation silently no-ops. No error, no warning.

## Check 1: the central wiring

`server/gateway.ts` - the one place that constructs every generated server - passes `validateRequest: validateGeneratedRequest`. ✅ Confirmed.

## Check 2: the two documented exceptions, and whether they're actually compensated

Two handlers go further than the default and **explicitly say** the gateway does *not* validate them:

> *"Matches the proto's documented `max_len`, enforced HERE because the gateway supplies no `validateRequest` (server/gateway.ts) - buf.validate annotations document the contract but do not run. Unclamped, an arbitrarily long string would be shipped to a paid embeddings provider on every call."*

This is genuinely self-aware engineering - the team knows the generic path doesn't cover these two routes (they call a paid embeddings provider, where an unbounded input is a real cost risk) and says so in the code. The interesting question is whether the claimed compensating bound is **real** or just a comment. Checked directly:

| File | Declared bound | Actually enforced? |
| --- | --- | --- |
| `search-intel-history.ts` | `MAX_QUERY_LEN = 500` | ✅ `validateHistoryText(req.query, 'query', 2, MAX_QUERY_LEN)` |
| `get-similar-events.ts` | `MAX_SITUATION_LEN = 1000` | ✅ `validateHistoryText(req.situation, 'situation', 10, MAX_SITUATION_LEN)` |

Both bounds are passed into a real validation call in the same file, not merely declared and forgotten.

## Why this is reported in full, not simplified

The honest finding here isn't "validation is always on" - it's more precise than that: **the generic path has two narrow, explicitly-documented exceptions, and both are genuinely compensated, verified to actually run.** That nuance - not every route needs identical protection, and a team that documents *and enforces* its own exceptions - is a stronger signal of engineering maturity than a flat "100% coverage" claim would be.

## Reproduce

```bash
bash findings/WM-010/reproduce.sh
```

## Evidence

[`evidence/input-validation-report.json`](./evidence/input-validation-report.json)

## Verdict

**The central fix for the GHSA-cmj5 class holds, and both documented exceptions to it carry real, verified, actually-enforced compensating controls - not just comments claiming one exists.**
