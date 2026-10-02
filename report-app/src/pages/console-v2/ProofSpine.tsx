import { ArrowUpRight } from 'lucide-react';
import { data } from '../../data';

export function ProofSpine({ go }: { go: (p: string) => void }) {
  const { register } = data;
  const reproducedBy = (ghsa: string) => data.findings.find((f) => f.references?.ghsa === ghsa);

  return (
    <>
      <div className="v2-head">
        <div>
          <h1>Proof spine</h1>
          <p>Every advisory already published on the target, verified {register.verified_on}. Prior art is reproduced and labelled as such, never claimed as a new discovery.</p>
        </div>
      </div>

      <div className="v2-bento">
        <div className="v2-tile v2-stat v2-dark v2-span-4">
          <div className="v2-tile-num">{register.count_published}</div>
          <div className="v2-tile-sub">Published advisories</div>
        </div>
        <div className="v2-tile v2-stat v2-amber v2-span-4">
          <div className="v2-tile-num">{register.count_draft}</div>
          <div className="v2-tile-sub">Draft / accepted residual</div>
        </div>
        <div className="v2-tile v2-stat v2-ember v2-span-4">
          <div className="v2-tile-num">{data.findings.filter((f) => f.references?.ghsa).length}</div>
          <div className="v2-tile-sub">Reproduced by this assessment</div>
        </div>
      </div>

      <div className="v2-chart-card">
        <div className="v2-row-list">
          {register.advisories.map((a) => {
            const f = reproducedBy(a.id);
            const tone = a.severity.startsWith('High') ? 'ember' : a.severity.startsWith('Low') ? 'neutral' : 'amber';
            return (
              <div className={`v2-row ${tone !== 'neutral' ? `is-${tone}` : ''}`} key={a.id} style={{ cursor: 'default' }}>
                <a className="v2-row-id" style={{ color: '#ff8a52', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'auto' }} href={`https://github.com/koala73/worldmonitor/security/advisories/${a.id}`} target="_blank" rel="noreferrer">
                  {a.id} <ArrowUpRight size={11} />
                </a>
                <div className="v2-row-main">
                  <div className="v2-row-title">{a.class}</div>
                  <div className="v2-row-meta">{a.platform}{a.cwe ? ` · ${a.cwe.join(', ')}` : ''}</div>
                </div>
                <span className={`v2-pill ${tone}`}>{a.severity}</span>
                {f
                  ? <button className="v2-pill moss" style={{ cursor: 'pointer', border: 0 }} onClick={() => go(`/console/findings/${f.id}`)}>{f.id}</button>
                  : <span className="v2-pill neutral">Catalogued</span>}
              </div>
            );
          })}
        </div>
      </div>

      {register.external_researcher_credits.length > 0 && (
        <div className="v2-chart-card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.7rem' }}>External researcher credits</h3>
          {register.external_researcher_credits.map((c) => (
            <p key={c.researcher} style={{ fontSize: '0.86rem', color: 'var(--v2-muted)', marginBottom: '0.4rem' }}>
              <b style={{ color: '#fff' }}>{c.researcher}</b> ({c.year}): {c.findings.join('; ')}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
