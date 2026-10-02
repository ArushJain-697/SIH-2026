import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { data } from '../../data';
import { statusMeta } from '../../lib/status';
import type { Finding } from '../../types';

function severity(f: Finding): ReactNode {
  if (!f.severity?.cvss31_vector) return `N/A: ${f.status} (a held control has nothing to score)`;
  return (
    <>
      <div className="mono">CVSS 3.1 ({f.severity.cvss31_score}): {f.severity.cvss31_vector}</div>
      {f.severity.cvss40_vector && <div className="mono">CVSS 4.0: {f.severity.cvss40_vector}</div>}
      <div className="mono">EPSS: {typeof f.severity.epss === 'number' ? f.severity.epss : 'N/A (no CVE assigned)'}</div>
    </>
  );
}

function steps(f: Finding): ReactNode {
  return (
    <>
      {f.preconditions && <div style={{ marginBottom: '0.35rem' }}>Preconditions: {f.preconditions}</div>}
      <div className="mono">{f.reproduce_script ? `bash ${f.reproduce_script}` : 'Static-analysis verdict. See proof of concept for the source evidence.'}</div>
    </>
  );
}

function poc(f: Finding): ReactNode {
  if (f.evidence_summary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.2rem 1rem' }}>
        {Object.entries(f.evidence_summary).map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <span style={{ color: 'var(--v2-faint)', fontSize: '0.8rem' }}>{k.replace(/_/g, ' ')}</span>
            <span className="mono" style={{ overflowWrap: 'anywhere' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return f.evidence_files.map((e) => <div key={e} className="mono">findings/{f.dir}/evidence/{e}</div>);
}

function Row({ f, i }: { f: Finding; i: number }) {
  const [open, setOpen] = useState(i === 0);
  const m = statusMeta(f.status);
  return (
    <div className={`v2-acc ${open ? 'is-open' : ''}`}>
      <button className="v2-acc-head" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontFamily: 'JetBrains Mono Variable, monospace', fontWeight: 700, fontSize: '0.84rem', color: 'var(--v2-faint)' }}>{f.id}</span>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
        <span className={`v2-pill ${m.tone === 'red' ? 'ember' : m.tone === 'yellow' ? 'amber' : 'moss'}`}>{m.label}</span>
        <ChevronDown size={16} className="chev" />
      </button>
      {open && (
        <div className="v2-acc-body">
          <Field k="Description">{f.description}</Field>
          <Field k="Affected component"><span className="mono">{f.component}</span></Field>
          <Field k="Severity (CVSS)">{severity(f)}</Field>
          <Field k="Steps to reproduce">{steps(f)}</Field>
          <Field k="Proof of concept">{poc(f)}</Field>
          <Field k="Business impact">{f.business_impact}</Field>
          <Field k="Remediation">
            {f.remediation}
            {f.has_remediation_patch && <div style={{ marginTop: '0.5rem' }}><span className="v2-pill moss">✓ {f.remediation_patch}</span></div>}
          </Field>
        </div>
      )}
    </div>
  );
}

export function PSExport() {
  return (
    <>
      <div className="v2-head">
        <div>
          <h1>PS deliverable export</h1>
          <p>Every finding in the exact field order PS 26163 names. Also generated as <code>report/ps-schema-export.md</code>, never hand-typed. Click a finding to expand it.</p>
        </div>
      </div>
      <div>
        {data.findings.map((f, i) => <Row f={f} i={i} key={f.id} />)}
      </div>
    </>
  );
}

function Field({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="v2-field">
      <div className="k">{k}</div>
      <div className="v">{children}</div>
    </div>
  );
}
