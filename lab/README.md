# Local Lab

**Owned by:** Phase 2 (tickets #9–#12). **Do not populate before Phase 2 is authorized.**

No lab → no legitimate PoC. Everything active in this project runs here, never against production. See [`../docs/ROE.md`](../docs/ROE.md).

## Planned contents

| Path | Ticket | Purpose |
| --- | --- | --- |
| `docker-compose.yml` / bring-up notes | #9 | Local WorldMonitor instance built from source (`SELF_HOSTING.md`) |
| `mock-upstream/` | #10 | ~50-line HTTP stub answering metered upstream API shapes (AviationStack, Finnhub, …) so Denial-of-Wallet tests never touch a real vendor |
| `seed/` | #11 | Two seeded test users (free + Pro) and one local feed source we control |
| this file | #12 | **The pinned commit hash and config** every finding references |

## Pinned lab state

| Field | Value |
| --- | --- |
| Target commit | `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0` |
| Commit date | 2026-09-28T20:28:16+02:00 |
| Fetch command | `bash lab/fetch-target-source.sh` (writes to `.cache/worldmonitor-src/`, gitignored, ~200MB) |
| Used for | **Static analysis only** (`framework/seam-linter/*`) — reading public source, never a running deployment. See `docs/ROE.md`. |
| Live-instance status | **Not stood up.** We hold no credentials for the target's real Vercel/Convex/Upstash/Cloudflare project and did not attempt to obtain any. Per build-map ticket #9's own fallback: "a partial honest lab beats a fake full one." |
| What we built instead | `lab/mock-upstream/` + `lab/repro-services/{bola-mock,dow-mock}/` — minimal, faithful, MIT-your-own-code reproductions of two documented advisory patterns, driven over real local HTTP. Each has vulnerable + patched variants and is explicitly labelled as a reproduction, not the live app, in its own README/source comments. |
| Date pinned | 2026-09-28 |

Re-fetch before trusting any `framework/seam-linter/output/*` result — the target repo has daily commit velocity:

```bash
bash lab/fetch-target-source.sh
node framework/seam-linter/rate-limit-coverage-check.mjs .cache/worldmonitor-src
node framework/seam-linter/cors-scan.mjs .cache/worldmonitor-src
node framework/seam-linter/analyze-invariants.mjs .cache/worldmonitor-src
```

## Rules

- **Mock everything metered.** Real upstream calls cost the owner money and are a red line.
- **Two seeded accounts only** — a victim and an attacker, both ours. Never a real user's data.
- **Pin the commit.** The target sees daily commits; a finding without a pinned hash is not reproducible.
- **Be honest about the gaps.** Some behaviour is Vercel-Edge-specific (e.g. the `GHSA-887j` socket-pinning residual) and can only be demonstrated as a *class* locally. Say so; cite the code.
