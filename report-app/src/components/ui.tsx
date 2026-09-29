import type { ReactNode } from 'react';
import { statusMeta, verdictMeta } from '../lib/status';
import type { CoverageVerdict, FindingStatus } from '../types';

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 3H5a2 2 0 0 0-2 2v2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
      <path d="M12 6v4.2M12 13.8V18" stroke="var(--color-primary-400)" strokeWidth="2.4" />
      <circle cx="12" cy="12" r="1.3" fill="var(--color-primary-400)" stroke="none" />
    </svg>
  );
}

export function Logo({ onClick }: { onClick: () => void }) {
  return (
    <div className="logo" onClick={onClick} role="link" aria-label="Home">
      <LogoMark />
      <div>
        <div className="logo-word">SEAM</div>
        <div className="logo-sub">WorldMonitor · SIH 26163</div>
      </div>
    </div>
  );
}

export function CapsuleNav({ links, right, onHome, className }: { links: ReactNode; right: ReactNode; onHome: () => void; className?: string }) {
  return (
    <div className="nav-wrap">
      <nav className="capsule">
        <Logo onClick={onHome} />
        <div className={`capsule-links ${className ?? ''}`}>{links}</div>
        <div className="capsule-right">{right}</div>
      </nav>
    </div>
  );
}

export function StatusBadge({ status }: { status: FindingStatus }) {
  const m = statusMeta(status);
  return (
    <span className={`badge ${m.tone}`}>
      <span className="dot" />
      {m.label}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: CoverageVerdict }) {
  const m = verdictMeta(verdict);
  return (
    <span className={`badge ${m.tone}`}>
      <span className="dot" />
      {m.label}
    </span>
  );
}

type Disk = 'orange' | 'yellow' | 'green' | 'dark';

export function MetricCard({ title, value, sub, icon, disk = 'orange' }: { title: string; value: ReactNode; sub?: string; icon: ReactNode; disk?: Disk }) {
  return (
    <div className="card metric">
      <div className={`disk ${disk}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="t">{title}</div>
        <div className="v">{value}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
    </div>
  );
}
