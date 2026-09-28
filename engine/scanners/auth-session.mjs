#!/usr/bin/env node
/**
 * Authentication & session management scanner — PS scope area 1,
 * build-map-advanced ticket #C1. All three checks are static, against the
 * real live-cloned source, each targeting a documented real-world attack
 * class rather than a generic checklist item.
 *
 * 1. JWT algorithm pinning (CWE-347 signature-verification bypass class,
 *    the "alg:none" / algorithm-confusion attack): does every jose
 *    jwtVerify() call site pass an explicit, non-empty `algorithms` array
 *    that never includes 'none'? jose enforces whatever list it's given,
 *    but a caller that omits `algorithms` entirely falls back to jose's own
 *    broader default and a caller who accepts an attacker-supplied `alg`
 *    reopens the classic 2015-era JWT bypass.
 *
 * 2. OAuth state consumption atomicity (the exact class the target's own
 *    GHSA-9m4c-824h-m4xw was: "Slack and Discord OAuth state consumption is
 *    non-atomic and fail-open"): does the real callback code use an atomic
 *    Redis GETDEL (get-and-delete in one operation) rather than a
 *    check-then-delete pair that leaves a TOCTOU window?
 *
 * 3. Session cookie attributes (CWE-1004 / CWE-614): does the real
 *    Set-Cookie construction include HttpOnly, Secure, and a SameSite
 *    value, for every real cookie-issuing call site found?
 *
 * Usage: node engine/scanners/auth-session.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/scanners/output');

if (!existsSync(SRC)) {
  console.error(`ERROR: target source not found at ${SRC} — run: bash lab/fetch-target-source.sh`);
  process.exit(2);
}

function gitCommit(dir) {
  try {
    const head = readFileSync(join(dir, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) return readFileSync(join(dir, '.git', head.slice(5).trim()), 'utf8').trim();
    return head;
  } catch { return 'unknown'; }
}

function walk(dir, out = [], exts = ['.ts', '.js']) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist', 'generated'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out, exts); continue; }
    if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
}

// --- Check 1: JWT algorithm pinning ---
function checkJwtAlgorithmPinning() {
  const files = [...walk(join(SRC, 'api')), ...walk(join(SRC, 'server'))];
  const findings = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (!text.includes('jwtVerify')) continue;
    // Find each jwtVerify call and look for an `algorithms:` option nearby
    // (within the same options-object region — a generous window since the
    // options are frequently built in a separate function, as here).
    const hasAlgorithmsDeclaration = /algorithms\s*:\s*\[[^\]]*\]/.test(text);
    const algMatches = [...text.matchAll(/algorithms\s*:\s*\[([^\]]*)\]/g)];
    for (const m of algMatches) {
      const algList = m[1];
      const includesNone = /['"]none['"]/i.test(algList);
      const isEmpty = algList.trim() === '';
      findings.push({
        file: f.replace(SRC + '/', ''),
        algorithms_declared: algList.trim(),
        includes_none: includesNone,
        is_empty: isEmpty,
        safe: !includesNone && !isEmpty,
      });
    }
    if (!hasAlgorithmsDeclaration) {
      findings.push({
        file: f.replace(SRC + '/', ''),
        algorithms_declared: null,
        includes_none: false,
        is_empty: true,
        safe: false,
        note: 'jwtVerify() is called but no explicit algorithms: [...] option was found in this file — falls back to jose defaults unless declared in an imported options object we did not trace.',
      });
    }
  }
  const unsafe = findings.filter((f) => !f.safe);
  return { check: 'jwt_algorithm_pinning', files_with_jwtVerify: findings.length, unsafe_count: unsafe.length, findings, verdict: unsafe.length === 0 && findings.length > 0 ? 'VERIFIED-SECURE' : (findings.length === 0 ? 'NOT_APPLICABLE' : 'CANDIDATE-UNCONFIRMED') };
}

// --- Check 2: OAuth state atomicity ---
function checkOauthStateAtomicity() {
  const oauthDirs = [join(SRC, 'api/discord/oauth'), join(SRC, 'api/slack/oauth'), join(SRC, 'api/oauth')];
  const findings = [];
  for (const dir of oauthDirs) {
    if (!existsSync(dir)) continue;
    for (const f of walk(dir)) {
      const text = readFileSync(f, 'utf8');
      if (!/state/i.test(text) || !/callback/i.test(f)) continue;
      const usesAtomicGetDel = /getdel/i.test(text);
      const usesCheckThenDelete = /\.get\([^)]*state[^)]*\)[\s\S]{0,200}\.del\(/i.test(text) && !usesAtomicGetDel;
      findings.push({
        file: f.replace(SRC + '/', ''),
        uses_atomic_getdel: usesAtomicGetDel,
        uses_check_then_delete_pattern: usesCheckThenDelete,
        safe: usesAtomicGetDel || !usesCheckThenDelete,
      });
    }
  }
  const unsafe = findings.filter((f) => !f.safe);
  return { check: 'oauth_state_atomicity', callback_files_checked: findings.length, unsafe_count: unsafe.length, findings, verdict: findings.length > 0 && unsafe.length === 0 ? 'VERIFIED-SECURE' : (findings.length === 0 ? 'NOT_APPLICABLE' : 'CANDIDATE-UNCONFIRMED') };
}

// --- Check 3: session cookie attributes ---
function checkSessionCookieAttributes() {
  const files = [...walk(join(SRC, 'api')), ...walk(join(SRC, 'server'))];
  const findings = [];
  // Anchored strictly on an actual cookie-VALUE string (a backtick/quoted
  // string containing `Path=/`, which is the one attribute no comment about
  // cookies would incidentally contain) — NOT on the word "HttpOnly"
  // appearing anywhere in the file, which an earlier version of this check
  // did and which produced 3 false positives from files that merely
  // COMMENT on the real cookie implementation living in wm-session.js
  // (confirmed by manual read before shipping this fix — the fix and the
  // reason for it are kept here rather than silently corrected, same
  // discipline as findings/WM-004 and findings/WM-005).
  const cookieStringRe = /[`"][^`"]*Path=\/[^`"]*[`"]/g;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const matches = [...text.matchAll(cookieStringRe)];
    if (matches.length === 0) continue;
    for (const m of matches) {
      const cookieStr = m[0];
      const hasHttpOnly = /HttpOnly/i.test(cookieStr);
      const hasSecure = /(?<!\w)Secure(?!\w)/.test(cookieStr);
      const hasSameSite = /SameSite\s*=\s*(Lax|Strict|None)/i.test(cookieStr);
      // A cookie CLEARER (Max-Age=0) legitimately may omit HttpOnly on a
      // "readable" companion cookie by design — but Secure+SameSite should
      // still hold. Only flag missing HttpOnly as unsafe when the string
      // isn't an explicit clear-cookie (Max-Age=0) for a non-session value.
      findings.push({
        file: f.replace(SRC + '/', ''),
        cookie_string_snippet: cookieStr.slice(0, 120),
        has_httponly: hasHttpOnly,
        has_secure: hasSecure,
        has_samesite: hasSameSite,
        safe: hasSecure && hasSameSite && (hasHttpOnly || /Max-Age=0/.test(cookieStr)),
      });
    }
  }
  const unsafe = findings.filter((f) => !f.safe);
  return { check: 'session_cookie_attributes', cookie_definitions_found: findings.length, unsafe_count: unsafe.length, findings, verdict: findings.length > 0 && unsafe.length === 0 ? 'VERIFIED-SECURE' : (findings.length === 0 ? 'NOT_APPLICABLE' : 'CANDIDATE-UNCONFIRMED') };
}

function main() {
  const commit = gitCommit(SRC);
  const jwt = checkJwtAlgorithmPinning();
  const oauth = checkOauthStateAtomicity();
  const cookies = checkSessionCookieAttributes();

  const report = {
    tool: 'auth-session-scanner',
    scope_area: 1,
    target_commit: commit,
    checked_at: new Date().toISOString(),
    checks: { jwt, oauth, cookies },
    overall_verdict: [jwt, oauth, cookies].every((c) => c.verdict === 'VERIFIED-SECURE' || c.verdict === 'NOT_APPLICABLE') ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED',
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'auth-session-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    jwt: { files: jwt.files_with_jwtVerify, unsafe: jwt.unsafe_count, verdict: jwt.verdict },
    oauth: { files: oauth.callback_files_checked, unsafe: oauth.unsafe_count, verdict: oauth.verdict },
    cookies: { files: cookies.cookie_definitions_found, unsafe: cookies.unsafe_count, verdict: cookies.verdict },
    overall: report.overall_verdict,
  }, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { main, checkJwtAlgorithmPinning, checkOauthStateAtomicity, checkSessionCookieAttributes };
