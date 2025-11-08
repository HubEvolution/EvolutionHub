import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/pages/api/ai-video/usage';
import { rollingDailyKey } from '@/lib/kv/usage';

class KvMock {
  store = new Map<string, string>();

  async get(key: string, type?: 'text' | 'json'): Promise<any> {
    const value = this.store.get(key) ?? null;
    if (!value) return null;
    if (type === 'json') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function createCookies(initial: Record<string, string> = {}) {
  const jar = new Map(Object.entries(initial).map(([k, v]) => [k, { value: v }]));
  return {
    get: (name: string) => jar.get(name),
    set: (name: string, value: string, _options?: unknown) => {
      jar.set(name, { value });
    },
  } satisfies {
    get: (name: string) => { value: string } | undefined;
    set: (name: string, value: string, options?: unknown) => void;
  };
}

function createRequest(url: string) {
  return new Request(url, {
    method: 'GET',
    headers: {
      Origin: new URL(url).origin,
    },
  });
}

describe('GET /api/ai-video/usage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns guest limits when no KV entry exists', async () => {
    const url = 'https://hub-evolution.com/api/ai-video/usage';
    const context = {
      request: createRequest(url),
      locals: {
        user: null,
        runtime: { env: {} },
      },
      cookies: createCookies({ guest_id: 'guest-test' }),
    } as unknown as Parameters<typeof GET>[0];

    const response = await GET(context);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      success: boolean;
      data: { limit: number; remaining: number; resetAt: number };
    };
    expect(payload.success).toBe(true);
    expect(payload.data.limit).toBe(0);
    expect(payload.data.remaining).toBe(0);
    expect(typeof payload.data.resetAt).toBe('number');
    expect(Number.isFinite(payload.data.resetAt)).toBe(true);
  });

  it('honours existing KV usage for users', async () => {
    const kv = new KvMock();
    const ownerType = 'user';
    const ownerId = 'user-123';
    const key = rollingDailyKey('ai-video', ownerType, ownerId);
    const resetAtSec = Math.floor(Date.now() / 1000) + 3600;
    await kv.put(
      key,
      JSON.stringify({
        count: 250,
        resetAt: resetAtSec,
      })
    );

    const url = 'https://hub-evolution.com/api/ai-video/usage';
    const context = {
      request: createRequest(url),
      locals: {
        user: {
          id: ownerId,
          plan: 'premium',
        },
        runtime: { env: { KV_AI_VIDEO_USAGE: kv } },
      },
      cookies: createCookies(),
    } as unknown as Parameters<typeof GET>[0];

    const response = await GET(context);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      success: boolean;
      data: { limit: number; remaining: number; resetAt: number };
    };
    expect(payload.success).toBe(true);
    // premium plan => 1000 tenths = 100 credits
    expect(payload.data.limit).toBe(100);
    // used 250 tenths => remaining 75 credits
    expect(payload.data.remaining).toBeCloseTo(75);
    expect(payload.data.resetAt).toBe(resetAtSec * 1000);
    expect(response.headers.get('X-Usage-Limit')).toBe('100');
    expect(response.headers.get('X-Usage-Remaining')).toBe('75');
  });
});
