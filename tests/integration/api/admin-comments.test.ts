import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function get(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON possible on error paths */
  }
  return { status: res.status, json, text } as const;
}

describe('Admin Comments API (integration)', () => {
  it('denies unauthenticated access with 401', async () => {
    const { status, json } = await get('/api/admin/comments?limit=5');
    expect(status).toBe(401);
    if (json) {
      expect(json).toHaveProperty('success', false);
      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('type');
    }
  });

  it('accepts query params but still requires auth', async () => {
    const { status } = await get(
      '/api/admin/comments?status=pending&entityType=blog_post&entityId=foo&limit=12&offset=0&includeReports=true'
    );
    expect(status).toBe(401);
  });
});
