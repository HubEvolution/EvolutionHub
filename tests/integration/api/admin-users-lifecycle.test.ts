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
    } catch {
      // ignore json parse errors in auth-only checks
    }
  }
  return { status: res.status, headers: res.headers, json } as const;
}

describe('Admin Users List — auth and CSRF checks', () => {
  it('GET /api/admin/users/list → 401 when unauthenticated', async () => {
    const { status } = await request('/api/admin/users/list');
    expect(status).toBe(401);
  });

  it('debug-login then GET /api/admin/users/list → 403 for non-admin', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }

    const cookie = login.headers.get('set-cookie') || '';
    const { status } = await request('/api/admin/users/list', {
      headers: { Cookie: cookie },
    });
    expect(status).toBe(403);
  });
});

describe('Admin Users Lifecycle — CSRF and auth enforcement', () => {
  const lifecycleEndpoints: Array<{ method: string; path: string }> = [
    { method: 'POST', path: '/api/admin/users/user-123/ban' },
    { method: 'POST', path: '/api/admin/users/user-123/unban' },
    { method: 'DELETE', path: '/api/admin/users/user-123' },
  ];

  for (const { method, path } of lifecycleEndpoints) {
    it(`${method} ${path} without auth → 403 (fails CSRF origin checks)`, async () => {
      const { status } = await request(path, { method });
      expect(status).toBe(403);
    });

    it(`debug-login non-admin with CSRF token → 403 forbidden`, async () => {
      const login = await request('/api/debug-login', { method: 'POST' });
      if (login.status !== 200) {
        expect([403, 404, 405]).toContain(login.status);
        return;
      }

      const cookie = login.headers.get('set-cookie') || '';
      const csrf = `testtoken_${Math.random().toString(36).slice(2)}`;
      const { status } = await request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
          Cookie: `${cookie}; csrf_token=${csrf}`,
        },
        body: method === 'DELETE' ? undefined : JSON.stringify({ reason: 'test' }),
      });
      expect(status).toBe(403);
    });
  }
});
