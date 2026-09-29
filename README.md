# SIH 26163 — WorldMonitor Security Assessment

**Problem Statement:** 26163 — *Security Assessment of the World Monitor application* · **Organisation:** NTRO · **Category:** Software / Smart Automation
**Target:** `github.com/koala73/worldmonitor` (Elie Habib, AGPL-3.0-only, 87.5k★) · live at `worldmonitor.app`

## Thesis

> **WorldMonitor is an AI-built, CI-hardened codebase; its own 11 published advisories prove that its dozens of automated linters push bugs to the *seams* between a control and its exceptions — so we built an advisory-aware, seam-focused assessment framework, scored to CERT-In standard, reusable across NTRO's estate.**

Three pillars: **Hook** (audit the seams an autonomous pipeline leaves) · **Spine** (every finding class ties to an external authority *and* a real advisory) · **Money shot** (Denial-of-Wallet as an authorization flaw, proven by the target's own `GHSA-hcq5-jm84-2395`).

## Approved Claim Block

- This is a **time-boxed, authorized assessment slice**, not a full production penetration test.
- All active proof-of-concept testing runs on a **local instance built from source**. `worldmonitor.app` receives **passive, unauthenticated header observation only**. No real metered third-party API is ever called.
- Every finding carries an explicit status: **`REPRODUCED-KNOWN`** (a published advisory class reproduced to validate our harness — cites its GHSA), **`CONFIRMED-NOVEL`** (absent from the advisory register), or **`VERIFIED-SECURE`** (hostile attempt made, control held).
- We **do not** claim the target's published advisories as our own discoveries. The advisory register (`register/advisories.json`) is prior art and is cited as such.
- Severity is reported with a full **CVSS 3.1 and 4.0 vector plus an EPSS probability**, per CERT-In's audit guidance. We do not inflate severity, and we report controls that held.
- Any genuinely novel finding is disclosed privately through the target's `SECURITY.md` channel before any public mention.

**Forbidden terms and strings for all demo copy:** see [`docs/LANDMINES.md`](./docs/LANDMINES.md). Architecture facts may be cited **only** from [`docs/ground-truth.md`](./docs/ground-truth.md).

## Repository layout

```text
docs/         bible, build map, research briefs, progress, and the four constraint docs
              (LANDMINES.md, ROE.md, ground-truth.md, coverage-matrix.md)
codex/skills/ guardrail skill enforcing one-phase-at-a-time execution
register/     advisories.json — the prior-art register (11 published + 1 draft)
lab/          local instance config + mock-upstream/ stub (Phase 2)
framework/    seam-linter/ + regression-harness/ (Phase 3)
findings/     WM-00X/ per finding: finding.md, evidence/, reproduce.sh (Phase 4)
report/       assembled CERT-In-format report (Phase 5)
deck/         slides + speaker notes (Phase 6)
tests/        verification checks
```

## Quick start — run everything

Zero external dependencies (Node 18+ only, no `npm install`):

```bash
npm test                # unit tests + landmine scan + finding validation + regression harness
npm run fetch-target     # shallow-clone the real target repo for static analysis (public source, read-only)
npm run seam-lint        # run all 3 Seam-Linter tools against the live-cloned source
npm run regress           # advisory-aware regression harness alone
npm run report             # regenerate report/report.md from register + findings
npm run proof-spine        # regenerate docs/proof-spine.md from register/advisories.json
```

**Current real results** (commit `a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0`, 2026-09-28): 4 findings — 2 `REPRODUCED-KNOWN` (WM-001 BOLA / `GHSA-r649`, WM-002 Denial-of-Wallet / `GHSA-hcq5`, the money shot) + 2 `VERIFIED-SECURE` (WM-003 independent rate-limit-coverage re-derivation across 236 real routes, WM-004 CORS wildcard audit across 24 real files). See [`report/report.md`](./report/report.md) and [`docs/coverage-matrix.md`](./docs/coverage-matrix.md).

## Start here

1. Read [`docs/WORLDMONITOR-SIH26163-BIBLE-v2.md`](./docs/WORLDMONITOR-SIH26163-BIBLE-v2.md) for the *why* — thesis, verified ground truth, advisory register, landmines.
2. Read [`docs/WORLDMONITOR-SIH26163-BUILD-MAP.md`](./docs/WORLDMONITOR-SIH26163-BUILD-MAP.md) for the *what and in what order* — 33 tickets across 8 phases, each independently testable.
3. Check [`docs/progress.md`](./docs/progress.md) for current state before touching anything.
4. Work one phase at a time via the guardrail skill:

```bash
# in an agent session
$worldmonitor-assessment-build
```

## The two ground rules

> **No re-reporting.** The ~11 published advisories are prior art. Reproduce them (labelled) to prove the method; never claim them as discoveries. The repo's Security tab is one click away from any judge.

> **No fabrication.** Every fact on a slide traces to `docs/ground-truth.md`, `register/advisories.json`, or the bible's verified-sources list. The research round seeded specific fabrications — one in front of an NTRO jury ends the submission.
