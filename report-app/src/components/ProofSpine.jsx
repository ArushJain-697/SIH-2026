import React from 'react';

export default function ProofSpine({ data }) {
  const { register } = data;

  return (
    <div>
      <h1 className="page-title">Proof Spine</h1>
      <p className="page-subtitle">
        Every published advisory on the target repository — prior art, verified {register.verified_on}.
        Reproduced (never claimed as novel) where cited by a finding; catalogued otherwise.
      </p>

      <div className="stat-row" style={{ marginBottom: 24 }}>
        <div className="stat-cell">
          <div className="num">{register.count_published}</div>
          <div className="label">Published Advisories</div>
        </div>
        <div className="stat-cell cyan">
          <div className="num">{register.count_draft}</div>
          <div className="label">Draft / Accepted Residual</div>
        </div>
        <div className="stat-cell red">
          <div className="num">{data.findings.filter((f) => f.references?.ghsa).length}</div>
          <div className="label">Reproduced by This Assessment</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="reg-table">
          <thead>
            <tr>
              <th>GHSA</th>
              <th>Severity</th>
              <th>Class</th>
              <th>Platform</th>
              <th>CWE</th>
              <th>Reproduced By</th>
            </tr>
          </thead>
          <tbody>
            {register.advisories.map((a) => {
              const reproducedBy = data.findings.find((f) => f.references?.ghsa === a.id);
              return (
                <tr key={a.id}>
                  <td>
                    <a href={`https://github.com/koala73/worldmonitor/security/advisories/${a.id}`} target="_blank" rel="noreferrer" className="mono">
                      {a.id}
                    </a>
                  </td>
                  <td>{a.severity}</td>
                  <td style={{ maxWidth: 260 }}>{a.class}</td>
                  <td>{a.platform}</td>
                  <td className="mono">{(a.cwe || []).join(', ')}</td>
                  <td>
                    {reproducedBy ? (
                      <span className="stamp flagged">{reproducedBy.id}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>catalogued only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {register.external_researcher_credits?.length > 0 && (
        <div className="section" style={{ marginTop: 28 }}>
          <div className="section-title">External researcher credits</div>
          {register.external_researcher_credits.map((c) => (
            <p key={c.researcher} style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              <strong style={{ color: 'var(--text)' }}>{c.researcher}</strong> ({c.year}): {c.findings.join('; ')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
