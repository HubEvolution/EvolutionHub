import { describe, it, expect } from 'vitest';
import { getJson } from '../../shared/http';

const ENDPOINT = '/api/mcp/ping';
const EXECUTOR_TOKEN = process.env.WEB_EVAL_EXECUTOR_TOKEN;
const HAS_TOKEN = Boolean(EXECUTOR_TOKEN);

type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  error: { type: string; message: string; details?: Record<string, unknown> };
};
type ApiResponse<T> = ApiSuccess<T> | ApiError | null;

describe('/api/mcp/ping', () => {
  it('rejects unauthenticated requests', async () => {
    const { res, json } = await getJson<ApiResponse<unknown>>(ENDPOINT);
    if (res.status === 429) {
      if (!json || json.success !== false) throw new Error('expected error shape (rate_limit)');
      expect(json.error.type).toBe('rate_limit');
      expect(res.headers.get('Retry-After')).toBeTruthy();
    } else {
      expect(res.status).toBe(401);
      if (!json || json.success !== false) throw new Error('expected error shape');
      expect(json.error.type).toBe('auth_error');
    }
  });

  (HAS_TOKEN ? it : it.skip)('accepts executor token auth', async () => {
    const { res, json } = await getJson<ApiResponse<{ ok: true; identity: unknown | null }>>(
      ENDPOINT,
      {
        headers: { 'x-executor-token': EXECUTOR_TOKEN as string },
      }
    );
    expect(res.status).toBe(200);
    if (!json || json.success !== true) throw new Error('expected success shape');
    expect(json.data.ok).toBe(true);
  });
});
