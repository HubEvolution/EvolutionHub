export type VoiceJobState = {
  status: 'active' | 'done' | 'error';
  partials: string[];
  final?: string;
  usage?: { count: number; limit: number; window: string };
  updatedAt: number;
};

export class VoiceStreamAggregator {
  private kv: import('@cloudflare/workers-types').KVNamespace | undefined;
  private ttlSeconds: number;
  private mem?: Map<string, VoiceJobState>;

  constructor(kv: import('@cloudflare/workers-types').KVNamespace | undefined, ttlSeconds = 3600) {
    this.kv = kv;
    this.ttlSeconds = ttlSeconds;
    // In-memory fallback for environments/tests without KV
    this.mem = new Map<string, VoiceJobState>();
  }

  private key(jobId: string) {
    return `voice:job:${jobId}`;
  }

  async get(jobId: string): Promise<VoiceJobState | null> {
    const inMem = this.mem?.get(this.key(jobId));
    if (inMem) return inMem;
    if (this.kv) {
      // Try JSON first; fall back to text
      const raw = (await this.kv.get(this.key(jobId), 'json')) as unknown as
        | VoiceJobState
        | string
        | null;
      if (raw) {
        let obj: VoiceJobState | null = null;
        if (typeof raw === 'string') {
          try {
            obj = JSON.parse(raw) as VoiceJobState;
          } catch {
            obj = null;
          }
        } else {
          obj = raw as VoiceJobState;
        }
        if (obj) {
          const normalized: VoiceJobState = {
            status: obj.status || 'active',
            partials: Array.isArray(obj.partials) ? obj.partials : [],
            final: obj.final,
            usage: obj.usage,
            updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
          };
          // cache to memory too
          this.mem?.set(this.key(jobId), normalized);
          return normalized;
        }
      }
      // Fallback: try plain text and parse
      const asText = (await this.kv.get(this.key(jobId))) as unknown as string | null;
      if (asText) {
        try {
          const obj = JSON.parse(asText) as VoiceJobState;
          const normalized: VoiceJobState = {
            status: obj.status || 'active',
            partials: Array.isArray(obj.partials) ? obj.partials : [],
            final: obj.final,
            usage: obj.usage,
            updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
          };
          this.mem?.set(this.key(jobId), normalized);
          return normalized;
        } catch {}
      }
    }
    const fromMem = this.mem?.get(this.key(jobId));
    return fromMem ?? null;
  }

  async ensure(jobId: string): Promise<VoiceJobState> {
    const now = Date.now();
    const cur = await this.get(jobId);
    if (cur) return cur;
    const init: VoiceJobState = { status: 'active', partials: [], updatedAt: now };
    if (this.kv) {
      await this.kv.put(this.key(jobId), JSON.stringify(init), { expirationTtl: this.ttlSeconds });
    }
    this.mem?.set(this.key(jobId), init);
    return init;
  }

  async appendPartial(jobId: string, text: string) {
    const now = Date.now();
    const cur = await this.ensure(jobId);
    const partials = [...(cur.partials || []), text];
    const next: VoiceJobState = { ...cur, partials, updatedAt: now };
    if (this.kv) {
      await this.kv.put(this.key(jobId), JSON.stringify(next), { expirationTtl: this.ttlSeconds });
    }
    this.mem?.set(this.key(jobId), next);
    return next;
  }

  async setFinal(jobId: string, text: string) {
    const now = Date.now();
    const cur = await this.ensure(jobId);
    const next: VoiceJobState = { ...cur, final: text, status: 'done', updatedAt: now };
    if (this.kv) {
      await this.kv.put(this.key(jobId), JSON.stringify(next), { expirationTtl: this.ttlSeconds });
    }
    this.mem?.set(this.key(jobId), next);
    return next;
  }

  async setUsage(jobId: string, usage: VoiceJobState['usage']) {
    const now = Date.now();
    const cur = await this.ensure(jobId);
    const next: VoiceJobState = { ...cur, usage, updatedAt: now };
    if (this.kv) {
      await this.kv.put(this.key(jobId), JSON.stringify(next), { expirationTtl: this.ttlSeconds });
    }
    this.mem?.set(this.key(jobId), next);
    return next;
  }
}
