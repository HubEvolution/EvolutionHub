/*
 * Simple environment validation for Auth/STYTCH configuration.
 * Run:  npx tsx scripts/validate-env.ts  (or npm run validate:env if wired)
 */
import { z } from 'zod';

function toBool(v: unknown): boolean {
  const s = String(v ?? '').toLowerCase();
  return s === '1' || s === 'true';
}

const env = process.env as Record<string, string | undefined>;

const baseSchema = z.object({
  ENVIRONMENT: z.string().optional().default('development'),
  AUTH_PROVIDER: z.enum(['stytch', 'legacy']).optional(),
  // Secrets optional at this layer; required checks are conditional below
  STYTCH_PROJECT_ID: z.string().optional(),
  STYTCH_SECRET: z.string().optional(),
  STYTCH_PUBLIC_TOKEN: z.string().optional(),
  STYTCH_CUSTOM_DOMAIN: z.string().optional(),
  STYTCH_PKCE: z.string().optional(),
  JWT_SECRET: z.string().optional(),
});

const parsed = baseSchema.safeParse(env);
if (!parsed.success) {
  console.error('[env:validate] invalid process.env shape', parsed.error.flatten());
  process.exit(1);
}

const cfg = parsed.data;
const isProdLike =
  cfg.ENVIRONMENT === 'production' ||
  cfg.ENVIRONMENT === 'staging' ||
  cfg.ENVIRONMENT === 'testing';
const issues: string[] = [];
const warnings: string[] = [];

if (!cfg.AUTH_PROVIDER) {
  warnings.push('AUTH_PROVIDER is not set (defaults may apply).');
}

if ((cfg.AUTH_PROVIDER || 'stytch') === 'stytch') {
  if (!cfg.STYTCH_PUBLIC_TOKEN) issues.push('STYTCH_PUBLIC_TOKEN is required for OAuth start.');
  if (isProdLike) {
    if (!cfg.STYTCH_PROJECT_ID) issues.push('STYTCH_PROJECT_ID is required in non-dev envs.');
    if (!cfg.STYTCH_SECRET) issues.push('STYTCH_SECRET is required in non-dev envs.');
  } else {
    if (!cfg.STYTCH_PROJECT_ID || !cfg.STYTCH_SECRET) {
      const bypass = toBool(env.E2E_FAKE_STYTCH) || toBool(env.STYTCH_BYPASS);
      if (!bypass)
        warnings.push('STYTCH_PROJECT_ID/SECRET missing (dev). Set E2E_FAKE_STYTCH=1 to simulate.');
    }
  }
}

if (isProdLike && !cfg.JWT_SECRET) {
  issues.push('JWT_SECRET is required in non-dev envs (protected APIs).');
}

if (issues.length === 0) {
  console.log('[env:validate] OK');
  if (warnings.length) {
    for (const w of warnings) console.warn('[env:validate] warn:', w);
  }
  process.exit(0);
}

console.error('[env:validate] failed:');
for (const i of issues) console.error(' -', i);
if (warnings.length) {
  for (const w of warnings) console.warn('[env:validate] warn:', w);
}
process.exit(1);
