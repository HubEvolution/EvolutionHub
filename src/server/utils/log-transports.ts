import type { LogEntry, LogTransport } from '@/types/logger';

function safeJson(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return JSON.stringify({ error: 'unstringifiable' });
  }
}

export class ConsoleTransport implements LogTransport {
  name = 'console';
  // Console output is handled by the logger itself; this is a no-op transport
  async send(_entry: LogEntry): Promise<void> {
    return;
  }
  async close(): Promise<void> {
    return;
  }
  isConnected(): boolean {
    return true;
  }
}

export class HttpTransport implements LogTransport {
  name = 'http';
  private endpoint: string;
  private apiKey?: string;

  constructor(opts: { endpoint: string; apiKey?: string }) {
    this.endpoint = opts.endpoint;
    this.apiKey = opts.apiKey;
  }

  async send(entry: LogEntry): Promise<void> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.apiKey) headers['authorization'] = `Bearer ${this.apiKey}`;

    // Use globalThis.fetch so this works in CF Workers and Node (tests)
    const res = await (globalThis.fetch?.(this.endpoint, {
      method: 'POST',
      headers,
      body: safeJson(entry),
    }) ?? Promise.resolve({ ok: true } as Response));

    if (!(res as any).ok) {
      // Swallow errors; logging failures must not break app flow
      return;
    }
  }

  async close(): Promise<void> {
    return;
  }

  isConnected(): boolean {
    return Boolean(this.endpoint);
  }
}

// Minimal Analytics Engine transport that writes a datapoint if available.
// Expects a binding-like object on globalThis.__ANALYTICS__ with writeDataPoint()
export class AnalyticsTransport implements LogTransport {
  name = 'analytics';
  private datasetKey: string;

  constructor(datasetBindingName?: string) {
    this.datasetKey = datasetBindingName || '__ANALYTICS__';
  }

  private get dataset(): { writeDataPoint: (data: Record<string, unknown>) => void } | null {
    const anyGlobal = globalThis as unknown as Record<string, any>;
    const ds = anyGlobal[this.datasetKey];
    if (ds && typeof ds.writeDataPoint === 'function') return ds;
    return null;
  }

  async send(entry: LogEntry): Promise<void> {
    const ds = this.dataset;
    if (!ds) return;
    try {
      ds.writeDataPoint({
        index: entry.level,
        blobs: [entry.message, entry.source ?? ''],
        doubles: [Date.parse(String(entry.timestamp)) || Date.now()],
        // Flatten a couple of common fields only; details stay in http transport
      });
    } catch {
      // ignore
    }
  }

  async close(): Promise<void> {
    return;
  }

  isConnected(): boolean {
    return Boolean(this.dataset);
  }
}

// Optional R2 transport for Logpush-like JSONL files. Expects globalThis.__R2_LOGS__ with put()
export class R2Transport implements LogTransport {
  name = 'r2';
  private bucketKey: string;

  constructor(bucketBindingName?: string) {
    this.bucketKey = bucketBindingName || '__R2_LOGS__';
  }

  private get bucket(): { put: (key: string, body: string) => Promise<void> } | null {
    const anyGlobal = globalThis as unknown as Record<string, any>;
    const b = anyGlobal[this.bucketKey];
    if (b && typeof b.put === 'function') return b;
    return null;
  }

  async send(entry: LogEntry): Promise<void> {
    const bucket = this.bucket;
    if (!bucket) return;
    try {
      const ts = new Date(entry.timestamp).toISOString();
      const d = ts.slice(0, 10).replace(/-/g, '/'); // yyyy/mm/dd
      const h = ts.slice(11, 13);
      const id = entry.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = `logs/${d}/${h}/${id}.jsonl`;
      const line = safeJson(entry) + '\n';
      await bucket.put(key, line);
    } catch {
      // ignore
    }
  }

  async close(): Promise<void> {
    return;
  }

  isConnected(): boolean {
    return Boolean(this.bucket);
  }
}
