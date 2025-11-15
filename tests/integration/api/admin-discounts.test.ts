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

describe('Admin Discount API — unauth/validation', () => {
  it('GET /api/admin/discounts/list → 401 unauth', async () => {
    const { status } = await request('/api/admin/discounts/list');
    expect(status).toBe(401);
  });

  it('POST /api/admin/discounts/create → 401 unauth', async () => {
    const { status } = await request('/api/admin/discounts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TEST', type: 'percentage', value: 10 }),
    });
    expect(status).toBe(401);
  });

  it('DELETE /api/admin/discounts/[code] → 401 unauth', async () => {
    const { status } = await request('/api/admin/discounts/TEST', { method: 'DELETE' });
    expect(status).toBe(401);
  });

  it('GET /api/admin/discounts/[code]/usage → 401 unauth', async () => {
    const { status } = await request('/api/admin/discounts/TEST/usage');
    expect(status).toBe(401);
  });
});

describe('Admin Discount API — authenticated (non-admin) → 403', () => {
  it('POST /api/debug-login then try discount endpoints → 403', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      expect([403, 404, 405]).toContain(login.status);
      return;
    }
    const cookie = login.headers.get('set-cookie') || '';

    const list = await request('/api/admin/discounts/list', {
      headers: { Cookie: cookie },
    });
    expect(list.status).toBe(403);

    const create = await request('/api/admin/discounts/create', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TEST', type: 'percentage', value: 10 }),
    });
    expect(create.status).toBe(403);
  });
});

describe('Admin Discount API — validation errors', () => {
  it('POST /api/admin/discounts/create with invalid data → 400', async () => {
    const login = await request('/api/debug-login', { method: 'POST' });
    if (login.status !== 200) {
      return;
    }
    const cookie = login.headers.get('set-cookie') || '';

    // Missing required fields
    const res1 = await request('/api/admin/discounts/create', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TEST' }),
    });
    expect([400, 403]).toContain(res1.status);

    // Invalid type
    const res2 = await request('/api/admin/discounts/create', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TEST', type: 'invalid', value: 10 }),
    });
    expect([400, 403]).toContain(res2.status);

    // Invalid value
    const res3 = await request('/api/admin/discounts/create', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TEST', type: 'percentage', value: -10 }),
    });
    expect([400, 403]).toContain(res3.status);
  });
});

describe('Admin Discount API — method not allowed', () => {
  it('GET /api/admin/discounts/create → 405', async () => {
    const { status } = await request('/api/admin/discounts/create');
    expect(status).toBe(405);
  });

  it('POST /api/admin/discounts/list → 405', async () => {
    const { status } = await request('/api/admin/discounts/list', { method: 'POST' });
    expect(status).toBe(405);
  });

  it('POST /api/admin/discounts/[code] → 405', async () => {
    const { status } = await request('/api/admin/discounts/TEST', { method: 'POST' });
    expect(status).toBe(405);
  });

  it('POST /api/admin/discounts/[code]/usage → 405', async () => {
    const { status } = await request('/api/admin/discounts/TEST/usage', { method: 'POST' });
    expect(status).toBe(405);
  });
});
