import { ArrowRight, Bug, Layers, ShieldCheck, HelpCircle, FileDiff } from 'lucide-react';
import { data, reproduced } from '../../data';
import { MetricCard, StatusBadge, VerdictBadge } from '../../components/ui';
import { verdictMeta } from '../../lib/status';

function diffClass(l: string) {
  if (l.startsWith('@@')) return 'hunk';
  if (l.startsWith('+') && !l.startsWith('+++')) return 'add';
  if (l.startsWith('-') && !l.startsWith('---')) return 'del';
  return undefined;
}

export function Dashboard({ go }: { go: (p: string) => void }) {
  const sc = data.summary.status_counts;
  const scored = data.findings.filter((f) => f.status !== 'VERIFIED-SECURE' && f.severity?.cvss31_score != null);
  const bands = [
    { label: 'High (7.0+)', n: scored.filter((f) => (f.severity!.cvss31_score ?? 0) >= 7).length, c: 'var(--color-primary-500)' },
    { label: 'Medium (4.0 to 6.9)', n: scored.filter((f) => { const s = f.severity!.cvss31_score ?? 0; return s >= 4 && s < 7; }).length, c: 'var(--color-secondary-500)' },
    { label: 'Low (<4.0)', n: scored.filter((f) => (f.severity!.cvss31_score ?? 0) < 4).length, c: 'var(--color-accent-500)' },
  ];
  const patched = data.findings.find((f) => f.remediation_patch_diff);
  const diffLines = (patched?.remediation_patch_diff ?? '').split('\n').filter((l) => !l.startsWith('index ')).slice(0, 26);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Assessment overview</h1>
          <p>WorldMonitor, assessed against a pinned commit in a local lab. Every figure below is generated from <code>findings/*/finding.json</code>.</p>
        </div>
        <button className="btn btn-primary" onClick={() => go('/console/findings')}>All findings <ArrowRight size={15} /></button>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        <MetricCard disk="orange" icon={<Bug size={20} />} title="Reproduced (known class)" value={sc['REPRODUCED-KNOWN'] ?? 0} sub="Published advisories re-proven" />
        <MetricCard disk="green" icon={<ShieldCheck size={20} />} title="Verified secure" value={sc['VERIFIED-SECURE'] ?? 0} sub="Control attacked, control held" />
        <MetricCard disk="yellow" icon={<HelpCircle size={20} />} title="Candidate" value={sc['CANDIDATE-UNCONFIRMED'] ?? 0} sub="Suspicious, not yet provable" />
        <MetricCard disk="dark" icon={<Layers size={20} />} title="Scope areas covered" value={`${data.summary.scope_areas_with_evidence} / ${data.summary.total_scope_areas}`} sub={`${data.summary.total_findings} verdicts total`} />
      </div>

      <div className="split" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <div className="card-head">
            <div><h3>Coverage matrix</h3><div className="sub">PS 26163's seven scope areas</div></div>
          </div>
          <table className="table">
            <thead><tr><th>Area</th><th>Verdict</th><th>Evidence</th></tr></thead>
            <tbody>
              {Object.values(data.coverage_matrix).map((c) => (
                <tr key={c.area_number}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: verdictMeta(c.verdict).dot, flexShrink: 0 }} />
                      <span className="t-title">{c.label}</span>
                    </div>
                  </td>
                  <td><VerdictBadge verdict={c.verdict} /></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {c.finding_ids.map((id) => <button key={id} className="id-chip" onClick={() => go(`/console/findings/${id}`)}>{id}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div><h3>Regression suite</h3><div className="sub">Vulnerable vs patched, re-run every build</div></div>
              <span className="badge green">{data.regression_results.filter((r) => r.pass).length}/{data.regression_results.length} pass</span>
            </div>
            {data.regression_results.map((r) => (
              <div key={r.advisory} className="reg-row">
                <div className="top">
                  <span className="name">{r.advisory}</span>
                  <span className={`badge ${r.pass ? 'green' : 'red'}`}>{r.pass ? 'PASS' : 'FAIL'}</span>
                </div>
                <div className="ba">
                  <div className="before"><b>Before · vulnerable</b>{r.pass ? 'Attack succeeds' : 'See detail'}</div>
                  <div className="after"><b>After · patched</b>{r.pass ? 'Attack blocked' : 'Regression'}</div>
                </div>
                <div className="detail">{r.detail}</div>
              </div>
            ))}
          </div>

          <div className="card pad">
            <h3 style={{ fontSize: '1.05rem' }}>Severity of scored findings</h3>
            <div className="sub" style={{ fontSize: '0.76rem', color: 'var(--color-neutral-500)', marginBottom: '0.9rem' }}>CVSS 3.1, computed. Verified-secure verdicts carry no score.</div>
            <div className="sev-track">
              {bands.filter((b) => b.n > 0).map((b) => <div key={b.label} style={{ flex: b.n, background: b.c }} />)}
            </div>
            <div className="sev-legend">
              {bands.map((b) => <span key={b.label}><i style={{ background: b.c }} />{b.label}: <b className="mono">{b.n}</b></span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div><h3>Reproduced findings</h3><div className="sub">Ranked by CVSS 3.1</div></div>
          </div>
          <table className="table">
            <tbody>
              {[...reproduced, ...data.findings.filter((f) => f.status === 'CANDIDATE-UNCONFIRMED')]
                .sort((a, b) => (b.severity?.cvss31_score ?? 0) - (a.severity?.cvss31_score ?? 0))
                .map((f) => (
                  <tr key={f.id} className="click" onClick={() => go(`/console/findings/${f.id}`)}>
                    <td>
                      <div className="t-title">{f.title}</div>
                      <div className="t-meta">{f.id} · {f.references?.ghsa ?? f.tags?.owasp_api}</div>
                    </td>
                    <td style={{ width: 90 }}><b className="mono">{f.severity?.cvss31_score ?? 'n/a'}</b></td>
                    <td style={{ width: 130 }}><StatusBadge status={f.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {patched && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileDiff size={17} color="var(--color-primary-500)" /> Remediation, as a diff</h3>
                <div className="sub">findings/{patched.dir}/remediation.patch · git apply --check verified</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => go(`/console/findings/${patched.id}`)}>{patched.id}</button>
            </div>
            <div className="diff">
              {diffLines.map((l, i) => <div key={i} className={diffClass(l)}>{l || ' '}</div>)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
