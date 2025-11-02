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

describe('Admin Sessions API — unauth/CSRF smokes', () => {
  it('GET /api/admin/users/sessions → 401 unauthenticated', async () => {
    const { status } = await request('/api/admin/users/sessions?userId=test');
    expect(status).toBe(401);
  });

  it('POST /api/admin/users/revoke-sessions without CSRF → 403', async () => {
    const { status } = await request('/api/admin/users/revoke-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test' }),
    });
    expect(status).toBe(403);
  });
});

describe('Admin Sessions API — authenticated (non-admin) → 403', () => {
  it('POST /api/debug-login then GET /api/admin/users/sessions → 403 (not admin)', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const setCookie = login.headers.get('set-cookie') || '';
    const { status } = await request('/api/admin/users/sessions?userId=test', {
      headers: { Cookie: setCookie },
    });
    expect(status).toBe(403);
  });
});
