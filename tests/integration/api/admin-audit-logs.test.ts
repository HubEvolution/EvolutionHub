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

describe('Admin Audit Logs API — unauth/405 smokes', () => {
  it('GET /api/admin/audit/logs → 401 unauthenticated', async () => {
    const { status } = await request('/api/admin/audit/logs');
    expect(status).toBe(401);
  });

  it('GET /api/admin/audit/logs/{id} → 401 unauthenticated', async () => {
    const { status } = await request('/api/admin/audit/logs/nonexistent');
    expect(status).toBe(401);
  });

  it('POST /api/admin/audit/logs → 405', async () => {
    const { status, headers } = await request('/api/admin/audit/logs', { method: 'POST' });
    expect(status).toBe(405);
    expect((headers.get('allow') || '').toUpperCase()).toContain('GET');
  });
});

describe('Admin Audit Logs API — authenticated (non-admin) → 403', () => {
  it('POST /api/debug-login then GET /api/admin/audit/logs → 403 (not admin)', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const setCookie = login.headers.get('set-cookie') || '';
    const { status } = await request('/api/admin/audit/logs?limit=1', { headers: { Cookie: setCookie } });
    expect(status).toBe(403);
  });
});
