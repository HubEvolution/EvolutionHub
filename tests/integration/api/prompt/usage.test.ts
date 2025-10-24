import { describe, it, expect } from 'vitest';

function base(url: string) {
  return url.replace(/\/$/, '');
}

describe('Prompt API: GET /api/prompt/usage', () => {
  const TEST_BASE = base(process.env.TEST_BASE_URL || 'http://127.0.0.1:8787');

  it('returns 200 and expected JSON shape with debug headers', async () => {
    const res = await fetch(`${TEST_BASE}/api/prompt/usage`);
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') || '';
    expect(ct).toContain('application/json');

    const payload = (await res.json()) as any;
    expect(payload && typeof payload === 'object').toBe(true);
    expect(payload.success).toBe(true);
    expect(payload.data).toBeTruthy();
    expect(payload.data).toHaveProperty('ownerType');
    expect(payload.data).toHaveProperty('usage');
    expect(payload.data.usage).toHaveProperty('used');
    expect(payload.data.usage).toHaveProperty('limit');

    const ownerHeader = res.headers.get('X-Usage-OwnerType');
    const limitHeader = res.headers.get('X-Usage-Limit');
    expect(ownerHeader).not.toBeNull();
    expect(limitHeader).not.toBeNull();
  });
});
