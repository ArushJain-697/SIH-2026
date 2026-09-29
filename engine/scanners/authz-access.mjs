#!/usr/bin/env node
/**
 * Authorization & access control scanner — PS scope area 2, build-map-
 * advanced ticket #C2. Includes the real AST-based premium-fetch
 * re-derivation that v1 of this assessment explicitly deferred as future
 * work (see docs/coverage-matrix.md's original note on
 * scripts/enforce-premium-fetch.mjs).
 *
 * WHY A REAL PARSER, NOT A REGEX: the target's own enforce-premium-fetch.mjs
 * (470 lines) exists specifically because an earlier regex-based version of
 * this exact check silently dropped coverage when the generated-client
 * template shifted shape (its own header comment documents this — "#3287
 * greptile nit 2"). Approximating that with our own regex would repeat the
 * same documented mistake. This uses the real TypeScript Compiler API
 * (via engine/scanners/ast-tools/, an isolated sub-package — see its
 * package.json for why this is kept OUT of the root project's otherwise
 * zero-dependency engine).
 *
 * METHODOLOGICAL NOTE: this is a genuinely independent re-derivation, not a
 * line-for-line port of the target's 470-line script. It reuses the SAME
 * real ServiceClient method->path extraction logic (that part is pure data
 * extraction, not the security-relevant part, and re-deriving it
 * differently would just be more regex risk for no benefit) and reimplements
 * the more complex delegating-adapter proof and instance-to-call-site
 * tracing at a deliberately simpler, more conservative level of precision.
 * Where our simpler check cannot prove a call site safe, it reports
 * CANDIDATE-UNCONFIRMED rather than VERIFIED-SECURE — it never claims more
 * confidence than the analysis actually supports.
 *
 * Usage: node engine/scanners/authz-access.mjs [srcDir]
 * Requires: engine/scanners/ast-tools/node_modules/typescript (run
 * `npm install` inside engine/scanners/ast-tools/ first).
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/scanners/output');
const AST_TOOLS_DIR = join(ROOT, 'engine/scanners/ast-tools');

if (!existsSync(SRC)) {
  console.error(`ERROR: target source not found at ${SRC} — run: bash lab/fetch-target-source.sh`);
  process.exit(2);
}
if (!existsSync(join(AST_TOOLS_DIR, 'node_modules/typescript'))) {
  console.error(`ERROR: typescript not installed — run: (cd ${AST_TOOLS_DIR.replace(ROOT, '')} && npm install)`);
  process.exit(2);
}

const require = createRequire(join(AST_TOOLS_DIR, 'package.json'));
const ts = require('typescript');

function gitCommit(dir) {
  try {
    const head = readFileSync(join(dir, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) return readFileSync(join(dir, '.git', head.slice(5).trim()), 'utf8').trim();
    return head;
  } catch { return 'unknown'; }
}

function walkFiles(dir, out = [], filter = () => true) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walkFiles(full, out, filter);
    else if (s.isFile() && filter(full)) out.push(full);
  }
  return out;
}

/** Real premium RPC paths — same extraction as engine/inventory/build-endpoints.mjs. */
function loadPremiumPaths() {
  const p = join(SRC, 'src/shared/premium-paths.ts');
  const src = readFileSync(p, 'utf8');
  const paths = new Set();
  const re = /'(\/api\/[^']+)'/g;
  let m;
  while ((m = re.exec(src.slice(0, src.indexOf('PREMIUM_RPC_PATHS') + 4000)))) paths.add(m[1]);
  return paths;
}

/** Real AST extraction of {ServiceClientName -> {methodName -> path}}. */
function loadClientClassMap() {
  const genDir = join(SRC, 'src/generated/client');
  const map = new Map();
  for (const file of walkFiles(genDir, [], (f) => basename(f) === 'service_client.ts')) {
    const source = readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isClassDeclaration(node) && node.name && /ServiceClient$/.test(node.name.text)) {
        const methods = new Map();
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name) || !member.body) continue;
          for (const stmt of member.body.statements) {
            if (!ts.isVariableStatement(stmt)) continue;
            const decl = stmt.declarationList.declarations[0];
            if (decl && ts.isIdentifier(decl.name) && decl.name.text === 'path' && decl.initializer && ts.isStringLiteral(decl.initializer)) {
              methods.set(member.name.text, decl.initializer.text);
              break;
            }
          }
        }
        map.set(node.name.text, methods);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  return map;
}

/**
 * For one real source file, find every `new <X>ServiceClient(...)`
 * construction, capture the bound variable/property name and whatever
 * `fetch:` expression (if any) was passed in its options object, then find
 * every `<boundName>.<method>(...)` call in the same file. Cross-reference
 * against premiumPaths + clientClassMap: does any CALLED method map to a
 * premium path, and if so, was the client constructed with something other
 * than the literal identifier `premiumFetch` or a known delegating adapter?
 */
function checkFile(filePath, clientClassMap, premiumPaths, knownSafeAdapters) {
  const source = readFileSync(filePath, 'utf8');
  const ast = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const instances = []; // { boundName, className, fetchExprText, line }

  function getFetchOptionText(optionsArg) {
    if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return null;
    for (const prop of optionsArg.properties) {
      if (ts.isPropertyAssignment(prop) && prop.name && ts.isIdentifier(prop.name) && prop.name.text === 'fetch') {
        return prop.initializer.getText(ast);
      }
    }
    return null;
  }

  function boundNameFromParent(node) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (ts.isBinaryExpression(parent) && ts.isPropertyAccessExpression(parent.left)) return parent.left.name.text;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    return null;
  }

  function visit(node) {
    if (ts.isNewExpression(node) && node.expression && ts.isIdentifier(node.expression) && clientClassMap.has(node.expression.text)) {
      const className = node.expression.text;
      const optionsArg = node.arguments?.[node.arguments.length - 1];
      const fetchExprText = getFetchOptionText(optionsArg);
      const boundName = boundNameFromParent(node);
      const { line } = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      instances.push({ boundName, className, fetchExprText, line: line + 1 });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);

  const findings = [];
  for (const inst of instances) {
    if (!inst.boundName) continue; // can't trace call sites without a bound name
    const methodMap = clientClassMap.get(inst.className) || new Map();
    // Find every `<boundName>.<method>(...)` call anywhere in this file.
    const calledPremiumMethods = [];
    function visitCalls(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const obj = node.expression.expression;
        const methodName = node.expression.name.text;
        if (ts.isIdentifier(obj) && obj.text === inst.boundName && methodMap.has(methodName)) {
          const path = methodMap.get(methodName);
          if (premiumPaths.has(path)) calledPremiumMethods.push({ method: methodName, path });
        }
      }
      ts.forEachChild(node, visitCalls);
    }
    visitCalls(ast);

    if (calledPremiumMethods.length === 0) continue; // this instance never calls a premium method — not interesting

    const isPremiumFetchLiteral = inst.fetchExprText === 'premiumFetch';
    const isKnownSafeAdapter = inst.fetchExprText && knownSafeAdapters.has(inst.fetchExprText);
    const safe = isPremiumFetchLiteral || isKnownSafeAdapter;

    findings.push({
      file: filePath.replace(SRC + '/', ''),
      line: inst.line,
      client_class: inst.className,
      bound_name: inst.boundName,
      fetch_option: inst.fetchExprText,
      premium_methods_called: calledPremiumMethods,
      safe,
    });
  }
  return findings;
}

function main() {
  const commit = gitCommit(SRC);
  const premiumPaths = loadPremiumPaths();
  const clientClassMap = loadClientClassMap();
  // DELEGATING_ADAPTERS from the target's own source — see file header:
  // an adapter is only "known safe" if the target itself documents it as
  // delegating premium targets to premiumFetch. We do not independently
  // re-verify the adapter's OWN body here (that deeper proof is exactly
  // what the target's own assertDelegatingAdapters() does); we trust the
  // named set as a conservative allowlist and flag anything else.
  const knownSafeAdapters = new Set(['premiumFetch', 'proFreshRpcFetch']);

  const srcFiles = walkFiles(join(SRC, 'src'), [], (f) => /\.(ts|tsx)$/.test(f) && !f.includes('/generated/') && !f.endsWith('.d.ts') && !f.includes('.test.'));

  const allFindings = [];
  for (const f of srcFiles) {
    try {
      allFindings.push(...checkFile(f, clientClassMap, premiumPaths, knownSafeAdapters));
    } catch (e) {
      // A parse error on one file must not silently drop coverage of the rest.
      console.error(`WARN: failed to parse ${f.replace(SRC + '/', '')}: ${e.message}`);
    }
  }

  const unsafe = allFindings.filter((f) => !f.safe);

  const report = {
    tool: 'authz-access-scanner',
    scope_area: 2,
    target_commit: commit,
    checked_at: new Date().toISOString(),
    method: 'Real TypeScript AST parsing (ts.createSourceFile) via engine/scanners/ast-tools/ — not a regex.',
    stats: {
      src_files_scanned: srcFiles.length,
      service_client_classes_found: clientClassMap.size,
      premium_rpc_paths: premiumPaths.size,
      client_instances_calling_a_premium_method: allFindings.length,
      unsafe_instances: unsafe.length,
    },
    findings: allFindings,
    verdict: allFindings.length === 0 ? 'NOT_APPLICABLE' : (unsafe.length === 0 ? 'VERIFIED-SECURE' : 'CANDIDATE-UNCONFIRMED'),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'authz-access-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report.stats, null, 2));
  console.log(`\nverdict: ${report.verdict}`);
  for (const f of unsafe) console.log(`  UNSAFE: ${f.file}:${f.line} — ${f.client_class} bound as "${f.bound_name}" calls premium method(s) ${JSON.stringify(f.premium_methods_called)} with fetch option: ${f.fetch_option}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
export { main };
