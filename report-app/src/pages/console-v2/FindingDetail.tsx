import { useMemo, useState } from 'react';
import { marked } from 'marked';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { data, findingById } from '../../data';
import { statusMeta } from '../../lib/status';

export function FindingDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const f = findingById(id);
  const html = useMemo(() => (f?.markdown ? (marked.parse(f.markdown, { async: false }) as string) : null), [f]);
  const [copied, setCopied] = useState(false);

  if (!f) {
    return (
      <>
        <button className="v2-back" onClick={() => go('/console/findings')}><ArrowLeft size={15} /> All findings</button>
        <p>Finding {id} not found.</p>
      </>
    );
  }

  const m = statusMeta(f.status);
  const cmd = f.reproduce_script ? `bash ${f.reproduce_script}` : null;
  const copy = () => {
    if (!cmd) return;
    navigator.clipboard?.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };

  const kv: { k: string; v: string | undefined; wide?: boolean }[] = [
    { k: f.severity?.cvss31_score != null ? `CVSS 3.1 · ${f.severity.cvss31_score}` : 'CVSS 3.1', v: f.severity?.cvss31_vector, wide: true },
    { k: 'CVSS 4.0', v: f.severity?.cvss40_vector, wide: true },
    { k: 'EPSS', v: typeof f.severity?.epss === 'number' ? String(f.severity.epss) : f.epss_note ? 'N/A: no CVE (see write-up)' : undefined },
    { k: 'CWE', v: f.tags?.cwe?.join(', ') },
    { k: 'WSTG', v: f.tags?.wstg },
    { k: 'OWASP API', v: f.tags?.owasp_api },
    { k: 'Advisory', v: f.references?.ghsa ?? undefined },
    { k: 'Scope areas', v: f.scope_areas.map((n) => `${n} · ${data.scope_area_labels[n]}`).join('; ') },
    { k: 'Lab commit', v: f.lab_commit?.slice(0, 12) },
    { k: 'Component', v: f.component, wide: true },
  ];

  return (
    <>
      <button className="v2-back" onClick={() => go('/console/findings')}><ArrowLeft size={15} /> All findings</button>
      <div className="v2-head">
        <div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontFamily: 'JetBrains Mono Variable, monospace', fontWeight: 700, color: 'var(--v2-faint)' }}>{f.id}</span>
            <span className={`v2-pill ${m.tone === 'red' ? 'ember' : m.tone === 'yellow' ? 'amber' : 'moss'}`}>{m.label}</span>
          </div>
          <h1>{f.title}</h1>
        </div>
      </div>

      <div className="v2-bento">
        <div className="v2-span-8">
          <div className="v2-chart-card" style={{ marginBottom: '1rem' }}>
            {kv.filter((x) => x.v).map((x) => (
              <div key={x.k} className="v2-field" style={{ gridTemplateColumns: x.wide ? '1fr' : '170px 1fr' }}>
                <div className="k">{x.k}</div>
                <div className="v mono">{x.v}</div>
              </div>
            ))}
          </div>
          {html && (
            <div className="v2-chart-card prose" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>

        <div className="v2-span-4">
          {cmd && (
            <div className="v2-tile v2-dark" style={{ cursor: 'default', marginBottom: '1rem' }}>
              <div className="v2-tile-label" style={{ marginBottom: '0.6rem' }}>Reproduce</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, overflowWrap: 'anywhere' }}>{cmd}</code>
                <button className="v2-pill neutral" style={{ cursor: 'pointer', border: 0 }} onClick={copy} aria-label="Copy command">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          <div className="v2-chart-card" style={{ marginBottom: '1rem' }}>
            <div className="v2-tile-label" style={{ marginBottom: '0.5rem' }}>Business impact</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--v2-muted)', lineHeight: 1.6 }}>{f.business_impact}</p>
          </div>

          <div className="v2-chart-card" style={{ marginBottom: '1rem' }}>
            <div className="v2-tile-label" style={{ marginBottom: '0.5rem' }}>Remediation</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--v2-muted)', lineHeight: 1.6 }}>{f.remediation}</p>
            {f.has_remediation_patch && <span className="v2-pill moss" style={{ marginTop: '0.85rem', display: 'inline-block' }}>✓ {f.remediation_patch}</span>}
          </div>

          {f.evidence_files.length > 0 && (
            <div className="v2-chart-card">
              <div className="v2-tile-label" style={{ marginBottom: '0.6rem' }}>Evidence files · {f.evidence_files.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {f.evidence_files.map((e) => <span key={e} className="mono" style={{ fontSize: '0.74rem', color: 'var(--v2-faint)', overflowWrap: 'anywhere' }}>findings/{f.dir}/evidence/{e}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
