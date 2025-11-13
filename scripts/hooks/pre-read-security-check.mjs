#!/usr/bin/env node
/**
 * Pre-Read Security Check Hook
 * Blocks access to sensitive files and enforces security policies
 *
 * This hook is triggered before Cascade reads code files.
 * Exit code 2 blocks the read operation.
 */

import { readFileSync } from 'node:fs';

// Sensitive files/patterns that should not be accessed
const SENSITIVE_PATTERNS = [
  /\.env(?:\.\w+)?$/, // .env files (all variants)
  /\.env\.local$/, // Local environment files
  /\.env\.production$/, // Production secrets
  /secrets\.json$/, // Secret files
  /private.*key$/i, // Private keys
  /\.pem$/, // Certificate files
  /\.pfx$/, // Certificate files
  /\.p12$/, // Certificate files
  /wrangler\.toml$/, // May contain secrets
  /\.npmrc$/, // May contain auth tokens
  /\.yarnrc\.yml$/, // May contain auth tokens
  /\.git\/config$/, // Git config with credentials
  /node_modules\//, // Don't read dependencies
  /\.cache\//, // Cache directories
  /\.logs?\//, // Log directories
  /\.backups?\//, // Backup directories
  /dist\//, // Build artifacts
  /out\//, // Build artifacts
  /reports\//, // Reports may contain sensitive data
];

// Files that require team lead approval
const APPROVAL_REQUIRED_PATTERNS = [
  /migrations\//, // Database migrations
  /\.github\/workflows\//, // CI/CD workflows
  /scripts\/deploy/, // Deployment scripts
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
    // If we can't parse context, allow the operation
    // This prevents breaking the workflow during development
    process.exit(0);
  }

  // Extract file path from context
  const filePath = context?.file_path || context?.path || '';

  if (!filePath) {
    // No file path provided, allow operation
    process.exit(0);
  }

  // Check if file matches sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(filePath)) {
      console.error(`❌ SECURITY: Access to sensitive file blocked: ${filePath}`);
      console.error('   This file contains or may contain sensitive information.');
      console.error('   If you need to access this file, use your terminal directly.');
      process.exit(2); // Exit code 2 blocks the operation
    }
  }

  // Check if file requires approval
  for (const pattern of APPROVAL_REQUIRED_PATTERNS) {
    if (pattern.test(filePath)) {
      console.warn(`⚠️  APPROVAL REQUIRED: ${filePath}`);
      console.warn('   This file requires team lead review before modifications.');
      // Don't block, just warn
    }
  }

  // Allow operation
  process.exit(0);
}

main();
