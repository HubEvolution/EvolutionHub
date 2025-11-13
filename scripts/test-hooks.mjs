#!/usr/bin/env node
/**
 * Test script for Cascade Hooks
 * Validates that hooks execute correctly and return expected exit codes
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const HOOKS_DIR = 'scripts/hooks';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(status, message) {
  const color = status === 'PASS' ? GREEN : status === 'FAIL' ? RED : YELLOW;
  console.log(`${color}[${status}]${RESET} ${message}`);
}

function testHook(hookScript, testCases) {
  console.log(`\n📝 Testing ${hookScript}...`);
  
  const hookPath = join(HOOKS_DIR, hookScript);
  if (!existsSync(hookPath)) {
    log('FAIL', `Hook script not found: ${hookPath}`);
    return false;
  }

  let allPassed = true;

  for (const testCase of testCases) {
    const { name, input, expectedExitCode, shouldContain } = testCase;
    
    try {
      const cmd = `echo '${JSON.stringify(input)}' | node ${hookPath}`;
      const result = execSync(cmd, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (expectedExitCode === 0) {
        log('PASS', `${name} - Returned exit code 0`);
        if (shouldContain && !result.includes(shouldContain)) {
          log('WARN', `  Output missing expected text: "${shouldContain}"`);
        }
      } else {
        log('FAIL', `${name} - Expected exit code ${expectedExitCode} but got 0`);
        allPassed = false;
      }
    } catch (err) {
      const exitCode = err.status;
      if (exitCode === expectedExitCode) {
        log('PASS', `${name} - Returned exit code ${exitCode}`);
        if (shouldContain && err.stderr && !err.stderr.includes(shouldContain)) {
          log('WARN', `  Output missing expected text: "${shouldContain}"`);
        }
      } else {
        log('FAIL', `${name} - Expected exit code ${expectedExitCode} but got ${exitCode}`);
        allPassed = false;
      }
    }
  }

  return allPassed;
}

function main() {
  console.log('🧪 Cascade Hooks Test Suite\n');
  
  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Pre-Read Security Check
  const securityTests = [
    {
      name: 'Allow normal file',
      input: { file_path: 'src/components/MyComponent.tsx' },
      expectedExitCode: 0
    },
    {
      name: 'Block .env file',
      input: { file_path: '.env.local' },
      expectedExitCode: 2,
      shouldContain: 'SECURITY'
    },
    {
      name: 'Block secrets.json',
      input: { file_path: 'secrets.json' },
      expectedExitCode: 2,
      shouldContain: 'SECURITY'
    },
    {
      name: 'Block node_modules',
      input: { file_path: 'node_modules/package/index.js' },
      expectedExitCode: 2
    },
    {
      name: 'Warn for migrations',
      input: { file_path: 'migrations/001-initial.sql' },
      expectedExitCode: 0,
      shouldContain: 'APPROVAL'
    },
    {
      name: 'Handle empty input',
      input: {},
      expectedExitCode: 0
    }
  ];

  if (testHook('pre-read-security-check.mjs', securityTests)) {
    passedTests++;
  }
  totalTests++;

  // Test 2: Post-Write Quality Check
  const qualityTests = [
    {
      name: 'Handle TypeScript file',
      input: { file_path: 'src/components/Button.tsx' },
      expectedExitCode: 0
    },
    {
      name: 'Handle JSON file',
      input: { file_path: 'package.json' },
      expectedExitCode: 0
    },
    {
      name: 'Handle non-lintable file',
      input: { file_path: 'README.md' },
      expectedExitCode: 0
    },
    {
      name: 'Handle empty input',
      input: {},
      expectedExitCode: 0
    }
  ];

  if (testHook('post-write-quality-check.mjs', qualityTests)) {
    passedTests++;
  }
  totalTests++;

  // Test 3: Post-Write TypeCheck
  const typeCheckTests = [
    {
      name: 'Handle TypeScript file',
      input: { file_path: 'src/lib/utils.ts' },
      expectedExitCode: 0
    },
    {
      name: 'Ignore non-TypeScript file',
      input: { file_path: 'src/components/Button.astro' },
      expectedExitCode: 0
    },
    {
      name: 'Handle empty input',
      input: {},
      expectedExitCode: 0
    }
  ];

  if (testHook('post-write-typecheck.mjs', typeCheckTests)) {
    passedTests++;
  }
  totalTests++;

  // Test 4: Post-Command Logger
  const loggerTests = [
    {
      name: 'Log command',
      input: { command: 'npm test' },
      expectedExitCode: 0
    },
    {
      name: 'Handle empty input',
      input: {},
      expectedExitCode: 0
    }
  ];

  if (testHook('post-command-logger.mjs', loggerTests)) {
    passedTests++;
  }
  totalTests++;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} hooks passed`);
  
  if (passedTests === totalTests) {
    log('PASS', 'All hooks tests passed! ✨');
    process.exit(0);
  } else {
    log('FAIL', `${totalTests - passedTests} hook(s) failed`);
    process.exit(1);
  }
}

main();
