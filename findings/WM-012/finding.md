# [WM-012] Software composition analysis - 4 advisories on the auth SDK's transitive tree, reachability unconfirmed

- **Status:** `CANDIDATE-UNCONFIRMED` - this project's first, deliberately. Not every real question resolves to secure-or-vulnerable on static analysis alone, and forcing one here would be exactly the overclaiming this project's whole methodology refuses to do.
- **Severity:** CVSS 3.1 **7.5** (High) - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` (the `image-size` advisory, the clearest-ancestry member of the set) - **computed by our own calculator and it matches npm audit's embedded vector exactly**
- **CWE:** CWE-835, CWE-1104 · **WSTG:** WSTG-CONF-09 · **OWASP:** API9:2023
- **PS scope area:** 4 - API security (supply-chain risk to the request-handling layer)
- **Target commit:** `c7859c70e529db67cb871d2199f0e24d728679c1`

## What real `npm audit` found (works without a full install)

Against the real, live-cloned `package-lock.json` - no `npm install` needed, `npm audit` operates on the lockfile alone: **8 unique root advisories** across 28 flagged packages, 0 critical / 10 high / 18 moderate, out of **1795 total resolved dependencies**.

## What flat severity labels miss - and what our ancestry tracer adds

`npm audit`'s severity is the same whether a vulnerable package sits in your live request handler or in a build tool nobody's process ever executes. This scanner traces each advisory's real ancestry through the lockfile's own dependency graph, then greps the actual source (`api/`, `server/`, `src/`, excluding tests/generated) for whether the nearest real top-level dependency is genuinely imported.

**4 advisories trace to `@clerk/clerk-js`** - the app's confirmed-live auth SDK (see [`findings/WM-008`](../WM-008/)):

| Advisory | Severity | Package |
| --- | --- | --- |
| JXL/HEIF parser infinite-loop DoS | High (7.5) | `image-size` |
| ICNS parser infinite-loop DoS | High (7.5) | `image-size` |
| O(depth²) JSON filter DoS | Moderate (6.2) | `stream-json` |
| Missing buffer bounds check | Moderate (7.5) | `uuid` |

Clerk's real dependency tree bundles Solana wallet-adapter support (likely for a "sign in with wallet" auth method), and that tree drags these in. **This proves `@clerk/clerk-js` is genuinely imported by live code - it does not prove any of these specific vulnerable functions are ever actually called.** That would require call-graph analysis this pass did not attempt. Reporting the honest boundary of what was actually checked, rather than rounding up to "vulnerable" or down to "safe," is the point of `CANDIDATE-UNCONFIRMED`.

**Every embedded CVSS vector was cross-validated** against our own independently-built CVSS 3.1 calculator ([`tests/cvss31.test.mjs`](../../tests/cvss31.test.mjs)) - all 6 vectors npm audit provided matched our computed score exactly, 0 mismatches.

## The narrower, separately-reported case: `ip-address`'s SSRF advisories

Two `ip-address` advisories are, on their title alone, directly on this project's SSRF thesis - `Address6.isLinkLocal()` misclassification and a missing NAT64 range, both "allowing SSRF and trust-boundary bypass." Traced through the real lockfile: `ip-address` ← `socks` ← `telegram`. `telegram` is confirmed imported **only** by [`scripts/telegram/session-auth.mjs`](../../.cache/worldmonitor-src/scripts/telegram/session-auth.mjs) - an operational script for Telegram session setup, not the live web request-handling path. Real advisory, real SSRF class, but a narrower real-world risk than the headline suggested before checking.

## Reproduce

```bash
bash findings/WM-012/reproduce.sh
```

## Evidence

[`evidence/sca-report.json`](./evidence/sca-report.json) - full per-advisory ancestry and reachability data. [`evidence/sbom.cyclonedx.json`](./evidence/sbom.cyclonedx.json) - a real CycloneDX 1.5 SBOM, 1666 components, 9 vulnerability records, generated from the actual lockfile.

## Real remediation patch

[`remediation.patch`](./remediation.patch) - a real unified diff bumping the direct `undici` dependency `7.29.0` → `7.30.0` (closes `GHSA-3wwx-pv8p-q78v`, the WebSocket permessage-deflate DoS). This is not a hand-typed example: it was generated against the real pinned source and **verified with `git apply --check`** to apply cleanly - `findings/WM-012/reproduce.sh` re-verifies this every run.

## Verdict

**Honestly unresolved, and reported that way.** 4 advisories on packages whose top-level parent (`@clerk/clerk-js`) is genuinely live-imported, but whose own vulnerable functions were not confirmed reachable. 2 advisories confirmed to trace only through an operational script. Remediation is the standard, low-cost move (`npm audit fix` - patched versions are available for all of these) regardless of the reachability answer, so acting on it costs nothing while the deeper question stays open. One concrete fix (`undici`) is provided as a real, verified, applyable patch rather than left as prose.
