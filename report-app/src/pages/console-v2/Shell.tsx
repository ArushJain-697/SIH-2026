import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ConsoleBackdrop } from '../../components/ConsoleBackdrop';
import { WORKFLOW_URL } from '../../data';
import '../../styles/console-v2.css';

const TABS = [
  { path: '/console', label: 'Overview' },
  { path: '/console/findings', label: 'Findings' },
  { path: '/console/proof-spine', label: 'Proof spine' },
  { path: '/console/ps-export', label: 'PS export' },
  { path: '/console/methodology', label: 'Methodology' },
];

export function Shell({ path, go, children }: { path: string; go: (p: string) => void; children: ReactNode }) {
  const active = (p: string) => (p === '/console' ? path === '/console' : path.startsWith(p));
  return (
    <div className="v2">
      <ConsoleBackdrop theme="dark" />
      <div className="v2-nav-wrap">
        <nav className="v2-nav">
          <button className="v2-logo" onClick={() => go('/')}>SEAM</button>
          <div className="v2-tabs">
            {TABS.map((t) => (
              <button key={t.path} className={`v2-tab ${active(t.path) ? 'is-on' : ''}`} onClick={() => go(t.path)}>{t.label}</button>
            ))}
          </div>
          <a className="v2-cta" href={WORKFLOW_URL} target="_blank" rel="noreferrer">Run workflow <ArrowUpRight size={14} /></a>
        </nav>
      </div>
      <main className="v2-wrap" id="main" tabIndex={-1} style={{ outline: 'none' }}>
        {children}
      </main>
    </div>
  );
}
