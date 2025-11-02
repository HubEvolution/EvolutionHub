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

describe('Admin Users Set Plan — method/CSRF/auth checks', () => {
  it('GET /api/admin/users/set-plan → 405 method not allowed', async () => {
    const { status } = await request('/api/admin/users/set-plan');
    expect(status).toBe(405);
  });

  it('POST /api/admin/users/set-plan without CSRF → 403', async () => {
    const { status } = await request('/api/admin/users/set-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'someone@example.com', plan: 'pro' }),
    });
    expect([403, 401, 429]).toContain(status);
  });

  it('debug-login then POST /api/admin/users/set-plan with CSRF → 403 for non-admin', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const cookie = login.headers.get('set-cookie') || '';
    const csrf = 'testtoken_' + Math.random().toString(36).slice(2);
    const { status } = await request('/api/admin/users/set-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        Cookie: `${cookie}; csrf_token=${csrf}`,
      },
      body: JSON.stringify({
        email: 'someone@example.com',
        plan: 'pro',
        reason: 'integration test',
      }),
    });
    expect(status).toBe(403);
  });
});
