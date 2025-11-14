#!/usr/bin/env node

// Simple guard for dangerous or high-impact commands triggered by Cascade Hooks.
// - Blocks deploy/secrets and obviously destructive shell commands.
// - Exit code 2 blocks the underlying Cascade action.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function isDangerousCommand(cmd) {
  const lower = cmd.toLowerCase();

  const dangerousSubstrings = ['rm -rf', 'rm -r ', ' mkfs', ' chmod -r', ' chown -r'];

  if (dangerousSubstrings.some((s) => lower.includes(s))) return true;

  // Block deploy and secrets-related commands from being auto-run by Cascade.
  const blockedPrefixes = [
    'npm run deploy',
    'npm run secrets',
    'wrangler publish',
    'wrangler deploy',
    'git push',
    'git commit',
  ];

  return blockedPrefixes.some((prefix) => lower.startsWith(prefix));
}

function isDevCommand(cmd) {
  const normalized = cmd.trim();

  if (normalized === 'npm run dev' || normalized === 'npm run dev:e2e') {
    return true;
  }

  const devPrefixes = [
    'npm run dev:worker',
    'npm run dev:open',
    'npm run dev:pages-fallback',
  ];

  return devPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function ensurePort8787Free() {
  try {
    let output = '';
    try {
      output = execSync('lsof -ti:8787', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      output = '';
    }

    if (!output) return;

    const pids = output
      .split('\n')
      .map((pid) => pid.trim())
      .filter(Boolean);

    if (!pids.length) return;

    console.error(
      `pre-run-command: Port 8787 verwendet von PID(s) ${pids.join(
        ', '
      )}. Versuche, diese Prozesse zu beenden, bevor der Dev-Server gestartet wird.`
    );

    try {
      execSync(`kill ${pids.join(' ')}`, { stdio: 'ignore' });
    } catch (err) {
      console.error(
        'pre-run-command: Konnte Prozesse auf Port 8787 nicht automatisch beenden. Bitte beende den bestehenden Dev-Server manuell.',
        err instanceof Error ? err.message : String(err)
      );
    }
  } catch {
    // Wenn lsof/kill nicht verfügbar sind, quittieren wir leise; der Dev-Command selbst wird dann ggf. fehlschlagen.
  }
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) {
      process.exit(0);
      return;
    }

    const payload = JSON.parse(raw);
    const toolInfo = payload?.tool_info ?? {};
    const commandLine = String(toolInfo.command_line || '').trim();

    if (!commandLine) {
      process.exit(0);
      return;
    }

    if (!process.env.CASCADES_HOOKS_DISABLE_LOG) {
      try {
        fs.mkdirSync('.logs', { recursive: true });
        fs.appendFileSync(
          '.logs/cascade-pre-run-command.log',
          `${new Date().toISOString()} pre_run_command: ${commandLine}\n`
        );
      } catch {
        // logging best-effort only
      }
    }

    if (isDevCommand(commandLine)) {
      ensurePort8787Free();
    }

    if (isDangerousCommand(commandLine)) {
      console.error(
        `Blocked dangerous or high-impact command from Cascade: "${commandLine}". ` +
          'Please run this manually in your terminal if you really intend to execute it.'
      );
      process.exit(2);
      return;
    }

    process.exit(0);
  } catch (err) {
    console.error('pre-run-command hook error:', err instanceof Error ? err.message : String(err));
    // Non-2 error codes do not block the Cascade action per Hooks spec.
    process.exit(1);
  }
}

main();
