import { test, expect } from '@playwright/test';

// Minimal deterministic smoke: legacy auth endpoints should return 410 Gone
// Config provides baseURL and Origin header.

test.describe('Legacy Auth 410 stubs', () => {
  test('GET /api/auth/verify-email → 410', async ({ request }) => {
    const res = await request.get('/api/auth/verify-email');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/login → 410', async ({ request }) => {
    const res = await request.post('/api/auth/login');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/login → 410 has security headers (saubere Variante)', async ({ request }) => {
    const res = await request.post('/api/auth/login');
    expect(res.status()).toBe(410);
    const headers = res.headers();
    // Security headers baseline via middleware
    expect((headers['x-frame-options'] || '').toUpperCase()).toBe('DENY');
    expect((headers['x-content-type-options'] || '').toLowerCase()).toBe('nosniff');
    expect((headers['referrer-policy'] || '').toLowerCase()).toBe('strict-origin-when-cross-origin');
  });

  test('GET /api/auth/logout → 410', async ({ request }) => {
    const res = await request.get('/api/auth/logout');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/logout → 410', async ({ request }) => {
    const res = await request.post('/api/auth/logout');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/change-password → 410 (unsafe wrapped)', async ({ request }) => {
    const res = await request.post('/api/auth/change-password');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/forgot-password → 410 (unsafe wrapped)', async ({ request }) => {
    const res = await request.post('/api/auth/forgot-password');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/reset-password → 410 (unsafe wrapped)', async ({ request }) => {
    const res = await request.post('/api/auth/reset-password');
    expect(res.status()).toBe(410);
  });

  test('POST /api/auth/register → 410 (unsafe wrapped)', async ({ request }) => {
    const res = await request.post('/api/auth/register');
    expect(res.status()).toBe(410);
  });
});
