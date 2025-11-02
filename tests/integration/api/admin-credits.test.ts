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

describe('Admin Credits API — unauth/validation', () => {
  it('GET /api/admin/credits/history → 401 unauth', async () => {
    const { status } = await request('/api/admin/credits/history?userId=test');
    expect(status).toBe(401);
  });

  it('GET /api/admin/credits/usage → 401 unauth', async () => {
    const { status } = await request('/api/admin/credits/usage?userId=test');
    expect(status).toBe(401);
  });
});

describe('Admin Credits API — authenticated (non-admin) → 403', () => {
  it('POST /api/debug-login then GET history/usage → 403', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const cookie = login.headers.get('set-cookie') || '';
    const h = await request('/api/admin/credits/history?userId=test', {
      headers: { Cookie: cookie },
    });
    const u = await request('/api/admin/credits/usage?userId=test', {
      headers: { Cookie: cookie },
    });
    expect(h.status).toBe(403);
    expect(u.status).toBe(403);
  });
});
