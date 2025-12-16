#!/usr/bin/env tsx

/**
 * Deploy orchestrator: Build -> Wrangler Deploy -> Warmup/Health
 * Usage:
 *   tsx scripts/deploy.ts --env production|staging|testing --url <BASE_URL>
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { config as dotenvConfig } from 'dotenv';
import { execa } from 'execa';

function loadDotenv() {
  const root = process.cwd();
  const candidates = ['.env', '.env.local'];
  if (!process.env.DOTENV_CONFIG_QUIET) {
    process.env.DOTENV_CONFIG_QUIET = 'true';
  }
  for (const rel of candidates) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) {
      dotenvConfig({ path: p });
    }
  }
}

loadDotenv();

function parseArgs() {
  const args = process.argv.slice(2);
  let env = (process.env.DEPLOY_ENV || '').toLowerCase();
  let baseUrl = process.env.BASE_URL || '';
  let pretty = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--env' && args[i + 1]) env = args[++i];
    else if (a === '--url' && args[i + 1]) baseUrl = args[++i];
    else if (a === '--pretty') pretty = true;
    else if (a === '--verbose') verbose = true;
  }

  if (!env || !['production', 'staging', 'testing'].includes(env)) {
    throw new Error('--env must be one of: production|staging|testing');
  }
  if (!baseUrl) throw new Error('--url BASE_URL is required');

  return { env, baseUrl: baseUrl.replace(/\/$/, ''), pretty, verbose };
}

type StepKind = 'build' | 'wrangler' | 'warmup';

function stripAnsi(input: string): string {
  return input.replace(/\x1B\[[0-9;]*m/g, '');
}

function stripWranglerPrefix(line: string): string {
  return line.replace(/^\[[^\]]+\]\s*/, '');
}

function shouldKeepLine(kind: StepKind, plain: string): boolean {
  const s = plain.trim();
  if (!s) return false;
  const lower = s.toLowerCase();

  if (/(^|\b)(error|fatal|failed|fail)\b/.test(lower)) return true;
  if (/(^|\b)(warn|warning)\b/.test(lower)) return true;
  if (s.includes('?')) return true;

  if (kind === 'build') {
    if (lower.includes('built in')) return true;
    if (lower.includes('[build]') && /\bcompleted\b/.test(lower)) return true;
    if (lower.includes('[build]') && /\bcomplete!?\b/.test(lower)) return true;
    if (lower.includes('[build]') && /\bsuccess\b/.test(lower)) return true;
    return false;
  }

  if (kind === 'wrangler') {
    if (lower.startsWith('⛅️ wrangler')) return true;
    if (lower.includes('deploy')) return true;
    if (lower.includes('published')) return true;
    if (lower.includes('uploaded')) return true;
    if (lower.includes('current version id')) return true;
    if (lower.includes('current deployment id')) return true;
    if (lower.includes('available at')) return true;
    return false;
  }

  return true;
}

async function runRaw(cmd: string, args: string[], env?: Record<string, string>) {
  await execa(cmd, args, { stdio: 'inherit', env: { ...process.env, ...(env || {}) } });
}

async function runPretty(cmd: string, args: string[], kind: StepKind, env?: Record<string, string>) {
  const child = execa(cmd, args, {
    env: { ...process.env, ...(env || {}) },
    all: true,
    reject: false,
  });

  const allStream = child.all;
  if (!allStream) {
    const res = await child;
    if (res.exitCode !== 0) {
      throw new Error(`${cmd} exited with code ${res.exitCode}`);
    }
    return;
  }

  const rl = readline.createInterface({ input: allStream, crlfDelay: Infinity });

  const tail: string[] = [];
  const tailMax = 120;

  let inBindings = false;
  let bindingsCount = 0;
  let bindingsEmitted = false;

  const maybeEmitBindingsSummary = () => {
    if (bindingsEmitted) return;
    bindingsEmitted = true;
    console.log(`bindings: ${bindingsCount} resources (use --verbose for details)`);
  };

  rl.on('line', (line) => {
    const outLine = kind === 'wrangler' ? stripWranglerPrefix(line) : line;
    tail.push(stripAnsi(outLine));
    if (tail.length > tailMax) tail.shift();

    const plain = stripAnsi(outLine);
    const trimmed = plain.trim();

    if (inBindings) {
      if (!trimmed) {
        inBindings = false;
        maybeEmitBindingsSummary();
        return;
      }
      if (/^binding\s+resource\s+mode/i.test(trimmed)) return;
      if (/^[-─]{3,}/.test(trimmed)) return;
      bindingsCount += 1;
      return;
    }

    if (trimmed.includes('Your Worker has access to the following bindings:')) {
      inBindings = true;
      bindingsCount = 0;
      bindingsEmitted = false;
      return;
    }

    if (kind === 'wrangler') {
      if (trimmed.includes('Using vars defined in .env')) return;
      if (/^[-─]{8,}$/.test(trimmed)) return;
      if (trimmed.includes('update available')) return;
    }

    if (shouldKeepLine(kind, trimmed)) {
      console.log(outLine);
    }
  });

  const res = await child;
  rl.close();
  if (inBindings) {
    maybeEmitBindingsSummary();
  }
  if (res.exitCode !== 0) {
    console.error(`\n${cmd} ${args.join(' ')} failed (exit ${res.exitCode}). Last output:`);
    for (const l of tail.slice(-30)) {
      console.error(l);
    }
    throw new Error(`${cmd} exited with code ${res.exitCode}`);
  }
}

async function main() {
  const { env, baseUrl, pretty, verbose } = parseArgs();
  const mode = verbose ? 'verbose' : pretty ? 'pretty' : 'raw';
  console.log(`🚀 Deploy start: env=${env}, baseUrl=${baseUrl} (${mode})`);

  const usePretty = pretty && !verbose;

  // 1) Build (mode per env)
  if (env === 'staging') {
    if (usePretty) {
      console.log('\n[build]');
      await runPretty('npm', ['run', 'build:worker:staging'], 'build');
    } else {
      await runRaw('npm', ['run', 'build:worker:staging']);
    }
  } else {
    if (usePretty) {
      console.log('\n[build]');
      await runPretty('npm', ['run', 'build:worker'], 'build');
    } else {
      await runRaw('npm', ['run', 'build:worker']);
    }
  }

  // 2) Deploy via Wrangler
  if (usePretty) {
    console.log('\n[deploy]');
    await runPretty('npx', ['--no-install', 'wrangler', 'deploy', '--env', env], 'wrangler');
  } else {
    await runRaw('npx', ['--no-install', 'wrangler', 'deploy', '--env', env]);
  }

  // 3) Warmup/Health
  {
    const warmupArgs = ['scripts/warmup.ts', '--url', baseUrl, '--env', env, '--concurrency', '4'];
    if (verbose) {
      warmupArgs.push('--verbose');
    }
    await runRaw('tsx', warmupArgs);
  }

  console.log('✅ Deploy complete');
}

main().catch((e) => {
  console.error(`❌ Deploy failed: ${(e as Error).message}`);
  process.exit(1);
});
