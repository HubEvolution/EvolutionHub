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

describe('Admin Rate Limits API — unauth/CSRF smokes', () => {
  it('GET /api/admin/rate-limits/state → 401 unauth', async () => {
    const { status } = await request('/api/admin/rate-limits/state');
    expect(status).toBe(401);
  });

  it('POST /api/admin/rate-limits/reset without CSRF → 403', async () => {
    const { status } = await request('/api/admin/rate-limits/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'api', key: '127.0.0.1:anonymous' }),
    });
    expect(status).toBe(403);
  });
});

describe('Admin Rate Limits API — authenticated (non-admin) → 403', () => {
  it('POST /api/debug-login then GET state → 403', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const cookie = login.headers.get('set-cookie') || '';
    const s = await request('/api/admin/rate-limits/state', { headers: { Cookie: cookie } });
    expect(s.status).toBe(403);
  });
});
