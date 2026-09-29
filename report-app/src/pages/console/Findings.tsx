import { useMemo, useState } from 'react';
import { data } from '../../data';
import { StatusBadge } from '../../components/ui';
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Findings</h1>
          <p>Every verdict traces to evidence in <code>findings/&lt;id&gt;/evidence/</code> and a deterministic <code>reproduce.sh</code>.</p>
        </div>
      </div>

      <div className="filters">
        {STATUS.map((s) => (
          <button key={s.key} className={`chip ${status === s.key ? 'on' : ''}`} onClick={() => setStatus(s.key)}>{s.label}</button>
        ))}
      </div>
      <div className="filters">
        <button className={`chip ${area === 'ALL' ? 'on' : ''}`} onClick={() => setArea('ALL')}>All areas</button>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button key={n} className={`chip ${area === n ? 'on' : ''}`} onClick={() => setArea(n)} title={data.scope_area_labels[n] ?? ''}>
            {n} · {data.scope_area_labels[n]}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Finding</th><th>CVSS 3.1</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const s = f.severity?.cvss31_score;
                return (
                  <tr key={f.id} className="click" onClick={() => go(`/console/findings/${f.id}`)}>
                    <td className="mono" style={{ fontWeight: 700, width: 90 }}>{f.id}</td>
                    <td>
                      <div className="t-title">{f.title}</div>
                      <div className="t-meta">
                        Scope {f.scope_areas.join(', ')}
                        {f.references?.ghsa ? ` · ${f.references.ghsa}` : ''}
                        {f.has_remediation_patch ? ' · has patch' : ''}
                      </div>
                    </td>
                    <td style={{ width: 190 }}>
                      {s != null ? (
                        <div className="score">
                          <div className="bar"><i style={{ width: `${s * 10}%`, ['--c' as string]: s >= 7 ? 'var(--color-primary-500)' : 'var(--color-secondary-500)' }} /></div>
                          <b>{s.toFixed(1)}</b>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-400)' }}>No vulnerability to score</span>
                      )}
                    </td>
                    <td style={{ width: 150 }}><StatusBadge status={f.status} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-neutral-500)', padding: '2rem' }}>No findings match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
