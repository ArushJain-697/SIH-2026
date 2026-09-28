#!/usr/bin/env node
/**
 * Enforces that engine/scanners/ never calls fetch() directly — every
 * outbound request must go through engine/probe/safe-http.mjs, which is the
 * only place the host-allowlist guarantee (tests/safe_http.test.mjs) lives.
 * A scanner that bypasses the probe bypasses the safety guarantee.
 *
 * Usage: node tests/lint_no_raw_fetch.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const SCANNERS_DIR = join(ROOT, 'engine/scanners');

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

function main() {
  const files = walk(SCANNERS_DIR);
  let violations = 0;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    // A bare `fetch(` not preceded by `safeFetch`/`boundedBurst`/a comment marker.
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (/\bawait\s+fetch\s*\(|[^.\w]fetch\s*\(/.test(line) && !/safeFetch|boundedBurst|\/\/\s*safe-http-exempt/.test(line)) {
        violations++;
        console.error(`RAW FETCH  ${f.replace(ROOT, '')}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  if (violations === 0) {
    console.log(`lint_no_raw_fetch: clean — ${files.length} scanner file(s), 0 raw fetch() calls`);
    process.exit(0);
  } else {
    console.error(`lint_no_raw_fetch: FAILED — ${violations} raw fetch() call(s) bypassing engine/probe/safe-http.mjs`);
    process.exit(1);
  }
}

main();
