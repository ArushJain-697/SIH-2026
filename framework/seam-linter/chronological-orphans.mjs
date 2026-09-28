#!/usr/bin/env node
/**
 * Seam-Linter — chronological orphan check. Build-map ticket #15 (STRETCH,
 * Phase 3). Bible §4: "CI invariants are typically reactive... heavily
 * automated codebases... are riddled with chronological blind spots."
 *
 * WHY THIS SCOPE, NOT A GENERIC ONE: our own ticket #13 heuristic could not
 * reliably extract most of the 30 real enforce- and check- prefixed .mjs
 * scripts' walked target directory (most call a variable holding it, not a
 * string literal our regex can see) — see
 * framework/seam-linter/output/invariant-coverage-map.json and the honest
 * limitation noted in docs/progress.md. Rather than force a generic
 * sibling-vs-invariant date comparison on data we can't actually verify, this
 * tool asks a narrower, fully-verifiable question directly extending WM-004:
 * of the 13 real files WM-004 found independently setting a CORS wildcard
 * (bypassing the shared api/_cors.js / server/cors.ts helper), were any of
 * them CREATED AFTER the shared helper already existed? A file predating the
 * helper is unsurprising (it couldn't have used a control that didn't exist
 * yet). A file postdating it and STILL bypassing it is a live, ongoing
 * chronological-blind-spot signal, not historical debt.
 *
 * WHY THE GITHUB API, NOT LOCAL GIT: lab/fetch-target-source.sh does a
 * shallow clone (--depth 1) by design (fast, small, sufficient for the
 * static-source-reading tools) — so there is no local commit history to
 * `git blame` or `git log --follow` against. GitHub's commits API is queried
 * directly instead, using the documented Link-header last-page trick to find
 * a path's oldest commit in 2 requests instead of downloading full history.
 * This is read-only, unauthenticated, public-repository access — reading
 * public source, explicitly permitted by docs/ROE.md — not a test against
 * any running instance.
 *
 * Usage: node framework/seam-linter/chronological-orphans.mjs
 * (no --src arg: queries the GitHub API directly, not the local clone)
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'framework/seam-linter/output');
const CACHE_PATH = join(OUT_DIR, 'chronological-orphans-cache.json');
const REPO = 'koala73/worldmonitor';

// The 13 real files WM-004 found independently setting a CORS wildcard,
// bypassing api/_cors.js / server/cors.ts. Hardcoded from that finding's own
// evidence (findings/WM-004/evidence/cors-scan-report.json) rather than
// re-run live here, so this tool's API budget is spent on DATES, not
// re-discovering a list we already have real evidence for.
const CANDIDATE_FILES = [
  'api/_agent-metadata.ts', 'api/a2a.ts', 'api/agent-auth.ts', 'api/ask.ts',
  'api/docs-mcp.ts', 'api/geo.js', 'api/http-message-signatures-directory.ts',
  'api/md-twin.ts', 'api/oauth/authorize.js', 'api/oauth-authorization-server.ts',
  'api/oauth-protected-resource.ts', 'api/security/report.js', 'api/version.js',
];

const CONTROL_FILES = ['api/_cors.js', 'server/cors.ts'];

function loadCache() {
  if (existsSync(CACHE_PATH)) {
    try { return JSON.parse(readFileSync(CACHE_PATH, 'utf8')); } catch { /* fall through */ }
  }
  return {};
}

function saveCache(cache) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function ghFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sih26163-seam-linter', Accept: 'application/vnd.github+json' } });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (res.status === 403 || res.status === 429) {
    throw new Error(`rate limited (remaining=${remaining}) fetching ${url}`);
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return { json: await res.json(), linkHeader: res.headers.get('link'), remaining };
}

function parseLastPage(linkHeader) {
  if (!linkHeader) return null; // only one page -> the single commit returned IS the oldest
  const m = linkHeader.match(/<([^>]+)>;\s*rel="last"/);
  if (!m) return null;
  return m[1];
}

/** First (oldest) commit touching `path`, via the Link-header last-page trick. 2 API calls. */
async function firstCommitFor(path, cache) {
  if (cache[path]) return cache[path];
  const firstUrl = `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=1`;
  const { json: firstPage, linkHeader } = await ghFetch(firstUrl);
  const lastPageUrl = parseLastPage(linkHeader);

  let oldest;
  if (!lastPageUrl) {
    oldest = firstPage[0]; // single page = single commit = the oldest one
  } else {
    const { json: lastPage } = await ghFetch(lastPageUrl);
    oldest = lastPage[0];
  }

  const result = oldest
    ? { path, sha: oldest.sha, date: oldest.commit.author.date, message: oldest.commit.message.split('\n')[0] }
    : { path, sha: null, date: null, message: '(no commits found for this path — may not exist / renamed)' };

  cache[path] = result;
  saveCache(cache);
  return result;
}

async function main() {
  const cache = loadCache();
  const results = { control_files: [], candidate_files: [], errors: [] };

  console.error(`Fetching real introduction dates from the GitHub API (2 requests/path, cached to ${CACHE_PATH.replace(ROOT, '')})...\n`);

  for (const f of CONTROL_FILES) {
    try {
      const r = await firstCommitFor(f, cache);
      results.control_files.push(r);
      console.error(`  [control]    ${f} -> ${r.date}`);
    } catch (e) {
      results.errors.push({ path: f, error: String(e.message) });
      console.error(`  [ERROR] ${f}: ${e.message}`);
    }
  }

  for (const f of CANDIDATE_FILES) {
    try {
      const r = await firstCommitFor(f, cache);
      results.candidate_files.push(r);
      console.error(`  [candidate]  ${f} -> ${r.date}`);
    } catch (e) {
      results.errors.push({ path: f, error: String(e.message) });
      console.error(`  [ERROR] ${f}: ${e.message}`);
    }
  }

  const earliestControlDate = results.control_files
    .filter((c) => c.date)
    .map((c) => c.date)
    .sort()[0];

  const postdatesControl = results.candidate_files.filter((c) => c.date && earliestControlDate && c.date > earliestControlDate);
  const predatesControl = results.candidate_files.filter((c) => c.date && earliestControlDate && c.date <= earliestControlDate);

  const verdict = {
    tool: 'chronological-orphans',
    checked_at: new Date().toISOString(),
    earliest_shared_cors_control_date: earliestControlDate,
    control_files: results.control_files,
    candidate_files_postdating_control: postdatesControl,
    candidate_files_predating_control: predatesControl,
    errors: results.errors,
    verdict: postdatesControl.length === 0 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
    verdict_note: postdatesControl.length === 0
      ? `All ${results.candidate_files.length} candidate files were created ON OR BEFORE the earliest shared CORS control file (${earliestControlDate}) — consistent with historical files that simply predate the centralized helper, not an ongoing pattern of new code bypassing an existing control.`
      : `${postdatesControl.length} of ${results.candidate_files.length} candidate file(s) were created AFTER the shared CORS control already existed (${earliestControlDate}) — new code kept bypassing an already-existing control. Needs manual read of each to determine if this is intentional (per-file justification) or a genuine chronological blind spot.`,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'chronological-orphans-report.json'), JSON.stringify(verdict, null, 2));

  console.log('\n' + JSON.stringify({
    earliest_control_date: earliestControlDate,
    postdating_count: postdatesControl.length,
    predating_count: predatesControl.length,
    verdict: verdict.verdict,
  }, null, 2));
  console.log(`\n${verdict.verdict_note}`);

  if (postdatesControl.length > 0) {
    console.log('\nFiles created AFTER the shared control existed:');
    for (const f of postdatesControl) console.log(`  ${f.path} — created ${f.date} ("${f.message}")`);
  }
}

main().catch((e) => {
  console.error('chronological-orphans FAILED:', e.message);
  console.error('This is honest: a partial cache (if any calls succeeded before the failure) is saved and reusable on retry.');
  process.exit(2);
});
