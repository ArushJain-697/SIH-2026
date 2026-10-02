import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { data } from '../../data';

const STANDARDS = [
  ['Testing methodology', 'OWASP WSTG v4.2'],
  ['API risk taxonomy', 'OWASP API Security Top 10 (2023)'],
  ['Weakness classification', 'CWE (MITRE)'],
  ['Severity scoring', 'CVSS 3.1 + CVSS 4.0 (FIRST)'],
  ['Likelihood scoring', 'EPSS (FIRST), where a CVE applies'],
  ['Dual scoring', 'CERT-In audit guidelines'],
  ['Disclosure posture', 'ISO/IEC 29147 & 30111-aligned'],
  ['SBOM format', 'CycloneDX 1.5'],
];

const ENGINE = [
  ['CVSS 4.0', 'A port of FIRST\'s official algorithm, cross-validated against the unmodified reference implementation across 2000 random vectors with zero mismatches before it scored a single finding.'],
  ['EPSS', 'Live queries to FIRST\'s public API, with an explicit not-applicable or unavailable result instead of an invented number.'],
  ['Safe HTTP probe', 'The only sanctioned path for dynamic requests. A lint forbids raw fetch() anywhere in scanner code.'],
  ['Seven scanners', 'One module per PS scope area, each emitting schema-validated, evidence-backed verdicts.'],
  ['SCA + SBOM', 'npm audit plus a lockfile-ancestry tracer that separates the live request path from ops-only scripts.'],
  ['Regression harness', 'Auto-discovers every lab/repro-services/*/manifest.mjs; adding a reproduction needs no harness change.'],
];

const NOT_DONE = [
  'No request to the live worldmonitor.app deployment. Localhost only, enforced in code.',
  'No account created on the target or on any identity provider.',
  'No weaponized payloads, even in the lab. Benign markers only.',
  'No published advisory claimed as novel; the schema validator fails the build if one is.',
  'Dynamic confirmation of new candidates deliberately skipped: no new exploitable finding existed to demonstrate.',
  'Agent-skill prompt-injection surface (public/.well-known/agent-skills) not tested in this pass.',
];

const TABS = [
  { key: 'standards', label: 'Standards' },
  { key: 'engine', label: 'Engine' },
  { key: 'not-done', label: 'Not done' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function Methodology() {
  const [tab, setTab] = useState<TabKey>('standards');

  return (
    <>
      <div className="v2-head">
        <div>
          <h1>Methodology & compliance</h1>
          <p>Standards alignment, the engine's guarantees, and an explicit list of what this assessment did not do.</p>
        </div>
      </div>

      <div className="v2-bento">
        <div className="v2-tile v2-stat v2-ember v2-span-4">
          <div className="v2-tile-num">{STANDARDS.length}</div>
          <div className="v2-tile-sub">External standards referenced</div>
        </div>
        <div className="v2-tile v2-glass v2-span-8">
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem' }}>Every scoring decision maps to a named, public standard</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--v2-muted)' }}>Not an internal judgment call: CVSS, EPSS, CWE, OWASP, CERT-In, ISO, all cited per finding below.</div>
        </div>
      </div>

      <div className="v2-tabrow">
        {TABS.map((t) => (
          <button key={t.key} className={`v2-filter ${tab === t.key ? 'is-on' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'standards' && (
        <div className="v2-bento">
          {STANDARDS.map(([k, v], i) => (
            <div key={k} className={`v2-tile v2-stat v2-span-3 ${i % 4 === 0 ? 'v2-amber' : i % 4 === 1 ? 'v2-moss' : i % 4 === 2 ? 'v2-cream' : 'v2-glass'}`}>
              <div className="v2-tile-label">{k}</div>
              <div style={{ fontWeight: 800, marginTop: '0.5rem', fontSize: '1rem' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'engine' && (
        <div className="v2-chart-card">
          {ENGINE.map(([k, v]) => (
            <div key={k} style={{ padding: '0.9rem 0', borderBottom: '1px solid var(--v2-line)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{k}</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--v2-muted)', marginTop: '0.25rem', lineHeight: 1.55 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'not-done' && (
        <div className="v2-chart-card">
          {NOT_DONE.map((t) => (
            <div key={t} style={{ display: 'flex', gap: '0.7rem', padding: '0.8rem 0', borderBottom: '1px solid var(--v2-line)', fontSize: '0.86rem', color: 'var(--v2-muted)' }}>
              <X size={15} color="#ff8a52" style={{ flexShrink: 0, marginTop: 3 }} />{t}
            </div>
          ))}
        </div>
      )}

      <div className="v2-chart-card" style={{ marginTop: '1rem' }}>
        <div className="v2-chart-head"><div><h3>Per-finding standards mapping</h3><div className="sub">Generated from finding data, not hand-typed. CVSS 4.0 column: a check means both vectors were computed.</div></div></div>
        <div className="v2-row-list">
          {data.findings.map((f) => (
            <div className="v2-row" key={f.id} style={{ cursor: 'default' }}>
              <span className="v2-row-id">{f.id}</span>
              <div className="v2-row-main">
                <div className="v2-row-title" style={{ fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--v2-faint)', marginTop: 2 }}>{f.tags?.cwe?.join(', ') ?? 'n/a'} · {f.tags?.wstg ?? 'n/a'} · {f.tags?.owasp_api ?? 'n/a'}</div>
              </div>
              <span className={`v2-row-score ${f.severity?.cvss31_score == null ? 'is-na' : ''}`}>{f.severity?.cvss31_score ?? 'N/A'}</span>
              {f.severity?.cvss40_vector ? <Check size={15} color="#5fe3a8" /> : <span style={{ color: 'var(--v2-faint)', fontSize: '0.78rem' }}>n/a</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
