import { describe, it, expect } from 'vitest';
import { GET, PUT, PATCH, DELETE, OPTIONS, HEAD } from '@/pages/api/auth/register';

const expect405 = async (resPromise: Promise<Response> | Response) => {
  const res = resPromise instanceof Response ? resPromise : await resPromise;
  expect(res.status).toBe(405);
  expect(res.headers.get('Allow')).toBe('POST');
  expect(res.headers.get('Content-Type')).toMatch(/application\/json/);
  // Security headers present
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  const bodyText = await res.text();
  const body = JSON.parse(bodyText);
  expect(body).toMatchObject({ error: true, message: 'Method Not Allowed' });
};

describe('Register-V2 Method 405 handling', () => {
  it('GET returns 405 with Allow: POST', async () => {
    await expect405((GET as any)());
  });

  it('PUT returns 405 with Allow: POST', async () => {
    await expect405((PUT as any)());
  });

  it('PATCH returns 405 with Allow: POST', async () => {
    await expect405((PATCH as any)());
  });

  it('DELETE returns 405 with Allow: POST', async () => {
    await expect405((DELETE as any)());
  });

  it('OPTIONS returns 405 with Allow: POST', async () => {
    await expect405((OPTIONS as any)());
  });

  it('HEAD returns 405 with Allow: POST', async () => {
    await expect405((HEAD as any)());
  });
});
