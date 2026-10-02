# Findings

**Owned by:** Phase 4 (tickets #19–#23). **Do not populate before Phase 4 is authorized.**

## Layout

One directory per finding:

```text
findings/
  WM-001/
    finding.md        the finding, in the schema below
    evidence/         raw HTTP request/response, logs, screenshots
    reproduce.sh      deterministic re-run against the local instance
    README            one line: the pinned lab commit + config used
```

## Status enum (mandatory - the guardrail skill enforces this)

| Status | Meaning | Hard requirement |
| --- | --- | --- |
| `REPRODUCED-KNOWN` | A published advisory class reproduced in the lab to validate our harness | **Must** cite its GHSA in `references`. Presenting one of these as a discovery is disqualifying. |
| `CONFIRMED-NOVEL` | A new issue found by the framework | **Must** be absent from `register/advisories.json`. Check before labelling. |
| `VERIFIED-SECURE` | Hostile attempt made, control held | **Must** record the vector tested and the evidence it was repelled. |

## Finding schema

```text
[WM-00X] <Component> - <Class> allows <Impact>
Status:    REPRODUCED-KNOWN | CONFIRMED-NOVEL | VERIFIED-SECURE
Severity:  CVSS 3.1 <score> <vector>
           CVSS 4.0 <vector>
           EPSS <probability>
Tags:      CWE-XXX | WSTG-XXXX | API#:2023 | ASVS Vx.x
Component: api/_foo.ts (endpoint /api/foo)   Trust boundary: <n>
Lab:       commit <hash>, config <ref>

Description      the defect and mechanism, not the payload
Preconditions    auth level, config, seeded state
Steps            deterministic, against localhost
Proof of concept benign marker only - see docs/ROE.md
Business impact  money / data / availability / trust, in the owner's terms
Remediation      specific change, with a diff where possible
References       OWASP / CWE / the GHSA if reproduced / external anchor
```

## Non-negotiables

- **Benign payloads only.** `console.log(document.domain)`, a DOM marker, a bounded burst against `lab/mock-upstream/`. Never a weaponized payload, even locally.
- **`localhost` only.** See [`../docs/ROE.md`](../docs/ROE.md). Never `worldmonitor.app`.
- **Determinism.** If `reproduce.sh` does not re-run it, it is not confirmed.
- **No severity inflation.** The credibility mix is reproduced + novel + verified-secure. An all-criticals report on a hardened app is distrusted.
