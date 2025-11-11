/*
 * Check Cloudflare Wrangler secrets across all environments and workers.
 *
 * Usage:
 *   - npx tsx scripts/check-wrangler-secrets.ts
 *   - npm run secrets:check
 *
 * Notes:
 *   - Requires Cloudflare auth locally (wrangler configured) to list secrets.
 *   - Uses `wrangler secret list --format json` for each env/worker.
 *   - Exits non-zero if required secrets are missing.
 */
import { execa } from 'execa';
import path from 'node:path';
import process from 'node:process';

type EnvName = 'production' | 'staging' | 'testing' | 'development';

type CheckContext = {
  label: string;
  cwd: string; // where to run wrangler from
  config: string; // wrangler.toml path (relative to cwd or absolute)
  envs: EnvName[] | ['default']; // which envs to query (or 'default' = no --env)
  domainByEnv?: Partial<Record<EnvName, string[]>>; // optional display mapping
  requiredByEnv: Partial<Record<EnvName | 'default', { required: string[]; optional?: string[] }>>;
};

type SecretList = { name?: string }[] | string[];

function toNames(list: SecretList): string[] {
  if (Array.isArray(list)) {
    return list
      .map((x) => (typeof x === 'string' ? x : x?.name))
      .filter((v): v is string => Boolean(v))
      .sort();
  }
  return [];
}

async function listSecrets(ctx: CheckContext, env: EnvName | 'default'): Promise<string[]> {
  const args = ['secret', 'list', '--format', 'json', '--config', ctx.config];
  if (env !== 'default') args.push('--env', env);
  const { stdout } = await execa('npx', ['-y', 'wrangler', ...args], {
    cwd: ctx.cwd,
    env: process.env,
  });
  try {
    const parsed = JSON.parse(stdout) as SecretList;
    return toNames(parsed);
  } catch (e) {
    // Fallback: try to parse simple lines if JSON parsing fails
    return stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !l.startsWith('{') && !l.startsWith('[') && !l.includes(':'))
      .sort();
  }
}

function diffSecrets(actual: string[], expected: { required: string[]; optional?: string[] }) {
  const missingRequired = expected.required.filter((k) => !actual.includes(k));
  const missingOptional = (expected.optional ?? []).filter((k) => !actual.includes(k));
  return { missingRequired, missingOptional };
}

async function run() {
  const root = process.cwd();
  const mainCtx: CheckContext = {
    label: 'main-worker',
    cwd: root,
    config: path.join(root, 'wrangler.toml'),
    envs: ['production', 'staging', 'testing'],
    domainByEnv: {
      production: ['hub-evolution.com', 'www.hub-evolution.com'],
      staging: ['staging.hub-evolution.com'],
      testing: ['ci.hub-evolution.com'],
    },
    requiredByEnv: {
      production: {
        required: [
          'STYTCH_PROJECT_ID',
          'STYTCH_SECRET',
          'STYTCH_PUBLIC_TOKEN',
          'JWT_SECRET',
          'RESEND_API_KEY',
          'STRIPE_SECRET',
          'STRIPE_WEBHOOK_SECRET',
          'TURNSTILE_SECRET_KEY',
        ],
      },
      staging: {
        required: [
          'STYTCH_PROJECT_ID',
          'STYTCH_SECRET',
          'STYTCH_PUBLIC_TOKEN',
          'JWT_SECRET',
          'RESEND_API_KEY',
          'STRIPE_SECRET',
          'STRIPE_WEBHOOK_SECRET',
          'TURNSTILE_SECRET_KEY',
        ],
      },
      testing: {
        required: [
          'STYTCH_PROJECT_ID',
          'STYTCH_SECRET',
          'STYTCH_PUBLIC_TOKEN',
          'JWT_SECRET',
          'STRIPE_SECRET',
          'STRIPE_WEBHOOK_SECRET',
          'TURNSTILE_SECRET_KEY',
        ],
        optional: ['RESEND_API_KEY'], // avoid email sending in CI by default
      },
    },
  };

  const cronCtx: CheckContext = {
    label: 'cron-worker',
    cwd: path.join(root, 'workers/cron-worker'),
    config: path.join(root, 'workers/cron-worker/wrangler.toml'),
    envs: ['default'], // single worker, no explicit envs
    requiredByEnv: {
      default: {
        required: ['INTERNAL_HEALTH_TOKEN'],
        optional: ['GITHUB_TOKEN'],
      },
    },
  };

  const contexts: CheckContext[] = [mainCtx, cronCtx];

  const failures: {
    ctx: string;
    env: string;
    missingRequired: string[];
    missingOptional: string[];
    actual: string[];
    domains?: string[];
  }[] = [];

  for (const ctx of contexts) {
    for (const env of ctx.envs) {
      const expected = ctx.requiredByEnv[env];
      if (!expected) continue;
      let actual: string[] = [];
      try {
        actual = await listSecrets(ctx, env);
      } catch (err: any) {
        const msg = err?.stderr || err?.message || String(err);
        console.error(`[secrets:check] Failed to list secrets for ${ctx.label} env=${env}:`, msg);
        failures.push({
          ctx: ctx.label,
          env: String(env),
          missingRequired: expected.required,
          missingOptional: expected.optional ?? [],
          actual: [],
          domains: ctx.domainByEnv?.[env as EnvName],
        });
        continue;
      }

      const { missingRequired, missingOptional } = diffSecrets(actual, expected);
      if (missingRequired.length || missingOptional.length) {
        failures.push({
          ctx: ctx.label,
          env: String(env),
          missingRequired,
          missingOptional,
          actual,
          domains: ctx.domainByEnv?.[env as EnvName],
        });
      } else {
        const domains = ctx.domainByEnv?.[env as EnvName];
        console.log(
          `✓ ${ctx.label} env=${env}${domains ? ` domains=${domains.join(',')}` : ''} — all required secrets present (${actual.length})`
        );
      }
    }
  }

  if (failures.length) {
    console.error('\n[secrets:check] Missing secrets detected:');
    for (const f of failures) {
      const domainStr = f.domains?.length ? ` domains=${f.domains.join(',')}` : '';
      console.error(`- ${f.ctx} env=${f.env}${domainStr}`);
      if (f.missingRequired.length)
        console.error(`  required missing: ${f.missingRequired.join(', ')}`);
      if (f.missingOptional.length)
        console.error(`  optional missing: ${f.missingOptional.join(', ')}`);
      if (f.actual.length) console.error(`  present: ${f.actual.join(', ')}`);
    }
    console.error('\nRemediation examples:');
    console.error('  npx wrangler secret put STYTCH_PROJECT_ID --env production');
    console.error('  npx wrangler secret put STRIPE_SECRET --env staging');
    console.error(
      '  (for cron) cd workers/cron-worker && npx wrangler secret put INTERNAL_HEALTH_TOKEN'
    );
    process.exit(1);
  }

  console.log('\n[secrets:check] OK — all required secrets configured');
}

run().catch((err) => {
  console.error('[secrets:check] Unexpected failure:', err);
  process.exit(1);
});
