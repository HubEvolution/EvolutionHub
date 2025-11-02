import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ORIGIN = BASE; // same-origin for local dev worker

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

describe('Admin Backup API — unauthenticated and CSRF smokes', () => {
  it('GET /api/admin/backup/jobs → 401 unauthenticated', async () => {
    const { status } = await request('/api/admin/backup/jobs');
    expect(status).toBe(401);
  });

  it('POST /api/admin/backup/create without CSRF → 403', async () => {
    const { status, json } = await request('/api/admin/backup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'full' }),
    });
    expect([403, 401, 429]).toContain(status);
    if (status === 200 && json) {
      expect(json.success).toBe(true);
    }
  });
});

describe('Admin Backup API — authenticated (debug-user) but not admin', () => {
  it('POST /api/debug-login then GET /api/admin/backup/jobs → 403 (not admin)', async () => {
    // Create a debug session (dev-only endpoint)
    const login = await request('/api/debug-login', {
      method: 'POST',
    });
    // If debug-login is disabled (non-dev), allow 403 here and skip follow-up
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }

    // Extract Set-Cookie for session_id
    const setCookie = login.headers.get('set-cookie') || '';
    expect(setCookie).toContain('session_id=');

    const { status } = await request('/api/admin/backup/jobs', {
      headers: { Cookie: setCookie },
    });
    // Authenticated but not admin → expect forbidden
    expect(status).toBe(403);
  });
});
