# Finding schema — field reference

**Enforced by:** [`finding-rules.mjs`](./finding-rules.mjs) · **Run by:** [`tests/validate_findings.mjs`](../../tests/validate_findings.mjs) · **Build-map ticket:** #7 · **Bible:** §11

Every `findings/WM-0XX/finding.json` must satisfy this. The validator cross-checks `status` against `register/advisories.json` — that cross-check *is* the anti-plagiarism / anti-fabrication enforcement in code, not just in a doc.

```jsonc
{
  "id": "WM-001",                 // WM-### — sequential
  "title": "short, class + component",
  "status": "REPRODUCED-KNOWN",   // REPRODUCED-KNOWN | CONFIRMED-NOVEL | CANDIDATE-UNCONFIRMED | VERIFIED-SECURE
  "component": "convex query getByEnabled (mock harness)",
  "trust_boundary": 5,            // bible §3.2 boundary number

  "severity": {                   // omitted fields for VERIFIED-SECURE
    "cvss31_vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    "cvss31_score": 6.5,
    "cvss40_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
    "epss": null                  // number 0-1, OR omit + set epss_note
  },
  "epss_note": "No CVE assigned to this finding; EPSS is a per-CVE exploitation-probability score and does not apply directly. Reasoned likelihood is discussed qualitatively in the report per CERT-In's dual CVSS+EPSS guidance.",

  "tags": {
    "cwe": ["CWE-284", "CWE-639"],
    "wstg": "WSTG-ATHZ-02",
    "owasp_api": "API1:2023"      // omit for VERIFIED-SECURE
  },

  "lab_commit": "a1caad92c7488ebb6a1ed6a3a9aed7591f89aab0",
  "reproduce_script": "findings/WM-001/reproduce.sh",
  "control_tested": null,         // required string for VERIFIED-SECURE, e.g. "reflected-origin + credentials on Pro endpoints"

  "description": "the defect and mechanism, not the payload",
  "preconditions": "auth level, config, seeded state",
  "business_impact": "money / data / availability / trust, in the owner's terms",
  "remediation": "specific change, diff where possible",

  "references": {
    "ghsa": "GHSA-r649-4cqj-w93h",   // REQUIRED if status = REPRODUCED-KNOWN; FORBIDDEN (must be null/absent) if CONFIRMED-NOVEL/CANDIDATE-UNCONFIRMED
    "external": ["https://stack.convex.dev/authorization"]
  }
}
```

## The four statuses

| Status | Meaning | Validator enforces |
| --- | --- | --- |
| `REPRODUCED-KNOWN` | Published advisory class reproduced to validate our harness | `references.ghsa` **must** resolve in `register/advisories.json` |
| `CONFIRMED-NOVEL` | New issue, confirmed in the lab | `references.ghsa` **must not** match a register entry |
| `CANDIDATE-UNCONFIRMED` | Framework-surfaced candidate we could not verify against real infra (no credentials) | Same anti-collision check as above; honesty over false confidence (build-map #21) |
| `VERIFIED-SECURE` | Hostile vector attempted, control held | `control_tested` required; no CVSS required |

Run the validator: `node tests/validate_findings.mjs`
