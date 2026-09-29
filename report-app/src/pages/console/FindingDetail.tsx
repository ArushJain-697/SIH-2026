import { useMemo, useState } from 'react';
import { marked } from 'marked';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { data, findingById } from '../../data';
import { StatusBadge } from '../../components/ui';

export function FindingDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const f = findingById(id);
  // finding.md is first-party, generated in this repo — not user-supplied content.
  const html = useMemo(() => (f?.markdown ? (marked.parse(f.markdown, { async: false }) as string) : null), [f]);
  const [copied, setCopied] = useState(false);

  if (!f) {
    return (
      <>
        <button className="back" onClick={() => go('/console/findings')}><ArrowLeft size={15} /> All findings</button>
        <p>Finding {id} not found.</p>
      </>
    );
  }

  const cmd = f.reproduce_script ? `bash ${f.reproduce_script}` : null;
  const copy = () => {
    if (!cmd) return;
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const kv: { k: string; v: string | undefined; wide?: boolean }[] = [
    { k: f.severity?.cvss31_score != null ? `CVSS 3.1 · ${f.severity.cvss31_score}` : 'CVSS 3.1', v: f.severity?.cvss31_vector, wide: true },
    { k: 'CVSS 4.0', v: f.severity?.cvss40_vector, wide: true },
    { k: 'EPSS', v: typeof f.severity?.epss === 'number' ? String(f.severity.epss) : f.epss_note ? 'N/A — no CVE (see write-up)' : undefined },
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
      <button className="back" onClick={() => go('/console/findings')}><ArrowLeft size={15} /> All findings</button>
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--color-neutral-500)' }}>{f.id}</span>
            <StatusBadge status={f.status} />
          </div>
          <h1>{f.title}</h1>
        </div>
      </div>

      <div className="split" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="kv">
              {kv.filter((x) => x.v).map((x) => (
                <div key={x.k} className={x.wide ? 'wide' : undefined}>
                  <div className="k">{x.k}</div>
                  <div className="v">{x.v}</div>
                </div>
              ))}
            </div>
          </div>
          {html && (
            <div className="card">
              <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          )}
        </div>

        <div className="stack">
          {cmd && (
            <div className="surface-dark" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Reproduce</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '0.6rem 0.75rem', borderRadius: 10, overflowWrap: 'anywhere' }}>{cmd}</code>
                <button className="btn btn-ghost-dark btn-sm" onClick={copy} aria-label="Copy command">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          <div className="card pad">
            <div className="k" style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', marginBottom: '0.5rem' }}>Business impact</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-800)' }}>{f.business_impact}</p>
          </div>

          <div className="card pad">
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', marginBottom: '0.5rem' }}>Remediation</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-800)' }}>{f.remediation}</p>
            {f.has_remediation_patch && <span className="badge green" style={{ marginTop: '0.85rem' }}>✓ {f.remediation_patch}</span>}
          </div>

          {f.evidence_files.length > 0 && (
            <div className="card pad">
              <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', marginBottom: '0.6rem' }}>Evidence files · {f.evidence_files.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {f.evidence_files.map((e) => <span key={e} className="mono" style={{ fontSize: '0.74rem', color: 'var(--color-neutral-700)', overflowWrap: 'anywhere' }}>findings/{f.dir}/evidence/{e}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
