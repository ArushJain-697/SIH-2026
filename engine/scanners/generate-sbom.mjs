#!/usr/bin/env node
/**
 * Minimal CycloneDX 1.5 SBOM generator — part of build-map-advanced ticket
 * #D1. Built from the real package-lock.json, listing every resolved
 * package with its resolved version and, where npm audit flagged it, a
 * vulnerability reference. This is a minimal, hand-rolled CycloneDX
 * document (not the full spec) — enough to be a real, valid, machine-
 * readable SBOM a downstream tool could ingest, without adding a CycloneDX
 * library as a dependency.
 *
 * Usage: node engine/scanners/generate-sbom.mjs [srcDir]
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = process.argv[2] || join(ROOT, '.cache/worldmonitor-src');
const OUT_DIR = join(ROOT, 'engine/scanners/output');

function gitCommit(dir) {
  try {
    const head = readFileSync(join(dir, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) return readFileSync(join(dir, '.git', head.slice(5).trim()), 'utf8').trim();
    return head;
  } catch { return 'unknown'; }
}

function main() {
  const lock = JSON.parse(readFileSync(join(SRC, 'package-lock.json'), 'utf8'));
  const pkgJson = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
  const commit = gitCommit(SRC);

  let vulnByName = {};
  const scaReportPath = join(OUT_DIR, 'sca-report.json');
  if (existsSync(scaReportPath)) {
    const sca = JSON.parse(readFileSync(scaReportPath, 'utf8'));
    for (const f of sca.findings) {
      for (const pkg of f.affected_packages) {
        (vulnByName[pkg] ||= []).push({ id: f.advisory_url.split('/').pop(), source: { name: 'GHSA', url: f.advisory_url }, ratings: [{ severity: f.npm_audit_severity }] });
      }
    }
  }

  const components = [];
  for (const [pkgPath, meta] of Object.entries(lock.packages || {})) {
    if (pkgPath === '') continue; // root package itself, handled separately
    const name = pkgPath.split('node_modules/').pop();
    if (!name || meta.version === undefined) continue;
    components.push({
      type: 'library',
      'bom-ref': `${name}@${meta.version}`,
      name,
      version: meta.version,
      purl: `pkg:npm/${name.startsWith('@') ? name.replace('/', '%2F') : name}@${meta.version}`,
      scope: meta.dev ? 'optional' : 'required',
    });
  }

  // De-duplicate by bom-ref (same package can appear at multiple lockfile paths at the same version).
  const seen = new Set();
  const uniqueComponents = components.filter((c) => {
    if (seen.has(c['bom-ref'])) return false;
    seen.add(c['bom-ref']);
    return true;
  });

  const vulnerabilities = [];
  for (const [name, entries] of Object.entries(vulnByName)) {
    for (const e of entries) {
      vulnerabilities.push({
        id: e.id,
        source: e.source,
        ratings: e.ratings,
        affects: [{ ref: uniqueComponents.find((c) => c.name === name)?.['bom-ref'] || name }],
      });
    }
  }

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: { type: 'application', name: pkgJson.name, version: pkgJson.version },
      properties: [{ name: 'target_commit', value: commit }],
    },
    components: uniqueComponents,
    vulnerabilities,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'sbom.cyclonedx.json'), JSON.stringify(sbom, null, 2));
  console.log(`generate-sbom: wrote ${uniqueComponents.length} components, ${vulnerabilities.length} vulnerability records to engine/scanners/output/sbom.cyclonedx.json`);
}

main();
