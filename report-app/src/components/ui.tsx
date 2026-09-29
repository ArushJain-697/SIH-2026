import type { ReactNode } from 'react';
import { statusMeta, verdictMeta } from '../lib/status';
import type { CoverageVerdict, FindingStatus } from '../types';

export function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="logo" onClick={onClick} aria-label="SEAM home">
      <span className="logo-word">SEAM</span>
    </button>
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
