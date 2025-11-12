import type { WebEvalEnvBindings } from './env';

export type WebEvalProvider = 'local' | 'browser';

export function isBrowserEnabled(env: Partial<WebEvalEnvBindings>): boolean {
  return env.WEB_EVAL_BROWSER_ENABLE === '1' && !!env.BROWSER;
}

export function isBrowserAllowedInProd(env: Partial<WebEvalEnvBindings>): boolean {
  return env.WEB_EVAL_BROWSER_ALLOW_PROD === '1';
}

export function getProvider(env: Partial<WebEvalEnvBindings>): WebEvalProvider {
  return isBrowserEnabled(env) ? 'browser' : 'local';
}

export function parseAllowedOriginsCsv(csv?: string): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith('/') ? s.slice(0, -1) : s));
}
