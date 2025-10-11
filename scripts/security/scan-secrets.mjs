#!/usr/bin/env node
/*
 Simple secrets scanner to catch obvious leaks before push.
 Scans text files and skips common build/vendor dirs.
 Exits non-zero on findings and prints locations.
*/
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.wrangler',
  '.vite',
  '.cache',
  'playwright-report',
  'test-suite-v2/reports',
  'reports',
  '.types',
  'temp',
]);
const TEXT_EXTS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.astro',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.sh',
  '.mjs',
]);

// Patterns: Stripe, AWS-ish, generic API keys, bearer tokens
const PATTERNS = [
  { name: 'Stripe Live Key', re: /sk_live_[A-Za-z0-9]{20,}/ },
  { name: 'Stripe Test Key', re: /sk_test_[A-Za-z0-9]{20,}/ },
  { name: 'GitHub Token', re: /ghp_[A-Za-z0-9]{36,}/ },
  { name: 'AWS Access Key ID', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Google API Key', re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Bearer Token', re: /Bearer\s+[A-Za-z0-9\-_.=]{20,}/ },
  // Avoid flagging env placeholders like (hidden) or obvious non-secrets
];

/**
 * Recursively collect files.
 */
function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.DS_Store')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTS.has(ext)) yield full;
    }
  }
}

const findings = [];
for (const file of walk(ROOT)) {
  // Skip large files (>2MB)
  const stat = fs.statSync(file);
  if (stat.size > 2 * 1024 * 1024) continue;
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  // Skip files that are obviously generated artifacts
  if (/This file is generated|DO NOT EDIT/.test(content)) continue;
  for (const { name, re } of PATTERNS) {
    const matches = content.match(re);
    if (matches) {
      findings.push({ file: path.relative(ROOT, file), rule: name, sample: matches[0] });
    }
  }
}

if (findings.length) {
  console.error('[security:scan] Potential secrets found:');
  for (const f of findings) {
    console.error(`- [${f.rule}] ${f.file} -> ${f.sample.slice(0, 12)}…`);
  }
  console.error('\nTo proceed: remove or replace with env vars, then commit again.');
  process.exit(2);
}

console.log('[security:scan] OK — no obvious secrets detected.');
