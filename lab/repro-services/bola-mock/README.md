# bola-mock — minimal reproduction harness for GHSA-r649-4cqj-w93h

> **This is NOT the live WorldMonitor / Convex deployment.** We have no credentials for the target's real Convex project, and standing one up is out of scope for a local, credential-free lab. This is a **minimal, faithful reproduction** of the documented vulnerability *pattern* — a public query with no per-caller ownership filter — built from the advisory's own description: *"Unauthenticated cross-tenant read of all users' alert rules via public Convex query `getByEnabled`."*

Two servers, same route shape, same seed data:

| File | Behavior |
| --- | --- |
| `vulnerable.mjs` | `GET /alertRules?enabled=true` returns **every** user's alert rules — the pre-fix pattern. No caller identity is consulted. |
| `patched.mjs` | Same route, but requires `X-User-Id` + a valid session token, and filters results to `ownerId === callerId` — the pattern Convex's own docs prescribe ("use `ctx.auth`, which cannot be spoofed" — see `docs/ground-truth.md`). |

Seed data (`seed.mjs`): two users, matching `docs/ROE.md`'s "two seeded test users" rule — `user-free-001` (free tier) and `user-pro-002` (Pro tier) — each owning distinct alert rules. Both are synthetic, created for this lab only.

## Run it

```bash
node lab/repro-services/bola-mock/vulnerable.mjs 4101 &
curl -s -H "X-User-Id: user-free-001" "http://localhost:4101/alertRules?enabled=true" | jq
# -> returns BOTH users' rules, including user-pro-002's, despite the caller being user-free-001
```

```bash
node lab/repro-services/bola-mock/patched.mjs 4102 &
curl -s -H "X-User-Id: user-free-001" -H "X-Session-Token: valid-free-001" "http://localhost:4102/alertRules?enabled=true" | jq
# -> returns ONLY user-free-001's rules
```

See `findings/WM-001/reproduce.sh` for the scripted, evidence-capturing version of this.
