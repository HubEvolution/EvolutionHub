import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceStreamAggregator, type VoiceJobState } from '@/lib/services/voice-stream-aggregator';

function createMemoryKV() {
  const store = new Map<string, string>();
  let lastPutOpts: any = null;
  return {
    get lastPutOpts() {
      return lastPutOpts;
    },
    async get(key: string, opts?: any) {
      const v = store.get(key);
      if (v == null) return null as any;
      if (opts && opts.type === 'json') {
        try {
          return JSON.parse(v);
        } catch {
          return null as any;
        }
      }
      return v as any;
    },
    async put(key: string, value: string, opts?: any) {
      lastPutOpts = opts || null;
      store.set(key, value);
      return null as any;
    },
  };
}

describe('VoiceStreamAggregator', () => {
  let kv: ReturnType<typeof createMemoryKV>;
  let agg: VoiceStreamAggregator;

  beforeEach(() => {
    kv = createMemoryKV();
    agg = new VoiceStreamAggregator(kv as any, 60);
  });

  it('ensure() initializes a new job state', async () => {
    const jobId = 'job-1';
    const s = await agg.ensure(jobId);
    expect(s.status).toBe('active');
    expect(Array.isArray(s.partials)).toBe(true);
    expect((kv as any).lastPutOpts?.expirationTtl).toBeGreaterThan(0);
  });

  it('appendPartial() accumulates partials and updates updatedAt', async () => {
    const jobId = 'job-2';
    await agg.ensure(jobId);
    const before = await agg.get(jobId);
    await agg.appendPartial(jobId, 'hello');
    const after = await agg.get(jobId);
    expect(after?.partials.length).toBe(1);
    expect(after?.partials[0]).toBe('hello');
    expect((after!.updatedAt as number) >= (before!.updatedAt as number)).toBe(true);
  });

  it('setUsage() stores usage details', async () => {
    const jobId = 'job-3';
    await agg.ensure(jobId);
    const usage = { count: 1, limit: 10, window: '24h' } as VoiceJobState['usage'];
    await agg.setUsage(jobId, usage);
    const s = await agg.get(jobId);
    expect(s?.usage).toEqual(usage);
  });

  it('setFinal() sets final text and marks status done', async () => {
    const jobId = 'job-4';
    await agg.ensure(jobId);
    await agg.appendPartial(jobId, 'a');
    await agg.appendPartial(jobId, 'b');
    await agg.setFinal(jobId, 'final text');
    const s = await agg.get(jobId);
    expect(s?.final).toBe('final text');
    expect(s?.status).toBe('done');
  });
});
