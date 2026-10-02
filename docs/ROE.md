# Rules of Engagement - scope, ethics, authorization

**Build-map ticket:** #3 (🟨 SAFETY, FOUNDATION) · **Bible:** §12

PS 26163 hands us the app link *and* the open source as the dataset, and NTRO is the requesting body - so the authorization is real. It is also **bounded**, and the PS constraints are the grading rubric's integrity check:

> *"Testing must be performed only on authorized systems. No actions should affect production users or data. Exploitation should be limited to proof-of-concept validation. Compliance with applicable laws, policies, and ethical hacking guidelines is required."*

## The one hard rule

> **Every active PoC runs against a LOCAL instance built from source. `worldmonitor.app` - its real users, data, and paid API quotas - is OUT OF BOUNDS for any active testing.**

This is not an apology; it is the professional posture, and it is exactly what an NTRO jury rewards. WorldMonitor is a live product (87.5k★, a paid Pro tier, a published security policy). Attacking production would be illegal/unethical, would violate the PS constraints, could run up the owner's real third-party API bills, and is an instant disqualifier. Self-hosting is fully supported (`SELF_HOSTING.md`, `docker-compose.yml`), so the local lab is a legitimate, faithful environment.

## Permitted

| Action | Where |
| --- | --- |
| Active PoCs, bursts, auth bypass attempts, injection tests | `localhost` / `127.0.0.1` only |
| Metered-upstream tests (Denial-of-Wallet, rate limits) | `lab/mock-upstream/` stub only - never a real vendor |
| Reading the public source, the advisory register, the shipped client bundle | Public, read-only |
| Passive, unauthenticated observation of the live site (response headers) | `worldmonitor.app` - a normal browser visit, nothing crafted, nothing repeated enough to look like abuse |

## Forbidden (red lines)

- No active or attack traffic against `worldmonitor.app` or any real infrastructure.
- No requests that drive real, metered third-party APIs - that is the owner's money.
- No accessing, exfiltrating, or modifying any real user's data. Two seeded test accounts only.
- No weaponized or destructive payloads, even locally. **Benign markers only** - `console.log(document.domain)`, a DOM marker, a bounded burst against the stub.
- No public disclosure of an unpatched novel finding. Private channel first (below).
- No severity inflation; no claiming a finding that was not reproduced.

## Responsible disclosure

Anything genuinely novel (`CONFIRMED-NOVEL`) is reported through the repository's own **`SECURITY.md` GitHub Private Vulnerability Reporting** channel (→ `@koala73`) *before* any public mention, aligned to CERT-In's RVDCP and an ISO/IEC 29147 / 30111 posture. The SIH deliverable demonstrates it on the local instance. Ticket #25 records this stance.

## What cannot be reproduced locally (say so honestly)

Some behaviour is Vercel-Edge- or Cloudflare-specific - e.g. the exact Edge `fetch` socket behaviour behind the DNS-rebinding residual (`GHSA-887j-p88r-qmm9`). Where only the *class* can be shown locally and production impact is reasoned from code, **state that explicitly** and cite the code. That honesty is a feature, not a gap.

## The rehearsed answer

> *"Did you test the live site?"* → **"No active testing on production - that would violate the PS constraints and be unethical. Passive header inspection only; everything active ran on our local instance, and every metered call hit our own stub."**
