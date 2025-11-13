#!/usr/bin/env node
/**
 * Post-Command Logger Hook
 * Tracks command execution for compliance and audit purposes
 * 
 * This hook logs commands executed via Cascade for audit trails.
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOG_DIR = '.logs';
const AUDIT_LOG = join(LOG_DIR, 'cascade-audit.log');

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

  const command = context?.command || context?.cmd || '';
  
  if (!command) {
    process.exit(0);
  }

  // Ensure log directory exists
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  // Create log entry
  const timestamp = new Date().toISOString();
  const user = process.env.USER || process.env.USERNAME || 'unknown';
  const logEntry = `[${timestamp}] user=${user} command="${command}"\n`;

  // Append to audit log
  try {
    appendFileSync(AUDIT_LOG, logEntry);
  } catch (err) {
    // Failed to write log, but don't block the operation
  }

  process.exit(0);
}

main();
