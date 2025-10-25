#!/usr/bin/env tsx

/**
 * Deploy orchestrator: Build -> Wrangler Deploy -> Warmup/Health
 * Usage:
 *   tsx scripts/deploy.ts --env production|staging|testing --url <BASE_URL>
 */

import { execa } from 'execa';

function parseArgs() {
  const args = process.argv.slice(2);
  let env = (process.env.DEPLOY_ENV || '').toLowerCase();
  let baseUrl = process.env.BASE_URL || '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--env' && args[i + 1]) env = args[++i];
    else if (a === '--url' && args[i + 1]) baseUrl = args[++i];
  }

  if (!env || !['production', 'staging', 'testing'].includes(env)) {
    throw new Error('--env must be one of: production|staging|testing');
  }
  if (!baseUrl) throw new Error('--url BASE_URL is required');

  return { env, baseUrl: baseUrl.replace(/\/$/, '') };
}

async function run(cmd: string, args: string[], env?: Record<string, string>) {
  await execa(cmd, args, { stdio: 'inherit', env: { ...process.env, ...(env || {}) } });
}

async function main() {
  const { env, baseUrl } = parseArgs();
  console.log(`🚀 Deploy start: env=${env}, baseUrl=${baseUrl}`);

  // 1) Build (mode per env)
  if (env === 'staging') {
    await run('npm', ['run', 'build:worker:staging']);
  } else {
    await run('npm', ['run', 'build:worker']);
  }

  // 2) Deploy via Wrangler
  await run('npx', ['--no-install', 'wrangler', 'deploy', '--env', env]);

  // 3) Warmup/Health
  await run('tsx', ['scripts/warmup.ts', '--url', baseUrl, '--env', env, '--concurrency', '4']);

  console.log('✅ Deploy complete');
}

main().catch((e) => {
  console.error(`❌ Deploy failed: ${(e as Error).message}`);
  process.exit(1);
});
