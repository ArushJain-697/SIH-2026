import React from 'react';

const PS_FIELDS = [
  'Vulnerability title',
  'Description',
  'Affected component',
  'Severity (CVSS)',
  'Steps to reproduce',
  'Proof of concept',
  'Business impact',
  'Remediation',
];

function severityField(f) {
  if (!f.severity?.cvss31_vector) {
    return `N/A — ${f.status} (no vulnerability exists to score; a held control has no CVSS)`;
  }
  const parts = [`CVSS 3.1: ${f.severity.cvss31_score} — ${f.severity.cvss31_vector}`];
  if (f.severity.cvss40_vector) parts.push(`CVSS 4.0: ${f.severity.cvss40_vector}`);
  if (typeof f.severity.epss === 'number') parts.push(`EPSS: ${f.severity.epss}`);
  else if (f.epss_note) parts.push(`EPSS: N/A — ${f.epss_note}`);
  return parts;
}

function stepsField(f) {
  const parts = [];
  if (f.preconditions) parts.push(`Preconditions: ${f.preconditions}`);
  parts.push(f.reproduce_script ? `bash ${f.reproduce_script}` : 'Static-analysis-only verdict — no dynamic reproduction script.');
  return parts;
}

function pocField(f) {
  if (f.evidence_summary && Object.keys(f.evidence_summary).length > 0) {
    return Object.entries(f.evidence_summary);
  }
  if (f.evidence_files?.length > 0) {
    return f.evidence_files.map((ef) => `findings/${f.dir}/evidence/${ef}`);
  }
  return [`See findings/${f.dir}/finding.md`];
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9.5, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)' }}>{children}</div>
    </div>
  );
}

export default function PSExport({ data }) {
  return (
    <div>
      <h1 className="page-title">PS Deliverable Export</h1>
      <p className="page-subtitle">
        Every finding rendered in the exact field order PS 26163 names — Vulnerability title, Description,
        Affected component, Severity (CVSS), Steps to reproduce, Proof of concept, Business impact,
        Remediation — generated from <code>findings/*/finding.json</code>, never hand-typed.
        Also downloadable as <code>report/ps-schema-export.md</code>.
      </p>

      <div className="finding-list">
        {data.findings.map((f) => (
          <div key={f.id} className="b-card">
            <div className="finding-card-top">
              <span className="finding-id mono">{f.id}</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{f.status}</span>
            </div>

            <Field label={PS_FIELDS[0]}>{f.title}</Field>
            <Field label={PS_FIELDS[1]}>{f.description}</Field>
            <Field label={PS_FIELDS[2]}><span className="mono" style={{ fontSize: 11.5 }}>{f.component}</span></Field>
            <Field label={PS_FIELDS[3]}>
              {Array.isArray(severityField(f))
                ? severityField(f).map((l, i) => <div key={i} className="mono" style={{ fontSize: 11.5 }}>{l}</div>)
                : severityField(f)}
            </Field>
            <Field label={PS_FIELDS[4]}>
              {stepsField(f).map((l, i) => <div key={i} className="mono" style={{ fontSize: 11.5 }}>{l}</div>)}
            </Field>
            <Field label={PS_FIELDS[5]}>
              {Array.isArray(pocField(f)) && pocField(f)[0] && Array.isArray(pocField(f)[0]) ? (
                <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', tableLayout: 'fixed' }}>
                  <tbody>
                    {pocField(f).map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ padding: '2px 10px 2px 0', color: 'var(--text-faint)', width: '45%' }}>{k}</td>
                        <td className="mono" style={{ overflowWrap: 'anywhere' }}>{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                pocField(f).map((l, i) => <div key={i} className="mono" style={{ fontSize: 11.5 }}>{l}</div>)
              )}
            </Field>
            <Field label={PS_FIELDS[6]}>{f.business_impact}</Field>
            <Field label={PS_FIELDS[7]}>
              {f.remediation}
              {f.has_remediation_patch && (
                <div style={{ marginTop: 6 }}><span className="stamp approved">✓ {f.remediation_patch}</span></div>
              )}
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}
