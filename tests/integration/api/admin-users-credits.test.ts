import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ORIGIN = BASE;

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Origin')) headers.set('Origin', ORIGIN);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const ct = res.headers.get('content-type') || '';
  let json: any = null;
  if (ct.includes('application/json')) {
    try {
      json = await res.json();
    } catch {}
  }
  return { status: res.status, headers: res.headers, json } as const;
}

describe('Admin Users Summary — auth and role checks', () => {
  it('GET /api/admin/users/summary?email=x → 401 when unauthenticated', async () => {
    const { status } = await request('/api/admin/users/summary?email=someone@example.com');
    expect(status).toBe(401);
  });

  it('debug-login then GET /api/admin/users/summary → 403 for non-admin', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      // Not available outside dev; accept forbidden here and skip
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const setCookie = login.headers.get('set-cookie') || '';
    expect(setCookie).toContain('session_id=');

    const { status } = await request('/api/admin/users/summary?email=someone@example.com', {
      headers: { Cookie: setCookie },
    });
    expect(status).toBe(403);
  });
});

describe('Admin Credits Grant — CSRF enforcement', () => {
  it('POST /api/admin/credits/grant without CSRF → 403', async () => {
    const { status, json } = await request('/api/admin/credits/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'someone@example.com', amount: 100 }),
    });
    expect(status).toBe(403);
    if (status === 200 && json) {
      expect(json.success).toBe(true);
    }
  });
});
