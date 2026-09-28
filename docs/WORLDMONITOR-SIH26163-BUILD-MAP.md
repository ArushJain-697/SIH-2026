# SIH 26163 — WorldMonitor Security Assessment · Build Map & Implementation Guide
### "We audit the seams an autonomous pipeline leaves — and prove it on the target's own scars."

**Read this if you need to execute the project without first reading the full bible.** The companion [`WORLDMONITOR-SIH26163-BIBLE-v2.md`](./WORLDMONITOR-SIH26163-BIBLE-v2.md) holds the *why* — the thesis, the verified ground truth, the advisory register, the landmines, and the claim boundaries. This map turns it into a strict dependency-ordered sequence. Every ticket is independently testable before its dependants start. Where a ticket cites a section (e.g. §5), that's where the reasoning lives in the bible.

## Build strategy

This is a **presentation-first** map. The bible's own finding stands: *for SIH, the PPT and the idea win, not the implementation.* So the "product" here is a **defensible assessment + a reusable framework idea + a deck + one live demo** — not a fully shipped pentest tool. Full tooling is STRETCH; a *specified + token-demo'd* version is the CORE target. If you have 4 months, build it all; if you have a weekend, the critical path still wins the room.

The team wins by making **one complete, honest, advisory-aware assessment path** land on a slide — not by "finding 45 vulnerabilities" (the target has ~11 *published* advisories; re-reporting them as novel is disqualifying).

**Lock order:** thesis & claim discipline → ground truth & advisory register → finding schema → local lab (or mock) → the reusable framework (Seam-Linter + Regression Harness) → findings (reproduced-known + one novel seam + verified-secure) → CERT-In report → deck & demo → freeze & submit.

### Priority tags

| Tag | Meaning |
| --- | --- |
| 🟥 **CORE** | Required for a credible, un-dismissable SIH submission. Never cut for a stretch feature. |
| 🟨 **SAFETY** | Protects against the two things that instantly sink this project: **overclaiming / fabricated facts** and **unauthorized testing**. |
| 🟦 **EVIDENCE** | Makes a finding reproducible, inspectable, and judge-defensible. |
| 🟩 **DEMO** | Makes the thesis land in 3 minutes / on a slide. For this project DEMO is CORE-adjacent — the PPT *is* the deliverable. |
| ⬜ **STRETCH** | Only attempt after every CORE ticket is green. A specified-and-narrated version of a STRETCH item is often enough. |

### Work-window tags

| Tag | Meaning |
| --- | --- |
| ⚪ **FOUNDATION** | First session: thesis lock, ethics/scope, ground-truth sheet, advisory register, schemas. |
| 🌅 **CORE BUILD** | Stand up the lab (or mock) and the minimum framework + one reproduction. |
| 🌤️ **INTEGRATE** | Real repo analysis, the novel seam finding, verified-secure controls, the report. |
| 🌇 **FREEZE** | Lock fixtures, finalize deck, rehearse demo, fact-audit against landmines. |
| 🏁 **FINAL** | Rehearsal, packaging, submission only. No new claims. |

### Ticket rule

Do not start a ticket until its blockers have passed their **Test**. A beautiful slide is not a passing test. Every finding must carry a **status label** — `REPRODUCED-KNOWN` (cites the GHSA), `CONFIRMED-NOVEL`, or `VERIFIED-SECURE` — and every fact on a slide must trace to the verified ground-truth sheet (#5), the advisory register (#6), or the verified-sources list in the bible (§13). Anything else is spoken generally or checked first.

### Ground rule (project-specific — this is the one that keeps you alive)

> **No re-reporting. No fabrication. No prod.**
> (1) The ~11 published advisories are **prior art** — you may *reproduce* them (labeled) to prove your method, never *claim* them as discoveries. (2) Every GHSA/CVE/stat/name on a slide is verified or it does not appear — the Gemini research seeded specific **fabrications** (see §3 landmines); one of them on screen and an NTRO judge ends you. (3) Every active PoC runs on a **local instance**; `worldmonitor.app` gets passive header reads only.

---

## Phase 0 — Scope, thesis, and claim discipline

### #1: Final thesis + claim block + demo owner
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: —

**Build:** Write the one-sentence thesis at the top of the repo README: *"WorldMonitor is an AI-built, CI-hardened codebase; its own advisories prove its linters push bugs to the seam between a control and its exceptions — so we built an advisory-aware, seam-focused assessment framework, scored to CERT-In standard, reusable across NTRO's estate."* Name one demo owner and one backup.
**Watch out:** do not pitch this as a generic VAPT or a scanner run. The novelty is the *seam* framing + the *reusable framework*, not "we found bugs." Decide once; stop re-debating.
**Test:** a teammate can state the thesis and the three pillars (Hook / Spine / Money-shot, bible §1) cold in 30 seconds.
**Done when:** thesis + pillars + demo owner are written and agreed.

### #2: Landmine register + fact-provenance rule
Priority: 🟨 SAFETY
Window: ⚪ FOUNDATION
Blocked by: #1

**Build:** Copy bible §3 into `docs/LANDMINES.md` — the fabricated IDs (`GHSA-4f5g-9h8j-2k1l`, `GHSA-m9n8-b7v6-c5x4`, `GHSA-7v6c-5x4z-3a2s`, `CVE-2025-29811`), the wrong stack (React/Express/Socket.io/Apollo/Leaflet/axios/Winston), "Preact SPA", the wrong Cody-Richard findings, the "OpenAI AI-worm Sept 25 2026" claim, and the verify-before-slide list (RVDCP PGP key, exact CERT-In date, named winners, per-model rates, unverified arXiv IDs).
**Watch out:** these read as authoritative because an LLM wrote them fluently. Fluency is not truth. The jury *wrote* the real CERT-In/NCIIPC docs and *owns* the repo.
**Test:** a text scan of every deliverable (README, findings, deck notes) flags any landmine string.
**Done when:** the register exists and the scan is wired into #31.

### #3: Rules of Engagement + ethics/scope lock
Priority: 🟨 SAFETY
Window: ⚪ FOUNDATION
Blocked by: #1

**Build:** Write `docs/ROE.md`: active PoCs run on a **local instance built from source** only; `worldmonitor.app` gets **passive, unauthenticated header reads** only; **no real metered-API calls** (owner's money); benign markers only; anything genuinely novel goes to the repo's `SECURITY.md` private reporting first (RVDCP-aligned, ISO/IEC 29147/30111 posture).
**Watch out:** an NTRO jury treats scope violation as a character failure, not a technical one. "We could have, but didn't, because it was out of scope" scores *higher* than an exploit.
**Test:** every future PoC ticket references a target on `localhost`/`127.0.0.1` and a benign marker, never a prod host.
**Done when:** the ROE is written and every teammate can recite the "did you test prod?" answer (bible §10).

### #4: Repo skeleton
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: #2, #3

**Build:** Create the skeleton:
```text
docs/            (LANDMINES.md, ROE.md, ground-truth.md, coverage-matrix.md)
register/        (advisories.json — the prior-art register)
lab/             (docker-compose, seed, mock-upstream/)
framework/       (seam-linter/, regression-harness/)
findings/        (WM-00X/ per finding: finding.md, evidence/, reproduce.sh)
report/          (assembled CERT-In-format report)
deck/            (slides + speaker notes)
```
**Watch out:** don't build a codebase that only runs on one laptop. No hidden local paths, no uncommitted fixtures.
**Test:** a fresh checkout shows the tree and a `README` that opens with the thesis (#1), not background.
**Done when:** the skeleton exists and the README leads with the product.

---

## Phase 1 — Ground truth & the prior-art register (contracts before hunting)

### #5: Verified ground-truth fact sheet
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: #4

**Build:** `docs/ground-truth.md` from bible §2.1: real stack (vanilla TS + Vite; globe.gl/Three.js; deck.gl/MapLibre; Vercel Edge Functions; Sebuf/protobuf; Upstash Redis; Cloudflare R2/KV; Convex; Dodo Payments; Tauri 2 + Node sidecar; MCP server), author **Elie Habib**, **AGPL-3.0**, **87.5k★**. This is the *only* source slides may cite for architecture facts.
**Watch out:** the #1 way to look unprepared is a stack error — v1's "Preact SPA" was wrong. Re-verify against your clone before quoting; the repo moves (7,900+ commits).
**Test:** every architecture claim in the deck maps to a line in this file.
**Done when:** the sheet exists and is the cited source for §3 of the deck.

### #6: The advisory register (structured prior art)
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: #4

**Build:** `register/advisories.json` — one record per real GHSA (bible §2.2): id, severity, title, class/CWE, the seam it demonstrates. Include the 11 published + the draft DNS-rebind. Re-scrape the repo's Security → Advisories tab to confirm none were added/removed since 2026-09-28.
**Watch out:** this is your anti-plagiarism shield **and** your credibility engine — it proves you understand the target and won't waste the jury's time. It is *not* your findings list.
**Test:** each record links to a live advisory URL that resolves; no fabricated IDs from #2 appear.
**Done when:** the register validates and every entry is a real, resolvable advisory.

### #7: Finding schema (CERT-In aligned)
Priority: 🟥 CORE
Window: ⚪ FOUNDATION
Blocked by: #5, #6

**Build:** The per-finding schema (bible §11): id, title, `status` ∈ {REPRODUCED-KNOWN, CONFIRMED-NOVEL, VERIFIED-SECURE}, CVSS 3.1 vector+score, CVSS 4.0 vector, **EPSS** probability, tags (CWE / WSTG / API-Top-10 / ASVS), component + trust boundary, preconditions, steps (local), benign PoC, business impact, remediation, references (incl. the matching GHSA where reproduced).
**Watch out:** dual **CVSS + EPSS** is a real CERT-In audit mandate (verified) — it's a scoring point, use it. A `REPRODUCED-KNOWN` finding with no GHSA reference reads as a stolen discovery.
**Test:** validate one record of each status; a `REPRODUCED-KNOWN` without a `references[GHSA]` is rejected.
**Done when:** every finding ticket writes against this schema.

### #8: Coverage-matrix skeleton
Priority: 🟦 EVIDENCE
Window: ⚪ FOUNDATION
Blocked by: #7

**Build:** `docs/coverage-matrix.md`: the 7 PS scope areas × verdict (finding / reproduced-known / verified-secure / not-tested-why). This one table signals completeness better than anything else in the report.
**Watch out:** honesty is the point — a "not tested, here's why" cell is a strength, not a gap. All-green with no misses reads as inflation.
**Test:** every PS scope area has a row with a verdict placeholder.
**Done when:** the matrix exists and is referenced by the report (#24) and slide 9.

---

## Phase 2 — The local lab (no PoC without it)

### #9: Local instance from source
Priority: 🟥 CORE
Window: 🌅 CORE BUILD
Blocked by: #4

**Build:** Clone the repo, follow `SELF_HOSTING.md`, bring it up via `docker-compose` with throwaway/free keys where a feature needs one. Most scope areas need no real upstream keys.
**Watch out:** if you cannot stand up the full app, stand up the *slice* you'll demo (the Convex query, the MCP quota path). A partial honest lab beats a fake full one. Never point active tests at prod.
**Test:** `localhost` app loads; the demo slice (e.g. an MCP `tools/call` or a Convex query) responds.
**Done when:** the local instance serves the one path your demo needs. *(If truly infeasible in your window, mark this REPRODUCED-VIA-DIAGRAM and lean on #10's mock — say so honestly on the slide.)*

### #10: Mock the metered upstreams
Priority: 🟨 SAFETY
Window: 🌅 CORE BUILD
Blocked by: #9

**Build:** A ~50-line local HTTP stub answering the upstream API shapes (AviationStack, Finnhub, etc.) so DoW/rate-limit tests hit `localhost`, never a real vendor.
**Watch out:** this is what makes the Denial-of-Wallet demo *safe and deterministic* — each "expensive call" hits your stub, and you narrate "each of these is a real API call the owner pays for."
**Test:** the DoW repro (#20) drives the stub and never emits a request to a real vendor domain.
**Done when:** metered-path tests are fully local.

### #11: Seed two test users + local feed
Priority: 🟦 EVIDENCE
Window: 🌅 CORE BUILD
Blocked by: #9

**Build:** Seed a free-tier and a Pro-tier test account, plus one local RSS/feed source you control for any content-injection test.
**Watch out:** two seeded accounts only — the BOLA repro (#19) needs a victim and an attacker, both yours. Never touch a real user's data.
**Test:** you can log in as each account and each has a distinct object ID.
**Done when:** free + Pro accounts exist and are usable by #19/#20.

### #12: Lab snapshot + commit hash
Priority: 🟦 EVIDENCE
Window: 🌅 CORE BUILD
Blocked by: #9

**Build:** Record the exact commit hash and config in `lab/README`. Every finding references it.
**Watch out:** an active codebase moves; a finding without a pinned commit isn't reproducible.
**Test:** `lab/README` names the commit; `reproduce.sh` files (#26) reference it.
**Done when:** the lab is pinned and cited.

---

## Phase 3 — The reusable framework (the 25% innovation)

> This is the answer to *"assessing an existing app isn't innovation."* Even a **specified + token-run + narrated** version wins the innovation criterion. If you build exactly one thing, build the Seam-Linter token run (#13–#14) on the target's real linters.

### #13: Seam-Linter core — invariant map
Priority: 🟥 CORE
Window: 🌤️ INTEGRATE
Blocked by: #6

**Build:** A tool that ingests the repo's own `enforce-*.mjs` / `check-*.mjs` scripts and outputs *exactly what each invariant matches* (which paths/AST shapes it asserts). This is "audit the auditor."
**Watch out:** the security gap lives in what the linter *doesn't* match — you must map the boundary precisely, not just list the linters. Don't claim it finds bugs yet; this ticket maps coverage.
**Test:** for one real `enforce-*.mjs`, the tool prints the set of files/shapes it covers and the complement it ignores.
**Done when:** the invariant coverage map is produced for ≥1 real linter.

### #14: Seam-Linter — sibling-path differential
Priority: 🟥 CORE
Window: 🌤️ INTEGRATE
Blocked by: #13

**Build:** Cluster near-duplicate handlers (isomorphic siblings) and diff their guards — flag a sibling missing the auth/validation the others have (the AI-context-eviction pattern, bible §4).
**Watch out:** WorldMonitor's own `GHSA-r649` (a public Convex query left unguarded while siblings were guarded) is the proof this class is real on the target. A flagged sibling is a *candidate*, not a confirmed finding, until #21 verifies it in the lab.
**Test:** on the real repo, the differ outputs at least one ranked sibling-mismatch candidate with file/line.
**Done when:** ≥1 seam candidate is produced from the real codebase.

### #15: Seam-Linter — chronological orphans
Priority: ⬜ STRETCH
Window: 🌤️ INTEGRATE
Blocked by: #13

**Build:** Cross-reference `git blame` creation dates against each invariant's introduction date — surface endpoints/handlers that predate an invariant and never got retrofitted.
**Watch out:** this needs the full git history; cap the scan to save time. Narrate it on the slide if you can't fully build it.
**Test:** the tool lists ≥1 handler created before its governing invariant.
**Done when:** an orphan list exists, or it's carried as a stated slide capability.

### #16: Seam-Linter — cast/assertion adjacency
Priority: ⬜ STRETCH
Window: 🌤️ INTEGRATE
Blocked by: #13

**Build:** Grep for `as any` / `as unknown` / non-null `!` adjacent to code paths guarded by a `check-*.mjs` — the "forced the compiler, killed the semantic boundary" pattern.
**Watch out:** high signal-to-noise only if you scope to guarded regions; a raw grep is noise.
**Test:** the tool reports cast sites within N lines of a guarded sink.
**Done when:** the adjacency report exists, or it's narrated.

### #17: Advisory-Aware Regression Harness
Priority: 🟥 CORE
Window: 🌤️ INTEGRATE
Blocked by: #6, #7

**Build:** For each advisory in the register (#6), encode a deterministic reproduction/regression test; output a CI gate that fails if a fix regresses. Start with the 2–3 you'll demo (`GHSA-r649`, `GHSA-hcq5`).
**Watch out:** the pitch is "point-in-time audits go stale; this turns an app's whole disclosure history into a permanent test suite." That framing is the innovation — don't bury it as a test folder.
**Test:** the harness runs the encoded advisory tests and reports pass/regressed per advisory.
**Done when:** ≥2 advisories are encoded as runnable regression checks.

### #18: Framework output → CERT-In finding schema
Priority: 🟦 EVIDENCE
Window: 🌤️ INTEGRATE
Blocked by: #7, #14, #17

**Build:** Both tools emit findings in the #7 schema — CWE/WSTG/API tags, CVSS + EPSS, benign PoC, status label.
**Watch out:** framework output must self-label `CONFIRMED-NOVEL` vs `REPRODUCED-KNOWN` so nothing accidentally re-reports an advisory as a discovery.
**Test:** a Seam-Linter candidate and a Regression-Harness result both validate against the schema with correct status.
**Done when:** framework output drops straight into `findings/`.

---

## Phase 4 — Findings: reproduce-known, one novel, and verified-secure

### #19: Reproduce a published advisory (credibility)
Priority: 🟥 CORE
Window: 🌤️ INTEGRATE
Blocked by: #11, #17
Status target: `REPRODUCED-KNOWN`

**Build:** In the lab, reproduce the BOLA class — a public Convex query returning records not scoped to the caller (validates `GHSA-r649-4cqj-w93h`). Score CVSS 3.1 (~6.5) + 4.0 (~7.1, `VC:H`/`AU:Y`) + EPSS. Cite the GHSA and Convex's own "access control for all public functions" guidance.
**Watch out:** label it `REPRODUCED-KNOWN` and *say on the slide* "we reproduce the disclosed class to validate the harness." Presenting it as your discovery is the disqualifier.
**Test:** the victim account's records are returned to the attacker account on `localhost`, captured with a benign marker; `reproduce.sh` re-runs it.
**Done when:** the reproduction runs deterministically and is honestly labeled.

### #20: The money shot — Denial-of-Wallet reproduction
Priority: 🟥 CORE
Window: 🌤️ INTEGRATE
Blocked by: #10, #17
Status target: `REPRODUCED-KNOWN`

**Build:** Reproduce the reserve-then-refund TOCTOU that refunds a spend-quota slot after the metered call executed (validates `GHSA-hcq5-jm84-2395`), driving the mock upstream (#10). Score with `S:C` (3.1) / subsequent-system `SA:H` (4.0) + EPSS. Prep the "API4:2023, not out-of-scope DoS" rebuttal (bible §6).
**Watch out:** this is the single most memorable beat — theory (Vector B) = the target's own scar. Keep the cost framing. Never hit a real vendor (that's the whole point of #10).
**Test:** the quota goes negative / infinite free execution is shown against the stub; the "is this just DoS?" answer is rehearsed.
**Done when:** the DoW repro runs on the mock and the rebuttal is one clean sentence.

### #21: The novel seam finding (the differentiator)
Priority: 🟥 CORE
Window: 🌤️ INTEGRATE
Blocked by: #14
Status target: `CONFIRMED-NOVEL`

**Build:** Take the highest-ranked Seam-Linter candidate (#14) *not* in the advisory register, verify it in the lab, and write it up as `CONFIRMED-NOVEL`. Even one credible novel seam finding, honestly scored, outweighs ten re-reports.
**Watch out:** before claiming novelty, check it against #6 — if it's already an advisory, it's `REPRODUCED-KNOWN`, not novel. If nothing verifies, that's honest: present it as "candidate surfaced by the framework, pending confirmation / disclosed privately" and lean on the reproductions.
**Test:** the candidate is confirmed on `localhost` with a benign PoC and is absent from the advisory register.
**Done when:** one novel finding is confirmed-and-labeled, or honestly downgraded to a disclosed candidate.

### #22: Verified-secure controls (report the misses)
Priority: 🟦 EVIDENCE
Window: 🌤️ INTEGRATE
Blocked by: #9
Status target: `VERIFIED-SECURE`

**Build:** Test 2–3 controls that *held* — e.g. the RSS SSRF allowlist re-checking on redirect hops, CSP `script-src 'self'`, the sidecar CSPRNG token — and document them as verified-secure with the vector tested.
**Watch out:** a report that's all criticals on a hardened app is distrusted. The mix — reproduced + novel + verified-secure — *is* the credibility (bible §11).
**Test:** each control has a documented hostile attempt and evidence it was repelled.
**Done when:** the "controls that held" section has ≥2 entries.

### #23: Platform ↔ authority ↔ advisory proof spine
Priority: 🟦 EVIDENCE
Window: 🌤️ INTEGRATE
Blocked by: #6
DEMO: slide 6

**Build:** Assemble the bible §5 table — each platform risk tied to an external authority (Vercel `guarded-fetch`, Convex docs, **NSA MCP paper**, OWASP MCP Top 10, the real CVEs) *and* its matching WM advisory.
**Watch out:** the NSA-paper→NTRO line is your best single beat — cite the NSA's own MCP security paper to an NTRO jury, then show WM's MCP advisories sitting where it predicts. Verify each external anchor resolves (bible §13 verified list).
**Test:** every row has a resolving external URL and a real GHSA.
**Done when:** the proof-spine table is slide-ready.

---

## Phase 5 — The report & compliance wrapper

### #24: CERT-In-format report assembly
Priority: 🟥 CORE
Window: 🌇 FREEZE
Blocked by: #8, #19, #20, #21, #22, #23

**Build:** Assemble `report/`: executive summary (posture verdict, findings-by-severity, top-3 risks in business language, scope+authorization statement), coverage matrix (#8), findings (#7 schema, ordered by severity), verified-secure controls, remediation roadmap, appendices (methodology, hypothesis register incl. not-confirmed, evidence index).
**Watch out:** dual CVSS+EPSS throughout; map each finding to CWE/WSTG/API. The exec summary translates tech into *risk to a CII operator*, not jargon.
**Test:** a non-author teammate can find, for any finding, its CVSS, EPSS, GHSA (if reproduced), and reproduce.sh.
**Done when:** the report is internally consistent and every number traces to evidence.

### #25: Responsible-disclosure note
Priority: 🟨 SAFETY
Window: 🌇 FREEZE
Blocked by: #21

**Build:** A short note stating any `CONFIRMED-NOVEL` finding was/would be reported via the repo's `SECURITY.md` private channel first (RVDCP-aligned), before any public mention.
**Watch out:** never publicly detail an unpatched novel finding on real infra. Private channel first — say this out loud; it scores.
**Test:** the note names the disclosure channel and the posture (ISO/IEC 29147/30111).
**Done when:** the disclosure stance is written and rehearsable.

### #26: Evidence discipline + reproduce.sh
Priority: 🟦 EVIDENCE
Window: 🌇 FREEZE
Blocked by: #19, #20, #21

**Build:** Each confirmed/reproduced finding gets `findings/WM-00X/` with the raw HTTP request/response, a log/screenshot, a one-line README naming the pinned commit+config, and a `reproduce.sh` that re-runs it against the local instance.
**Watch out:** benign markers only (`console.log(document.domain)`, a bounded burst to the stub) — never weaponized payloads, even locally.
**Test:** `reproduce.sh` re-runs one finding deterministically from a clean checkout of the lab.
**Done when:** every non-secure finding re-runs on demand.

---

## Phase 6 — Deck & demo (PPT wins — treat as CORE)

### #27: The 10-slide deck
Priority: 🟥 CORE
Window: 🌇 FREEZE
Blocked by: #23, #24

**Build:** Build the deck to bible §8: Title/thesis → Mission stakes → Target understood → The insight (linters-vs-advisories paradox) → The method (4 seams) → Proof spine (+NSA→NTRO) → DoW money shot → Innovation (the framework) → Rigor & ethics (coverage matrix, CVSS+EPSS, RVDCP) → Impact & ask.
**Watch out:** slide 3 (real architecture) must be flawless — it's where you prove comprehension. No landmine strings (#2). Threat-first, not tech-first, on slide 2.
**Test:** run the fact scan (#31) over the deck notes; zero landmine hits.
**Done when:** 10 slides exist, each mapped to a bible section, fact-clean.

### #28: The 3-minute demo
Priority: 🟩 DEMO
Window: 🌇 FREEZE
Blocked by: #20, #26
DEMO: the kill shot

**Build:** Script the arc (bible §9): frame (local lab, no prod) → the paradox (linters vs 11 advisories) → the kill shot (**live:** Seam-Linter surfaces a candidate on the real linters, *or* the DoW repro on the mock with cost framing; **narrated fallback** if unbuilt) → coverage matrix → framework + disclosure → close.
**Watch out:** if the kill shot is a reproduction, *say so* ("we reproduce the disclosed class to validate our harness"). Don't improvise it live — it must be deterministic.
**Test:** the demo runs end-to-end under 3 minutes, twice, without hunting for files.
**Done when:** the kill shot lands reliably and honestly.

### #29: Hostile Q&A rehearsal
Priority: 🟥 CORE
Window: 🌇 FREEZE
Blocked by: #24

**Build:** Rehearse cold answers to the bible §10 matrix: "scanner false positives?", "isn't this just DoS?", "inflating CVSS?", "did you test prod / move laterally?", "what's innovative?", "did you find anything real on a hardened app?", "why trust your architecture claims?".
**Watch out:** name your own limits before the judge does — the reproduced/novel/verified-secure mix and "CVSS paired with EPSS per CERT-In" turn apparent weaknesses into the integrity story.
**Test:** every member answers each in one clean sentence, grounded in a real advisory or a verified source.
**Done when:** the matrix is reflexive for both presenter and backup.

### #30: Fallback recording
Priority: 🟨 SAFETY
Window: 🌇 FREEZE
Blocked by: #28

**Build:** Record the demo (live-mode and, if the lab is fragile, a cached/narrated run). Screenshot the kill shot, the coverage matrix, and a CERT-In finding.
**Watch out:** hackathon Wi-Fi and live labs betray you. The recording is insurance.
**Test:** playback clearly shows the kill shot and the honest labeling.
**Done when:** you can present even if the live run dies.

---

## Phase 7 — Freeze & submission

### #31: Fact & citation final audit
Priority: 🟨 SAFETY
Window: 🏁 FINAL
Blocked by: #2, #24, #27

**Build:** Run the landmine scan (#2) over the deck, report, README, and spoken script. Verify every GHSA/CVE resolves, every stat has a verified source, every "verify-before-slide" item (CERT-In date, RVDCP key, winners, per-model rates, arXiv IDs) is either confirmed against the primary source or spoken generally.
**Watch out:** copied Gemini-research claims are not citations. One fabricated ID in front of an NTRO/CERT-In jury is fatal.
**Test:** a non-author teammate challenges each headline claim — "which advisory?", "verified where?", "reproduced or novel?" — and every answer resolves to evidence.
**Done when:** zero landmines, every claim sourced.

### #32: Dry-run twice + freeze
Priority: 🟥 CORE
Window: 🏁 FINAL
Blocked by: #28, #29, #31

**Build:** Hard feature freeze — polish only. Dry-run the full pitch+demo cold, twice, once by the backup.
**Watch out:** the last-day instinct to add "one more finding" breaks demos. After freeze, only make the existing path bulletproof.
**Test:** two consecutive clean run-throughs with no manual fixes.
**Done when:** both presenters complete the arc without hunting.

### #33: Submission package
Priority: 🟥 CORE
Window: 🏁 FINAL
Blocked by: #30, #32

**Build:** Package: repo (README = thesis + scope + framework + how to run the lab), the report, the deck, the fallback recording, and a short `RECOVERY.md` (missing path, no internet, lab restart).
**Watch out:** don't package secrets or any real user data. Submit ~1 hour early.
**Test:** open the package from a fresh machine; every link and the lab bring-up resolve.
**Done when:** everything is submitted and reproducible by a teammate.

---

## Final critical path

If time collapses, build only this — it still wins the room:

1. #1 thesis + claim block.
2. #2 landmine register (anti-fabrication).
3. #5 ground-truth sheet + #6 advisory register (anti-plagiarism).
4. #7 finding schema.
5. #9/#10 lab-or-mock for the one demo slice.
6. #13–#14 Seam-Linter token run on the real linters (the innovation).
7. #20 Denial-of-Wallet reproduction (the money shot) — or #19 the BOLA reproduction.
8. #23 platform↔advisory proof spine (+ NSA→NTRO line).
9. #27 the 10-slide deck + #28 the 3-minute demo.
10. #29 hostile Q&A.

That is enough to show:
```text
A machine-maintained app with dozens of linters still shipped 11 advisories.
We built the framework that audits the seams those linters miss,
proved it on the target's own scars, scored it to CERT-In standard —
and it's reusable across NTRO's estate.
```

## Cut order when behind

Drop from the top; never drop below the line.

1. #16 cast-adjacency → narrate on slide.
2. #15 chronological orphans → narrate on slide.
3. Full framework build → specified + token run (#13–#14) + narration.
4. Extra reproductions → keep exactly one (the DoW money shot).
5. #22 verified-secure controls → trim to one.

— never cut below this line —
- #1/#2 thesis + landmine discipline (fabrication = instant death)
- #6 advisory register (re-reporting = instant death)
- one reproduced finding + the proof spine
- #3 ethics/scope + #29 Q&A
- #27 the deck (the deck *is* the deliverable)

## Milestones

| Milestone | Green condition |
| --- | --- |
| M1 — Foundation | #1–#8: thesis locked, landmines + advisory register written, finding schema + coverage matrix exist |
| M2 — Lab | #9–#12: local instance (or honest mock) serves the demo slice; mock upstream isolates DoW |
| M3 — Framework + first proof | #13–#14 + #17 + one of #19/#20: token Seam-Linter run + one reproduced advisory, both labeled |
| M4 — Findings + report | #21–#26: one novel seam (or disclosed candidate) + verified-secure controls + CERT-In report |
| M5 — Deck + demo | #27–#30: 10 slides fact-clean, 3-min kill shot deterministic, Q&A reflexive |
| M6 — Submission | #31–#33: zero landmines, two clean dry-runs, reproducible package submitted |

---

*Companion to `WORLDMONITOR-SIH26163-BIBLE-v2.md` — the bible explains WHY (thesis, ground truth, advisory register, landmines); this map tells you WHAT to build, in WHAT order, how to test each piece, and what's honestly stretch. The two ground rules keep the project alive: **never build a claim on an unverified fact** (fabrication in front of an NTRO jury is fatal), and **never present a reproduced advisory as a novel discovery** (the repo's Security tab is one click away). Reproduce to prove the method; claim only what the framework newly finds; report what held.*
