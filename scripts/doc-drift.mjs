#!/usr/bin/env node
import { execSync } from 'node:child_process';

const allow = (process.env.ALLOW_DOCS_DRIFT ?? '').toLowerCase();
if (allow === '1' || allow === 'true') {
  console.log('[doc-drift] Drift checks disabled via ALLOW_DOCS_DRIFT');
  process.exit(0);
}

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

function determineBaseRef() {
  const candidate = process.env.DOCS_DRIFT_BASE || process.env.GITHUB_BASE_REF || 'origin/main';
  try {
    const base = run(`git merge-base HEAD ${candidate}`);
    if (base) return base;
  } catch (error) {
    console.warn(`[doc-drift] Unable to resolve merge-base against ${candidate}: ${error.message}`);
  }
  try {
    return run('git rev-parse HEAD^');
  } catch {
    return '';
  }
}

function collectChangedFiles(range) {
  const diffTarget = range ? `${range}...HEAD` : '';
  try {
    const output = run(`git diff --name-only ${diffTarget}`.trim());
    if (!output) return [];
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.warn(`[doc-drift] Failed to read git diff: ${error.message}`);
    return [];
  }
}

const base = determineBaseRef();
const changedFiles = collectChangedFiles(base);

if (!changedFiles.length) {
  console.log('[doc-drift] No changes detected, skipping drift enforcement.');
  process.exit(0);
}

const docMatchers = [/^docs\//, /README\.md$/i, /CHANGELOG\.md$/i, /^openapi\.ya?ml$/i];
const codeMatchers = [
  /^src\//,
  /^apps?\//,
  /^packages?\//,
  /^scripts\//,
  /^migrations?\//,
  /^config\//,
  /\.([tj]sx?|astro|vue|svelte|css|scss|less|json)$/,
];

const docChanges = changedFiles.filter((file) => docMatchers.some((regex) => regex.test(file)));
const codeChanges = changedFiles.filter((file) => codeMatchers.some((regex) => regex.test(file)));

if (codeChanges.length && !docChanges.length) {
  console.error('[doc-drift] Code changes detected without accompanying documentation updates.');
  console.error('Changed code files:');
  for (const file of codeChanges) {
    console.error(`  - ${file}`);
  }
  console.error(
    'Add documentation updates (docs/, README, CHANGELOG, or OpenAPI) or set ALLOW_DOCS_DRIFT=true to override.'
  );
  process.exit(1);
}

console.log('[doc-drift] Documentation coverage verified.');
