# [WM-003] Non-GET gateway route rate-limit/fail-closed coverage — independently re-verified

- **Status:** `VERIFIED-SECURE`
- **Control tested:** independent re-derivation of the target's own systemic non-GET-route rate-limit coverage guardrail, against the **real, live-cloned source** at the pinned commit — not a description of the control, an actual re-execution of an equivalent check built from scratch.
- **CWE:** CWE-770, CWE-841 · **WSTG:** WSTG-BUSL-02
- **Component:** `server/_shared/rate-limit.ts` registries vs. all 38 `docs/api/*.openapi.json` generated routes
- **Lab commit pinned:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

## This IS "audit the auditor" — in the maintainer's own words

`scripts/enforce-rate-limit-policies.mjs` (the target's own CI invariant) documents, in its own header comment, a **real historical seam bug** it exists to prevent:

> *"the sanctions-entity-search review finding — the policy key was `/api/sanctions/v1/lookup-entity` but the proto RPC generates path `/api/sanctions/v1/lookup-sanction-entity`, so the 30/min limit never applied and the endpoint fell through to the 600/min global limiter."*

That is a rename-drift **seam between a control (the policy registry) and its real target (the generated route)** — exactly the class this project's thesis predicts for an AI-assisted, CI-guarded codebase. We did not invent this pattern or need to demonstrate it hypothetically: **the maintainer's own code comment describes it.**

## What we independently re-built (methodological note)

We deliberately did **not** import or execute the target's own script. We reimplemented its stated guardrail from a different angle:

| | Target's own script | Our independent tool |
| --- | --- | --- |
| Route source | `docs/api/*.openapi.yaml`, parsed with the `yaml` npm package | `docs/api/*.openapi.json` (the JSON siblings), parsed with native `JSON.parse` — zero dependencies |
| Registry extraction | Dynamic `tsx` import of the live TS module | Regex extraction over the TS object literal text |
| Execution | Runs in the target's own CI | Runs standalone against a cloned checkout, from this project |

If two differently-built tools agree the guardrail holds, that is stronger evidence than trusting the target's own CI a second time.

## Method

[`framework/seam-linter/rate-limit-coverage-check.mjs`](../../framework/seam-linter/rate-limit-coverage-check.mjs) checks three things against the live source:
1. Every generated **non-GET** gateway route is covered by `ENDPOINT_RATE_POLICIES` or explicitly, justification-carrying exempt via `RATE_LIMIT_MUTATION_FALLBACK_EXEMPT`.
2. Every route in `FAIL_CLOSED_ENDPOINT_RATE_POLICY_REQUIRED` actually has a corresponding `ENDPOINT_RATE_POLICIES` entry.
3. No runtime call site in `server/`/`api/` opts out of fail-closed behaviour via `checkEndpointRateLimit(..., { failClosed: false })`.

## Reproduce

```bash
bash findings/WM-003/reproduce.sh
```

## Evidence

[`evidence/rate-limit-coverage-report.json`](./evidence/rate-limit-coverage-report.json) — full machine-readable output.

| Metric | Value |
| --- | --- |
| OpenAPI spec files parsed | 38 |
| Total gateway routes | 236 |
| Non-GET routes checked | 18 |
| `ENDPOINT_RATE_POLICIES` entries | 59 |
| `FAIL_CLOSED_ENDPOINT_RATE_POLICY_REQUIRED` entries | 50 |
| Uncovered non-GET routes found | **0** |
| Fail-closed-required-without-policy found | **0** |
| Fail-open opt-outs found in runtime code | **0** |

## Verdict

**The guardrail holds** at commit `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`. All 18 non-GET routes across 236 gateway routes are triaged into either a rate-limit policy or an explicit, justified exemption; every fail-closed-required route has its policy; no runtime escape hatch was found. Reported honestly as a held control, not stretched into a finding — this is exactly the "we report our misses" discipline the bible's methodology requires (§0, §11).

The reusable contribution is the **method**: this independent-re-derivation technique generalizes to any CI-guarded codebase and is one instance of the "Advisory-Aware Regression Harness" capability proposed as a reusable NTRO tool (bible §7).
