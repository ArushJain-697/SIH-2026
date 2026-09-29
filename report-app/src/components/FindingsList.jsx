import React, { useState, useMemo } from 'react';
import { Stamp, StreamDot } from './Blueprint.jsx';

const STATUS_FILTERS = ['ALL', 'REPRODUCED-KNOWN', 'VERIFIED-SECURE', 'CANDIDATE-UNCONFIRMED'];

export default function FindingsList({ data, onSelect }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [activeId, setActiveId] = useState(null);

  const filtered = useMemo(() => {
    return data.findings.filter((f) => {
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      if (areaFilter !== 'ALL' && !(f.scope_areas || []).includes(Number(areaFilter))) return false;
      return true;
    });
  }, [data.findings, statusFilter, areaFilter]);

  return (
    <div>
      <h1 className="page-title">Findings</h1>
      <p className="page-subtitle">
        Every finding traces to real evidence in <code>findings/&lt;id&gt;/evidence/</code> and a
        deterministic <code>reproduce.sh</code>.
      </p>

      <div className="filter-bar">
        {STATUS_FILTERS.map((s) => (
          <button key={s} className={`btn-stamp ghost ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'ALL' ? 'All statuses' : s}
          </button>
        ))}
      </div>
      <div className="filter-bar">
        <button className={`btn-stamp ghost ${areaFilter === 'ALL' ? 'active' : ''}`} onClick={() => setAreaFilter('ALL')}>All areas</button>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button key={n} className={`btn-stamp ghost ${areaFilter === String(n) ? 'active' : ''}`} onClick={() => setAreaFilter(String(n))}>
            Area {n}
          </button>
        ))}
      </div>

      <div className="stream-wrap">
        <div className="stream-sidebar">
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`stream-sidebar-item ${activeId === f.id ? 'active' : ''}`}
              onMouseEnter={() => setActiveId(f.id)}
              onClick={() => onSelect(f.id)}
            >
              <StreamDot status={f.status} />
              <span className="mono">{f.id}</span>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 14, fontSize: 10.5, color: 'var(--text-faint)' }}>No matches.</div>}
        </div>

        <table className="stream-table">
          <thead>
            <tr>
              <th>Span (title)</th>
              <th style={{ width: 220 }}>CVSS position</th>
              <th style={{ width: 90 }}>Score</th>
              <th style={{ width: 120 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const score = f.severity?.cvss31_score;
              const pct = score != null ? Math.min(100, (score / 10) * 100) : 0;
              const hot = score != null && score >= 7;
              return (
                <tr key={f.id} onMouseEnter={() => setActiveId(f.id)} onClick={() => onSelect(f.id)}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{f.title}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 2 }}>
                      {f.id} · scope {(f.scope_areas || []).join(', ')}
                      {f.has_remediation_patch && <span style={{ color: 'var(--green)' }}> · has patch</span>}
                    </div>
                  </td>
                  <td>
                    <div className="stream-bar-track">
                      {score != null && <div className={`stream-bar-fill ${hot ? 'hot' : ''}`} style={{ width: `${pct}%` }} />}
                    </div>
                  </td>
                  <td className="mono">{score != null ? score.toFixed(1) : '—'}</td>
                  <td><Stamp status={f.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
