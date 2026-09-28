#!/usr/bin/env bash
# WM-007 — re-verifies the real running instance's localStorage/sessionStorage
# content against a credential-shaped-pattern scan. This check needs an
# actual browser (it reads real DOM storage APIs); there is no CLI-only
# automation for it in this project by design — we deliberately avoided
# adding a Playwright/Puppeteer dependency to keep the engine zero-dependency
# (see package.json). Reproduce with the built-in browser tool or any
# browser's devtools console against the real running instance.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
  echo "ERROR: the real instance is not running on localhost:3000."
  echo "Start it first: cd .cache/worldmonitor-src && npm install && npm run dev"
  exit 1
fi

cat << 'JS'
Open http://localhost:3000/ in a browser, let it fully load, then run this in
the devtools console (or via any browser-automation MCP tool's javascript_exec):

  const patterns = {
    jwt_like: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    wm_api_key: /\bwm_[a-f0-9]{20,}\b/i,
    bearer_token: /\bBearer\s+[A-Za-z0-9._-]{15,}/,
    generic_secret_key: /\b(sk|pk|api[_-]?key|secret|password|token)[_-]?[:=]\s*['"]?[A-Za-z0-9_-]{16,}/i,
  };
  const hits = [];
  for (const k of Object.keys(localStorage)) {
    const v = localStorage.getItem(k);
    for (const [name, re] of Object.entries(patterns)) if (re.test(v)) hits.push({key: k, pattern: name});
  }
  JSON.stringify({ total_keys_scanned: Object.keys(localStorage).length, credential_shaped_hits: hits,
    session_storage_keys: Object.keys(sessionStorage).length, cookies_set: document.cookie.length > 0 }, null, 2)

Expected result (evidence/localstorage-full-dump.json): 27 localStorage keys,
0 credential-shaped hits, 1 sessionStorage key (a benign viewed-panel
tracker), no cookies set.
JS

echo
echo "WM-007 reproduce.sh: manual/browser-tool reproduction steps printed above; captured evidence is in findings/WM-007/evidence/"
