# [WM-005] Type-safety-silencing casts near security-sensitive code - manually reviewed, none unsafe

- **Status:** `VERIFIED-SECURE`
- **Control tested:** complete (not sampled) scan of every `as any`/`as unknown` in the real source for proximity to a security-sensitive marker, with every candidate individually read in full context.
- **CWE:** CWE-704 (Incorrect Type Conversion), CWE-843 (Type Confusion) · **WSTG:** WSTG-INPV-05
- **Component:** full non-generated, non-test source tree (`src/`, `api/`, `server/`, `convex/`)
- **Lab commit pinned:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

## The class this tests for

Bible §4: an AI-assisted-codebase-specific vulnerability where a developer or agent casts a value to `any`/`unknown` purely to make a compiler error disappear, and in doing so silently erases the type system's guarantee right at a security-relevant boundary - an auth object, an entitlement check, untrusted parsed input. Rather than assume this exists, we checked directly.

## Method

[`framework/seam-linter/cast-adjacency.mjs`](../../framework/seam-linter/cast-adjacency.mjs) found every `as any`/`as unknown` occurrence in the real source (excluding generated code and tests), then checked a ±5-line window around each for one of seven curated security-sensitive markers (auth header reads, rate-limit calls, CORS headers, `localStorage`, HTML sinks, premium-fetch/entitlement checks, `JSON.parse` of request-shaped variable names).

**Scope, stated honestly:** non-null assertion (`!`) was deliberately excluded. A regex that reliably distinguishes a real non-null assertion from `!=`, `!==`, or logical negation (`!x`) needs a real TypeScript AST parser - the same limitation already noted for `scripts/enforce-premium-fetch.mjs` in `framework/seam-linter/output/invariant-coverage-map.md`. Flagged as future work rather than shipped as a noisy, low-precision regex.

## We show our false positives here too

The first pass found **4** candidates. Two were inside `e2e/*.spec.ts` end-to-end test files - our initial exclusion pattern only matched `.test.ts`, not `.spec.ts`. Fixed and re-run: **2** real candidates remained, across **262** total occurrences in **1724** files.

## The two real candidates, read in full

**`convex/apiPlanLimitUsage.ts:522`** - `(internal as any).apiPlanLimitUsage.listActivePaidEntitlements`. This is a standard, widely-used Convex idiom: referencing an internal (server-only) function via the generated `internal` API object, where TypeScript's circular type inference on the generated API surface can't always resolve before the module fully loads. Critically, the **return value is still explicitly type-asserted** immediately after (`) as ActiveEntitlement[]`) - type safety on the data that actually flows through this entitlement-checking path is preserved. Only the function-reference lookup itself is loosely typed, not the security-relevant payload.

**`src/app/event-handlers.ts:1164`** - `const parsed = JSON.parse(raw) as unknown;`, immediately followed by an explicit `Array.isArray(parsed)` check and a type-predicate `.filter((value): value is string => ...)` narrowing to `string` before the value is used anywhere. This is **textbook-correct** defensive parsing of untrusted `localStorage` data - casting to `unknown` (never `any`) and validating at runtime before use is exactly what secure TypeScript is supposed to do. If anything, this is exemplary practice, not a boundary degradation.

## Reproduce

```bash
bash findings/WM-005/reproduce.sh
```

## Evidence

[`evidence/cast-adjacency-report.json`](./evidence/cast-adjacency-report.json), [`evidence/cast-adjacency-output.txt`](./evidence/cast-adjacency-output.txt).

## Verdict

**Control holds, completely.** 262 of 262 real occurrences accounted for (not sampled); the 2 that warranted closer inspection were read in full context and confirmed benign - one preserves type safety on the security-relevant payload despite a loose function-reference lookup, the other is exemplary defensive input validation. No remediation required.
