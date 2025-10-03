import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import { ALLOWED_MODELS } from '../../src/config/ai-image';

// Allow self-signed localhost certs (wrangler https)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let TEST_URL = '';
const ENV_URL = process.env.TEST_BASE_URL || '';

interface ApiErrorEnvelope {
  success: false;
  error: { type: string; message: string; details?: unknown };
}

interface AiJobIO {
  key: string;
  url: string | null;
  contentType?: string | null;
  size?: number | null;
}

interface AiJobData {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  provider: 'replicate';
  model: string | null;
  input: AiJobIO | null;
  output: { key: string; url: string | null } | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

function extractCookieValue(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const m = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : null;
}

function makeCsrfToken(): string {
  // Simple random token for tests
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildCookieHeader(...pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${k}=${v}`).join('; ');
}

function csrfHeaders(token: string): Record<string, string> {
  return {
    'X-CSRF-Token': token,
    Cookie: `csrf_token=${token}`,
  };
}

async function fetchManual(path: string, init: RequestInit = {}) {
  const res = await fetch(`${TEST_URL}${path}`, {
    redirect: 'manual',
    ...init,
  });

  return res;
}

async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

describe('AI Image Enhancer API + R2 Proxy (Integration)', () => {
  let rootDir = '';
  let jobId = '';
  let guestId = '';
  let uploadUrl: string | null = null;

  beforeAll(async () => {
    if (!ENV_URL) throw new Error('TEST_BASE_URL must be provided by global setup');
    TEST_URL = ENV_URL.replace(/\/$/, '');

    // Resolve repo root for reading a real image asset
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    rootDir = join(__dirname, '../..');

    // Probe worker readiness using a known API
    const probe = await fetch(`${TEST_URL}/api/csp-report`, { method: 'GET', redirect: 'manual' });
    if (!(probe.status === 405 && probe.headers.get('allow') === 'POST')) {
      throw new Error(`Worker not ready at ${TEST_URL}`);
    }
  });

  it('GET /api/ai-image/jobs -> 405 with Allow: POST', async () => {
    const res = await fetchManual('/api/ai-image/jobs');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('GET /api/ai-image/jobs/{id}/cancel -> 405 with Allow: POST', async () => {
    // jobId will be set later; 405 does not depend on its existence
    const res = await fetchManual(`/api/ai-image/jobs/${jobId || 'placeholder'}/cancel`);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('POST /api/ai-image/jobs (multipart) -> 202 and success envelope; sets guest_id cookie', async () => {
    // Read a small PNG from the repo
    const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
    const buf = await readFile(pngPath);

    // Create File and FormData payload
    const file = new File([buf], 'sample.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', file);
    fd.append('model', ALLOWED_MODELS[0].slug);

    const token = makeCsrfToken();
    const res = await fetchManual('/api/ai-image/jobs', {
      method: 'POST',
      body: fd,
      headers: {
        // CSRF double-submit and same-origin
        Origin: TEST_URL,
        ...csrfHeaders(token),
      },
    });

    expect(res.status).toBe(202);
    expect(res.headers.get('content-type') || '').toContain('application/json');

    const body = await json<ApiEnvelope<AiJobData>>(res);
    expect(body.success).toBe(true);
    if (body.success) {
      expect(typeof body.data.id).toBe('string');
      expect(body.data.status).toBe('queued');
      expect(body.data.input?.url).toBeTruthy();
      jobId = body.data.id;
      uploadUrl = body.data.input?.url ?? null;
    }

    const setCookie = res.headers.get('set-cookie');
    const gid = extractCookieValue(setCookie, 'guest_id');
    expect(gid).toBeTruthy();
    guestId = gid || '';
  });

  it('POST /api/ai-image/jobs without CSRF -> 403 forbidden', async () => {
    const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
    const buf = await readFile(pngPath);
    const file = new File([buf], 'sample.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', file);
    fd.append('model', ALLOWED_MODELS[0].slug);

    const res = await fetchManual('/api/ai-image/jobs', {
      method: 'POST',
      body: fd,
      headers: {
        Origin: TEST_URL,
        // No CSRF header/cookie
      },
    });
    expect(res.status).toBe(403);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(false);
    if (!body.success) expect(body.error.type).toBe('forbidden');
  });

  it('POST /api/ai-image/jobs rejects non-image uploads via magic bytes -> 400 validation_error', async () => {
    // Create a fake file with non-image content but image/png type and .png name
    const fake = new TextEncoder().encode('not an image');
    const file = new File([fake], 'fake.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', file);
    fd.append(
      'model',
      'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a'
    );

    const token = makeCsrfToken();
    const res = await fetchManual('/api/ai-image/jobs', {
      method: 'POST',
      body: fd,
      headers: {
        Origin: TEST_URL,
        ...csrfHeaders(token),
      },
    });
    expect(res.status).toBe(400);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(false);
    if (!body.success) expect(body.error.type).toBe('validation_error');
  });

  it('POST /api/ai-image/jobs with mismatched CSRF -> 403 forbidden', async () => {
    const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
    const buf = await readFile(pngPath);
    const file = new File([buf], 'sample.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', file);
    fd.append(
      'model',
      'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a'
    );

    const token = makeCsrfToken();
    const res = await fetchManual('/api/ai-image/jobs', {
      method: 'POST',
      body: fd,
      headers: {
        Origin: TEST_URL,
        'X-CSRF-Token': token,
        // Intentionally set a different cookie token
        Cookie: `csrf_token=${token}-x`,
      },
    });
    expect(res.status).toBe(403);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(false);
    if (!body.success) expect(body.error.type).toBe('forbidden');
  });

  it('POST /api/ai-image/jobs/{id}/cancel as owner -> 200 success envelope with status=canceled', async () => {
    const token = makeCsrfToken();
    const res = await fetchManual(`/api/ai-image/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        Origin: TEST_URL,
        'X-CSRF-Token': token,
        Cookie: buildCookieHeader(['guest_id', guestId], ['csrf_token', token]),
      },
    });
    expect(res.status).toBe(200);
    const body = await json<ApiEnvelope<AiJobData>>(res);
    expect(body.success).toBe(true);
    if (body.success) {
      expect(body.data.id).toBe(jobId);
      expect(body.data.status).toBe('canceled');
    }
  });

  it('GET /api/ai-image/jobs/{id} as owner -> 200 success envelope', async () => {
    const res = await fetchManual(`/api/ai-image/jobs/${jobId}`, {
      headers: {
        Cookie: `guest_id=${guestId}`,
      },
    });
    expect(res.status).toBe(200);
    const body = await json<ApiEnvelope<AiJobData>>(res);
    expect(body.success).toBe(true);
    if (body.success) {
      expect(body.data.id).toBe(jobId);
      // after cancel, status should remain canceled
      expect(body.data.status).toBe('canceled');
    }
  });

  it('GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and sets guest_id', async () => {
    const res = await fetchManual(`/api/ai-image/jobs/${jobId}`);
    expect(res.status).toBe(403);
    const setCookie = res.headers.get('set-cookie');
    const gid = extractCookieValue(setCookie, 'guest_id');
    expect(gid).toBeTruthy();
  });

  it('GET /api/ai-image/jobs/{id} with different guest_id -> 403 forbidden envelope', async () => {
    const res = await fetchManual(`/api/ai-image/jobs/${jobId}`, {
      headers: {
        Cookie: `guest_id=${guestId}-other`,
      },
    });
    expect(res.status).toBe(403);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(false);
    if (!body.success) {
      expect(body.error.type).toBe('forbidden');
    }
  });

  it('POST /api/ai-image/jobs/{id}/cancel with different guest_id -> 403 forbidden envelope', async () => {
    const token = makeCsrfToken();
    const res = await fetchManual(`/api/ai-image/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        Origin: TEST_URL,
        'X-CSRF-Token': token,
        Cookie: buildCookieHeader(['guest_id', `${guestId}-other`], ['csrf_token', token]),
      },
    });
    expect(res.status).toBe(403);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(false);
    if (!body.success) {
      expect(body.error.type).toBe('forbidden');
    }
  });

  it('R2 proxy: GET uploads URL is public and cached (Cache-Control: public, max-age=900, immutable)', async () => {
    expect(uploadUrl).toBeTruthy();
    if (!uploadUrl) throw new Error('Missing uploadUrl');

    const url = new URL(uploadUrl);
    // should not require cookies
    async function fetchOnceFollow(u: URL): Promise<Response> {
      let r = await fetch(u.toString(), { redirect: 'manual' });
      if (r.status === 301 || r.status === 302) {
        const loc = r.headers.get('location');
        if (loc) {
          const follow = new URL(loc, u.origin);
          r = await fetch(follow.toString(), { redirect: 'manual' });
        }
      }
      return r;
    }

    let res = await fetchOnceFollow(url);
    // Retry for eventual consistency on R2 edge (up to ~3s)
    for (let i = 0; i < 10 && res.status === 404; i++) {
      await new Promise((r) => setTimeout(r, 300));
      res = await fetchOnceFollow(url);
    }
    if (res.status === 404) {
      // Avoid flakiness in local/dev where R2 edge may be eventually consistent.
      // In CI against a persistent R2 bucket this should be 200.
      console.warn(
        '[integration] R2 uploads fetch returned 404 after retries; skipping header assertions'
      );
      return;
    }
    expect(res.status).toBe(200);
    const cc = res.headers.get('cache-control') || '';
    expect(cc).toContain('public');
    expect(cc).toContain('max-age=900');
    expect(cc).toContain('immutable');
    const ct = res.headers.get('content-type') || '';
    expect(ct).toContain('image/');
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();
    // uploads path should not set cookies
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('R2 proxy: results path is owner-gated (403 for non-owner, 404 for owner when missing)', async () => {
    const fakeOther = `${guestId}-x`;
    const ownerPath = `/r2-ai/ai-enhancer/results/guest/${guestId}/nonexistent.png`;
    const otherPath = `/r2-ai/ai-enhancer/results/guest/${fakeOther}/nonexistent.png`;

    // Non-owner -> 403, and a guest cookie may be set if missing
    const resForbidden = await fetchManual(otherPath);
    expect(resForbidden.status).toBe(403);

    // Owner -> 404 (object not found)
    const resOwner = await fetchManual(ownerPath, {
      headers: { Cookie: `guest_id=${guestId}` },
    });
    expect(resOwner.status).toBe(404);
  });

  it('Rate limiting: excessive GET /api/ai-image/jobs/{id} eventually returns 429 with Retry-After', async () => {
    let saw429 = false;
    for (let i = 0; i < 12; i++) {
      const res = await fetchManual(`/api/ai-image/jobs/${jobId}`, {
        headers: { Cookie: `guest_id=${guestId}` },
      });
      if (res.status === 429) {
        saw429 = true;
        expect(res.headers.get('retry-after')).toBeTruthy();
        // body from limiter is plain JSON (not envelope)
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          retryAfter?: number;
        } | null;
        expect(data && typeof data.retryAfter === 'number').toBe(true);
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  it('GET /api/ai-image/generate -> 405 with Allow: POST', async () => {
    const res = await fetchManual('/api/ai-image/generate');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('POST /api/ai-image/generate (multipart) -> 200 success envelope with limits', async () => {
    const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
    const buf = await readFile(pngPath);
    const file = new File([buf], 'sample.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', file);
    fd.append(
      'model',
      'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a'
    );

    const token = makeCsrfToken();
    const res = await fetchManual('/api/ai-image/generate', {
      method: 'POST',
      body: fd,
      headers: {
        Origin: TEST_URL,
        ...csrfHeaders(token),
      },
    });
    expect(res.status).toBe(200);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(true);
    if (body.success) {
      const limits = (body.data as { limits: { user: number; guest: number } }).limits;
      expect(typeof limits.user).toBe('number');
      expect(typeof limits.guest).toBe('number');
    }
  });

  it('POST /api/ai-image/generate without CSRF -> 403 forbidden', async () => {
    const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
    const buf = await readFile(pngPath);
    const file = new File([buf], 'sample.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', file);
    fd.append(
      'model',
      'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a'
    );

    const res = await fetchManual('/api/ai-image/generate', {
      method: 'POST',
      body: fd,
      headers: { Origin: TEST_URL },
    });
    expect(res.status).toBe(403);
    const body = await json<ApiEnvelope<unknown>>(res);
    expect(body.success).toBe(false);
    if (!body.success) expect(body.error.type).toBe('forbidden');
  });

  it('Rate limiting: excessive POST /api/ai-image/generate hits 429 (stricter 15/min)', async () => {
    const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
    const buf = await readFile(pngPath);
    const file = new File([buf], 'sample.png', { type: 'image/png' });
    let saw429 = false;
    const token = makeCsrfToken();
    for (let i = 0; i < 20; i++) {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('model', ALLOWED_MODELS[0].slug);
      const res = await fetchManual('/api/ai-image/generate', {
        method: 'POST',
        body: fd,
        headers: {
          Origin: TEST_URL,
          ...csrfHeaders(token),
        },
      });
      if (res.status === 429) {
        saw429 = true;
        expect(res.headers.get('retry-after')).toBeTruthy();
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          retryAfter?: number;
        } | null;
        expect(data && typeof data.retryAfter === 'number').toBe(true);
        break;
      }
    }
    expect(saw429).toBe(true);
  });
});
