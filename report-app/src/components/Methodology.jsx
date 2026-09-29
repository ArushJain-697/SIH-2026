import React from 'react';

export default function Methodology({ data }) {
  return (
    <div>
      <h1 className="page-title">Methodology & Compliance</h1>
      <p className="page-subtitle">Standards alignment, ethics, and what this assessment did not do.</p>

      <div className="section">
        <div className="section-title">The one hard rule</div>
        <div className="b-card">
          <p>
            Every active proof-of-concept ran against either the real WorldMonitor application, built from source
            and run locally (<code>localhost:3000</code>) — a genuine controlled environment — or a minimal,
            clearly-labelled reproduction harness. <strong>Nothing ever touched the live <code>worldmonitor.app</code> deployment
            or any real user data.</strong> This is enforced in code: <code>engine/probe/safe-http.mjs</code> refuses any
            host that is not <code>localhost</code>/<code>127.0.0.1</code>/<code>::1</code>, proven in its own test suite against
            the real production hostname.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Standards alignment</div>
        <div className="kv-grid">
          <div><div className="kv-label">Testing methodology</div><div className="kv-value" style={{ fontSize: 12.5 }}>OWASP WSTG v4.2</div></div>
          <div><div className="kv-label">API risk taxonomy</div><div className="kv-value" style={{ fontSize: 12.5 }}>OWASP API Security Top 10 (2023)</div></div>
          <div><div className="kv-label">Weakness classification</div><div className="kv-value" style={{ fontSize: 12.5 }}>CWE (MITRE)</div></div>
          <div><div className="kv-label">Severity scoring</div><div className="kv-value" style={{ fontSize: 12.5 }}>CVSS 3.1 + CVSS 4.0 (FIRST)</div></div>
          <div><div className="kv-label">Likelihood scoring</div><div className="kv-value" style={{ fontSize: 12.5 }}>EPSS (FIRST) where a CVE applies</div></div>
          <div><div className="kv-label">Dual scoring mandate</div><div className="kv-value" style={{ fontSize: 12.5 }}>CERT-In Audit Policy Guidelines</div></div>
          <div><div className="kv-label">Disclosure posture</div><div className="kv-value" style={{ fontSize: 12.5 }}>ISO/IEC 29147 &amp; 30111-aligned</div></div>
          <div><div className="kv-label">SBOM format</div><div className="kv-value" style={{ fontSize: 12.5 }}>CycloneDX 1.5</div></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">The engine, briefly</div>
        <div className="b-card">
          <ul style={{ fontSize: 13, lineHeight: 1.8 }}>
            <li><strong>CVSS 4.0</strong> — a faithful port of the official FIRST algorithm, cross-validated against the unmodified reference implementation across 2000 random vectors (0 mismatches) before trusting it on any real finding.</li>
            <li><strong>EPSS</strong> — live queries to the public FIRST API, with an honest <code>not_applicable</code>/<code>unavailable</code> fallback rather than a fabricated number.</li>
            <li><strong>The safe HTTP probe</strong> — the sole sanctioned path for any dynamic request; a lint (<code>tests/lint_no_raw_fetch.mjs</code>) forbids raw <code>fetch()</code> in scanner code.</li>
            <li><strong>Seven scope-area scanners</strong> — one real module per PS scope area, each producing schema-validated, evidence-backed verdicts.</li>
            <li><strong>SCA + SBOM</strong> — real <code>npm audit</code> plus a lockfile-ancestry tracer that distinguishes a package on the live request path from one reachable only through an operational script.</li>
            <li><strong>An auto-discovering regression harness</strong> — every <code>lab/repro-services/*/manifest.mjs</code> is picked up automatically; adding a new reproduction needs zero harness edits.</li>
          </ul>
        </div>
      </div>

      <div className="section">
        <div className="section-title">What this assessment deliberately did not do</div>
        <div className="b-card">
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-dim)' }}>
            <li>No account was created on any external identity provider or on the live target.</li>
            <li>No weaponized payload was used, even locally — benign markers only.</li>
            <li>No published advisory is claimed as a novel discovery — the schema validator cross-checks every <code>REPRODUCED-KNOWN</code> status against the real advisory register and fails the build otherwise.</li>
            <li>Dynamic confirmation of new candidate findings (build-map-advanced ticket #E2) was deliberately not pursued this pass — every new static finding was either verified-secure or genuinely unresolved, and no vulnerability existed to dynamically demonstrate.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
