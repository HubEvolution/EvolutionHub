export type VoiceJobState = {
  status: 'active' | 'done' | 'error';
  partials: string[];
  final?: string;
  usage?: { count: number; limit: number; window: string };
  updatedAt: number;
};

export class VoiceStreamAggregator {
  private kv: any;
  private ttlSeconds: number;

  constructor(kv: any, ttlSeconds = 3600) {
    this.kv = kv;
    this.ttlSeconds = ttlSeconds;
  }

  private key(jobId: string) {
    return `voice:job:${jobId}`;
  }

  async get(jobId: string): Promise<VoiceJobState | null> {
    const v = await this.kv.get(this.key(jobId), { type: 'json' } as any);
    return (v as VoiceJobState) ?? null;
  }

  async ensure(jobId: string): Promise<VoiceJobState> {
    const now = Date.now();
    const cur = await this.get(jobId);
    if (cur) return cur;
    const init: VoiceJobState = { status: 'active', partials: [], updatedAt: now };
    await this.kv.put(this.key(jobId), JSON.stringify(init), {
      expirationTtl: this.ttlSeconds,
    } as any);
    return init;
  }

  async appendPartial(jobId: string, text: string) {
    const now = Date.now();
    const cur = (await this.get(jobId)) ?? { status: 'active', partials: [], updatedAt: now };
    const partials = [...(cur.partials || []), text];
    const next: VoiceJobState = { ...cur, partials, updatedAt: now };
    await this.kv.put(this.key(jobId), JSON.stringify(next), {
      expirationTtl: this.ttlSeconds,
    } as any);
    return next;
  }

  async setFinal(jobId: string, text: string) {
    const now = Date.now();
    const cur = (await this.get(jobId)) ?? { status: 'active', partials: [], updatedAt: now };
    const next: VoiceJobState = { ...cur, final: text, status: 'done', updatedAt: now };
    await this.kv.put(this.key(jobId), JSON.stringify(next), {
      expirationTtl: this.ttlSeconds,
    } as any);
    return next;
  }

  async setUsage(jobId: string, usage: VoiceJobState['usage']) {
    const now = Date.now();
    const cur = (await this.get(jobId)) ?? { status: 'active', partials: [], updatedAt: now };
    const next: VoiceJobState = { ...cur, usage, updatedAt: now };
    await this.kv.put(this.key(jobId), JSON.stringify(next), {
      expirationTtl: this.ttlSeconds,
    } as any);
    return next;
  }
}
