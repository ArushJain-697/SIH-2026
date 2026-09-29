import React from 'react';
import { Stamp, SectionTitle } from './Blueprint.jsx';

function severityBand(f) {
  if (f.status === 'VERIFIED-SECURE') return null;
  const s = f.severity?.cvss31_score;
  if (s === undefined || s === null) return null;
  if (s >= 7.0) return 'red';
  if (s >= 4.0) return 'amber';
  return 'green';
}

function diffLines(patch) {
  if (!patch) return [];
  return patch.split('\n').filter((l) => !l.startsWith('index ')).slice(0, 16);
}

function RegressionCard({ results }) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  return (
    <div className="b-card">
      <div className="bento-title">
        Regression Harness
        <span className="bento-tag">{passed}/{total} PASS</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 10 }}>
        lab/repro-services/*/manifest.mjs — auto-discovered
      </div>
      {results.map((r) => (
        <div key={r.advisory} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span className={`stream-dot ${r.pass ? 'approved' : 'flagged'}`} />
            <span className="mono" style={{ fontSize: 10.5 }}>{r.advisory}</span>
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-dim)', paddingLeft: 15, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{r.detail}</div>
        </div>
      ))}
    </div>
  );
}

function ClusteringCard({ coverageMatrix }) {
  const rows = Object.values(coverageMatrix);
  return (
    <div className="b-card">
      <div className="bento-title">
        Scope-Area Verdicts
        <span className="bento-tag">7 AREAS</span>
      </div>
      {rows.map((c) => {
        const color = c.verdict === 'FINDING' ? 'var(--red)' : c.verdict === 'CANDIDATE' ? 'var(--amber)' : 'var(--green)';
        const width = c.verdict === 'NOT_TESTED' ? 6 : 100;
        return (
          <div key={c.area_number} className="bar-row">
            <span className="bar-label">AREA {c.area_number}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${width}%`, background: color }} />
            </span>
            <span className="bar-val mono" style={{ fontSize: 9 }}>{c.finding_ids.length || '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReplayCard({ finding }) {
  if (!finding) {
    return (
      <div className="b-card">
        <div className="bento-title">Version Replay<span className="bento-tag">N/A</span></div>
        <p style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>No remediation patch to render.</p>
      </div>
    );
  }
  const lines = diffLines(finding.remediation_patch_diff);
  return (
    <div className="b-card">
      <div className="bento-title">
        Version Replay
        <span className="bento-tag">{finding.id}</span>
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginBottom: 8 }}>
        git apply --check verified · findings/{finding.dir}/remediation.patch
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 190, overflowY: 'auto' }}>
        {lines.map((l, i) => {
          const cls = l.startsWith('+') && !l.startsWith('+++') ? 'add' : l.startsWith('-') && !l.startsWith('---') ? 'del' : 'ctx';
          return <div key={i} className={`diff-line ${cls}`}>{l || ' '}</div>;
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ data, onSelectFinding }) {
  const { summary, coverage_matrix, findings, register, regression_results } = data;
  const sc = summary.status_counts;

  const bands = findings.map(severityBand).filter(Boolean);
  const redCount = bands.filter((b) => b === 'red').length;
  const amberCount = bands.filter((b) => b === 'amber').length;
  const greenCount = bands.filter((b) => b === 'green').length;
  const total = redCount + amberCount + greenCount || 1;

  const topFindings = findings
    .filter((f) => f.status === 'REPRODUCED-KNOWN' || f.status === 'CONFIRMED-NOVEL')
    .sort((a, b) => (b.severity?.cvss31_score || 0) - (a.severity?.cvss31_score || 0));

  const replayFinding = findings.find((f) => f.has_remediation_patch && f.remediation_patch_diff);

  return (
    <div>
      <h1 className="page-title">WorldMonitor — Security Assessment</h1>
      <p className="page-subtitle">
        Real, controlled-environment evidence against{' '}
        <code>github.com/koala73/worldmonitor</code> — SIH 26163 (NTRO). "No finding without proof."
      </p>

      <div className="stat-row">
        <div className="stat-cell">
          <div className="num">{summary.total_findings}</div>
          <div className="label">Total Findings</div>
        </div>
        <div className="stat-cell red">
          <div className="num">{sc['REPRODUCED-KNOWN'] || 0}</div>
          <div className="label">Reproduced (Known)</div>
        </div>
        <div className="stat-cell">
          <div className="num">{sc['VERIFIED-SECURE'] || 0}</div>
          <div className="label">Verified Secure</div>
        </div>
        <div className="stat-cell cyan">
          <div className="num">{sc['CANDIDATE-UNCONFIRMED'] || 0}</div>
          <div className="label">Candidate</div>
        </div>
        <div className="stat-cell">
          <div className="num">{summary.scope_areas_with_evidence}/7</div>
          <div className="label">Scope Areas Covered</div>
        </div>
        <div className="stat-cell">
          <div className="num">{register.count_published}</div>
          <div className="label">Prior Advisories</div>
        </div>
      </div>

      <div className="section">
        <SectionTitle>Severity distribution — findings with a CVSS score</SectionTitle>
        <div className="severity-bar-track">
          {redCount > 0 && <div className="severity-bar-seg red" style={{ width: `${(redCount / total) * 100}%` }} />}
          {amberCount > 0 && <div className="severity-bar-seg amber" style={{ width: `${(amberCount / total) * 100}%` }} />}
          {greenCount > 0 && <div className="severity-bar-seg green" style={{ width: `${(greenCount / total) * 100}%` }} />}
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 8 }}>
          {redCount} high/critical · {amberCount} medium · {greenCount} low
        </p>
      </div>

      <div className="section">
        <SectionTitle>Bench tests — live-run, not staged</SectionTitle>
        <div className="bento-grid">
          <RegressionCard results={regression_results || []} />
          <ClusteringCard coverageMatrix={coverage_matrix} />
          <ReplayCard finding={replayFinding} />
        </div>
      </div>

      <div className="section">
        <SectionTitle count={`${summary.scope_areas_with_evidence}/7`}>Coverage — all 7 PS scope areas</SectionTitle>
        <div className="coverage-grid">
          {Object.values(coverage_matrix).map((c) => (
            <div key={c.area_number} className="b-card">
              <div className="area-num">AREA {c.area_number}</div>
              <div className="area-label">{c.label}</div>
              <Stamp status={c.verdict === 'FINDING' ? 'REPRODUCED-KNOWN' : c.verdict === 'CANDIDATE' ? 'CANDIDATE-UNCONFIRMED' : 'VERIFIED-SECURE'} label={c.verdict.replace('_', ' ')} />
              {c.finding_ids.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--text-dim)' }}>
                  {c.finding_ids.map((id, i) => (
                    <span key={id}>
                      <span className="mono" style={{ cursor: 'pointer', color: 'var(--green)' }} onClick={() => onSelectFinding(id)}>{id}</span>
                      {i < c.finding_ids.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <SectionTitle count={topFindings.length}>Top findings — reproduced/confirmed, by severity</SectionTitle>
        <div className="finding-list">
          {topFindings.map((f) => (
            <div key={f.id} className="b-card clickable" onClick={() => onSelectFinding(f.id)}>
              <div className="finding-card-top">
                <span className="finding-id mono">{f.id}</span>
                <p className="finding-title">{f.title}</p>
                <Stamp status={f.status} />
              </div>
              <div className="finding-meta">
                {f.severity?.cvss31_score != null && <span>CVSS 3.1: {f.severity.cvss31_score}</span>}
                {f.references?.ghsa && <span>{f.references.ghsa}</span>}
                <span>Scope: {(f.scope_areas || []).join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
