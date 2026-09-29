import { ArrowUpRight, BookOpen, FileWarning, Repeat } from 'lucide-react';
import { data } from '../../data';
import { MetricCard } from '../../components/ui';

export function ProofSpine({ go }: { go: (p: string) => void }) {
  const { register } = data;
  const reproducedBy = (ghsa: string) => data.findings.find((f) => f.references?.ghsa === ghsa);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Proof spine</h1>
          <p>Every advisory already published on the target, verified {register.verified_on}. Prior art is reproduced and labelled as such, never claimed as a new discovery.</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <MetricCard disk="dark" icon={<BookOpen size={20} />} title="Published advisories" value={register.count_published} />
        <MetricCard disk="yellow" icon={<FileWarning size={20} />} title="Draft / accepted residual" value={register.count_draft} />
        <MetricCard disk="orange" icon={<Repeat size={20} />} title="Reproduced by this assessment" value={data.findings.filter((f) => f.references?.ghsa).length} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Advisory</th><th>Severity</th><th>Class</th><th>Platform</th><th>CWE</th><th>Reproduced</th></tr>
            </thead>
            <tbody>
              {register.advisories.map((a) => {
                const f = reproducedBy(a.id);
                return (
                  <tr key={a.id}>
                    <td>
                      <a className="mono" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-primary-600)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        href={`https://github.com/koala73/worldmonitor/security/advisories/${a.id}`} target="_blank" rel="noreferrer">
                        {a.id} <ArrowUpRight size={12} />
                      </a>
                    </td>
                    <td><span className={`badge ${a.severity.startsWith('High') ? 'red' : a.severity.startsWith('Low') ? 'neutral' : 'yellow'}`}>{a.severity}</span></td>
                    <td style={{ maxWidth: 300 }}>{a.class}</td>
                    <td>{a.platform}</td>
                    <td className="mono" style={{ fontSize: '0.76rem' }}>{a.cwe?.join(', ')}</td>
                    <td>
                      {f ? <button className="id-chip" onClick={() => go(`/console/findings/${f.id}`)}>{f.id}</button>
                        : <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-400)' }}>Catalogued</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {register.external_researcher_credits.length > 0 && (
        <div className="card pad" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>External researcher credits</h3>
          {register.external_researcher_credits.map((c) => (
            <p key={c.researcher} style={{ fontSize: '0.88rem', color: 'var(--color-neutral-700)' }}>
              <b>{c.researcher}</b> ({c.year}): {c.findings.join('; ')}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
