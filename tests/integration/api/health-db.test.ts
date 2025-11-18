import { describe, it, expect } from 'vitest';
import { getJson } from '../../shared/http';

const ENDPOINT = '/api/health/db';

type DbHealthTables = {
  users: boolean;
  comments: boolean;
  comment_moderation: boolean;
  comment_reports: boolean;
  discount_codes: boolean;
};

type DbHealthPayload = {
  status: 'ok' | 'degraded';
  tables: DbHealthTables;
  duration: string;
  timestamp: string;
  environment: string | null;
  errors?: string[];
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  error: { type: string; message: string; details?: Record<string, unknown> };
};
type ApiResponse<T> = ApiSuccess<T> | ApiError | null;

describe('/api/health/db', () => {
  it('returns ok status when core DB tables are accessible', async () => {
    const { res, json } = await getJson<ApiResponse<DbHealthPayload>>(ENDPOINT);

    expect(res.status).toBe(200);
    if (!json || json.success !== true) {
      throw new Error('expected success response shape');
    }

    const { status, tables } = json.data;
    expect(status).toBe('ok');

    expect(tables.users).toBe(true);
    expect(tables.comments).toBe(true);
    expect(tables.comment_moderation).toBe(true);
    expect(tables.comment_reports).toBe(true);
    expect(tables.discount_codes).toBe(true);
  });
});
