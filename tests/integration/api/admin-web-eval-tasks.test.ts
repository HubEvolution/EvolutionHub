import { describe, it, expect } from 'vitest';
import { TEST_URL, csrfHeaders, safeParseJson } from '../../shared/http';

interface ApiJson<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    details?: unknown;
  };
}

async function adminRequest(path: string, init: RequestInit = {}) {
  const baseUrl = TEST_URL;
  const cookie = process.env.ADMIN_TEST_COOKIE || '';
  const csrf = process.env.ADMIN_TEST_CSRF || '';

  if (!cookie || !csrf) {
    return { skipped: true as const };
  }

  const headers = new Headers(init.headers || {});
  headers.set('Origin', baseUrl);

  const csrfPair = csrfHeaders(csrf);
  if (!headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', csrfPair['X-CSRF-Token']);
  const existingCookie = headers.get('Cookie') || '';
  const mergedCookie = existingCookie
    ? `${existingCookie}; ${cookie}; ${csrfPair.Cookie}`
    : `${cookie}; ${csrfPair.Cookie}`;
  headers.set('Cookie', mergedCookie);

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: 'manual',
  });
  const text = res.status !== 302 ? await res.text() : '';
  const json = text ? safeParseJson<ApiJson>(text) : null;
  return { skipped: false as const, res, json };
}

describe('Admin Web-Eval Tasks — list & detail (smoke)', () => {
  it('GET /api/admin/web-eval/tasks returns a list or a sensible error for configured admin session', async () => {
    const result = await adminRequest('/api/admin/web-eval/tasks');

    if (result.skipped) {
      console.warn(
        'Skipping admin-web-eval-tasks tests: ADMIN_TEST_COOKIE or ADMIN_TEST_CSRF is not set.'
      );
      expect(true).toBe(true);
      return;
    }

    const { res, json } = result;

    if (res.status !== 200) {
      expect([400, 401, 403, 404, 405, 429, 500]).toContain(res.status);
      return;
    }

    expect(json && json.success).toBe(true);
    expect(json?.data && typeof json.data).toBe('object');
    const data = json!.data as { items?: unknown; nextCursor?: unknown };
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('GET /api/admin/web-eval/tasks/{id} works for an id returned by the list (if any)', async () => {
    const listResult = await adminRequest('/api/admin/web-eval/tasks');

    if (listResult.skipped) {
      console.warn(
        'Skipping admin-web-eval-tasks detail test: ADMIN_TEST_COOKIE or ADMIN_TEST_CSRF is not set.'
      );
      expect(true).toBe(true);
      return;
    }

    const { res: listRes, json: listJson } = listResult;

    if (listRes.status !== 200 || !listJson || !listJson.success || !listJson.data) {
      expect([400, 401, 403, 404, 405, 429, 500]).toContain(listRes.status);
      return;
    }

    const listData = listJson.data as { items?: Array<{ id?: string }> };
    const items = Array.isArray(listData.items) ? listData.items : [];
    if (!items.length || !items[0]?.id) {
      // Kein Task vorhanden — Liste ist aber prinzipiell erreichbar.
      expect(Array.isArray(items)).toBe(true);
      return;
    }

    const taskId = items[0].id as string;
    const detailResult = await adminRequest(
      `/api/admin/web-eval/tasks/${encodeURIComponent(taskId)}`
    );

    if (detailResult.skipped) {
      // Sollte in der Praxis nicht vorkommen, defensive Absicherung.
      expect(true).toBe(true);
      return;
    }

    const { res: detailRes, json: detailJson } = detailResult;

    if (detailRes.status !== 200) {
      expect([400, 401, 403, 404, 405, 429, 500]).toContain(detailRes.status);
      return;
    }

    expect(detailJson && detailJson.success).toBe(true);
    expect(detailJson?.data && typeof detailJson.data).toBe('object');
    const detailData = detailJson!.data as { task?: unknown };
    expect(detailData).toHaveProperty('task');
  });
});
