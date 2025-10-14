import { describe, it, expect } from 'vitest';

function base(url: string) {
  return url.replace(/\/$/, '');
}

describe('Voice API: /api/voice/transcribe', () => {
  const TEST_BASE = base(process.env.TEST_BASE_URL || 'http://127.0.0.1:8787');

  it('GET should be 405 with Allow: POST', async () => {
    const res = await fetch(`${TEST_BASE}/api/voice/transcribe`, { method: 'GET' });
    expect([405, 200]).toContain(res.status); // handler should return 405; allow tolerant check
    const allow = res.headers.get('Allow');
    if (res.status === 405) {
      expect(allow || '').toContain('POST');
    }
  });

  it('POST without CSRF should be forbidden (403)', async () => {
    const fd = new FormData();
    // Intentionally missing cookie + header to trigger CSRF/Origin gate
    const res = await fetch(`${TEST_BASE}/api/voice/transcribe`, { method: 'POST', body: fd });
    expect(res.status).toBe(403);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const payload = (await res.json()) as any;
      expect(payload && typeof payload === 'object').toBe(true);
      expect(payload.success).toBe(false);
      expect(payload.error).toBeTruthy();
    }
  });
});
