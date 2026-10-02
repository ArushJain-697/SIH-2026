#!/usr/bin/env node
/**
 * Live endpoint inventory — build-map-advanced ticket #A2 (CORE, Phase A).
 *
 * Merges FOUR real sources from the live-cloned target into one canonical
 * engine/inventory/endpoints.json — the single list every Phase C scanner
 * iterates, so no scanner invents its own partial view of "what endpoints
 * exist":
 *
 *   1. docs/api/*.openapi.json  — every proto-generated gateway route +
 *      HTTP method (236+ routes across 38 real service specs).
 *   2. server/_shared/rate-limit.ts — the four rate-limit registries
 *      (same extraction method as framework/seam-linter/rate-limit-
 *      coverage-check.mjs, kept independent/self-contained here on purpose
 *      so this ticket stands alone and is testable without that tool).
 *   3. api/api-route-exceptions.json — top-level Vercel Edge Functions that
 *      don't come from a proto (129 real entries: path, category, reason,
 *      owner).
 *   4. src/shared/premium-paths.ts — PREMIUM_RPC_PATHS, extracted the SAME
 *      way the target's own codegen does it (a bare quoted-string regex —
 *      see that file's own comment warning about apostrophes in nearby
 *      prose corrupting the extraction; we inherit that same documented
 *      fragility rather than pretending a regex is more robust than it is).
 *
 * Usage: node engine/inventory/build-endpoints.mjs [srcDir]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/inventory');

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

// --- 1. Gateway routes from real OpenAPI JSON specs ---
function extractGatewayRoutes() {
  const dir = join(SRC, 'docs/api');
  const routes = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.openapi.json'))) {
    let doc;
    try { doc = JSON.parse(readFileSync(join(dir, file), 'utf8')); } catch { continue; }
    const serviceName = file.replace('.openapi.json', '');
    for (const [route, operations] of Object.entries(doc.paths || {})) {
      if (!route.startsWith('/api/') || typeof operations !== 'object') continue;
      const methods = Object.keys(operations).map((m) => m.toLowerCase()).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m));
      const existing = routes.get(route) || { methods: new Set(), services: new Set() };
      for (const m of methods) existing.methods.add(m);
      existing.services.add(serviceName);
      routes.set(route, existing);
    }
  }
  return routes;
}

// --- 2. Rate-limit registries (self-contained extraction, mirrors rate-limit-coverage-check.mjs) ---
function extractRegistryKeys(source, exportName) {
  const startMarker = `export const ${exportName}`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return [];
  const rest = source.slice(startIdx + startMarker.length);
  const nextExportIdx = rest.search(/\nexport const /);
  const block = nextExportIdx === -1 ? rest : rest.slice(0, nextExportIdx);
  const keys = [];
  const keyRe = /'(\/api\/[^']+)'\s*:/g;
  let m;
  while ((m = keyRe.exec(block))) keys.push(m[1]);
  return keys;
}

// --- 3. Edge-function exceptions ---
function extractEdgeExceptions() {
  const p = join(SRC, 'api/api-route-exceptions.json');
  if (!existsSync(p)) return [];
  const doc = JSON.parse(readFileSync(p, 'utf8'));
  return Array.isArray(doc.exceptions) ? doc.exceptions : Array.isArray(doc) ? doc : [];
}

// --- 4. Premium-gated RPC paths ---
function extractPremiumPaths() {
  const p = join(SRC, 'src/shared/premium-paths.ts');
  if (!existsSync(p)) return [];
  const src = readFileSync(p, 'utf8');
  const startIdx = src.indexOf('PREMIUM_RPC_PATHS');
  if (startIdx === -1) return [];
  const block = src.slice(startIdx, startIdx + 4000);
  const paths = [];
  const re = /'(\/api\/[^']+)'/g;
  let m;
  while ((m = re.exec(block))) paths.push(m[1]);
  return paths;
}

function main() {
  const commit = gitCommit(SRC);
  const gatewayRoutes = extractGatewayRoutes();
  const rlSource = readFileSync(join(SRC, 'server/_shared/rate-limit.ts'), 'utf8');
  const endpointPolicies = new Set(extractRegistryKeys(rlSource, 'ENDPOINT_RATE_POLICIES'));
  const failClosedRequired = new Set(extractRegistryKeys(rlSource, 'FAIL_CLOSED_ENDPOINT_RATE_POLICY_REQUIRED'));
  const globalFallbackRead = new Set(extractRegistryKeys(rlSource, 'GLOBAL_RATE_LIMIT_FALLBACK_READ_ROUTES'));
  const mutationExempt = new Set(extractRegistryKeys(rlSource, 'RATE_LIMIT_MUTATION_FALLBACK_EXEMPT'));
  const edgeExceptions = extractEdgeExceptions();
  const edgeExceptionMap = new Map(edgeExceptions.map((e) => {
    const urlPath = '/' + String(e.path).replace(/\.(ts|js|tsx|jsx|mjs|cjs)$/i, '');
    return [urlPath, e];
  }));
  const premiumPaths = new Set(extractPremiumPaths());

  const endpoints = [];
  for (const [route, meta] of gatewayRoutes) {
    endpoints.push({
      path: route,
      methods: [...meta.methods].sort(),
      services: [...meta.services],
      source: 'gateway',
      rate_limit: {
        has_endpoint_policy: endpointPolicies.has(route),
        fail_closed_required: failClosedRequired.has(route),
        global_fallback_read: globalFallbackRead.has(route),
        mutation_fallback_exempt: mutationExempt.has(route),
      },
      premium_gated: premiumPaths.has(route),
      edge_function_exception: null,
    });
  }
  for (const [urlPath, exc] of edgeExceptionMap) {
    if (gatewayRoutes.has(urlPath)) continue; // already covered above
    endpoints.push({
      path: urlPath,
      // Edge functions aren't proto-generated, so we have no independent
      // source for their real HTTP method(s) the way gateway routes have
      // (their OpenAPI spec). methods: [] (not a guessed 'unknown' string)
      // so this class is honestly excluded from GET/non-GET-derived stats
      // below, rather than silently miscounted as non-GET.
      methods: [],
      services: [],
      source: 'edge-function-exception',
      rate_limit: {
        has_endpoint_policy: endpointPolicies.has(urlPath),
        fail_closed_required: failClosedRequired.has(urlPath),
        global_fallback_read: globalFallbackRead.has(urlPath),
        mutation_fallback_exempt: mutationExempt.has(urlPath),
      },
      premium_gated: premiumPaths.has(urlPath),
      edge_function_exception: { category: exc.category, reason: exc.reason, owner: exc.owner },
    });
  }
  endpoints.sort((a, b) => a.path.localeCompare(b.path));

  // Non-GET is only meaningful where we actually know the method(s) — i.e.
  // gateway routes. Edge-function exceptions (methods: []) are excluded
  // rather than guessed at, so this reproduces WM-003's real 18/236 exactly.
  const gatewayEndpoints = endpoints.filter((e) => e.source === 'gateway');
  const edgeEndpoints = endpoints.filter((e) => e.source === 'edge-function-exception');
  const nonGetGateway = gatewayEndpoints.filter((e) => e.methods.some((m) => m !== 'get'));
  const premiumCount = endpoints.filter((e) => e.premium_gated).length;
  // "At risk" = a route whose method profile REQUIRES triage (non-GET
  // gateway routes only, per the target's own #4676 guardrail — see
  // findings/WM-003) and has none of the three registry entries.
  const nonGetGatewayUncovered = nonGetGateway.filter(
    (e) => !e.rate_limit.has_endpoint_policy && !e.rate_limit.mutation_fallback_exempt,
  );
  const edgeExceptionsWithNoPolicyAtAll = edgeEndpoints.filter(
    (e) => !e.rate_limit.has_endpoint_policy && !e.rate_limit.global_fallback_read && !e.rate_limit.mutation_fallback_exempt,
  );

  const inventory = {
    tool: 'build-endpoints',
    target_commit: commit,
    built_at: new Date().toISOString(),
    stats: {
      total_endpoints: endpoints.length,
      gateway_routes: gatewayRoutes.size,
      edge_function_exceptions_total: edgeExceptions.length,
      edge_function_exceptions_not_in_gateway: edgeEndpoints.length,
      non_get_gateway_routes: nonGetGateway.length,
      non_get_gateway_routes_uncovered: nonGetGatewayUncovered.length,
      premium_gated_endpoints: premiumCount,
      edge_exceptions_with_no_rate_limit_registry_entry_at_all: edgeExceptionsWithNoPolicyAtAll.length,
      note: 'non_get_gateway_routes_uncovered should read 0, matching findings/WM-003 (independently re-derived from a different data source: .openapi.json here vs regex-over-TS there). edge_exceptions_with_no_rate_limit_registry_entry_at_all counts edge functions with NEITHER an explicit policy NOR an explicit exemption/fallback decision - these are NOT necessarily gaps (many are GET-only reads that never needed a registry entry at all; method is unknown for this class, see the methods:[] comment above), so this number needs a manual read before any claim, unlike non_get_gateway_routes_uncovered which is a real, method-verified guardrail check.',
    },
    endpoints,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'endpoints.json'), JSON.stringify(inventory, null, 2));

  console.log(JSON.stringify(inventory.stats, null, 2));
  console.log(`\nbuild-endpoints: wrote engine/inventory/endpoints.json (${endpoints.length} total endpoints at commit ${commit})`);
}

main();
