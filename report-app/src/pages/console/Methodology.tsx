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
  'No request to the live worldmonitor.app deployment — localhost only, enforced in code.',
  'No account created on the target or on any identity provider.',
  'No weaponized payloads, even in the lab — benign markers only.',
  'No published advisory claimed as novel; the schema validator fails the build if one is.',
  'Dynamic confirmation of new candidates (ticket #E2) deliberately skipped: no new exploitable finding existed to demonstrate.',
  'Agent-skill prompt-injection surface (public/.well-known/agent-skills) not tested in this pass.',
];

export function Methodology() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Methodology & compliance</h1>
          <p>Standards alignment, the engine's guarantees, and an explicit list of what this assessment did not do.</p>
        </div>
      </div>

      <div className="stack">
        <div className="grid-4">
          {STANDARDS.map(([k, v]) => (
            <div key={k} className="card pad" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>{k}</div>
              <div style={{ fontWeight: 700, marginTop: '0.3rem', color: 'var(--color-neutral-950)' }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head"><div><h3>Per-finding standards mapping</h3><div className="sub">Generated from finding data, not hand-typed</div></div></div>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Finding</th><th>CWE</th><th>WSTG</th><th>OWASP API</th><th>CVSS 3.1</th><th>CVSS 4.0</th><th>EPSS</th></tr></thead>
              <tbody>
                {data.findings.map((f) => (
                  <tr key={f.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>{f.id}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{f.tags?.cwe?.join(', ') ?? '—'}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{f.tags?.wstg ?? '—'}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{f.tags?.owasp_api ?? '—'}</td>
                    <td className="mono">{f.severity?.cvss31_score ?? '—'}</td>
                    <td>{f.severity?.cvss40_vector ? <Check size={15} color="var(--color-accent-600)" /> : '—'}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{typeof f.severity?.epss === 'number' ? f.severity.epss : f.epss_note ? 'N/A, noted' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3>The engine, briefly</h3></div>
            {ENGINE.map(([k, v]) => (
              <div key={k} className="reg-row">
                <div className="name" style={{ fontFamily: 'var(--font-body)' }}>{k}</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-neutral-600)', marginTop: '0.25rem' }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="surface-dark">
            <div className="card-head" style={{ borderColor: 'rgba(255,255,255,0.08)' }}><h3>What this assessment did not do</h3></div>
            {NOT_DONE.map((t) => (
              <div key={t} style={{ display: 'flex', gap: '0.7rem', padding: '0.85rem 1.35rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.86rem', color: 'rgba(255,255,255,0.75)' }}>
                <X size={15} color="var(--color-primary-400)" style={{ flexShrink: 0, marginTop: 3 }} />{t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
