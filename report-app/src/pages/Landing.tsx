import type { ReactNode } from 'react';
import {
  ArrowRight, ArrowUpRight, GitBranch, Server, ScanSearch, Gauge, FlaskConical, FileCheck2,
  ShieldCheck, Layers, Bug, Activity, Check, X, Minus, Lock, Play,
} from 'lucide-react';
import { data, REPO_URL, WORKFLOW_URL, TARGET_URL, findingById, pinnedCommit, reproduced } from '../data';
import { CapsuleNav, MetricCard, VerdictBadge, useReveal } from '../components/ui';
import { TerminalReplay } from '../components/TerminalReplay';
import { verdictMeta } from '../lib/status';

function ev(id: string, key: string): number | undefined {
  const v = findingById(id)?.evidence_summary?.[key];
  return typeof v === 'number' ? v : undefined;
}

function cookieFalsePositives(): number | undefined {
  const s = findingById('WM-008')?.evidence_summary as unknown as { session_cookie_attributes?: { false_positives_from_initial_heuristic?: number } } | undefined;
  return s?.session_cookie_attributes?.false_positives_from_initial_heuristic;
}

function dowNumbers() {
  const r = data.regression_results.find((x) => x.advisory.includes('hcq5'));
  const m = r?.detail.match(/(\d+) attack calls.*?vulnerable quota used=(\d+).*?patched quota used=(\d+)\/(\d+).*?billable calls this run: (\d+)/);
  if (!m) return null;
  const [, calls, vulnUsed, patchUsed, budget, totalBilled] = m.map(Number);
  return { calls, vulnUsed, patchUsed, budget, vulnBilled: totalBilled - patchUsed, patchBilled: patchUsed };
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Landing({ go }: { go: (p: string) => void }) {
  const ref = useReveal<HTMLDivElement>();
  const inv = data.inventory;
  const regPass = data.regression_results.filter((r) => r.pass).length;
  const regTotal = data.regression_results.length;
  const patches = data.findings.filter((f) => f.has_remediation_patch).length;
  const cov = Object.values(data.coverage_matrix);
  const dow = dowNumbers();
  const fps = [
    { id: 'WM-004', what: 'CORS audit', n: ev('WM-004', 'false_positives_eliminated_by_heuristic_refinement') },
    { id: 'WM-008', what: 'Cookie flags', n: cookieFalsePositives() },
    { id: 'WM-005', what: 'Cast sweep', n: ev('WM-005', 'false_positives_from_test_file_exclusion_gap') },
  ].filter((r): r is { id: string; what: string; n: number } => typeof r.n === 'number');
  const fpMax = Math.max(1, ...fps.map((r) => r.n));

  const stages = [
    { icon: <GitBranch size={19} />, title: 'Pin the source', body: 'Clone the real public repository at an exact commit, so every result is reproducible.', stat: `commit ${pinnedCommit}` },
    { icon: <Server size={19} />, title: 'Stand it up locally', body: 'Run the actual app on localhost:3000 — a controlled lab, never the live deployment.', stat: inv ? `${inv.total_endpoints} endpoints inventoried` : 'localhost:3000' },
    { icon: <ScanSearch size={19} />, title: 'Scan seven surfaces', body: 'One scanner per PS scope area, static and dynamic, including a real TypeScript AST pass.', stat: `${ev('WM-009', 'src_files_scanned') ?? '—'} files AST-parsed` },
    { icon: <Gauge size={19} />, title: 'Score in code', body: 'CVSS 3.1 and 4.0 computed by our own calculators; EPSS queried live where a CVE exists.', stat: 'CVSS 3.1 · 4.0 · EPSS' },
    { icon: <FlaskConical size={19} />, title: 'Reproduce & regress', body: 'Vulnerable and patched lab pairs, re-run on every build as a permanent regression suite.', stat: `${regPass}/${regTotal} regressions pass` },
    { icon: <FileCheck2 size={19} />, title: 'Report & patch', body: 'PS-schema export, CERT-In-format report, and fixes as real, git-verified diffs.', stat: `${patches} verified patches` },
  ];

  return (
    <div ref={ref}>
      <CapsuleNav
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="landing"
        links={
          <>
            <button className="capsule-link" onClick={() => scrollTo('how')}>How it works</button>
            <button className="capsule-link" onClick={() => scrollTo('coverage')}>Coverage</button>
            <button className="capsule-link" onClick={() => scrollTo('evidence')}>Evidence</button>
            <button className="capsule-link" onClick={() => scrollTo('safety')}>Safety</button>
            <button className="capsule-link" onClick={() => scrollTo('benchmarks')}>Benchmarks</button>
          </>
        }
        right={
          <>
            <a className="btn btn-ghost-dark btn-sm hide-sm" href={REPO_URL} target="_blank" rel="noreferrer">
              <GitBranch size={14} /> Source
            </a>
            <button className="btn btn-white btn-sm" onClick={() => go('/console')}>
              Open console <ArrowRight size={14} />
            </button>
          </>
        }
      />

      {/* Hero */}
      <header className="hero">
        <div className="container hero-grid">
          <div className="enter">
            <span className="eyebrow"><span className="pulse" /> SIH 26163 · NTRO · Security assessment of WorldMonitor</span>
            <h1>Don't trust our slides. <span className="accent">Inspect the evidence.</span></h1>
            <p className="lede">
              SEAM stood up the real WorldMonitor app in a local lab, ran seven scope-area scanners against it,
              reproduced two published vulnerability classes, and scored every verdict in code. Each finding here
              links to its evidence and a script that reproduces it.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={() => go('/console')}>
                Open the assessment <ArrowRight size={16} />
              </button>
              <a className="btn btn-secondary" href={WORKFLOW_URL} target="_blank" rel="noreferrer">
                <Play size={15} /> Run it yourself
              </a>
            </div>
            <div className="hero-facts">
              <div className="hero-fact"><div className="n">{data.summary.scope_areas_with_evidence}/{data.summary.total_scope_areas}</div><div className="l">PS scope areas covered</div></div>
              <div className="hero-fact"><div className="n">{data.summary.total_findings}</div><div className="l">Evidence-backed verdicts</div></div>
              <div className="hero-fact"><div className="n">{reproduced.length}</div><div className="l">Known classes reproduced</div></div>
            </div>
          </div>
          <div className="enter" style={{ animationDelay: '120ms' }}>
            <TerminalReplay />
          </div>
        </div>
      </header>

      <div className="container">
        {/* Metrics */}
        <div className="grid-4 fade-up" style={{ marginTop: '2.5rem' }}>
          <MetricCard disk="orange" icon={<Layers size={20} />} title="Scope areas with evidence" value={`${data.summary.scope_areas_with_evidence} / 7`} sub="Every PS area has a real verdict" />
          <MetricCard disk="dark" icon={<Activity size={20} />} title="Endpoints inventoried" value={inv?.total_endpoints ?? '—'} sub={inv ? `${inv.gateway_routes} gateway routes` : undefined} />
          <MetricCard disk="yellow" icon={<Bug size={20} />} title="Prior advisories mapped" value={data.register.advisories.length} sub={`${data.register.count_published} published · ${data.register.count_draft} draft`} />
          <MetricCard disk="green" icon={<ShieldCheck size={20} />} title="Regression suite" value={`${regPass} / ${regTotal} pass`} sub="Vulnerable reproduced, patch holds" />
        </div>

        {/* How it works */}
        <section className="section" id="how">
          <div className="section-head fade-up">
            <div className="kicker">How it works</div>
            <h2>From a pinned commit to a verified patch, in one pipeline.</h2>
            <p>All six stages run in CI on every push, and locally with a few npm scripts. Nothing on this site is hand-assembled.</p>
          </div>
          <div className="pipeline">
            {stages.map((s, i) => (
              <div key={s.title} className="card stage fade-up" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="num">0{i + 1}</div>
                <div className="icon">{s.icon}</div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
                <div className="stat">{s.stat}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage */}
        <section className="section" id="coverage">
          <div className="section-head fade-up">
            <div className="kicker">Coverage</div>
            <h2>All seven scope areas the problem statement names. None left untested.</h2>
            <p>Red means a real vulnerability class was reproduced there; green means we attacked the control and it held. A mix is the honest outcome — an all-green report would be the suspicious one.</p>
          </div>
          <div className="coverage">
            {cov.map((c, i) => (
              <div key={c.area_number} className="card cov fade-up" style={{ ['--tone' as string]: verdictMeta(c.verdict).dot, transitionDelay: `${i * 50}ms` }}>
                <div className="area">AREA {String(c.area_number).padStart(2, '0')}</div>
                <h4>{c.label}</h4>
                <div><VerdictBadge verdict={c.verdict} /></div>
                <div className="ids">
                  {c.finding_ids.map((id) => (
                    <button key={id} className="id-chip" onClick={() => go(`/console/findings/${id}`)}>{id}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="surface-dark cov-summary fade-up">
              <div className="big">{data.summary.scope_areas_with_evidence}/7</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>areas with direct evidence</div>
              <button className="btn btn-white btn-sm" style={{ marginTop: '0.9rem', alignSelf: 'flex-start' }} onClick={() => go('/console')}>
                See the matrix <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>

        {/* Spotlight */}
        {dow && (
          <section className="section" id="evidence">
            <div className="section-head fade-up">
              <div className="kicker">Evidence</div>
              <h2>The money shot: a quota that refunds itself after you've already paid.</h2>
            </div>
            <div className="card spotlight fade-up">
              <div className="spotlight-copy">
                <div className="spotlight-meta">
                  <span className="badge red"><span className="dot" />Reproduced</span>
                  <span className="badge neutral">GHSA-hcq5-jm84-2395</span>
                  <span className="badge neutral">CVSS 3.1 · {findingById('WM-002')?.severity?.cvss31_score}</span>
                  <span className="badge neutral">API4:2023</span>
                </div>
                <h3>Denial-of-Wallet on a metered API proxy.</h3>
                <p>
                  The gate reserves a quota slot, calls a paid upstream, then refunds the slot if the response looks
                  malformed — after the bill has already been incurred. An attacker who can trigger "malformed" spends
                  nothing from their own quota while the owner pays for every call.
                </p>
                <p>
                  We reproduced the published class in an isolated lab pair and fixed it: the reservation becomes
                  irrevocable at dispatch. The fix ships as a real diff, and the pair re-runs in CI on every build.
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => go('/console/findings/WM-002')}>
                    Open finding WM-002 <ArrowRight size={14} />
                  </button>
                  <span className="badge neutral" style={{ alignSelf: 'center' }}>bash findings/WM-002/reproduce.sh</span>
                </div>
              </div>
              <div className="spotlight-viz">
                <div className="flow">
                  <span className="node">request</span><span className="arrow">→</span>
                  <span className="node">reserve slot</span><span className="arrow">→</span>
                  <span className="node">paid upstream call</span><span className="arrow">→</span>
                  <span className="node hot">refund if "malformed"</span>
                </div>
                <div className="versus">
                  <div className="card vs-card">
                    <div className="lbl"><span>Vulnerable</span><span className="badge red">exploitable</span></div>
                    <div className="bar-row">
                      <div className="top"><span>Calls billed to owner</span><b>{dow.vulnBilled}</b></div>
                      <div className="bar"><i style={{ width: `${(dow.vulnBilled / dow.calls) * 100}%` }} /></div>
                    </div>
                    <div className="bar-row">
                      <div className="top"><span>Attacker quota used</span><b>{dow.vulnUsed}</b></div>
                      <div className="bar"><i style={{ width: `${(dow.vulnUsed / dow.budget) * 100}%`, ['--c' as string]: 'var(--color-neutral-400)' }} /></div>
                    </div>
                  </div>
                  <div className="card vs-card">
                    <div className="lbl"><span>Patched</span><span className="badge green">capped</span></div>
                    <div className="bar-row">
                      <div className="top"><span>Calls billed to owner</span><b>{dow.patchBilled}</b></div>
                      <div className="bar"><i style={{ width: `${(dow.patchBilled / dow.calls) * 100}%`, ['--c' as string]: 'var(--color-accent-500)' }} /></div>
                    </div>
                    <div className="bar-row">
                      <div className="top"><span>Attacker quota used</span><b>{dow.patchUsed}/{dow.budget}</b></div>
                      <div className="bar"><i style={{ width: `${(dow.patchUsed / dow.budget) * 100}%`, ['--c' as string]: 'var(--color-accent-500)' }} /></div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                  Same {dow.calls} attack calls against each variant, daily budget of {dow.budget}. Numbers come from the regression harness's latest run.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Safety */}
        <section className="section" id="safety">
          <div className="surface-dark safety fade-up">
            <div>
              <span className="badge dark"><Lock size={12} /> Trust boundary</span>
              <h2>It cannot touch production. That's enforced in code, not promised.</h2>
              <p>
                Every dynamic request goes through one module, <code style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>engine/probe/safe-http.mjs</code>,
                which throws on any host that isn't the local lab. Its test suite points it at the real production hostname and passes only if the call is refused before it leaves the machine.
              </p>
              <div className="rules">
                <div className="rule"><Check size={16} /> A lint fails the build if any scanner calls <code style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>fetch()</code> directly.</div>
                <div className="rule"><Check size={16} /> Token-bucket rate limit of 5 req/s, even against localhost.</div>
                <div className="rule"><Check size={16} /> Benign markers only — no weaponized payload, even in the lab.</div>
                <div className="rule"><Check size={16} /> No account created on the target or any identity provider.</div>
              </div>
            </div>
            <div>
              <div className="gate">
                <div className="gate-box">
                  <div className="h">Scanner request</div>
                  <div className="m">engine/scanners/*.mjs</div>
                </div>
                <div className="gate-core">safe-http<br />.mjs</div>
                <div className="targets">
                  <div className="target allow"><span>localhost:3000</span><Check size={15} /></div>
                  <div className="target allow"><span>127.0.0.1 · ::1</span><Check size={15} /></div>
                  <div className="target deny"><span>worldmonitor.app</span><X size={15} /></div>
                  <div className="target deny"><span>worldmonitor.app.evil.com</span><X size={15} /></div>
                </div>
              </div>
              <div className="legend">
                <span className="badge dark">LOCALHOST-ONLY PROBE</span>
                <span className="badge dark">HostNotAllowedError</span>
                <span className="badge dark">TESTED AGAINST THE REAL HOSTNAME</span>
              </div>
            </div>
          </div>
        </section>

        {/* Benchmarks */}
        <section className="section" id="benchmarks">
          <div className="section-head fade-up">
            <div className="kicker">Benchmarked against ground truth</div>
            <h2>We checked the checker before trusting it on a single finding.</h2>
            <p>Scoring engines and heuristics get validated against an independent reference first, and the misses they produced along the way are published rather than quietly patched.</p>
          </div>
          <div className="grid-3">
            <div className="card bench fade-up">
              <div className="big">2000<small>/ 2000</small></div>
              <h4>CVSS 4.0 calculator vs FIRST's reference</h4>
              <p>Random valid vectors scored by our engine and by FIRST's unmodified reference implementation, run side by side as an oracle. Zero mismatches.</p>
              <div className="bar"><i style={{ width: '100%', ['--c' as string]: 'var(--color-accent-500)' }} /></div>
              <div className="src">engine/core/cvss40.mjs · tests/cvss40.test.mjs</div>
            </div>
            <div className="card bench fade-up" style={{ transitionDelay: '60ms' }}>
              <div className="big">{ev('WM-012', 'cvss_vectors_cross_validated_against_own_calculator') ?? '—'}<small>/ {ev('WM-012', 'cvss_vectors_cross_validated_against_own_calculator') ?? '—'}</small></div>
              <h4>npm-audit's CVSS vectors, re-scored independently</h4>
              <p>
                Every vector npm audit shipped was recomputed by our CVSS 3.1 calculator instead of trusting its label — {ev('WM-012', 'cvss_cross_validation_mismatches') ?? 0} mismatches across {ev('WM-012', 'total_dependencies') ?? '—'} dependencies.
              </p>
              <div className="bar"><i style={{ width: '100%', ['--c' as string]: 'var(--color-accent-500)' }} /></div>
              <div className="src">engine/scanners/sca.mjs · findings/WM-012</div>
            </div>
            <div className="card bench fade-up" style={{ transitionDelay: '120ms' }}>
              <div className="big">{fps.reduce((a, r) => a + r.n, 0)}<small>false positives</small></div>
              <h4>Caught, fixed, and written up</h4>
              <p>First-pass heuristics over-reported. Each miss was traced to its cause, the heuristic corrected, and the story kept in the finding.</p>
              <div className="fp-rows">
                {fps.map((r) => (
                  <div key={r.id} className="fp-row">
                    <span className="i">{r.id}</span>
                    <div className="bar"><i style={{ width: `${(r.n / fpMax) * 100}%`, ['--c' as string]: 'var(--color-secondary-500)' }} /></div>
                    <span className="k">{r.n}</span>
                  </div>
                ))}
              </div>
              <div className="src">{fps.map((r) => r.what).join(' · ')}</div>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="section">
          <div className="section-head fade-up">
            <div className="kicker">Compared honestly</div>
            <h2>The same repository has been scanned before. Here's what's different.</h2>
            <p>
              SkillsLLM publishes an automated scan of <a href={TARGET_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-600)' }}>koala73/worldmonitor</a> (run 2026-07-06).
              Its dependency findings overlap ours, which is useful independent corroboration. Where it goes further than we did, we say so.
            </p>
          </div>
          <div className="card compare fade-up">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th /><th>Public automated scan</th><th className="us">SEAM assessment</th></tr>
                </thead>
                <tbody>
                  <CompareRow label="Method" them={<Cell kind="partial">npm audit + keyword search for prompt-injection phrases</Cell>} us={<Cell kind="yes">Seven scope-area scanners, TypeScript AST analysis, live-instance checks</Cell>} />
                  <CompareRow label="Severity" them={<Cell kind="partial">Tool labels: low / medium / high</Cell>} us={<Cell kind="yes">CVSS 3.1 and 4.0 computed in code; EPSS where a CVE exists</Cell>} />
                  <CompareRow label="Reachability" them={<Cell kind="no">Not assessed</Cell>} us={<Cell kind="yes">Lockfile ancestry + live-import tracing: {ev('WM-012', 'live_request_path_advisories') ?? '—'} of {ev('WM-012', 'unique_root_advisories') ?? '—'} advisories on the live path</Cell>} />
                  <CompareRow label="Proof" them={<Cell kind="no">None</Cell>} us={<Cell kind="yes">A reproduce.sh per finding; vulnerable/patched pairs re-run in CI</Cell>} />
                  <CompareRow label="Verdicts" them={<Cell kind="partial">Single WARNING status</Cell>} us={<Cell kind="yes">Reproduced · verified secure · candidate — confidence stated per finding</Cell>} />
                  <CompareRow label="Remediation" them={<Cell kind="no">None</Cell>} us={<Cell kind="yes">{patches} patches, verified with git apply --check</Cell>} />
                  <CompareRow label="Where it's ahead" them={<Cell kind="yes">Flags "ignore previous instructions" in public/.well-known/agent-skills/*/SKILL.md</Cell>} us={<Cell kind="no">Agent-skill prompt-injection surface not tested in this pass</Cell>} />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="surface-dark cta fade-up">
            <span className="badge dark"><Play size={12} /> One workflow, end to end</span>
            <h2>Run the whole assessment yourself.</h2>
            <p>The GitHub Actions workflow clones the target, stands it up inside the runner, runs every scanner and the regression suite, and republishes this site. Or do it locally:</p>
            <div className="cmds">
              <span>bash lab/fetch-target-source.sh</span>
              <span>npm run instance:install &amp;&amp; npm run instance:up</span>
              <span>npm run assess</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a className="btn btn-primary" href={WORKFLOW_URL} target="_blank" rel="noreferrer">Run workflow <ArrowUpRight size={15} /></a>
              <a className="btn btn-ghost-dark" href={REPO_URL} target="_blank" rel="noreferrer"><GitBranch size={15} /> Source</a>
              <button className="btn btn-white" onClick={() => go('/console')}>Open console <ArrowRight size={15} /></button>
            </div>
          </div>
        </section>

        <footer className="footer">
          <span>SEAM · SIH 26163 (NTRO) · Security assessment of WorldMonitor</span>
          <span>Tested against a local instance only · generated {new Date(data.generated_at).toISOString().slice(0, 10)}</span>
        </footer>
      </div>
    </div>
  );
}

function CompareRow({ label, them, us }: { label: string; them: ReactNode; us: ReactNode }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{them}</td>
      <td className="us">{us}</td>
    </tr>
  );
}

function Cell({ kind, children }: { kind: 'yes' | 'no' | 'partial'; children: ReactNode }) {
  const icon =
    kind === 'yes' ? <Check size={15} color="var(--color-accent-600)" /> :
    kind === 'no' ? <X size={15} color="var(--color-primary-500)" /> :
    <Minus size={15} color="var(--color-secondary-700)" />;
  return <div className="cell">{icon}<span>{children}</span></div>;
}
