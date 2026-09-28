#!/usr/bin/env node
/**
 * Landmine scanner — build-map ticket #2/#31 (SAFETY).
 *
 * Scans judge-facing deliverables for the fabricated/forbidden strings
 * catalogued in docs/LANDMINES.md. Zero hits is the pass condition.
 *
 * Scope is a WHITELIST, not a blacklist: the bible, build map, research
 * briefs, and progress.md intentionally QUOTE these strings to document and
 * warn about them (that's the whole point of docs/LANDMINES.md) — scanning
 * those would be false positives by design. Ticket #31 is explicit that the
 * real target is "the deck, report, README, and spoken script" — i.e. what a
 * judge actually sees. This file enforces exactly that scope.
 *
 * Usage: node tests/scan_landmines.mjs
 * Exit code: 0 = clean, 1 = landmine(s) found.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;

// Tier 1 — fabricated identifiers (never exist under any circumstance)
// Tier 2 — wrong-architecture strings (the real stack lives in docs/ground-truth.md)
// Tier 3 — wrong attributions / invented events
const FORBIDDEN = [
  { pattern: /GHSA-4f5g-9h8j-2k1l/i, why: 'fabricated GHSA id' },
  { pattern: /GHSA-m9n8-b7v6-c5x4/i, why: 'fabricated GHSA id' },
  { pattern: /GHSA-7v6c-5x4z-3a2s/i, why: 'fabricated GHSA id' },
  { pattern: /CVE-2025-29811/i, why: 'fabricated CVE (app has no GraphQL)' },
  { pattern: /\bSocket\.io\b/i, why: 'wrong architecture — target has no Socket.io' },
  { pattern: /\bApollo\s*Server\b/i, why: 'wrong architecture — target has no GraphQL/Apollo' },
  { pattern: /\bWinston\b/i, why: 'wrong architecture — not the target\'s logger' },
  { pattern: /\bLeaflet\.js\b/i, why: 'wrong architecture — target uses globe.gl/deck.gl, not Leaflet' },
  { pattern: /\bMapbox GL JS\b/i, why: 'wrong architecture — target uses MapLibre GL, not Mapbox' },
  { pattern: /\bPreact SPA\b/i, why: 'wrong architecture — target is vanilla TypeScript + Vite' },
  { pattern: /dangerouslySetInnerHTML/i, why: 'wrong architecture — no React in target' },
  { pattern: /src\/backend\/feedParser\.ts/i, why: 'fabricated file path' },
  { pattern: /src\/frontend\/components\/Map\.tsx/i, why: 'fabricated file path' },
  { pattern: /socketManager\.ts/i, why: 'fabricated file path' },
  { pattern: /rate-limit(ing)? race.{0,40}Winston/i, why: 'wrong Cody Richard attribution' },
  { pattern: /OpenAI.{0,20}AI[- ]worm.{0,20}(disclosure|Sept(ember)?\s*25,?\s*2026)/i, why: 'unverified OpenAI AI-worm claim — use Morris II (Cohen et al., 2024) instead' },
  { pattern: /news\.ycombinator\.com\/item\?id=39847291/i, why: 'invented HN citation' },
  { pattern: /pull\/(412|488|503|521|599|642|689|715)\b/i, why: 'invented WorldMonitor PR number' },
];

// WHITELIST — exactly the judge-facing surface named in build-map ticket #31.
// Add new deliverable paths here as they're created; do NOT add planning docs.
const SCAN_TARGETS = [
  'README.md',
  'findings',
  'report',
  'deck',
  'docs/ground-truth.md',
  'docs/coverage-matrix.md',
  'docs/proof-spine.md',
  'register/advisories.json',
];

const SKIP_DIRS = new Set(['.git', 'node_modules', '.claude', '.cache']);
const TEXT_EXT = new Set(['.md', '.json', '.mjs', '.js', '.ts', '.txt', '.yml', '.yaml']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

function collectFiles() {
  const files = [];
  for (const target of SCAN_TARGETS) {
    const full = join(ROOT, target);
    if (!existsSync(full)) continue; // not built yet (e.g. report/, deck/ pre-Phase 5/6) — fine
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function main() {
  const files = collectFiles();
  let hits = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const { pattern, why } of FORBIDDEN) {
      const m = text.match(pattern);
      if (m) {
        hits++;
        const rel = file.replace(ROOT, '');
        console.error(`LANDMINE  ${rel}: matched ${pattern} (${why}) — "${m[0]}"`);
      }
    }
  }

  if (hits === 0) {
    console.log(`scan_landmines: clean — ${files.length} judge-facing file(s) scanned, 0 hits`);
    console.log(`scan_landmines: scope = ${SCAN_TARGETS.join(', ')}`);
    process.exit(0);
  } else {
    console.error(`scan_landmines: FAILED — ${hits} landmine(s) found across ${files.length} judge-facing file(s)`);
    process.exit(1);
  }
}

main();
