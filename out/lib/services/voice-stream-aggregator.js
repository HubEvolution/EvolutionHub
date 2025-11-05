"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceStreamAggregator = void 0;
class VoiceStreamAggregator {
    constructor(kv, ttlSeconds = 3600) {
        this.kv = kv;
        this.ttlSeconds = ttlSeconds;
        // In-memory fallback for environments/tests without KV
        this.mem = new Map();
    }
    key(jobId) {
        return `voice:job:${jobId}`;
    }
    async get(jobId) {
        const inMem = this.mem?.get(this.key(jobId));
        if (inMem)
            return inMem;
        if (this.kv) {
            // Try JSON first; fall back to text
            const raw = (await this.kv.get(this.key(jobId), 'json'));
            if (raw) {
                let obj = null;
                if (typeof raw === 'string') {
                    try {
                        obj = JSON.parse(raw);
                    }
                    catch {
                        obj = null;
                    }
                }
                else {
                    obj = raw;
                }
                if (obj) {
                    const normalized = {
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
            const asText = (await this.kv.get(this.key(jobId)));
            if (asText) {
                try {
                    const obj = JSON.parse(asText);
                    const normalized = {
                        status: obj.status || 'active',
                        partials: Array.isArray(obj.partials) ? obj.partials : [],
                        final: obj.final,
                        usage: obj.usage,
                        updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
                    };
                    this.mem?.set(this.key(jobId), normalized);
                    return normalized;
                }
                catch { }
            }
        }
        const fromMem = this.mem?.get(this.key(jobId));
        return fromMem ?? null;
    }
    async ensure(jobId) {
        const now = Date.now();
        const cur = await this.get(jobId);
        if (cur)
            return cur;
        const init = { status: 'active', partials: [], updatedAt: now };
        if (this.kv) {
            await this.kv.put(this.key(jobId), JSON.stringify(init), { expirationTtl: this.ttlSeconds });
        }
        this.mem?.set(this.key(jobId), init);
        return init;
    }
    async appendPartial(jobId, text) {
        const now = Date.now();
        const cur = await this.ensure(jobId);
        const partials = [...(cur.partials || []), text];
        const next = { ...cur, partials, updatedAt: now };
        if (this.kv) {
            await this.kv.put(this.key(jobId), JSON.stringify(next), { expirationTtl: this.ttlSeconds });
        }
        this.mem?.set(this.key(jobId), next);
        return next;
    }
    async setFinal(jobId, text) {
        const now = Date.now();
        const cur = await this.ensure(jobId);
        const next = { ...cur, final: text, status: 'done', updatedAt: now };
        if (this.kv) {
            await this.kv.put(this.key(jobId), JSON.stringify(next), { expirationTtl: this.ttlSeconds });
        }
        this.mem?.set(this.key(jobId), next);
        return next;
    }
    async setUsage(jobId, usage) {
        const now = Date.now();
        const cur = await this.ensure(jobId);
        const next = { ...cur, usage, updatedAt: now };
        if (this.kv) {
            await this.kv.put(this.key(jobId), JSON.stringify(next), { expirationTtl: this.ttlSeconds });
        }
        this.mem?.set(this.key(jobId), next);
        return next;
    }
}
exports.VoiceStreamAggregator = VoiceStreamAggregator;
