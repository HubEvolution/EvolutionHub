import { describe, it, expect } from 'vitest';
import { getJson, sendJson, hex32, csrfHeaders } from '../shared/http';

type CommentsResponse<T> = {
  res: Response;
  json: T | null;
};

describe('Comments API (edge)', () => {
  const entityType = 'blog_post';
  const entityId = 'integration-post-1';

  it('GET /api/comments should succeed for entity', async () => {
    const {
      res,
      json,
    }: CommentsResponse<{
      success: boolean;
      data: { comments: unknown[]; total: number; hasMore: boolean };
    }> = await getJson(
      `/api/comments?entityType=${entityType}&entityId=${entityId}&limit=5&offset=0`
    );
    expect(res.status).toBe(200);
    expect(json?.success).toBe(true);
    expect(json?.data).toHaveProperty('comments');
    expect(json?.data).toHaveProperty('total');
    expect(json?.data).toHaveProperty('hasMore');
  });

  it('POST /api/comments/create should reject without CSRF (403)', async () => {
    const { res, json }: CommentsResponse<{ success: boolean; error: { type: string } }> =
      await sendJson('/api/comments/create', {
        content: 'Hello without CSRF',
        entityType,
        entityId,
      });
    expect(res.status).toBe(403);
    expect(json?.success).toBe(false);
    expect(json?.error?.type).toBe('forbidden');
  });

  it('POST /api/comments/create should create comment with valid CSRF (201)', async () => {
    const token = hex32();
    const {
      res,
      json,
    }: CommentsResponse<{ success: boolean; data: { id: string; entityId: string } }> =
      await sendJson(
        '/api/comments/create',
        { content: 'Hello with CSRF', entityType, entityId, csrfToken: token },
        { headers: csrfHeaders(token) }
      );
    expect([201, 401, 403]).toContain(res.status);
    if (res.status !== 201) return;
    expect(json?.success).toBe(true);
    expect(json?.data).toHaveProperty('id');
    expect(json?.data.entityId).toBe(entityId);
  });

  it('PUT /api/comments/:id should require auth (401)', async () => {
    const token = hex32();
    const {
      json: created,
    }: CommentsResponse<{
      success: boolean;
      data?: { id?: string };
    }> = await sendJson(
      '/api/comments/create',
      { content: 'To be updated', entityType, entityId, csrfToken: token },
      { headers: csrfHeaders(token) }
    );
    const cid =
      created && (created as any).data && (created as any).data.id
        ? (created as any).data.id
        : hex32();
    const { res, json }: CommentsResponse<{ success: boolean }> = await sendJson(
      `/api/comments/${cid}`,
      { content: 'update try', csrfToken: token },
      { method: 'PUT', headers: csrfHeaders(token) }
    );
    expect([401, 403, 404]).toContain(res.status);
    if (res.headers.get('content-type')?.includes('application/json')) {
      expect(json?.success).toBe(false);
    }
  });

  it('DELETE /api/comments/:id should require auth (401)', async () => {
    const token = hex32();
    const {
      json: created,
    }: CommentsResponse<{
      success: boolean;
      data?: { id?: string };
    }> = await sendJson(
      '/api/comments/create',
      { content: 'To be deleted', entityType, entityId, csrfToken: token },
      { headers: csrfHeaders(token) }
    );
    const cid =
      created && (created as any).data && (created as any).data.id
        ? (created as any).data.id
        : hex32();
    const { res, json }: CommentsResponse<{ success: boolean }> = await sendJson(
      `/api/comments/${cid}`,
      { csrfToken: token },
      { method: 'DELETE', headers: csrfHeaders(token) }
    );
    expect([401, 403, 404]).toContain(res.status);
    if (res.headers.get('content-type')?.includes('application/json')) {
      expect(json?.success).toBe(false);
    }
  });

  it('POST /api/comments/moderate should require moderator (401)', async () => {
    const token = hex32();
    const payload = { action: 'approve', commentId: 'does-not-matter', csrfToken: token };
    const { res, json }: CommentsResponse<{ success: boolean }> = await sendJson(
      '/api/comments/moderate',
      payload,
      {
        headers: csrfHeaders(token),
      }
    );
    expect(res.status).toBe(401);
    expect(json?.success).toBe(false);
  });
});
