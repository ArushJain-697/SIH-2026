# Landmine Register — strings that must NEVER appear in a deliverable

**Build-map ticket:** #2 (🟨 SAFETY, FOUNDATION) · **Bible:** §3

These came out of the Gemini Deep Research round and are **fabricated or factually wrong**. They read as authoritative because an LLM wrote them fluently. Fluency is not truth. The jury for PS 26163 is NTRO — they *own* the target repo and *wrote* the CERT-In/NCIIPC documents. One of these on a slide ends the submission.

## Tier 1 — Fabricated identifiers (do not exist)

| String | Why it's fatal |
| --- | --- |
| `GHSA-4f5g-9h8j-2k1l` | Invented. Real GHSA IDs are random (`GHSA-9gp4-366w-pcq3`); these are keyboard walks. |
| `GHSA-m9n8-b7v6-c5x4` | Invented. |
| `GHSA-7v6c-5x4z-3a2s` | Invented. |
| `CVE-2025-29811` | Invented ("GraphQL query batching DoS"). The app has no GraphQL. |

## Tier 2 — Wrong architecture (instant "they didn't read the code")

Never describe the stack as any of: **React**, **Express**, **Socket.io**, **Apollo GraphQL**, **Winston**, **Leaflet.js**, **Mapbox GL**, **axios**, **Preact**, `dangerouslySetInnerHTML`, `src/backend/feedParser.ts`, `src/frontend/components/Map.tsx`, `socketManager.ts`.

→ The real stack is in [`ground-truth.md`](./ground-truth.md). Cite that file only.

## Tier 3 — Wrong attributions and events

| Claim | Reality |
| --- | --- |
| Cody Richard reported "rate-limit race / Winston log leak / prototype pollution" | He reported **IPC command exposure, renderer-to-sidecar trust boundary, fetch-patch credential injection** (README, 2026). |
| "OpenAI AI-worm disclosure, September 25 2026" | Not verified. Use the real precedent: **Morris II** (Cohen et al., 2024), self-replicating prompt-injection worm. |
| Hacker News thread `id=39847291`, r/netsec threads, SANS ISC features on WorldMonitor | Invented citations. |
| PRs `#412`, `#488`, `#503`, `#521`, `#599`, `#642`, `#689`, `#715` as WorldMonitor security fixes | Invented. |

## Tier 4 — Verify before slide (plausible, unconfirmed)

Use the **concept**, not the unverified specific. Confirm against the primary source or speak generally.

- CERT-In audit guidelines: the **dual CVSS + EPSS mandate is VERIFIED REAL** ✅ — but the exact publication date ("July 25 2025") and "Section 16" numbering are **not** confirmed.
- RVDCP PGP key `0x3B4E082C` — unverified. Never print a crypto key you haven't checked.
- Named past SIH winners ("Team Syndicate PS 1744", "Team Radar Vision PS 1606") — unverifiable anecdotes.
- Exact SIH rubric percentages (20% / 25% / 20%) — plausible shape, invented precision.
- NCIIPC CAF control IDs (e.g. "C101") — verify or describe generally.
- Per-model hallucination rates ("Gemini 64.5%", "GPT-4 Turbo 3.59%") — the **averages** from arXiv 2406.10279 are safe (19.7% / 21.7% / 5.2% / 43% repeat); these per-model figures are not.
- arXiv IDs `2510.26103` and `2608.23897` — confirm they resolve before citing.
- Any "future-dated" 2026 CVE — confirm it resolves.

## Enforcement

Ticket #31 runs a scan of every deliverable (README, `findings/`, `report/`, `deck/`) against Tiers 1–3. Zero hits is the pass condition.

```bash
# placeholder — implemented in ticket #31
grep -rniE 'GHSA-4f5g|GHSA-m9n8|GHSA-7v6c|CVE-2025-29811|Socket\.io|Apollo|Winston|Leaflet|Preact|dangerouslySetInnerHTML' README.md docs/ findings/ report/ deck/
```
