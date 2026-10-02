# [WM-009] Premium-fetch authorization - real AST re-derivation, all 9 real call sites correctly gated

- **Status:** `VERIFIED-SECURE`
- **PS scope area:** 2 - Authorization & access control
- **CWE:** CWE-863, CWE-285 · **WSTG:** WSTG-ATHZ-01 · **OWASP:** API5:2023
- **Target commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

## The gap this closes

The earlier pass of this assessment explicitly refused to approximate this check with a regex, stating plainly it "needs a full TypeScript AST parser." This pass builds that parser-based check for real, using the actual TypeScript Compiler API (isolated in [`engine/scanners/ast-tools/`](../../engine/scanners/ast-tools/) - the one dependency this otherwise zero-dependency engine uses, and only for this).

## Why this specific check matters - a real, documented, shipped bug class

`scripts/enforce-premium-fetch.mjs`, the target's own 470-line AST-based CI invariant, exists because this exact bug happened for real. Its own header comment:

> *"Catches the HIGH(new) #1 class from #3242 review - `SupplyChainServiceClient` was constructed with `globalThis.fetch` (the generated default) and pro users silently got 401s the generated client swallowed into empty-fallback panels."*

A paying customer's premium API call silently downgraded to an **unauthenticated** request, which then failed and rendered an empty panel - with no error surfaced. That's a real Pro-tier authorization bypass, shipped once, now guarded against by CI.

## What our independent parser checked

For every one of **791 real, non-generated source files**: find every `new <X>ServiceClient(...)` construction, trace the bound variable, find every method call made on it in the same file, cross-reference each called method's path against the real premium-path registry, and - only where a premium method is actually called - verify the client was constructed with `fetch: premiumFetch` or the one documented delegating adapter, `proFreshRpcFetch`.

## Result

**9 real client instances** across 7 files actually call at least one premium-gated method. **All 9 are correctly gated** - including a fresh construction of `SupplyChainServiceClient`, the exact class named in the bug's own history:

```
src/services/supply-chain/index.ts:84 | SupplyChainServiceClient as client | fetch: premiumFetch
  methods: getMineralProduction, getCountryChokepointIndex, getBypassOptions,
           getCountryCostShock, getSectorDependency, getRouteExplorerLane,
           getRouteImpact, getCountryProducts, getCountryVulnerabilities,
           getChokepointDependencies, getMultiSectorCostShock
```

`src/services/market/index.ts` correctly uses the narrower `proFreshRpcFetch` adapter for the physical-metals premium routes - exactly matching what `src/shared/premium-paths.ts`'s own comment documents as the intended pattern for that specific client.

## Honest scope note

This is a genuinely independent re-derivation, not a line-for-line port of the target's 470-line script - it reuses their real method→path extraction (pure data extraction, not the security-relevant part) but implements the delegating-adapter and call-site tracing more conservatively. Where our analysis cannot prove a call site safe, it reports `CANDIDATE-UNCONFIRMED`, never a false `VERIFIED-SECURE` - that branch simply did not fire this run, because all 9 real instances found were provably safe.

## Reproduce

```bash
bash findings/WM-009/reproduce.sh
```

## Evidence

[`evidence/authz-access-report.json`](./evidence/authz-access-report.json) - full per-instance findings for all 9 client constructions.

## Verdict

**All 9 real premium-method call sites correctly gated, independently verified with a real parser - including the exact class of client the target's own bug history names.**
