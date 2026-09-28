#!/usr/bin/env node
/**
 * Seam-Linter — rate-limit coverage re-derivation. Build-map tickets #13/#14
 * (CORE, Phase 3). Bible §4 "the seam between a control and its exception".
 *
 * WHAT THIS DOES: independently re-derives the target's own systemic
 * guardrail from scripts/enforce-rate-limit-policies.mjs — "every generated
 * non-GET (mutation/spend) route must be either rate-limited or explicitly,
 * justified-ly exempt" — using our OWN parser against the REAL, live-cloned
 * source at the pinned commit. We deliberately do NOT import or execute
 * their script; we reimplement the check from its own documented intent
 * (read from its comments, quoted below) using a different data source
 * (the .openapi.json siblings of the .openapi.yaml files their script
 * reads) and a different extraction method (regex over the TS object
 * literals, not a dynamic `tsx` import). This independence is the point:
 * if two differently-built tools agree the guardrail holds, that is
 * stronger evidence than trusting the target's own CI a second time.
 *
 * WHY THIS IS THE SEAM THESIS IN CODE: the target's own script comment
 * documents a REAL historical seam bug it exists to prevent — "the
 * sanctions-entity-search review finding — the policy key was
 * `/api/sanctions/v1/lookup-entity` but the proto RPC generates path
 * `/api/sanctions/v1/lookup-sanction-entity`, so the 30/min limit never
 * applied and the endpoint fell through to the 600/min global limiter."
 * That is a rename-drift seam between a control (the policy registry) and
 * its real target (the generated route) — exactly the class this project's
 * thesis says an AI-assisted, CI-guarded codebase produces. We are not
 * inventing this pattern; the maintainer's own comment describes it.
 *
 * OUTPUT: a VERIFIED-SECURE control finding if the guardrail holds at the
 * pinned commit, or a CANDIDATE-UNCONFIRMED seam finding if it does not —
 * either way, real, reproducible, and honestly labelled.
 *
 * Usage: node framework/seam-linter/rate-limit-coverage-check.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OPENAPI_DIR = join(SRC, 'docs/api');
const RATE_LIMIT_TS = join(SRC, 'server/_shared/rate-limit.ts');

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(2);
}

if (!existsSync(SRC)) fail(`target source not found at ${SRC} — run: bash lab/fetch-target-source.sh`);
if (!existsSync(OPENAPI_DIR)) fail(`${OPENAPI_DIR} not found — target repo layout may have changed`);
if (!existsSync(RATE_LIMIT_TS)) fail(`${RATE_LIMIT_TS} not found — target repo layout may have changed`);

/** Parse every docs/api/*.openapi.json for {route: Set<method>} across the whole gateway. */
function extractGatewayRoutes() {
  const routes = new Map();
  const files = readdirSync(OPENAPI_DIR).filter((f) => f.endsWith('.openapi.json'));
  for (const file of files) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(join(OPENAPI_DIR, file), 'utf8'));
    } catch {
      continue; // malformed spec file — not our concern here, skip
    }
    const paths = doc?.paths || {};
    for (const [route, operations] of Object.entries(paths)) {
      if (!route.startsWith('/api/') || typeof operations !== 'object') continue;
      const methods = Object.keys(operations)
        .map((m) => m.toLowerCase())
        .filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m));
      const existing = routes.get(route) || new Set();
      for (const m of methods) existing.add(m);
      routes.set(route, existing);
    }
  }
  return { routes, fileCount: files.length };
}

/**
 * Extract the string keys ('/api/...': ...) of a named top-level exported
 * object literal, by slicing from `export const NAME` to the next top-level
 * `export const` (or end of file). Independent re-implementation, not a
 * TS-object dynamic import — a deliberate methodological difference from
 * the target's own script (see file header).
 */
function extractRegistryKeys(source, exportName) {
  const startMarker = `export const ${exportName}`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return null; // registry not found — reported by caller
  const rest = source.slice(startIdx + startMarker.length);
  const nextExportIdx = rest.search(/\nexport const /);
  const block = nextExportIdx === -1 ? rest : rest.slice(0, nextExportIdx);
  const keys = [];
  const keyRe = /'(\/api\/[^']+)'\s*:/g;
  let m;
  while ((m = keyRe.exec(block))) keys.push(m[1]);
  return keys;
}

/** Independent equivalent of the target's own failClosed:false escape-hatch grep. */
function findFailOpenOptOuts(srcDir) {
  const findings = [];
  const dirs = ['server', 'api'].map((d) => join(srcDir, d)).filter(existsSync);
  const exts = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx']);
  const optOutRe = /checkEndpointRateLimit\s*\([\s\S]*?\{[\s\S]*?failClosed\s*:\s*false[\s\S]*?\}\s*\)/g;

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next', 'dist', '.git'].includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const dot = entry.name.lastIndexOf('.');
      const ext = dot === -1 ? '' : entry.name.slice(dot);
      if (!exts.has(ext)) continue;
      const text = readFileSync(full, 'utf8');
      if (!text.includes('checkEndpointRateLimit') || !text.includes('failClosed')) continue;
      for (const m of text.matchAll(optOutRe)) {
        const line = text.slice(0, m.index).split('\n').length;
        findings.push(`${full.replace(srcDir + '/', '')}:${line}`);
      }
    }
  }
  for (const dir of dirs) walk(dir);
  return findings;
}

function main() {
  const rlSource = readFileSync(RATE_LIMIT_TS, 'utf8');
  const { routes: gatewayRoutes, fileCount } = extractGatewayRoutes();

  const endpointPolicies = extractRegistryKeys(rlSource, 'ENDPOINT_RATE_POLICIES');
  const failClosedRequired = extractRegistryKeys(rlSource, 'FAIL_CLOSED_ENDPOINT_RATE_POLICY_REQUIRED');
  const globalFallbackRead = extractRegistryKeys(rlSource, 'GLOBAL_RATE_LIMIT_FALLBACK_READ_ROUTES');
  const mutationExempt = extractRegistryKeys(rlSource, 'RATE_LIMIT_MUTATION_FALLBACK_EXEMPT');

  for (const [name, val] of Object.entries({ endpointPolicies, failClosedRequired, globalFallbackRead, mutationExempt })) {
    if (val === null) fail(`could not locate registry export "${name}" in ${RATE_LIMIT_TS} — target source has changed shape, re-verify this tool`);
  }

  const policySet = new Set(endpointPolicies);
  const exemptSet = new Set(mutationExempt);

  // Core guardrail: every generated non-GET route is covered or exempt.
  const nonGetRoutes = [];
  for (const [route, methods] of gatewayRoutes) {
    if ([...methods].some((m) => m !== 'get')) nonGetRoutes.push(route);
  }
  nonGetRoutes.sort();
  const uncovered = nonGetRoutes.filter((r) => !policySet.has(r) && !exemptSet.has(r));

  // Secondary check: every fail-closed-required route actually has a policy.
  const requiredWithoutPolicy = failClosedRequired.filter((k) => !policySet.has(k));

  // Tertiary check: the escape-hatch grep.
  const optOuts = findFailOpenOptOuts(SRC);

  const verdict = {
    tool: 'rate-limit-coverage-check',
    target_commit: gitCommit(SRC),
    checked_at: new Date().toISOString(),
    stats: {
      openapi_spec_files: fileCount,
      total_gateway_routes: gatewayRoutes.size,
      non_get_routes: nonGetRoutes.length,
      endpoint_policies: endpointPolicies.length,
      fail_closed_required: failClosedRequired.length,
      global_fallback_read_routes: globalFallbackRead.length,
      mutation_fallback_exempt: mutationExempt.length,
    },
    uncovered_non_get_routes: uncovered,
    fail_closed_required_missing_policy: requiredWithoutPolicy,
    fail_open_opt_outs_in_runtime_code: optOuts,
    verdict: (uncovered.length === 0 && requiredWithoutPolicy.length === 0 && optOuts.length === 0)
      ? 'VERIFIED-SECURE'
      : 'CANDIDATE-UNCONFIRMED',
  };

  console.log(JSON.stringify(verdict, null, 2));

  if (verdict.verdict === 'VERIFIED-SECURE') {
    console.error(`\n>>> independently re-derived guardrail HOLDS: all ${nonGetRoutes.length} non-GET routes across ${gatewayRoutes.size} gateway routes are triaged, ${requiredWithoutPolicy.length} fail-closed gaps, ${optOuts.length} fail-open opt-outs.`);
  } else {
    console.error(`\n>>> GAP FOUND: ${uncovered.length} uncovered non-GET route(s), ${requiredWithoutPolicy.length} fail-closed-required-without-policy, ${optOuts.length} fail-open opt-out(s) — candidate, needs manual confirmation before any claim.`);
  }

  return verdict;
}

function gitCommit(dir) {
  try {
    const head = readFileSync(join(dir, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) {
      const ref = head.slice(5).trim();
      return readFileSync(join(dir, '.git', ref), 'utf8').trim();
    }
    return head;
  } catch {
    return 'unknown';
  }
}

main();
