# SIH 26163 — WorldMonitor Security Assessment · BIBLE v2
### "We didn't try to look scary. We audited the seams an autonomous pipeline leaves — and proved it on the target's own scars."

**Problem Statement:** 26163 — *Security Assessment of the World Monitor application*
**Requesting body:** NTRO (National Technical Research Organisation)
**Category:** Software / Smart Automation
**Target (code):** `github.com/koala73/worldmonitor` · author **Elie Habib** · **AGPL-3.0** · **87.5k★ / 13.3k forks**
**Target (live):** `worldmonitor.app` *(passive observation only — see §9)*

> **This is v2.** v1 (the Downloads bible) had a factual error and a strategy-breaking blind spot. Everything below is either (a) verified against the live repo/web on 2026-09-28, or (b) explicitly flagged as "verify before slide." Read §0 and §1 before anything else.

---

## 0. What v1 got wrong (read this first)

You were right not to trust v1. Two problems, one fatal:

1. **Factual error:** v1 called the frontend a *"Preact SPA."* It is **vanilla TypeScript + Vite** (globe.gl/Three.js + deck.gl/MapLibre). A judge catches this in 10 seconds.
2. **Fatal blind spot:** v1 treated H1 (denial-of-wallet), H3 (BOLA), H9 (XFF-spoof) as *fresh hypotheses to "discover."* **They are already published GitHub Security Advisories on the repo.** WorldMonitor has **~11 public advisories.** If you present any of them as a novel discovery, any judge who opens the repo's Security tab sees it → instant credibility collapse, read as plagiarism.

**The consequence for strategy:** the win is no longer "find bugs in a hard app" (you'll fail, or re-report advisories). The win is a **differentiated methodology** that uses the advisory history as *proof the method works*, plus a **reusable capability** NTRO can keep. That reframe drives this whole document.

---

## 1. The thesis (one sentence) and why it wins

> **WorldMonitor is an AI-built, CI-hardened codebase; its own 11 advisories prove that its dozens of automated linters push bugs to the *seams* between a control and its exceptions — so we built an advisory-aware, seam-focused assessment *framework* that finds that bug class, scored to CERT-In standard, and reusable across NTRO's estate.**

Three pillars, each a slide, each defensible:

| Pillar | Claim | Proof it isn't hot air |
|---|---|---|
| **Hook — Novelty** | This is a machine-maintained codebase (7,900+ commits, daily velocity, `.agents/skills`, `AGENTS.md`, dozens of `enforce-*.mjs` linters). We audit the *control-vs-exception seam*, not the happy path. | The target has dozens of linters **and still shipped 11 advisories** — several living exactly at that seam (fail-open, validation-disabled, refund-race). Empirical, on-target proof. |
| **Spine — Rigor** | Every finding class maps to an external authority **and** a real WorldMonitor advisory. We reproduce in a local lab; we score CVSS + EPSS; we report what held. | The platform↔advisory table (§5). Nothing hand-wavy. |
| **Money shot — Impact** | Denial-of-Wallet is this app's signature risk (a keyed proxy in front of paid APIs). It's an *authorization* flaw (OWASP API4:2023), not out-of-scope DoS. | Vector-B (quota-refund TOCTOU) **is literally advisory GHSA-hcq5-jm84-2395.** Theory = the target's own scar. |

**Why an NTRO jury rewards this:** intelligence orgs despise scanner dumps and severity inflation; they reward tradecraft, reproducibility, honesty, and *reusable capability*. This thesis is built entirely from those values.

---

## 2. Ground truth — verified facts (cite these freely)

### 2.1 The real architecture
- **Frontend:** Vanilla TypeScript + Vite. Maps: globe.gl/Three.js (3D globe), deck.gl/MapLibre GL (flat map). i18n multi-locale. **No React/Vue/Angular.**
- **Backend:** Serverless — **Vercel Edge Functions** under `api/`, domain RPCs via **Sebuf** (proto-first RPC, Protocol Buffers). **Railway relay.**
- **State/data:** **Upstash Redis** (KV + rate state), **Cloudflare R2/KV** (objects/bootstrap bundles), **Convex** (app data / auth / alerts), **Dodo Payments** (Pro tier).
- **Desktop:** **Tauri 2 (Rust)** with a **Node.js sidecar**; secrets in OS keychain (consolidated vault).
- **Agent surface:** **MCP server** at `worldmonitor.app/mcp` (Streamable HTTP; public `tools/list`, authed `tools/call` via `X-WorldMonitor-Key` or OAuth). Public REST API + OpenAPI. CLI (`npx worldmonitor`) + Python/Ruby/Go SDKs.
- **The security-defining insight (still true):** the server's core job is to hold ~40+ third-party API keys and **proxy** to metered upstreams. So the risks that matter are **proxy abuse, denial-of-wallet, SSRF, and API-layer authorization** — not generic web bugs.

### 2.2 The real advisory register (the "prior art" — DO NOT re-report as novel)
Verified from the repo's Security → Advisories tab (2026-09-28):

| GHSA | Severity | What it is | Class it demonstrates |
|---|---|---|---|
| `GHSA-r649-4cqj-w93h` | **High** | Unauth cross-tenant read of **all** users' alert rules via public Convex query `getByEnabled` | BOLA / public-function authz |
| `GHSA-2x6r-qq54-mmhr` | **High** | Windows command injection in Tauri `open_url` IPC (`cmd /c start`) — user-assisted desktop RCE | Desktop IPC / command injection |
| `GHSA-5458-hq84-hcr5` | **High** | Desktop trusted windows could read the full secret cache + local API token | Desktop capability isolation |
| `GHSA-c267-988w-7pq7` | Moderate | Abuse-control / rate-limit bypass via spoofable `cf-connecting-ip` header | IP-trust / rate-limit bypass |
| `GHSA-hcq5-jm84-2395` | Moderate | **MCP daily cost-cap bypass: quota slot refunded after the tool already executed** | **Denial-of-Wallet / TOCTOU** |
| `GHSA-9m4c-824h-m4xw` | Moderate | Slack/Discord OAuth state consumption **non-atomic and fail-open** | Fail-open error handling |
| `GHSA-cmj5-cfhr-w964` | Moderate | **Generated API runtime validation is disabled** | Contract-vs-handler validation drift |
| `GHSA-gxj5-54wh-7vgr` | Moderate | Browser sessions can poison shared temporal baselines | Shared-state poisoning |
| `GHSA-9gp4-366w-pcq3` | Moderate | Weak (FNV-1a 52-bit) cache key → unauth shared-cache poisoning | Weak hashing / cache poisoning |
| `GHSA-5j39-mmw6-cqw6` | Moderate | MCP SSE replay not bound to the authenticated owner | Session/replay binding |
| `GHSA-f6gj-3v7v-j75q` | Low | OAuth refresh-token reuse not contained (no family revocation) | Token-reuse containment |
| `GHSA-887j-p88r-qmm9` | draft | DNS-rebinding residual in MCP proxy (Edge `fetch` can't pin socket) | SSRF residual (accepted) |

Also credited in README: researcher **Cody Richard** — IPC command exposure, renderer-to-sidecar trust boundary, fetch-patch credential injection (2026).

**How to use this register:** it is your *credibility engine*, not your findings list. It proves (a) you actually understand the target, (b) the seam thesis is real, (c) you won't waste the jury's time re-reporting known bugs. Your *new* findings must live in the gaps around these (§4).

---

## 3. LANDMINES — never say these (they will end you)

These came from the Gemini research and are **fabricated or wrong**. If any reach a slide, a judge who knows the repo/standards destroys you.

- ❌ **Any of these GHSA/CVE IDs** — they do not exist: `GHSA-4f5g-9h8j-2k1l`, `GHSA-m9n8-b7v6-c5x4`, `GHSA-7v6c-5x4z-3a2s`, `CVE-2025-29811`.
- ❌ **The stack "React / Express / Socket.io / Apollo GraphQL / Winston / Leaflet / Mapbox / axios."** All wrong. (See §2.1 for the real one.)
- ❌ **"Preact SPA."** It's vanilla TS.
- ❌ **Cody Richard reported "rate-limit race / Winston log leak / prototype pollution."** Wrong — see §2.2 for his real findings.
- ❌ **"OpenAI AI-worm disclosure, Sept 25 2026."** Use the real thing: **Morris II** (Cohen et al., 2024) for self-propagating prompt-injection worms.
- ⚠️ **Verify-before-slide (plausible but unconfirmed specifics):** RVDCP PGP key `0x3B4E082C`; the exact CERT-In guideline date "July 25 2025"; named past SIH winners (Team Syndicate/Radar Vision); exact SIH rubric percentages; per-model hallucination rates (Gemini 64.5% etc.); arXiv IDs `2510.26103` and `2608.23897`. Use the *concept*, not the unverified number.

**Rule:** a fact goes on a slide only if it's in §2 (verified), §5 (verified anchor + real advisory), or §11 (verified sources). Everything else is spoken generally or checked first.

---

## 4. The novel core — auditing the AI-seam (your 25% innovation, part 1)

**Thesis, expanded:** Autonomous agents write code that *satisfies the linter syntactically* while missing *semantic* security across sibling paths. Dozens of `enforce-*.mjs`/`check-*.mjs` invariants create a fortified happy path — and push bugs to four predictable seams:

1. **Isomorphic sibling paths.** The agent secures `updateFoo` (the prompted path) but generates `updateBar` (a sibling, later) without the auth decorator. → *WorldMonitor proof:* `GHSA-r649` (a public Convex query left unguarded while siblings were guarded).
2. **Fail-open async handlers.** RLHF rewards "don't crash," so `catch` blocks return a default *open* state. → *proof:* `GHSA-9m4c` ("non-atomic and **fail-open**").
3. **Linter-satisfied-but-semantically-dead controls.** The invariant checks the *call exists*; the agent disabled/emptied the actual check to make the build pass. → *proof:* `GHSA-cmj5` ("Generated API runtime **validation is disabled**").
4. **Chronological orphans + TOCTOU.** Endpoints predating an invariant escape it; reserve-then-refund quota logic races. → *proof:* `GHSA-hcq5` (refund-after-execute).

**External anchors (verified, citable):**
- **arXiv 2406.10279 — *"We Have a Package for You!"*** (USENIX Security 2025). Package-hallucination rates: **19.7% avg, 21.7% open-source, 5.2% commercial; 43% of hallucinations repeat identically** → this is what makes **slopsquatting** (MITRE **T1195.001**) scalable. Real incident: **`huggingface-cli`** hallucination registered on PyPI → ~30k downloads, picked up by Alibaba (Lasso Security / Bar Lanyado).
- **Morris II** (Cohen et al., 2024) — self-replicating prompt-injection worm through agent pipelines. *(Use this, not the fabricated OpenAI date.)*

**Why this wins:** no other SIH team will frame the target as a machine-maintained artifact and hunt the seam. And you can *prove the thesis on the target itself* — the linters-vs-advisories paradox is the single most memorable point you have.

---

## 5. The proof spine — platform ↔ authority ↔ real advisory (your rigor)

Every risk class ties to an external authority **and** a WorldMonitor advisory. This table is the backbone of your technical-depth slide and your Q&A defense.

| Platform | Vulnerability class (real) | External anchor (verified) | Real WM advisory |
|---|---|---|---|
| **Vercel Edge `fetch`** | Edge runtime can't pin socket to vetted IP → check-then-connect TOCTOU → DNS-rebinding SSRF (public IP for the check, `169.254.169.254` for the connect); IP-encoding bypass (`2130706433`) | **`vercel-labs/guarded-fetch`** (Vercel's own lib; "connect-time IP pinning"); Wiz/Stytch SSRF guidance | `GHSA-887j-p88r-qmm9` |
| **Convex** | "Public functions can be called by **anyone**" — missing object-level authz on a public query = unauth cross-tenant read (BOLA) | **Convex official docs** ("Use access control for all public functions"; avoid `.filter`, use `ctx.auth`) | `GHSA-r649-4cqj-w93h` |
| **MCP server** | Token passthrough / confused deputy (audience validation, RFC 9068); SSE replay not bound to owner; idempotency not enforced by spec; tool poisoning | **NSA MCP security PDF**; **OWASP MCP Top 10 (2025)** MCP03 Tool Poisoning; CVE-2025-49596 (MCP Inspector RCE), CVE-2025-6514 (mcp-remote), CVE-2025-53107 (git-mcp-server); Equixly: **43%** of MCP servers had command injection | `GHSA-5j39` (replay), `GHSA-hcq5` (cost-cap/idempotency) |
| **Cloudflare edge** | `cf-connecting-ip` / client-IP headers spoofable → defeats per-IP abuse controls | Cloudflare header-trust model | `GHSA-c267-988w-7pq7` |
| **Upstash Redis** | Non-atomic check-then-act → race bypass; weak cache-key hash → poisoning; fix = atomic Lua | Atomic reservation pattern (DoW literature) | `GHSA-9gp4` (weak hash) |
| **Sebuf/protobuf** | Generated runtime validation disabled / contract-handler drift | Proto-first validation drift | `GHSA-cmj5-cfhr-w964` |
| **Tauri desktop** | Over-exposed IPC command; capability isolation gap; user-assisted RCE | Tauri capability/allowlist model | `GHSA-2x6r` (open_url RCE), `GHSA-5458` (secret cache) |

**★ The single best line in your whole deck:** cite the **NSA's own MCP security paper** to an **NTRO** jury (NTRO is India's NSA-equivalent TECHINT agency), then show WorldMonitor's MCP advisories (`GHSA-5j39` replay, `GHSA-hcq5` cost-cap) sitting exactly where the NSA paper predicts. Authority + rigor + on-target proof, in one beat.

---

## 6. The Denial-of-Wallet money shot (verified, armored)

**Why it's this app's signature risk:** the server proxies ~40+ *paid* APIs; `.env.example` literally defines spend budgets (`AVIATIONSTACK_MONTHLY_BUDGET`, etc.). A weakly-guarded path to a metered upstream = the owner's real money.

**The un-dismissable pairing:**
- **Theory (Vector B):** a logic bug that *refunds a spend-quota slot after the metered call already executed* → infinite free execution (reserve-then-refund TOCTOU).
- **Reality:** **`GHSA-hcq5-jm84-2395` — "MCP daily cost-cap bypass: quota slot refunded after the tool already executed."** Word-for-word the same flaw, on the target, disclosed by the maintainer.

**The "isn't this just DoS (out of scope)?" defense** — memorize one of these:
> *"Volumetric DoS floods infrastructure and is correctly out of scope. This is **OWASP API4:2023 Unrestricted Resource Consumption** — an **authorization** flaw. The system stays 100% up and executes exactly as designed; it simply lets an unprivileged caller spend the org's budget without authorization. Treating a missing quota check as 'network DoS' is like treating an IDOR as a 'database error.' And it's not hypothetical — the maintainer already disclosed exactly this as GHSA-hcq5."*

**Scoring (defensible; recompute in the FIRST calculator before printing):**
- Unauth path to paid upstream — CVSS 3.1 `AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:L` ≈ **7.2**; CVSS 4.0 models it via **Subsequent-System** impact (`SI:H/SA:H`). The `S:C` (3.1) / subsequent-system (4.0) choice is the crux — the *billing provider* is a different authority than the API.
- Pair every score with **EPSS** (likelihood) per CERT-In (§8). That dual matrix is itself a scoring point.

---

## 7. Innovation, part 2 — productize into a reusable NTRO capability (the 25%)

The known critique of this PS: *"assessing an existing app isn't national-level innovation."* You neutralize it by shipping a **reusable framework**, not a PDF. Two components, both directly derived from your thesis:

1. **Advisory-Aware Regression Harness.** For each published advisory in a target repo, encode a deterministic reproduction/regression test. Output: a CI gate that fails if a fix regresses. *Pitch:* "point-in-time audits go stale; this makes an app's entire disclosed-vulnerability history a permanent test suite."
2. **Seam-Linter (the anti-linter).** A meta-tool that ingests a repo's own `enforce-*.mjs`/`check-*.mjs` invariants, maps exactly what they match, and reports the code paths they **don't** — isomorphic sibling handlers missing the guard, endpoints predating an invariant (via `git blame` vs invariant creation date), and `as any`/`!` casts adjacent to guarded sinks. Output: ranked seam candidates. *Pitch:* "we audit the auditor — the gaps in your own guardrails."

Both emit findings in **CERT-In format**: CWE + WSTG + API-Top-10 tags, CVSS **and** EPSS, benign PoC. **NTRO value:** run it across the government estate → *continuous* posture management, a national capability, not a one-off. This is the sentence that converts a bug-hunt into a winning SIH project.

*(Reminder from you: building is optional. Even as a designed-and-specified framework with a mock run, this is the highest-scoring idea in the room. If you build one thing, build the Seam-Linter demo on WorldMonitor's real linters.)*

---

## 8. The 10-slide deck (SIH idea-presentation template)

Keep to the official template's slide budget. Speaker-note intent in italics.

1. **Title / Team / PS 26163.** *One-line thesis as the subtitle.*
2. **The Mission Stakes.** *"A compromised intelligence dashboard blinds the decision-maker." Threat-first, not tech-first. 30 seconds of why NTRO cares.*
3. **The Target, Understood.** *Real architecture (§2.1). Name Tauri IPC, Edge proxy, Convex, MCP. Prove deep comprehension in 4 bullets. This alone beats half the room.*
4. **The Insight.** *"This is a machine-maintained codebase — 7,900+ commits, dozens of CI linters. Yet 11 advisories shipped. Automated guards create a fortified happy path and push bugs to the seams." Show the linters-vs-advisories paradox.*
5. **Our Method (the seam thesis).** *The 4 seams (§4), each with its real advisory as proof. Cite arXiv 2406.10279 + slopsquatting.*
6. **Proof Spine.** *The platform↔authority↔advisory table (§5). Land the NSA→NTRO line here.*
7. **The Money Shot: Denial-of-Wallet.** *Vector B ↔ GHSA-hcq5. The API4:2023 (not DoS) framing. Cost math.*
8. **Innovation: the reusable framework.** *Advisory-Aware Regression Harness + Seam-Linter (§7). CERT-In-formatted output. "A national capability."*
9. **Rigor & Ethics.** *Local lab, no prod traffic, CVSS+EPSS per CERT-In, RVDCP responsible disclosure, coverage matrix (report what held). "We report our misses."*
10. **Impact & Ask.** *What NTRO gets: a scored assessment + a reusable harness deployable across CII. Close on the one-liner.*

---

## 9. The 3-minute demo arc (the emotional beat)

- **0:00–0:20 — Frame.** "Authorized assessment, run entirely in a local lab we stand up from source. Zero production traffic. Passive header reads only on the live site." *(Jury relaxes; you've shown maturity.)*
- **0:20–0:50 — The paradox.** Show the repo: dozens of `enforce-*.mjs` linters on one side, the 11 advisories on the other. "The guards work — so the bugs moved to the seams."
- **0:50–2:10 — The kill shot.** Either (a) **live:** run the **Seam-Linter** against WorldMonitor's real linters and surface a candidate seam; or (b) **narrated (if unbuilt):** walk the **GHSA-hcq5 quota-refund** flow on a local instance / diagram, with the cost framing ("each of these is a real API call the owner pays for"). Honesty rule: if it's a reproduction of a known advisory, *say so* — "we reproduce the disclosed class to validate our harness."
- **2:10–2:40 — Coverage matrix.** All 7 PS areas × verdict, including "control verified — held." *This is the credibility beat.*
- **2:40–3:00 — Framework + disclosure.** Show the CERT-In-formatted finding + the reusable harness. Close: **"We didn't try to look scary. We built something NTRO can keep."**

---

## 10. Hostile Q&A defense matrix (grounded — no fabrications)

| Likely question | What they're testing | Model answer |
|---|---|---|
| *"How many of your findings are just scanner false positives?"* | Analytical laziness / scanner-dump | "None. Per CERT-In's audit guidelines we don't do tools-only testing — scanners were reconnaissance only; every finding has a manually-validated, benign PoC that re-runs deterministically." |
| *"Isn't denial-of-wallet just out-of-scope DoS?"* | Depth of risk understanding | Use the §6 rebuttal — API4:2023 authorization flaw, system stays up, and *GHSA-hcq5 is the maintainer's own disclosure of exactly this.* |
| *"CVSS 9.8 but needs user interaction — inflating?"* | Metric maturity | "Correct to push back. That's why we pair CVSS severity with **EPSS** likelihood, as CERT-In's guidelines require — we prioritized by EPSS, not theoretical max." |
| *"Did you attack the live site / move laterally?"* | Ethics / RoE | "No. RoE limited us to a local instance built from source; passive header reads only on prod. Anything genuinely novel goes through their SECURITY.md private disclosure (RVDCP-aligned) first." |
| *"Anyone can find an XSS — what's innovative?"* | Product vs homework | "Finding a bug is standard; operationalizing is the innovation. We shipped a reusable Advisory-Aware Regression Harness + a Seam-Linter that audits the project's own CI guardrails — NTRO runs it across other apps for continuous posture." |
| *"This app is hardened — did you find anything real?"* | Honesty / no inflation | "It IS hardened — that's the point. The guards push bugs to the seams; here's our seam candidate, and here are the controls we tested that HELD. We don't inflate severity." |
| *"Why should we trust your architecture claims?"* | Rigor | "Every class maps to an external authority and one of the target's own advisories — here's the table. The NSA's MCP security paper predicts the exact MCP replay/cost-cap issues WorldMonitor disclosed." |

---

## 11. Per-finding schema + worked examples (honest framing)

Use this schema (CERT-In / OWASP-aligned) for every finding:

```
[WM-00X] <Component> — <Class> allows <Impact>
Severity: <CVSS 3.1 score + vector> | <CVSS 4.0 vector> | EPSS: <prob>
Tags: CWE-XXX | WSTG-XXXX | API#:2023 | ASVS Vx.x
Component: api/_foo.ts (endpoint /api/foo) | Trust boundary: <n>
Status: CONFIRMED (local) / REPRODUCED-KNOWN (cites GHSA) / VERIFIED-SECURE
Description → Preconditions → Steps (local) → PoC (benign marker) → Business impact → Remediation (diff) → References
```

**Worked example A — reproduction (honest, builds credibility):**
`[WM-001] Convex public query — Broken Object Level Authorization (BOLA)`. Status: **REPRODUCED-KNOWN — validates GHSA-r649-4cqj-w93h.** Class: CWE-284/639, WSTG-ATHZ-02, API1:2023. In local lab, a public Convex query returns records not scoped to the caller. CVSS 3.1 `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` = 6.5; CVSS 4.0 with `VC:H` + `AU:Y` (predictable IDs) ≈ 7.1. Remediation: enforce `ctx.auth` ownership in the handler (Convex's own guidance). *Framed as: "we reproduce the disclosed class to prove our harness catches regressions."*

**Worked example B — the money shot:**
`[WM-002] MCP quota — reserve-then-refund TOCTOU → Denial-of-Wallet`. Status: **REPRODUCED-KNOWN — GHSA-hcq5-jm84-2395.** Class: CWE-770/362, API4:2023, WSTG-BUSL-02. Refund path returns the quota slot after the metered call executed. Scored with `S:C` (3.1) / subsequent-system `SA:H` (4.0) + EPSS. Remediation: **atomic decrement before** the upstream call (Redis Lua), compensate only on genuine failure.

**Worked example C — your NEW contribution (the differentiator):**
`[WM-003] Seam candidate — <isomorphic sibling / orphaned pre-invariant endpoint>`. Status: **CONFIRMED (novel)** — found by the Seam-Linter, *not* in the advisory list. This is the finding that isn't prior art. Even one credible new seam finding, honestly scored, is worth more than ten re-reported advisories.

> **Credibility mix (the PRATIVAAD rule):** a report that's all "criticals" on a hardened app is distrusted. Aim for: 1–2 reproduced-known (validate the harness) + 1–2 genuinely novel seam findings + several VERIFIED-SECURE controls. The mix *is* the credibility.

---

## 12. Scope, ethics, methodology (the maturity wrapper)

- **The one hard rule:** every active PoC runs against a **local instance** built from source (`docker-compose`, self-hosting is supported). `worldmonitor.app` gets **passive, unauthenticated observation only** (header reads). No attack traffic, no real metered-API calls (that's the owner's money), no other user's data.
- **Standards to name:** OWASP **WSTG v4.2**, **API Top 10 (2023)**, **ASVS**; **CVSS 4.0** (FIRST, Nov 2023) + **CVSS 3.1**; **EPSS**; **CWE**. Report format aligned to **CERT-In Comprehensive Cyber Security Audit Policy Guidelines** (dual **CVSS + EPSS** — *verified real mandate*).
- **Disclosure:** anything genuinely novel → the repo's **SECURITY.md private vulnerability reporting** first (RVDCP-aligned, ISO/IEC 29147/30111 posture). Say this out loud; it scores.
- **Coverage matrix (build this table):** the 7 PS scope areas × verdict (finding / reproduced-known / verified-secure / not-tested-why). This one table signals completeness better than anything else.

---

## 13. Sources (verified 2026-09-28) + verify-before-slide list

**Verified, safe to cite:**
- WorldMonitor repo + Security Advisories tab (the 11 GHSAs in §2.2); SECURITY.md; README (stack, author, stars, Cody Richard credit).
- `vercel-labs/guarded-fetch` (Edge SSRF / connect-time IP pinning).
- Convex official docs — "access control for all public functions."
- NSA MCP security PDF; OWASP MCP Top 10 (2025); CVE-2025-49596, CVE-2025-6514, CVE-2025-53107; Equixly 43% figure.
- arXiv **2406.10279** "We Have a Package for You!" (USENIX Sec 2025); slopsquatting / MITRE T1195.001; huggingface-cli/Lasso story; Morris II (Cohen 2024).
- CVSS 4.0 (FIRST); ISO/IEC 29147:2018 & 30111:2019; RFC 9116; OWASP WSTG v4.2 / API Top 10 2023 / ASVS.
- CERT-In audit guidelines — dual CVSS+EPSS mandate (verified via multiple sources).

**Verify against primary source before it touches a slide:**
- Exact CERT-In guideline date; RVDCP PGP key; NCIIPC CAF control IDs; SIH rubric percentages; named past SIH winners; per-model hallucination rates; arXiv 2510.26103 / 2608.23897; any "future-dated" 2026 CVE.

---

*Grounding note: architecture, advisories, and external anchors were read from the live repository and web on 2026-09-28. Re-verify file paths against your clone before citing in the final report — an active codebase moves (7,900+ commits and counting).*
