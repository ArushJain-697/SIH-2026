import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CapsuleNav } from '../../components/ui';
import { PillTabs } from '../../components/PillTabs';
import { WORKFLOW_URL } from '../../data';

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
    <>
      <CapsuleNav
        onHome={() => go('/')}
        links={<PillTabs tabs={TABS} isActive={active} onSelect={go} />}
        right={
          <a className="btn btn-white btn-sm" href={WORKFLOW_URL} target="_blank" rel="noreferrer">
            Run workflow <ArrowUpRight size={14} />
          </a>
        }
      />
      <main className="console" key={path} id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <div className="enter">{children}</div>
      </main>
    </>
  );
}
