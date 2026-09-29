import { useEffect, useState } from 'react';
import { Landing } from './pages/Landing';
import { Shell } from './pages/console/Shell';
import { Dashboard } from './pages/console/Dashboard';
import { Findings } from './pages/console/Findings';
import { FindingDetail } from './pages/console/FindingDetail';
import { ProofSpine } from './pages/console/ProofSpine';
import { PSExport } from './pages/console/PSExport';
import { Methodology } from './pages/console/Methodology';

function currentPath() {
  const p = window.location.hash.replace(/^#/, '').replace(/\/+$/, '');
  return p || '/';
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onHash = () => setPath(currentPath());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [path]);

  const go = (p: string) => {
    window.location.hash = p;
  };

  const skip = <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>;

  if (!path.startsWith('/console')) return <>{skip}<Landing go={go} /></>;

  const findingMatch = path.match(/^\/console\/findings\/(WM-\d{3})$/);
  let page;
  if (findingMatch) page = <FindingDetail id={findingMatch[1]} go={go} />;
  else if (path.startsWith('/console/findings')) page = <Findings go={go} />;
  else if (path.startsWith('/console/proof-spine')) page = <ProofSpine go={go} />;
  else if (path.startsWith('/console/ps-export')) page = <PSExport />;
  else if (path.startsWith('/console/methodology')) page = <Methodology />;
  else page = <Dashboard go={go} />;

  return <>{skip}<Shell path={path} go={go}>{page}</Shell></>;
}
