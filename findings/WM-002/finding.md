# [WM-002] Reserve-then-refund quota logic allows unlimited billable calls (Denial-of-Wallet)

- **Status:** `REPRODUCED-KNOWN` - validates [`GHSA-hcq5-jm84-2395`](https://github.com/koala73/worldmonitor/security/advisories/GHSA-hcq5-jm84-2395) ("MCP daily cost-cap bypass: quota slot refunded after the tool already executed", Moderate)
- **Severity:** CVSS 3.1 **7.2** (High) - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:L` *(computed, not asserted - `node framework/schema/cvss31.mjs "<vector>"` → `7.2`)*
  CVSS 4.0 vector: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:L/VA:N/SC:N/SI:H/SA:H` - models the Subsequent-System impact (the billing ledger) as High; exact numeric score not computed (CVSS 3.1 is authoritative for this finding; the CVSS 4.0 vector is a supplementary cross-check).
- **CWE:** CWE-770 (Allocation of Resources Without Limits), CWE-362 (Race Condition / TOCTOU) · **WSTG:** WSTG-BUSL-02 · **OWASP:** API4:2023 (Unrestricted Resource Consumption)
- **Component:** minimal reproduction harness (`lab/repro-services/dow-mock/`), driven against `lab/mock-upstream/` · **Trust boundary:** 6 (proxy → upstream API boundary)
- **Lab commit pinned:** `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`

## ⚠️ Framing

This reproduces the documented class of a **real, already-published** advisory (`GHSA-hcq5-jm84-2395`) on our own minimal harness - not the live target. See [`docs/ROE.md`](../../docs/ROE.md). It is presented as validation of our Advisory-Aware Regression Harness and as the concrete demonstrable artifact for this Denial-of-Wallet pattern, not as a novel discovery.

## Why this is the signature risk for this specific app

The target's core architecture is a keyed proxy in front of ~40+ paid third-party APIs - its own `.env.example` defines explicit spend budgets (e.g. `AVIATIONSTACK_MONTHLY_BUDGET`) precisely because the owner already fears exactly this class of bug. `GHSA-hcq5` proves it isn't hypothetical: the maintainer already found and fixed a real instance.

## "Isn't this just out-of-scope DoS?" - the rebuttal

The target's `SECURITY.md` explicitly excludes Denial of Service. This is **not** that. Volumetric DoS floods infrastructure to degrade availability. Here, the system stays 100% available and executes **exactly as designed** - the flaw is that it fails to enforce an **authorization boundary on the quantity of resource consumption an unprivileged caller can trigger**, which is precisely OWASP **API4:2023 Unrestricted Resource Consumption**. Treating a missing quota-atomicity check as "network DoS" is the same category error as treating an IDOR as a "database error."

## Description

The quota gate performs, in order: (1) check remaining quota, (2) **reserve** one slot, (3) dispatch the billable upstream call, (4) if the upstream response is classified `content-malformed`, **refund** the slot. Step 4 happens strictly *after* step 3 already executed and was billed - the exact TOCTOU the advisory's own title names ("refunded after the tool already executed"). Any caller who can reliably trigger the malformed classification nets zero cost to their own quota, forever, while the upstream side is billed every single time.

## Steps to reproduce (local)

```bash
bash findings/WM-002/reproduce.sh
```

## Proof of concept - the numbers that make the slide

10 identical attack calls (`malformed=1`) driven at each variant:

| Variant | Attacker's own quota after 10 calls | Real upstream billable calls |
| --- | --- | --- |
| **Vulnerable** | `used: 0` (looks completely clean to the attacker and to any quota dashboard) | **10** - every single attack call billed |
| **Patched** | `used: 3 / 3` (correctly exhausted) | **3** - capped at exactly the daily budget; calls 4-10 rejected `429` before ever reaching the upstream |

Captured evidence: [`evidence/vulnerable-quota-after-attack.json`](./evidence/vulnerable-quota-after-attack.json), [`evidence/upstream-calls-after-vulnerable-attack.json`](./evidence/upstream-calls-after-vulnerable-attack.json), [`evidence/patched-quota-after-attack.json`](./evidence/patched-quota-after-attack.json), [`evidence/upstream-calls-after-patched-attack.json`](./evidence/upstream-calls-after-patched-attack.json).

**The key signal:** on the vulnerable variant, the attacker's own quota display shows they've used *nothing* - the exploit is invisible from their side - while the owner's real bill shows 10 calls against a budget of 3. That divergence between "what the attacker sees" and "what the owner pays" is the entire finding in one screenshot.

## Business impact

Direct, unbounded financial exposure scaling linearly with attack volume, invisible to the victim's own per-caller quota monitoring (because the counter genuinely does return to a low/zero value - this is not a monitoring gap, it's a ledger that is *correctly reporting a false zero*). Repeated at scale against a real metered vendor (aviation data, market data, LLM inference), this is a direct, silent drain on the owner's operating budget.

## Remediation

Make the quota reservation **irrevocable the instant the billable call is dispatched**. A refund may only fire for a pre-flight validation failure that happens strictly *before* dispatch (i.e., before any money is spent) - never based on the *content* of a response to a call that already executed. Demonstrated fix: [`lab/repro-services/dow-mock/patched.mjs`](../../lab/repro-services/dow-mock/patched.mjs), verified by [`findings/WM-002/reproduce.sh`](./reproduce.sh) and by the automated [`framework/regression-harness/run.mjs`](../../framework/regression-harness/run.mjs).

## References

- GHSA-hcq5-jm84-2395 (target's own published advisory)
- OWASP API4:2023 - Unrestricted Resource Consumption
- `docs/WORLDMONITOR-SIH26163-BIBLE-v2.md` §6 (the DoW theory this finding validates)
