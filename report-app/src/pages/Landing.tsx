import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowUpRight, GitBranch, Server, ScanSearch, Gauge, FlaskConical, FileCheck2,
  ShieldCheck, Layers, Bug, Activity, Check, X, Minus, Lock, Play, Workflow, LayoutGrid, Scale, SquareTerminal,
} from 'lucide-react';
import { data, REPO_URL, WORKFLOW_URL, TARGET_URL, findingById, pinnedCommit } from '../data';
import { CapsuleNav, MetricCard } from '../components/ui';
import { TerminalReplay } from '../components/TerminalReplay';
import { MagnificationDock } from '../components/MagnificationDock';
import { PinnedPipeline } from '../components/PinnedPipeline';
import { ScopePan } from '../components/ScopePan';
import { SafetyGate } from '../components/SafetyGate';
import { WalletBreach } from '../components/WalletBreach';

const SECTIONS = [
  { id: 'how', label: 'How it works', icon: <Workflow /> },
  { id: 'coverage', label: 'Coverage', icon: <LayoutGrid /> },
  { id: 'evidence', label: 'Evidence', icon: <FlaskConical /> },
  { id: 'safety', label: 'Safety', icon: <Lock /> },
  { id: 'benchmarks', label: 'Benchmarks', icon: <Gauge /> },
  { id: 'compare', label: 'Comparison', icon: <Scale /> },
];

function useDockState(heroRef: React.RefObject<HTMLElement | null>) {
  const [pastHero, setPastHero] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0.15 });
    io.observe(hero);
    return () => io.disconnect();
  }, [heroRef]);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return { pastHero, active };
}

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
  const inv = data.inventory;
  const regPass = data.regression_results.filter((r) => r.pass).length;
  const regTotal = data.regression_results.length;
  const patches = data.findings.filter((f) => f.has_remediation_patch).length;
  const dow = dowNumbers();
  const fps = [
    { id: 'WM-004', what: 'CORS audit', n: ev('WM-004', 'false_positives_eliminated_by_heuristic_refinement') },
    { id: 'WM-008', what: 'Cookie flags', n: cookieFalsePositives() },
    { id: 'WM-005', what: 'Type-cast sweep', n: ev('WM-005', 'false_positives_from_test_file_exclusion_gap') },
  ].filter((r): r is { id: string; what: string; n: number } => typeof r.n === 'number');
  const fpMax = Math.max(1, ...fps.map((r) => r.n));
  const openConsole = () => go('/console');
  const heroRef = useRef<HTMLElement>(null);
  const { pastHero, active } = useDockState(heroRef);
  const dockItems = [
    ...SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, active: active === s.id, onClick: () => scrollTo(s.id) })),
    { id: 'console', label: 'Open console', icon: <SquareTerminal />, primary: true, onClick: openConsole },
  ];

  const stages = [
    { icon: <GitBranch size={18} />, title: 'Pin the source', body: 'Clone the public repository at one exact commit.', stat: `commit ${pinnedCommit}`, file: 'lab/fetch-target-source.sh' },
    { icon: <Server size={18} />, title: 'Run it locally', body: 'Stand up the real app on localhost:3000, never the live site.', stat: inv ? `${inv.total_endpoints} endpoints inventoried` : 'localhost:3000', file: 'npm run instance:up' },
    { icon: <ScanSearch size={18} />, title: 'Scan seven areas', body: 'One scanner per PS scope area, including a TypeScript AST pass.', stat: `${ev('WM-009', 'src_files_scanned') ?? 'n/a'} files parsed`, file: 'npm run scan:all-static' },
    { icon: <Gauge size={18} />, title: 'Score in code', body: 'CVSS 3.1 and 4.0 computed by our calculators; EPSS where a CVE exists.', stat: 'CVSS 3.1, 4.0 and EPSS', file: 'engine/core/cvss40.mjs' },
    { icon: <FlaskConical size={18} />, title: 'Reproduce', body: 'Vulnerable and patched lab pairs, re-run on every build.', stat: `${regPass}/${regTotal} regressions pass`, file: 'framework/regression-harness/run.mjs' },
    { icon: <FileCheck2 size={18} />, title: 'Report and patch', body: 'PS-format export, CERT-In report and git-verified diffs.', stat: `${patches} verified patches`, file: 'engine/report/ps-export.mjs' },
  ];

  return (
    <div>
      <CapsuleNav
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="landing"
        links={null}
        right={
          <>
            <a className="btn btn-ghost-dark btn-sm hide-sm" href={REPO_URL} target="_blank" rel="noreferrer">
              <GitBranch size={14} /> Source
            </a>
            <button className="btn btn-white btn-sm" onClick={openConsole}>Open console</button>
          </>
        }
      />

      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <header className="hero" ref={heroRef}>
          <div className="container hero-grid">
            <div>
              <span className="eyebrow reveal" style={{ ['--d' as string]: '0ms' }}>SIH 26163 for NTRO</span>
              <h1>
                <span className="line"><span className="reveal" style={{ ['--d' as string]: '80ms' }}>Don't trust our slides.</span></span>
                <span className="line"><span className="reveal" style={{ ['--d' as string]: '200ms' }}>Inspect the evidence.</span></span>
              </h1>
              <p className="lede reveal" style={{ ['--d' as string]: '360ms' }}>SEAM tested a real local copy of WorldMonitor across seven scope areas and scored every verdict in code.</p>
              <div className="hero-ctas reveal" style={{ ['--d' as string]: '460ms' }}>
                <button className="btn btn-primary" onClick={openConsole}>Open console</button>
                <a className="btn btn-secondary" href={WORKFLOW_URL} target="_blank" rel="noreferrer">
                  <Play size={15} /> Run workflow
                </a>
              </div>
            </div>
            <div className="terminal-stage reveal" style={{ ['--d' as string]: '300ms' }}>
              <TerminalReplay startDelay={950} />
            </div>
          </div>
        </header>

        <div className="container">
          <div className="grid-4 overlap-strip">
            <MetricCard disk="orange" icon={<Layers size={20} />} title="Scope areas with evidence" value={`${data.summary.scope_areas_with_evidence} of 7`} sub={`${data.summary.total_findings} verdicts in total`} />
            <MetricCard disk="dark" icon={<Activity size={20} />} title="Endpoints inventoried" value={inv?.total_endpoints ?? 'n/a'} sub={inv ? `${inv.gateway_routes} gateway routes` : undefined} />
            <MetricCard disk="yellow" icon={<Bug size={20} />} title="Prior advisories mapped" value={data.register.advisories.length} sub={`${data.register.count_published} published, ${data.register.count_draft} draft`} />
            <MetricCard disk="green" icon={<ShieldCheck size={20} />} title="Regression suite" value={`${regPass} of ${regTotal} pass`} sub="Exploit reproduced, patch holds" />
          </div>

          <section className="section" id="how">
            <div className="section-head" style={{ maxWidth: '100%', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>One pipeline, from pinned commit to patch.</h2>
              <p>Every stage runs in CI on each push. Nothing on this site is assembled by hand.</p>
            </div>
            <PinnedPipeline stages={stages} />
          </section>

          <section className="section" id="coverage">
            <div className="section-head" style={{ maxWidth: '100%', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>All seven scope areas, each with a verdict.</h2>
            </div>
            <ScopePan go={go} />
          </section>

          {dow && (
            <section className="section" id="evidence">
              <div className="section-head">
                <h2>A quota that refunds itself after the bill.</h2>
              </div>
              <div className="card spotlight">
                <div className="spotlight-copy">
                  <div className="spotlight-meta">
                    <span className="badge red"><span className="dot" />Reproduced</span>
                    <span className="badge neutral">GHSA-hcq5-jm84-2395</span>
                    <span className="badge neutral">CVSS 3.1: {findingById('WM-002')?.severity?.cvss31_score}</span>
                  </div>
                  <h3>Denial-of-Wallet on a metered API proxy.</h3>
                  <p>
                    The gate reserves a quota slot, calls a paid upstream, then refunds the slot when the reply looks
                    malformed. By then the owner has already paid. An attacker spends nothing from their own quota.
                  </p>
                  <p>
                    We reproduced the published class in a lab pair and fixed it by making the reservation final at
                    dispatch. The fix ships as a real diff.
                  </p>
                  <div className="spotlight-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => go('/console/findings/WM-002')}>Open WM-002</button>
                    <code>bash findings/WM-002/reproduce.sh</code>
                  </div>
                  <ol className="trace" aria-label="What happens to one attack call">
                    <li><b>Call arrives</b><span>A request the upstream will reject as malformed.</span></li>
                    <li><b>Slot reserved</b><span>The attacker quota drops by one.</span></li>
                    <li className="paid"><b>Upstream called</b><span>The owner is billed for the call.</span></li>
                    <li className="hot"><b>Slot refunded</b><span>The attacker quota is restored. The bill is not.</span></li>
                  </ol>
                </div>
                <div className="spotlight-viz">
                  <WalletBreach dow={dow} />
                </div>
              </div>
            </section>
          )}

          <section className="section" id="safety">
            <div className="surface-dark safety">
              <div>
                <span className="badge dark"><Lock size={12} /> Trust boundary</span>
                <h2>It cannot touch production. The code refuses.</h2>
                <p>
                  Every dynamic request passes through <code className="code-dark">engine/probe/safe-http.mjs</code>, which
                  throws on any host outside the local lab. Its tests aim it at the real production hostname and pass only
                  if the call is refused.
                </p>
                <div className="rules">
                  <div className="rule"><Check size={16} /> A lint fails the build if a scanner calls <code className="code-dark">fetch()</code> directly.</div>
                  <div className="rule"><Check size={16} /> Rate limited to 5 requests per second, even locally.</div>
                  <div className="rule"><Check size={16} /> Benign markers only. No weaponized payloads.</div>
                  <div className="rule"><Check size={16} /> No account created on the target or any identity provider.</div>
                </div>
              </div>
              <SafetyGate />
            </div>
          </section>

          <section className="section" id="benchmarks">
            <div className="section-head">
              <h2>We checked the checker first.</h2>
              <p>Each scoring engine was validated against an independent reference before it scored a single finding.</p>
            </div>
            <div className="bench-grid">
              <div className="card bench feature">
                <div className="big">2000 <small>of 2000</small></div>
                <h4>CVSS 4.0 calculator, matched against FIRST's own reference</h4>
                <p>
                  We scored 2000 random valid vectors with our engine and with FIRST's unmodified reference implementation,
                  side by side. Every score matched.
                </p>
                <p className="src">engine/core/cvss40.mjs, tests/cvss40.test.mjs</p>
              </div>
              <div className="card bench">
                <div className="big">{ev('WM-012', 'cvss_vectors_cross_validated_against_own_calculator') ?? 'n/a'} <small>of {ev('WM-012', 'cvss_vectors_cross_validated_against_own_calculator') ?? 'n/a'}</small></div>
                <h4>npm audit's scores, recomputed independently</h4>
                <p>Every CVSS vector npm audit reported was rescored by our own calculator. {ev('WM-012', 'cvss_cross_validation_mismatches') ?? 0} mismatches.</p>
              </div>
              <div className="card bench">
                <div className="big">{fps.reduce((a, r) => a + r.n, 0)} <small>false positives caught</small></div>
                <h4>Found, fixed and written up</h4>
                <div className="fp-rows">
                  {fps.map((r) => (
                    <div key={r.id} className="fp-row">
                      <span className="i">{r.what}</span>
                      <span className="tbar" style={{ width: `${(r.n / fpMax) * 100}%`, background: 'var(--color-secondary-500)' }} />
                      <span className="k">{r.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="compare">
            <div className="section-head">
              <h2>Scanned before. Here's what's different.</h2>
              <p>
                SkillsLLM published an automated scan of <a className="link" href={TARGET_URL} target="_blank" rel="noreferrer">koala73/worldmonitor</a> on
                6 July 2026. Its dependency findings overlap ours, which is useful independent corroboration.
              </p>
            </div>
            <div className="card compare">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th scope="col"><span className="sr-only">Aspect</span></th><th scope="col">Public automated scan</th><th scope="col" className="us">SEAM assessment</th></tr>
                  </thead>
                  <tbody>
                    <CompareRow label="Method" them={<Cell kind="partial">npm audit plus a keyword search for prompt-injection phrases</Cell>} us={<Cell kind="yes">Seven scope-area scanners, TypeScript AST analysis, live-instance checks</Cell>} />
                    <CompareRow label="Severity" them={<Cell kind="partial">Tool labels: low, medium, high</Cell>} us={<Cell kind="yes">CVSS 3.1 and 4.0 computed in code; EPSS where a CVE exists</Cell>} />
                    <CompareRow label="Reachability" them={<Cell kind="no">Not assessed</Cell>} us={<Cell kind="yes">Dependency tracing: {ev('WM-012', 'live_request_path_advisories') ?? 'n/a'} of {ev('WM-012', 'unique_root_advisories') ?? 'n/a'} advisories sit on the live request path</Cell>} />
                    <CompareRow label="Proof" them={<Cell kind="no">None</Cell>} us={<Cell kind="yes">A reproduce script for every finding; lab pairs re-run in CI</Cell>} />
                    <CompareRow label="Verdicts" them={<Cell kind="partial">A single WARNING status</Cell>} us={<Cell kind="yes">Reproduced, verified secure, or candidate, stated per finding</Cell>} />
                    <CompareRow label="Remediation" them={<Cell kind="no">None</Cell>} us={<Cell kind="yes">{patches} patches, verified with git apply --check</Cell>} />
                    <CompareRow label="Where it's ahead" them={<Cell kind="yes">Flags prompt-injection phrases in the app's public agent-skill files</Cell>} us={<Cell kind="no">That surface was not tested in this pass</Cell>} />
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="card cta">
              <h2>Run the whole assessment yourself.</h2>
              <p>The workflow clones WorldMonitor, starts it inside a GitHub runner, runs every scanner and the regression suite, then republishes this site.</p>
              <pre className="cmds"><code>{`bash lab/fetch-target-source.sh
npm run instance:install && npm run instance:up
npm run assess`}</code></pre>
              <div className="cta-actions">
                <a className="btn btn-primary" href={WORKFLOW_URL} target="_blank" rel="noreferrer">Run workflow <ArrowUpRight size={15} /></a>
                <button className="btn btn-secondary" onClick={openConsole}>Open console</button>
              </div>
            </div>
          </section>

          <footer className="footer">
            <span>SEAM, built for SIH 26163 (NTRO)</span>
            <span>Tested against a local instance only. Generated {new Date(data.generated_at).toISOString().slice(0, 10)}.</span>
          </footer>
        </div>
      </main>
      <MagnificationDock items={dockItems} visible={pastHero} />
    </div>
  );
}

function CompareRow({ label, them, us }: { label: string; them: ReactNode; us: ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{them}</td>
      <td className="us">{us}</td>
    </tr>
  );
}

function Cell({ kind, children }: { kind: 'yes' | 'no' | 'partial'; children: ReactNode }) {
  const icon =
    kind === 'yes' ? <Check size={15} color="var(--color-accent-700)" aria-label="Yes" /> :
    kind === 'no' ? <X size={15} color="var(--color-primary-600)" aria-label="No" /> :
    <Minus size={15} color="var(--color-secondary-700)" aria-label="Partly" />;
  return <div className="cell">{icon}<span>{children}</span></div>;
}
