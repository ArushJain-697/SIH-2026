#!/usr/bin/env node
/**
 * The safe HTTP probe — build-map-advanced ticket #A3 (SAFETY, non-negotiable).
 *
 * This is the ONLY sanctioned way any dynamic scanner or reproduction in
 * this project makes a network request. It is not a policy that hopes to be
 * followed — it is a runtime guarantee enforced in code:
 *
 *   1. HOST ALLOWLIST: any URL whose hostname is not exactly localhost,
 *      127.0.0.1, or ::1 throws HostNotAllowedError before any network call
 *      is attempted. There is no bypass flag. See docs/ROE.md.
 *   2. RATE LIMIT: a global token-bucket caps outbound requests (default
 *      5/s) so even local traffic never looks like abuse, and a runaway
 *      fuzz loop cannot hammer the local instance.
 *   3. EVIDENCE CAPTURE: every call is recorded as a HAR-like JSON record
 *      (method, url, request/response headers, status, truncated body,
 *      timing) — callers can persist it straight into a finding's
 *      evidence/ directory via captureToEvidence().
 *   4. BENIGN PAYLOADS ONLY: BENIGN_MARKERS below is the fixed, reviewed
 *      set of safe probe payloads (DOM markers, encoding edge cases, no
 *      weaponized strings) — scanners import from here, they do not invent
 *      their own payloads.
 *
 * A lint (tests/lint_no_raw_fetch.mjs) fails the build if engine/scanners/
 * calls fetch() directly instead of going through this module.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export class HostNotAllowedError extends Error {
  constructor(host) {
    super(`safe-http: refused to contact host "${host}" — only ${[...ALLOWED_HOSTS].join(', ')} are permitted. See docs/ROE.md. This is not a bypassable warning.`);
    this.name = 'HostNotAllowedError';
    this.host = host;
  }
}

// --- Benign, reviewed probe payloads. Never a weaponized string. ---
export const BENIGN_MARKERS = {
  domMarker: '<img src=x onerror="console.log(\'SIH26163-BENIGN-MARKER\')">',
  jsMarker: "console.log(document.domain)",
  oversizedString: 'A'.repeat(10000),
  encodedIpDecimal: '2130706433', // 127.0.0.1 as a decimal integer — encoding-edge-case probe
  encodedIpOctal: '0177.0.0.1',
  encodedIpHex: '0x7f000001',
  unicodeInvisible: 'test​zero-width-space',
  sqlBenignQuote: "O'Brien", // a benign apostrophe, not an injection payload
  boundedBurstCount: 8, // how many requests a "burst" test sends — bounded, never unbounded
};

// --- Global token-bucket rate limiter (shared across all callers in this process). ---
const RATE_LIMIT_PER_SEC = 5;
let tokens = RATE_LIMIT_PER_SEC;
let lastRefill = Date.now();

async function acquireToken() {
  for (;;) {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    if (elapsed > 0) {
      tokens = Math.min(RATE_LIMIT_PER_SEC, tokens + elapsed * RATE_LIMIT_PER_SEC);
      lastRefill = now;
    }
    if (tokens >= 1) { tokens -= 1; return; }
    await new Promise((r) => setTimeout(r, 1000 / RATE_LIMIT_PER_SEC));
  }
}

function assertAllowedHost(urlStr) {
  let url;
  try { url = new URL(urlStr); } catch { throw new Error(`safe-http: not a valid URL: ${urlStr}`); }
  const host = url.hostname;
  if (!ALLOWED_HOSTS.has(host)) throw new HostNotAllowedError(host);
  return url;
}

/**
 * The only sanctioned outbound request function in this codebase.
 * @param {string} urlStr - must resolve to localhost/127.0.0.1/::1
 * @param {RequestInit} [options]
 * @returns {Promise<{record: object, response: Response, bodyText: string}>}
 */
export async function safeFetch(urlStr, options = {}) {
  assertAllowedHost(urlStr);
  await acquireToken();

  const startedAt = Date.now();
  const reqHeaders = options.headers || {};
  let response, bodyText, error;
  try {
    response = await fetch(urlStr, options);
    bodyText = await response.text();
  } catch (e) {
    error = String(e.message || e);
  }
  const durationMs = Date.now() - startedAt;

  const record = {
    timestamp: new Date(startedAt).toISOString(),
    method: options.method || 'GET',
    url: urlStr,
    request_headers: reqHeaders,
    request_body: options.body ? String(options.body).slice(0, 2000) : undefined,
    status: response ? response.status : null,
    response_headers: response ? Object.fromEntries(response.headers.entries()) : {},
    response_body_truncated: bodyText ? bodyText.slice(0, 4000) : undefined,
    response_body_bytes: bodyText ? bodyText.length : 0,
    duration_ms: durationMs,
    error,
  };

  if (error) throw Object.assign(new Error(`safe-http: request to ${urlStr} failed: ${error}`), { record });

  return { record, response, bodyText };
}

/**
 * Bounded burst helper — sends `count` requests (capped by
 * BENIGN_MARKERS.boundedBurstCount unless explicitly raised) and returns all
 * captured records. Used by rate-limit / Denial-of-Wallet dynamic checks so
 * the burst size is always deliberate and visible, never unbounded.
 */
export async function boundedBurst(urlStr, options = {}, count = BENIGN_MARKERS.boundedBurstCount) {
  const records = [];
  for (let i = 0; i < count; i++) {
    try {
      const { record } = await safeFetch(urlStr, options);
      records.push(record);
    } catch (e) {
      records.push(e.record || { error: String(e) });
    }
  }
  return records;
}

/** Persist a captured record (or array of records) into a finding's evidence directory. */
export function captureToEvidence(evidenceDir, filename, recordOrRecords) {
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, filename), JSON.stringify(recordOrRecords, null, 2));
}

export { ALLOWED_HOSTS };
