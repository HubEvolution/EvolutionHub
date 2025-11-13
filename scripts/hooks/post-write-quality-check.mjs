#!/usr/bin/env node
/**
 * Post-Write Quality Check Hook
 * Automatically runs linting and formatting on changed files
 *
 * This hook is triggered after Cascade writes code.
 * Non-zero exit codes are logged but don't block the operation.
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { relative, extname } from 'node:path';

// File extensions that should be linted
const LINTABLE_EXTENSIONS = ['.ts', '.tsx', '.astro', '.js', '.mjs'];

// File extensions that should be formatted
const FORMATTABLE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.astro',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
];

function main() {
  let context;

  try {
    // Read context from stdin (Cascade provides this as JSON)
    const stdin = readFileSync(0, 'utf-8');
    if (!stdin.trim()) {
      // No input means this might be a test run or manual invocation
      process.exit(0);
    }

    context = JSON.parse(stdin);
  } catch (err) {
    // If we can't parse context, just exit gracefully
    process.exit(0);
  }

  // Extract file path from context
  const filePath = context?.file_path || context?.path || '';

  if (!filePath) {
    // No file path provided
    process.exit(0);
  }

  const ext = extname(filePath);
  const relativePath = relative(process.cwd(), filePath);

  console.log(`\n🔍 Quality Check: ${relativePath}`);

  let hasIssues = false;

  // Auto-format if applicable
  if (FORMATTABLE_EXTENSIONS.includes(ext)) {
    try {
      console.log('   ✓ Running Prettier...');
      execSync(`npx prettier --write "${filePath}"`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      console.log('   ✓ Formatted successfully');
    } catch (err) {
      console.warn('   ⚠️  Formatting warnings (non-critical)');
      hasIssues = true;
    }
  }

  // Run linting if applicable
  if (LINTABLE_EXTENSIONS.includes(ext) && filePath.startsWith('src/')) {
    try {
      console.log('   ✓ Running ESLint...');
      execSync(`npx eslint "${filePath}" --fix --cache --cache-location .cache/eslint`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      console.log('   ✓ Linting passed');
    } catch (err) {
      console.warn('   ⚠️  Linting issues detected:');
      if (err.stdout) console.warn(err.stdout);
      hasIssues = true;
    }
  }

  // Quick type check for TypeScript files
  if (['.ts', '.tsx'].includes(ext) && filePath.startsWith('src/')) {
    try {
      console.log('   ✓ Quick type check...');
      // Just check if tsc can parse the file (not a full project check)
      execSync(`npx tsc --noEmit --skipLibCheck "${filePath}"`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      console.log('   ✓ Type check passed');
    } catch (err) {
      console.warn('   ⚠️  Type check issues detected');
      console.warn('   💡 Run `npm run typecheck` for full validation');
      hasIssues = true;
    }
  }

  if (hasIssues) {
    console.log('\n💡 Tip: Run `npm run hygiene` for comprehensive validation\n');
  } else {
    console.log('   ✅ All checks passed!\n');
  }

  // Always succeed - we don't want to block Cascade
  process.exit(0);
}

main();
