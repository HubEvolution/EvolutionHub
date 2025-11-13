import { describe, it, expect } from 'vitest';
import { getJson, sendJson } from '../../shared/http';

describe('Admin APIs 405/Allow — metrics & users/list', () => {
  it('POST /api/admin/metrics → 405 with Allow: GET', async () => {
    const { res, json } = await sendJson('/api/admin/metrics', {}, { method: 'POST' });
    expect(res.status).toBe(405);
    const allow = res.headers.get('Allow') || res.headers.get('allow') || '';
    expect(allow).toContain('GET');
    if (json && typeof json === 'object') {
      const errType = (json as any)?.error?.type;
      if (typeof errType !== 'undefined') expect(errType).toBe('method_not_allowed');
    }
  });

  it('POST /api/admin/users/list → 405 with Allow: GET', async () => {
    const { res, json } = await sendJson('/api/admin/users/list', {}, { method: 'POST' });
    expect(res.status).toBe(405);
    const allow = res.headers.get('Allow') || res.headers.get('allow') || '';
    expect(allow).toContain('GET');
    if (json && typeof json === 'object') {
      const errType = (json as any)?.error?.type;
      if (typeof errType !== 'undefined') expect(errType).toBe('method_not_allowed');
    }
  });
});
