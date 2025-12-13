import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/pages/api/ai-video/generate';

// Minimal KV mock
class KvMock {
  store = new Map<string, string>();
  async get(key: string, type?: any): Promise<any> {
    const v = this.store.get(key) ?? null;
    if (type === 'json') {
      try {
        return v ? JSON.parse(v) : null;
      } catch {
        return null;
      }
    }
    return v;
  }
  async put(key: string, value: string, _opts?: any): Promise<void> {
    this.store.set(key, value);
  }
}

function ymNow() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function packsKey(userId: string) {
  return `ai:credits:user:${userId}:packs`;
}

// Utilities
function makeContext(env: any, user?: { id: string; plan?: string }) {
  return {
    locals: {
      user: user || null,
      runtime: { env },
    },
    request: {
      url: 'https://hub-evolution.com/api/ai-video/generate',
      method: 'POST',
      json: async () => ({ key: 'ai-video/uploads/user/user1/now.mp4', tier: '720p' }),
    },
    cookies: {
      get: (_: string) => undefined,
      set: (_: string, __: string, ___: any) => {},
    },
  } as any;
}

// Global fetch mock
function mockReplicateFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, _init?: unknown) => {
      void _init;
      if (typeof url === 'string' && url.includes('/v1/models/topazlabs/video-upscale')) {
        return new Response(JSON.stringify({ latest_version: { id: 'ver-123' } }), { status: 200 });
      }
      if (typeof url === 'string' && url.includes('/v1/predictions')) {
        return new Response(JSON.stringify({ id: 'pred-xyz', status: 'processing' }), {
          status: 200,
        });
      }
      // default ok
      return new Response('{}', { status: 200 });
    }) as any
  );
}

describe('ai-video generate (quota fallback)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('charges credits when balance is sufficient', async () => {
    mockReplicateFetch();
    const kv = new KvMock();
    // 10 credits (100 tenths) in a single pack
    kv.store.set(
      packsKey('user1'),
      JSON.stringify([
        { id: 'pack1', unitsTenths: 100, createdAt: Date.now(), expiresAt: Date.now() + 1e9 },
      ])
    );
    const env = { KV_AI_ENHANCER: kv as any, REPLICATE_API_TOKEN: 'x' };
    const ctx = makeContext(env, { id: 'user1', plan: 'premium' });

    const res = await POST(ctx);
    expect(res.status).toBe(200);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(true);
    expect(json.data.charge).toBeTruthy();
    // credits path
    expect(json.data.charge.credits).toBe(5);
    // balance reduced to 5 credits
    expect(json.data.charge.balance).toBe(5);
  });

  it('uses monthly quota when credits are 0 and quota remains', async () => {
    mockReplicateFetch();
    const kv = new KvMock();
    // no packs → 0 credits
    const env = { KV_AI_ENHANCER: kv as any, REPLICATE_API_TOKEN: 'x' };
    const ctx = makeContext(env, { id: 'user1', plan: 'premium' });

    const res = await POST(ctx);
    expect(res.status).toBe(200);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(true);
    expect(json.data.charge).toEqual({ credits: 0, quota: true });

    // verify quota counter incremented by 50 tenths
    const key = `ai:quota:video:tenths:user1:${ymNow()}`;
    const used = parseInt((await kv.get(key)) || '0', 10);
    expect(used).toBe(50);
  });

  it('returns insufficient_quota when credits=0 and quota exhausted', async () => {
    mockReplicateFetch();
    const kv = new KvMock();
    const key = `ai:quota:video:tenths:user1:${ymNow()}`;
    // pre-use 990 tenths of 1000
    await kv.put(key, String(990));
    const env = { KV_AI_ENHANCER: kv as any, REPLICATE_API_TOKEN: 'x' };
    const ctx = makeContext(env, { id: 'user1', plan: 'premium' });

    const res = await POST(ctx);
    expect(res.status).toBeGreaterThanOrEqual(400);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(false);
    expect(json.error.message).toBe('insufficient_quota');
  });
});
