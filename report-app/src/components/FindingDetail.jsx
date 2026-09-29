import React, { useMemo } from 'react';
import { marked } from 'marked';
import { Stamp } from './Blueprint.jsx';

export default function FindingDetail({ data, findingId, onBack }) {
  const finding = data.findings.find((f) => f.id === findingId);
  const html = useMemo(() => (finding?.markdown ? marked.parse(finding.markdown) : null), [finding]);

  if (!finding) {
    return (
      <div>
        <span className="btn-stamp ghost" style={{ cursor: 'pointer' }} onClick={onBack}>&larr; Back to findings</span>
        <p>Finding {findingId} not found.</p>
      </div>
    );
  }

  return (
    <div>
      <span className="btn-stamp ghost" style={{ cursor: 'pointer', marginBottom: 16, display: 'inline-block' }} onClick={onBack}>&larr; Back to findings</span>

      <div className="b-card">
        <div className="finding-card-top" style={{ marginBottom: 4 }}>
          <span className="finding-id mono">{finding.id}</span>
          <Stamp status={finding.status} />
        </div>
        <h1 className="page-title" style={{ marginTop: 8 }}>{finding.title}</h1>

        <div className="kv-grid">
          {finding.severity?.cvss31_vector && (
            <div className="kv-item wide">
              <div className="kv-label">CVSS 3.1{finding.severity?.cvss31_score != null ? ` — ${finding.severity.cvss31_score}` : ''}</div>
              <div className="kv-value">{finding.severity.cvss31_vector}</div>
            </div>
          )}
          {finding.severity?.cvss40_vector && (
            <div className="kv-item wide">
              <div className="kv-label">CVSS 4.0</div>
              <div className="kv-value">{finding.severity.cvss40_vector}</div>
            </div>
          )}
          <div>
            <div className="kv-label">EPSS</div>
            <div className="kv-value">{finding.severity?.epss != null ? finding.severity.epss : (finding.epss_note ? 'n/a — see note' : '—')}</div>
          </div>
          <div>
            <div className="kv-label">CWE</div>
            <div className="kv-value">{(finding.tags?.cwe || []).join(', ') || '—'}</div>
          </div>
          <div>
            <div className="kv-label">WSTG / OWASP</div>
            <div className="kv-value">{finding.tags?.wstg || '—'} {finding.tags?.owasp_api ? `/ ${finding.tags.owasp_api}` : ''}</div>
          </div>
          <div>
            <div className="kv-label">Trust Boundary</div>
            <div className="kv-value">{finding.trust_boundary}</div>
          </div>
          <div className="kv-item wide">
            <div className="kv-label">Component</div>
            <div className="kv-value" style={{ fontSize: 11.5 }}>{finding.component}</div>
          </div>
          <div>
            <div className="kv-label">Scope Area(s)</div>
            <div className="kv-value">{(finding.scope_areas || []).map((n) => `#${n} ${data.scope_area_labels[n]}`).join(' · ')}</div>
          </div>
          {finding.lab_commit && (
            <div>
              <div className="kv-label">Lab Commit</div>
              <div className="kv-value">{finding.lab_commit.slice(0, 12)}</div>
            </div>
          )}
          {finding.references?.ghsa && (
            <div>
              <div className="kv-label">Advisory</div>
              <div className="kv-value">
                <a href={`https://github.com/koala73/worldmonitor/security/advisories/${finding.references.ghsa}`} target="_blank" rel="noreferrer">
                  {finding.references.ghsa}
                </a>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {finding.reproduce_script && (
            <code style={{ background: 'var(--bg)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }}>
              bash {finding.reproduce_script}
            </code>
          )}
          {finding.has_remediation_patch && (
            <span className="stamp approved">✓ remediation.patch verified</span>
          )}
          {finding.evidence_files?.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}>
              {finding.evidence_files.length} evidence file(s) in findings/{finding.dir}/evidence/
            </span>
          )}
        </div>

        {html ? (
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p style={{ color: 'var(--text-faint)' }}>No finding.md write-up available for this finding.</p>
        )}
      </div>
    </div>
  );
}
