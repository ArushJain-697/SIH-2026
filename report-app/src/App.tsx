import { useEffect, useRef, useState } from 'react';
import { Home } from './landing/Home';
import { Transition } from './landing/Transition';
import { Shell } from './pages/console-v2/Shell';
import { Dashboard } from './pages/console-v2/Dashboard';
import { Findings } from './pages/console-v2/Findings';
import { FindingDetail } from './pages/console-v2/FindingDetail';
import { ProofSpine } from './pages/console-v2/ProofSpine';
import { PSExport } from './pages/console-v2/PSExport';
import { Methodology } from './pages/console-v2/Methodology';

function currentPath() {
  const p = window.location.hash.replace(/^#/, '').replace(/\/+$/, '');
  return p || '/';
}

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [wipe, setWipe] = useState<'idle' | 'cover' | 'reveal'>('idle');
  const pendingHash = useRef<string | null>(null);

  useEffect(() => {
    const onHash = () => {
      // Only consume a hash change we didn't already animate for (back/forward,
      // or a stray #id anchor jump) — avoids double-triggering the wipe.
      if (pendingHash.current === window.location.hash) { pendingHash.current = null; return; }
      setPath(currentPath());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [path]);

  const go = (p: string) => {
    const next = p ? `#${p}` : '#';
    if (next === window.location.hash || REDUCED) {
      window.location.hash = p;
      return;
    }
    pendingHash.current = next;
    setWipe('cover');
    window.setTimeout(() => {
      window.location.hash = p;
      setPath(currentPath());
      setWipe('reveal');
      window.setTimeout(() => setWipe('idle'), 1100);
    }, 900);
  };

  const skip = <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>;

  const findingMatch = path.match(/^\/console\/findings\/(WM-\d{3})$/);
  let page;
  if (!path.startsWith('/console')) page = <Home go={go} />;
  else if (findingMatch) page = <Shell path={path} go={go}><FindingDetail id={findingMatch[1]} go={go} /></Shell>;
  else if (path.startsWith('/console/findings')) page = <Shell path={path} go={go}><Findings go={go} /></Shell>;
  else if (path.startsWith('/console/proof-spine')) page = <Shell path={path} go={go}><ProofSpine go={go} /></Shell>;
  else if (path.startsWith('/console/ps-export')) page = <Shell path={path} go={go}><PSExport /></Shell>;
  else if (path.startsWith('/console/methodology')) page = <Shell path={path} go={go}><Methodology /></Shell>;
  else page = <Shell path={path} go={go}><Dashboard go={go} /></Shell>;

  return <>{skip}{page}<Transition phase={wipe} /></>;
}
