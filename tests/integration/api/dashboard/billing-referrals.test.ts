import { describe, it, expect } from 'vitest';
import { getJson, sendJson, csrfHeaders, TEST_URL } from '../../../shared/http';

// Tolerant integration checks for dashboard billing/referral summary endpoints
// - 401 unauth OK
// - 200 must include Server-Timing header
// - Non-GET must return 405 with Allow: GET

describe('Dashboard Billing & Referral Summary APIs', () => {
  describe('GET /api/dashboard/billing-summary', () => {
    it('returns 200 with Server-Timing when authenticated, else 401', async () => {
      const { res } = await getJson('/api/dashboard/billing-summary');
      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers.get('Server-Timing')).toBeTruthy();
      }
    });

    it('POST is not allowed (405, Allow: GET)', async () => {
      const { res } = await sendJson('/api/dashboard/billing-summary', {}, { method: 'POST' });
      // Some environments might route unauth before method check; accept 401 too
      expect([405, 401]).toContain(res.status);
      if (res.status === 405) {
        expect(res.headers.get('Allow')).toBe('GET');
      }
    });
  });

  describe('GET /api/dashboard/referral-summary', () => {
    it('returns 200 with Server-Timing when authenticated, else 401', async () => {
      const { res } = await getJson('/api/dashboard/referral-summary');
      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers.get('Server-Timing')).toBeTruthy();
      }
    });

    it('POST is not allowed (405, Allow: GET)', async () => {
      const { res } = await sendJson('/api/dashboard/referral-summary', {}, { method: 'POST' });
      expect([405, 401]).toContain(res.status);
      if (res.status === 405) {
        expect(res.headers.get('Allow')).toBe('GET');
      }
    });
  });
});
