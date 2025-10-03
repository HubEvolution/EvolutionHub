/*
  Shared HTTP helpers for tests (Integration/E2E-friendly)
  - Normalizes TEST_URL resolution
  - Adds Origin header for CSRF-aware routes
  - Provides JSON helpers that avoid parsing on 302 redirects
  - Exposes CSRF header builder and token utility
*/

export const TEST_URL = (
  process.env.TEST_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:8787'
).replace(/\/$/, '');

export function hex32(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function csrfHeaders(token: string): Record<string, string> {
  return {
    'X-CSRF-Token': token,
    Cookie: `csrf_token=${encodeURIComponent(token)}`,
  };
}

export async function getJson(path: string): Promise<{ res: Response; json: any }>;
export async function getJson(
  input: RequestInfo,
  init?: RequestInit
): Promise<{ res: Response; json: any }>;
export async function getJson(
  input: string | RequestInfo,
  init: RequestInit = {}
): Promise<{ res: Response; json: any }> {
  const url = typeof input === 'string' ? `${TEST_URL}${input}` : input;
  const res = await fetch(url as RequestInfo, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Origin: TEST_URL,
      ...(init.headers || {}),
    } as Record<string, string>,
    ...init,
  });
  const text = res.status !== 302 ? await res.text() : '';
  return { res, json: text ? safeParseJson(text) : null } as const;
}

export interface SendJsonExtra {
  method?: string;
  headers?: Record<string, string>;
}

export async function sendJson(
  path: string,
  data: unknown,
  extra: SendJsonExtra = {}
): Promise<{ res: Response; json: any }> {
  const { method = 'POST', headers = {} } = extra;
  const res = await fetch(`${TEST_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: TEST_URL,
      ...headers,
    },
    body: JSON.stringify(data),
    redirect: 'manual',
  });
  const text = res.status !== 302 ? await res.text() : '';
  return { res, json: text ? safeParseJson(text) : null } as const;
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
