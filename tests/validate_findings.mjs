#!/usr/bin/env node
/**
 * Runs every findings/WM-0XX/finding.json through finding-rules.mjs and
 * cross-checks status against register/advisories.json.
 *
 * Usage: node tests/validate_findings.mjs
 * Exit code: 0 = all valid, 1 = any invalid (or zero findings — that's not
 * an error by itself, but is reported so it's never silently "passing").
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validateFinding } from '../framework/schema/finding-rules.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const FINDINGS_DIR = join(ROOT, 'findings');
const REGISTER_PATH = join(ROOT, 'register/advisories.json');

function main() {
  const register = JSON.parse(readFileSync(REGISTER_PATH, 'utf8'));
  const registerIds = new Set(register.advisories.map((a) => a.id));

  if (!existsSync(FINDINGS_DIR)) {
    console.log('validate_findings: findings/ does not exist yet — nothing to validate');
    process.exit(0);
  }

  const dirs = readdirSync(FINDINGS_DIR).filter((name) => {
    const full = join(FINDINGS_DIR, name);
    return statSync(full).isDirectory();
  });

  if (dirs.length === 0) {
    console.log('validate_findings: no finding directories yet — nothing to validate');
    process.exit(0);
  }

  let failures = 0;
  const summary = [];

  for (const dir of dirs.sort()) {
    const jsonPath = join(FINDINGS_DIR, dir, 'finding.json');
    if (!existsSync(jsonPath)) {
      console.error(`FAIL  ${dir}: no finding.json`);
      failures++;
      continue;
    }
    let finding;
    try {
      finding = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.error(`FAIL  ${dir}: invalid JSON — ${e.message}`);
      failures++;
      continue;
    }
    const { valid, errors } = validateFinding(finding, { registerIds });
    if (valid) {
      console.log(`PASS  ${dir}  [${finding.status}]  ${finding.title}`);
      summary.push({ id: finding.id, status: finding.status, title: finding.title });
    } else {
      failures++;
      console.error(`FAIL  ${dir}:`);
      for (const err of errors) console.error(`        - ${err}`);
    }

    // reproduce_script must actually exist and be non-empty, if declared
    if (finding.reproduce_script) {
      const scriptPath = join(ROOT, finding.reproduce_script);
      if (!existsSync(scriptPath)) {
        console.error(`FAIL  ${dir}: reproduce_script "${finding.reproduce_script}" does not exist`);
        failures++;
      }
    }
  }

  console.log('---');
  console.log(`validate_findings: ${dirs.length} finding(s) checked, ${failures} failure(s)`);
  if (failures === 0) {
    console.log('status breakdown:', JSON.stringify(
      summary.reduce((acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {}),
    ));
  }
  process.exit(failures === 0 ? 0 : 1);
}

main();
