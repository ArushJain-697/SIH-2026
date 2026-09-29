import React, { useState } from 'react';
import data from './data/assessment-data.json';
import Dashboard from './components/Dashboard.jsx';
import FindingsList from './components/FindingsList.jsx';
import FindingDetail from './components/FindingDetail.jsx';
import ProofSpine from './components/ProofSpine.jsx';
import Methodology from './components/Methodology.jsx';
import PSExport from './components/PSExport.jsx';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'findings', label: 'Findings' },
  { key: 'proof-spine', label: 'Proof Spine' },
  { key: 'ps-export', label: 'PS Export' },
  { key: 'methodology', label: 'Methodology' },
];

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="var(--green)" strokeWidth="1.4" opacity="0.6" />
      <path d="M4 12 L9 12 L11 6 L14 18 L16 12 L20 12" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [selectedFinding, setSelectedFinding] = useState(null);

  function goToFindings(findingId) {
    setTab('findings');
    setSelectedFinding(findingId);
  }

  let content;
  if (tab === 'dashboard') {
    content = <Dashboard data={data} onSelectFinding={goToFindings} />;
  } else if (tab === 'findings') {
    content = selectedFinding
      ? <FindingDetail data={data} findingId={selectedFinding} onBack={() => setSelectedFinding(null)} />
      : <FindingsList data={data} onSelect={setSelectedFinding} />;
  } else if (tab === 'proof-spine') {
    content = <ProofSpine data={data} />;
  } else if (tab === 'ps-export') {
    content = <PSExport data={data} />;
  } else if (tab === 'methodology') {
    content = <Methodology data={data} />;
  }

  const genDate = new Date(data.generated_at);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <BrandMark />
            <div className="brand-title">WorldMonitor Assessment</div>
          </div>
          <span className="status-pill"><span className="dot" /> ASSESSMENT COMPLETE · {genDate.toISOString().slice(0, 10)}</span>
          <div className="topbar-spacer" />
          <a className="btn-primary" href="https://github.com/koala73/worldmonitor" target="_blank" rel="noreferrer">
            View Target Repo
          </a>
        </div>
        <nav className="sheet-tabs">
          {NAV.map((n) => (
            <div
              key={n.key}
              className={`sheet-tab ${tab === n.key ? 'active' : ''}`}
              onClick={() => { setTab(n.key); if (n.key !== 'findings') setSelectedFinding(null); }}
            >
              {n.label}
            </div>
          ))}
        </nav>
      </header>

      <main className="main">{content}</main>

      <footer className="title-block">
        <div className="tb-field">
          <div className="tb-label">Project</div>
          <div className="tb-value">SIH 26163 · NTRO — WorldMonitor Security Assessment</div>
        </div>
        <div className="tb-field">
          <div className="tb-label">Coverage</div>
          <div className="tb-value">{data.summary.scope_areas_with_evidence}/7 scope areas</div>
        </div>
        <div className="tb-field">
          <div className="tb-label">Findings</div>
          <div className="tb-value">{data.summary.total_findings}</div>
        </div>
        <div className="tb-field">
          <div className="tb-label">Generated</div>
          <div className="tb-value">{genDate.toISOString().slice(0, 19).replace('T', ' ')} UTC</div>
        </div>
      </footer>
    </div>
  );
}
