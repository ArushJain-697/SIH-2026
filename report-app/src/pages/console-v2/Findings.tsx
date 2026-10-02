import { useMemo, useState } from 'react';
import { data } from '../../data';
import { statusMeta } from '../../lib/status';
import type { FindingStatus } from '../../types';

const STATUS: { key: 'ALL' | FindingStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'REPRODUCED-KNOWN', label: 'Reproduced' },
  { key: 'CANDIDATE-UNCONFIRMED', label: 'Candidate' },
  { key: 'VERIFIED-SECURE', label: 'Verified secure' },
];

export function Findings({ go }: { go: (p: string) => void }) {
  const [status, setStatus] = useState<'ALL' | FindingStatus>('ALL');
  const [area, setArea] = useState<number | 'ALL'>('ALL');

  const rows = useMemo(
    () => data.findings.filter((f) => (status === 'ALL' || f.status === status) && (area === 'ALL' || f.scope_areas.includes(area))),
    [status, area],
  );

  const sc = data.summary.status_counts;
  const summary: { key: FindingStatus; label: string; color: string; pill: string }[] = [
    { key: 'REPRODUCED-KNOWN', label: 'Reproduced', color: '#ff7a3d', pill: 'ember' },
    { key: 'CANDIDATE-UNCONFIRMED', label: 'Candidate', color: '#ffb020', pill: 'amber' },
    { key: 'VERIFIED-SECURE', label: 'Verified secure', color: '#3fcf8e', pill: 'moss' },
  ];
  const total = data.summary.total_findings || 1;

  return (
    <>
      <div className="v2-head">
        <div>
          <h1>Findings</h1>
          <p>Every verdict traces to evidence in <code>findings/&lt;id&gt;/evidence/</code> and a deterministic <code>reproduce.sh</code>.</p>
        </div>
      </div>

      <div className="v2-bento">
        {summary.map((s) => (
          <button
            key={s.key}
            className={`v2-tile v2-stat v2-span-4 ${status === s.key ? '' : 'v2-glass'}`}
            style={status === s.key ? { background: `linear-gradient(140deg, ${s.color}, ${s.color}dd)`, color: '#140b08', border: 0, cursor: 'pointer', width: '100%' } : { cursor: 'pointer', width: '100%' }}
            onClick={() => setStatus(status === s.key ? 'ALL' : s.key)}
          >
            <div className="v2-tile-num">{sc[s.key] ?? 0}</div>
            <div className="v2-tile-sub">{s.label} · {Math.round(((sc[s.key] ?? 0) / total) * 100)}%</div>
            <div className="v2-tile-bar"><i style={{ width: `${((sc[s.key] ?? 0) / total) * 100}%`, background: status === s.key ? '#140b08' : s.color }} /></div>
          </button>
        ))}
      </div>

      <div className="v2-filter-row" style={{ marginTop: '0.5rem' }}>
        {STATUS.map((s) => (
          <button key={s.key} className={`v2-filter ${status === s.key ? 'is-on' : ''}`} onClick={() => setStatus(s.key)}>{s.label}</button>
        ))}
      </div>
      <div className="v2-filter-row">
        <button className={`v2-filter ${area === 'ALL' ? 'is-on' : ''}`} onClick={() => setArea('ALL')}>All areas</button>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button key={n} className={`v2-filter ${area === n ? 'is-on' : ''}`} onClick={() => setArea(n)} title={data.scope_area_labels[n] ?? ''}>
            {n} · {data.scope_area_labels[n]}
          </button>
        ))}
      </div>

      <div className="v2-chart-card" style={{ marginTop: '0.5rem' }}>
        <div className="v2-row-list">
          {rows.map((f) => {
            const s = f.severity?.cvss31_score;
            const m = statusMeta(f.status);
            const tone = m.tone === 'red' ? 'ember' : m.tone === 'yellow' ? 'amber' : m.tone === 'green' ? 'moss' : 'neutral';
            return (
              <div className={`v2-row ${tone !== 'neutral' ? `is-${tone}` : ''}`} key={f.id} onClick={() => go(`/console/findings/${f.id}`)}>
                <span className="v2-row-id">{f.id}</span>
                <div className="v2-row-main">
                  <div className="v2-row-title">{f.title}</div>
                  <div className="v2-row-meta">Scope {f.scope_areas.join(', ')}{f.references?.ghsa ? ` · ${f.references.ghsa}` : ''}{f.has_remediation_patch ? ' · has patch' : ''}</div>
                </div>
                <span className={`v2-row-score ${s == null ? 'is-na' : ''}`}>{s != null ? s.toFixed(1) : 'N/A'}</span>
                <span className={`v2-pill ${tone}`}>{m.label}</span>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--v2-faint)', padding: '2.5rem 0' }}>No findings match these filters.</div>
          )}
        </div>
      </div>
    </>
  );
}
