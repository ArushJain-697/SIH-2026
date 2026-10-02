import { ArrowUpRight, FileDiff } from 'lucide-react';
import { data, reproduced } from '../../data';
import { verdictMeta, statusMeta } from '../../lib/status';
import { StressRoadmap } from './StressRoadmap';
import { V2Donut } from './charts';
import { STRESS_FINDINGS, STRESS_SUMMARY } from '../../data/stress-findings';

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
    { label: 'High', n: scored.filter((f) => (f.severity!.cvss31_score ?? 0) >= 7).length, c: '#ff7a3d' },
    { label: 'Medium', n: scored.filter((f) => { const s = f.severity!.cvss31_score ?? 0; return s >= 4 && s < 7; }).length, c: '#ffb020' },
    { label: 'Low', n: scored.filter((f) => (f.severity!.cvss31_score ?? 0) < 4).length, c: '#3fcf8e' },
  ];
  const patched = data.findings.find((f) => f.remediation_patch_diff);
  const diffLines = (patched?.remediation_patch_diff ?? '').split('\n').filter((l) => !l.startsWith('index ')).slice(0, 18);
  const regPass = data.regression_results.filter((r) => r.pass).length;

  return (
    <>
      <div className="v2-head">
        <div>
          <h1>Assessment overview</h1>
          <p>WorldMonitor, assessed against a pinned commit in a local lab. Every number here comes from <code>findings/*/finding.json</code>.</p>
        </div>
        <button className="v2-cta" onClick={() => go('/console/findings')}>All findings <ArrowUpRight size={15} /></button>
      </div>

      {/* Asymmetric hero row: the stress-test headline gets the big tile */}
      <div className="v2-bento">
        <div className="v2-tile v2-ember v2-span-8" onClick={() => document.getElementById('stress-test')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
          <div className="v2-tile-label">Phase B · Live attacks</div>
          <div className="v2-tile-num">{STRESS_SUMMARY.liveFindings} genuine findings</div>
          <div className="v2-tile-sub">{STRESS_SUMMARY.liveHeld} of {STRESS_SUMMARY.liveTasks} tests held under real attack attempts</div>
          <div className="v2-tile-bar"><i style={{ width: `${(STRESS_SUMMARY.liveHeld / STRESS_SUMMARY.liveTasks) * 100}%` }} /></div>
        </div>
        <div className="v2-tile v2-dark v2-span-4">
          <div className="v2-tile-label">Phase A · Static</div>
          <div className="v2-tile-num">{STRESS_SUMMARY.staticTasks}/{STRESS_SUMMARY.staticTasks}</div>
          <div className="v2-tile-sub">0 vulnerabilities · 8 hardening notes</div>
        </div>
      </div>

      <div className="v2-bento">
        <div className="v2-tile v2-stat v2-dark v2-span-3">
          <div className="v2-tile-num">{sc['REPRODUCED-KNOWN'] ?? 0}</div>
          <div className="v2-tile-sub">Reproduced</div>
        </div>
        <div className="v2-tile v2-stat v2-moss v2-span-3">
          <div className="v2-tile-num">{sc['VERIFIED-SECURE'] ?? 0}</div>
          <div className="v2-tile-sub">Verified secure</div>
        </div>
        <div className="v2-tile v2-stat v2-amber v2-span-3">
          <div className="v2-tile-num">{sc['CANDIDATE-UNCONFIRMED'] ?? 0}</div>
          <div className="v2-tile-sub">Candidate</div>
        </div>
        <div className="v2-tile v2-stat v2-glass v2-span-3">
          <div className="v2-tile-num">{data.summary.scope_areas_with_evidence}/{data.summary.total_scope_areas}</div>
          <div className="v2-tile-sub">Scope areas</div>
        </div>
      </div>

      <div className="v2-bento">
        <div className="v2-chart-card v2-span-7">
          <div className="v2-chart-head">
            <div><h3>Coverage matrix</h3><div className="sub">PS 26163's seven scope areas</div></div>
          </div>
          <div className="v2-row-list">
            {Object.values(data.coverage_matrix).map((c) => {
              const tone = c.verdict === 'FINDING' ? 'ember' : c.verdict === 'CANDIDATE' ? 'amber' : c.verdict === 'VERIFIED_SECURE' ? 'moss' : 'neutral';
              return (
                <div className={`v2-row ${tone !== 'neutral' ? `is-${tone}` : ''}`} key={c.area_number} style={{ cursor: 'default' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: verdictMeta(c.verdict).dot, flexShrink: 0 }} />
                  <div className="v2-row-main" style={{ flexBasis: 170 }}>
                    <div className="v2-row-title">{c.label}</div>
                  </div>
                  <span className={`v2-pill ${tone}`}>{verdictMeta(c.verdict).label}</span>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginLeft: 'auto', justifyContent: 'flex-end' }}>
                    {c.finding_ids.map((id) => <button key={id} className="v2-pill neutral" style={{ cursor: 'pointer', border: 0 }} onClick={() => go(`/console/findings/${id}`)}>{id}</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="v2-chart-card v2-span-5">
          <div className="v2-chart-head">
            <div><h3>Severity of scored findings</h3><div className="sub">CVSS 3.1, hover a slice</div></div>
          </div>
          <V2Donut bands={bands} centerLabel="scored" />
          <div style={{ marginTop: '1.3rem', paddingTop: '1.1rem', borderTop: '1px solid var(--v2-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Regression suite</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--v2-faint)' }}>Vulnerable vs patched, re-run every build</div>
            </div>
            <span className="v2-pill moss">{regPass}/{data.regression_results.length} pass</span>
          </div>
        </div>
      </div>

      <div className="v2-bento">
        <div className="v2-chart-card v2-span-7">
          <div className="v2-chart-head">
            <div><h3>Reproduced findings</h3><div className="sub">Ranked by CVSS 3.1</div></div>
          </div>
          <div className="v2-row-list">
            {[...reproduced, ...data.findings.filter((f) => f.status === 'CANDIDATE-UNCONFIRMED')]
              .sort((a, b) => (b.severity?.cvss31_score ?? 0) - (a.severity?.cvss31_score ?? 0))
              .map((f) => {
                const tone = statusMeta(f.status).tone === 'red' ? 'ember' : statusMeta(f.status).tone === 'yellow' ? 'amber' : 'moss';
                return (
                  <div className={`v2-row is-${tone}`} key={f.id} onClick={() => go(`/console/findings/${f.id}`)}>
                    <span className="v2-row-id">{f.id}</span>
                    <div className="v2-row-main">
                      <div className="v2-row-title">{f.title}</div>
                      <div className="v2-row-meta">{f.references?.ghsa ?? f.tags?.owasp_api ?? ''}</div>
                    </div>
                    <span className={`v2-row-score ${f.severity?.cvss31_score == null ? 'is-na' : ''}`}>{f.severity?.cvss31_score ?? 'N/A'}</span>
                    <span className={`v2-pill ${tone}`}>{statusMeta(f.status).label}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {patched && (
          <div className="v2-tile v2-dark v2-span-5" style={{ padding: 0, cursor: 'default' }}>
            <div style={{ padding: '1.3rem 1.4rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem' }}><FileDiff size={16} /> Remediation diff</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--v2-faint)', marginTop: 2 }}>findings/{patched.dir}/remediation.patch</div>
              </div>
              <button className="v2-pill ember" style={{ cursor: 'pointer', border: 0 }} onClick={() => go(`/console/findings/${patched.id}`)}>{patched.id}</button>
            </div>
            <div className="diff" style={{ borderRadius: 0, maxHeight: 280 }}>
              {diffLines.map((l, i) => <div key={i} className={diffClass(l)}>{l || ' '}</div>)}
            </div>
          </div>
        )}
      </div>

      <div className="v2-chart-card" id="stress-test" style={{ marginTop: '0.25rem' }}>
        <div className="v2-chart-head">
          <div>
            <h3>Stress test · 29 tasks against the real app</h3>
            <div className="sub">{STRESS_SUMMARY.staticTasks} static reads + {STRESS_SUMMARY.liveTasks} live tests, {STRESS_SUMMARY.liveHeld} held, {STRESS_SUMMARY.liveFindings} genuine findings</div>
          </div>
        </div>
        <StressRoadmap items={STRESS_FINDINGS} />
      </div>
    </>
  );
}
