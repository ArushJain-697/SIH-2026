#!/usr/bin/env node
/**
 * EPSS (Exploit Prediction Scoring System) client — build-map-advanced
 * ticket #B2. Queries the public, keyless FIRST.org EPSS API
 * (api.first.org/data/v1/epss) for a CVE's real exploitation-probability
 * and percentile — this is exactly the second half of CERT-In's dual
 * CVSS+EPSS audit mandate (verified real in the bible/research phase).
 *
 * EPSS is strictly per-CVE. A finding that only cites a GHSA (no CVE
 * assigned) has no EPSS score by definition — this module returns an
 * honest "not_applicable" record for that case rather than inventing a
 * number, which is the correct, defensible behavior per docs/LANDMINES.md's
 * anti-fabrication discipline.
 *
 * Usage: node engine/core/epss.mjs CVE-2021-44228
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE_DIR = join(ROOT, '.cache/epss');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — EPSS updates daily

function cachePath(cve) {
  return join(CACHE_DIR, `${cve}.json`);
}

function readCache(cve) {
  const p = cachePath(cve);
  if (!existsSync(p)) return null;
  try {
    const rec = JSON.parse(readFileSync(p, 'utf8'));
    if (Date.now() - rec.fetched_at_ms < CACHE_TTL_MS) return rec;
  } catch { /* corrupt cache entry — refetch */ }
  return null;
}

function writeCache(cve, rec) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(cve), JSON.stringify(rec, null, 2));
}

/**
 * @param {string|null} cve - a real CVE id, or null/undefined if this
 *   finding has no assigned CVE (e.g. it only cites a GHSA).
 * @returns {Promise<{status: 'scored'|'not_applicable'|'unavailable', cve: string|null, epss: number|null, percentile: number|null, date: string|null, note: string, source: 'live'|'cache'|null}>}
 */
export async function getEpss(cve) {
  if (!cve) {
    return {
      status: 'not_applicable', cve: null, epss: null, percentile: null, date: null,
      note: 'No CVE is assigned to this finding (it cites a GHSA advisory, not a CVE). EPSS is a per-CVE exploitation-probability score and does not apply directly. Likelihood is reasoned qualitatively in the finding instead, per CERT-In\'s dual CVSS+EPSS guidance.',
      source: null,
    };
  }

  const cached = readCache(cve);
  if (cached) return { ...cached, source: 'cache' };

  try {
    const res = await fetch(`https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`, {
      headers: { 'User-Agent': 'sih26163-worldmonitor-assessment' },
    });
    if (!res.ok) throw new Error(`EPSS API HTTP ${res.status}`);
    const body = await res.json();
    const row = body.data?.[0];
    if (!row) {
      const rec = {
        status: 'unavailable', cve, epss: null, percentile: null, date: null,
        note: `EPSS has no record for ${cve} (possibly too new, or not a scored CVE). Reasoned qualitatively instead.`,
        fetched_at_ms: Date.now(),
      };
      writeCache(cve, rec);
      return { ...rec, source: 'live' };
    }
    const rec = {
      status: 'scored', cve,
      epss: Number(row.epss), percentile: Number(row.percentile), date: row.date,
      note: `Live EPSS score from api.first.org, fetched ${new Date().toISOString()}.`,
      fetched_at_ms: Date.now(),
    };
    writeCache(cve, rec);
    return { ...rec, source: 'live' };
  } catch (e) {
    // Honest offline fallback — never fabricate a number.
    return {
      status: 'unavailable', cve, epss: null, percentile: null, date: null,
      note: `EPSS API unreachable (${e.message}). Reasoned qualitatively instead of showing a fabricated number — see the finding's own likelihood discussion.`,
      source: null,
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cve = process.argv[2];
  if (!cve) { console.error('Usage: node epss.mjs CVE-XXXX-XXXXX'); process.exit(1); }
  const r = await getEpss(cve);
  console.log(JSON.stringify(r, null, 2));
}
