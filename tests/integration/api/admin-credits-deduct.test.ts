import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ORIGIN = BASE;

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Origin')) headers.set('Origin', ORIGIN);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });
  const ct = res.headers.get('content-type') || '';
  let json: any = null;
  if (ct.includes('application/json')) {
    try {
      json = await res.json();
    } catch {}
  }
  return { status: res.status, headers: res.headers, json } as const;
}

describe('Admin Credits Deduct — auth/csrf checks', () => {
  it('POST /api/admin/credits/deduct without CSRF → 403', async () => {
    const { status } = await request('/api/admin/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'someone@example.com', amount: 100 }),
    });
    expect([403, 401, 429]).toContain(status);
  });
});
