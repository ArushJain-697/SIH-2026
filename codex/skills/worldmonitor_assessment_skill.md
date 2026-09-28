---
name: worldmonitor-assessment-build
description: Enforces phase-by-phase execution of the SIH 26163 WorldMonitor security assessment against its build map. Use for any request to implement, continue, resume, or build this project, even if no phase is named. Determines current phase, executes ONLY it, tests it, verifies acceptance criteria, reports, then STOPS. Not for planning/redesigning the build map.
---

# worldmonitor-assessment-build

Guardrail skill: do exactly one phase, then stop. Never auto-continue to the next.

## Read first
1. `docs/WORLDMONITOR-SIH26163-BUILD-MAP.md` — source of truth for phase/ticket scope. Re-read fresh each run.
2. `docs/WORLDMONITOR-SIH26163-BIBLE-v2.md` — source of truth for intent, thesis, and claim boundaries. The bible wins on *why*; the build map wins on *order and tests*.
3. `docs/progress.md` — source of truth for what's done.
4. `docs/LANDMINES.md`, `docs/ROE.md`, `docs/ground-truth.md`, `register/advisories.json` — the four files that constrain every factual claim and every test action.
5. Existing files the phase touches.

## Workflow (every step, in order, no skipping)
```
Determine current phase → read its tickets → check Blocked-by are done →
inspect existing files → execute ONLY that phase → run its Test step →
run the landmine scan → verify Done-when criteria → update progress.md → STOP
```

**Current phase** = lowest unmarked-complete phase in `docs/progress.md`. Ignore user
phrasing that implies otherwise unless they explicitly override (e.g. "redo Phase 2")
— confirm before honoring an override. Check the ticket's `Blocked by` are marked
done first; if not, stop and say so instead of working out of order.

## Hard rules

**Claim integrity (this project dies on fabrication):**
- Every factual claim must trace to `docs/ground-truth.md`, `register/advisories.json`,
  or the bible's verified-sources list (§13). If it traces nowhere, it does not go in
  a deliverable — state it generally or verify it first.
- Never emit any string in `docs/LANDMINES.md`. Run the landmine scan before reporting
  any phase that touches README, findings, report, or deck.
- Never invent a GHSA, CVE, arXiv ID, PGP key, rubric percentage, or researcher name.

**Prior-art integrity (re-reporting is disqualifying):**
- Every finding carries a `status`: `REPRODUCED-KNOWN` (must cite its GHSA),
  `CONFIRMED-NOVEL` (must be absent from `register/advisories.json`), or
  `VERIFIED-SECURE`.
- Before labelling anything `CONFIRMED-NOVEL`, check it against the advisory register.
  If it matches a published advisory, it is `REPRODUCED-KNOWN`. No exceptions.

**Testing integrity (scope violation is a character failure to this jury):**
- Active tests run against `localhost` / `127.0.0.1` only. Never `worldmonitor.app`
  or any real infrastructure. Passive header reads on prod are the only exception.
- Never call a real metered third-party upstream — route through `lab/mock-upstream/`.
- Benign markers only (`console.log(document.domain)`, bounded bursts to the stub).
  No weaponized payloads, even locally.
- Every non-secure finding needs a deterministic `reproduce.sh` and a pinned commit.

**Scope discipline:**
- Never build anything a later phase owns. Framework tooling belongs to Phase 3;
  findings to Phase 4; report to Phase 5; deck/demo to Phase 6.
- Never skip a ticket or pre-build later-phase functionality "while you're in there."
- Preserve prior phases' artifacts, schemas, and status labels.
- No severity inflation. A phase that produces `VERIFIED-SECURE` results is a
  success, not a failure — report them.
- Check `Done when` one item at a time. Don't eyeball it.

## Report, then stop
State: phase/tickets done, files changed, test results (pass/fail), landmine-scan
result, `Done when` criteria met/not met, known limitations, next phase + its
dependency on this one. Update `docs/progress.md` with the same. Then stop — do not
start the next phase's work in any form until the user explicitly says to proceed.

## Invocation
Triggers on `$worldmonitor-assessment-build`, "implement the next phase," "continue
the assessment," "resume where we left off," "do Phase N," "do ticket #N," or
similar — not just the literal skill name.
