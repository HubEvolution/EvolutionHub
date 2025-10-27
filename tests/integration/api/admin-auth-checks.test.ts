import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json } as const;
}

describe('Admin endpoints require auth', () => {
  it('GET /api/admin/status → 401 unauthenticated', async () => {
    const { status } = await get('/api/admin/status');
    expect(status).toBe(401);
  });

  it('GET /api/admin/metrics → 401 unauthenticated', async () => {
    const { status } = await get('/api/admin/metrics');
    expect(status).toBe(401);
  });
});
