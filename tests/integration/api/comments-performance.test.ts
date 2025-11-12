import { describe, it, expect } from 'vitest';
import { seedCommentsPerformance } from './__fixtures__/comments-performance';
import { safeParseJson } from '../../shared/http';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ADMIN_COOKIE = process.env.TEST_ADMIN_COOKIE || 'session_id=e2e-admin-session-0001';

async function get(path: string, init: RequestInit = {}) {
  const headers = new Headers({
    Origin: BASE,
    ...(init.headers as Record<string, string> | undefined),
  });
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });
  const text = res.status !== 302 ? await res.text() : '';
  let json: any = text ? safeParseJson<any>(text) : null;
  return { res, json } as const;
}

describe('/api/comments/performance (integration)', () => {
  it('returns status payload without auth', async () => {
    const { res, json } = await get('/api/comments/performance?mode=status');
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ok');
  });

  it('rejects paginated mode without postId', async () => {
    const { res, json } = await get('/api/comments/performance?mode=paginated');
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('validation_error');
  });

  it('returns paginated data for seeded post', async () => {
    const { postId } = await seedCommentsPerformance();
    const { res, json } = await get(`/api/comments/performance?mode=paginated&postId=${postId}`);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('comments');
    expect(json.data.pagination.total).toBeGreaterThan(0);
  });

  it('requires authentication for search mode', async () => {
    const { res, json } = await get('/api/comments/performance?mode=search&q=keyword');
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('auth_error');
  });

  it('returns search results when authenticated', async () => {
    await seedCommentsPerformance();
    const cookie = `${ADMIN_COOKIE}`;

    const { res, json } = await get(`/api/comments/performance?mode=search&q=unique-keyword-xyz`, {
      headers: {
        Cookie: cookie,
      },
    });

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.total).toBeGreaterThan(0);
  });
});
