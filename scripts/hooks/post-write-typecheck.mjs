#!/usr/bin/env node
/**
 * Post-Write TypeCheck Hook
 * Quick validation of TypeScript changes
 *
 * This hook runs a fast type check on TypeScript files after writes.
 * It's designed to be fast and non-blocking.
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { extname } from 'node:path';

function main() {
  let context;

  try {
    const stdin = readFileSync(0, 'utf-8');
    if (!stdin.trim()) {
      process.exit(0);
    }

    context = JSON.parse(stdin);
  } catch (err) {
    process.exit(0);
  }

  const filePath = context?.file_path || context?.path || '';

  if (!filePath) {
    process.exit(0);
  }

  const ext = extname(filePath);

  // Only run for TypeScript files in src/
  if (!['.ts', '.tsx'].includes(ext) || !filePath.startsWith('src/')) {
    process.exit(0);
  }

  try {
    // Incremental type check - faster than full project check
    execSync('npx tsc --noEmit --incremental', {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 10000, // 10 second timeout
    });
  } catch (err) {
    // Type check failed, but we don't block Cascade
    // The user will see this in the full typecheck
    process.exit(0);
  }

  process.exit(0);
}

main();
