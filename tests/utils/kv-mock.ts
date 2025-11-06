import type { KVNamespace } from '@cloudflare/workers-types';

interface StoredEntry {
  value: string;
  expiration?: number;
  metadata?: unknown;
}

interface LastWrite {
  key: string;
  value: string;
  options?: PutOptionsShape;
}

type PutOptionsShape = {
  expiration?: number;
  expirationTtl?: number;
  metadata?: unknown | null;
};

async function coerceToString(value: unknown): Promise<string> {
  if (typeof value === 'string') return value;
  if (value instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(value));
  }
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const slice = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return new TextDecoder().decode(new Uint8Array(slice));
  }
  if (typeof value === 'object' && value !== null && 'getReader' in (value as any)) {
    const reader = (value as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      if (chunk) {
        result += decoder.decode(chunk, { stream: true });
      }
    }
    result += decoder.decode();
    return result;
  }
  return String(value ?? '');
}

function computeExpiration(options?: PutOptionsShape): number | undefined {
  if (!options) return undefined;
  if (typeof options.expiration === 'number') return options.expiration;
  if (typeof options.expirationTtl === 'number') {
    const nowSeconds = Math.ceil(Date.now() / 1000);
    return nowSeconds + options.expirationTtl;
  }
  return undefined;
}

function resolveType(typeOrOptions: unknown): 'json' | 'text' | undefined {
  if (!typeOrOptions) return undefined;
  if (typeof typeOrOptions === 'string') return typeOrOptions as 'json' | 'text';
  if (typeof typeOrOptions === 'object' && 'type' in typeOrOptions) {
    const candidate = (typeOrOptions as { type?: unknown }).type;
    if (candidate === 'json' || candidate === 'text') return candidate;
  }
  return undefined;
}

function isExpired(entry: StoredEntry): boolean {
  if (!entry.expiration) return false;
  const nowSeconds = Math.ceil(Date.now() / 1000);
  return entry.expiration <= nowSeconds;
}

export interface KVNamespaceMock {
  namespace: KVNamespace;
  getLastWrite(): LastWrite | null;
  readRaw(key: string): string | null;
  readJSON<T>(key: string): T | null;
  clear(): void;
}

export function createKVNamespaceMock(): KVNamespaceMock {
  const store = new Map<string, StoredEntry>();
  let lastWrite: LastWrite | null = null;

  const namespaceImpl = {
    async get(key: unknown, typeOrOptions?: unknown): Promise<any> {
      const keys = Array.isArray(key) ? key : [key];
      const type = resolveType(typeOrOptions);
      const result = new Map<string, unknown>();

      for (const rawKey of keys) {
        const currentKey = String(rawKey);
        const entry = store.get(currentKey);
        if (!entry || isExpired(entry)) {
          if (entry && isExpired(entry)) store.delete(currentKey);
          result.set(currentKey, null);
          continue;
        }

        if (type === 'json') {
          try {
            result.set(currentKey, JSON.parse(entry.value));
          } catch {
            result.set(currentKey, null);
          }
        } else {
          result.set(currentKey, entry.value);
        }
      }

      if (Array.isArray(key)) {
        return result;
      }
      return result.get(String(key)) ?? null;
    },

    async getWithMetadata(key: unknown, typeOrOptions?: unknown): Promise<any> {
      const keys = Array.isArray(key) ? key : [key];
      const values = await this.get(key, typeOrOptions);

      const wrap = (currentKey: string, value: unknown) => {
        const entry = store.get(currentKey);
        if (!entry || isExpired(entry)) {
          if (entry && isExpired(entry)) store.delete(currentKey);
          return { value: null, metadata: null, cacheStatus: null };
        }
        return {
          value,
          metadata: entry.metadata ?? null,
          cacheStatus: null,
        };
      };

      if (Array.isArray(key)) {
        const result = new Map<string, unknown>();
        for (const rawKey of keys) {
          const currentKey = String(rawKey);
          const value = (values as Map<string, unknown>).get(currentKey) ?? null;
          result.set(currentKey, wrap(currentKey, value));
        }
        return result;
      }

      return wrap(String(key), values);
    },

    async put(key: unknown, value: unknown, options?: unknown): Promise<void> {
      const currentKey = String(key);
      const storedValue = await coerceToString(value);
      const normalizedOptions =
        options && typeof options === 'object'
          ? ({ ...(options as PutOptionsShape) } as PutOptionsShape)
          : undefined;
      const expiration = computeExpiration(normalizedOptions);
      const metadata = normalizedOptions?.metadata;

      store.set(currentKey, {
        value: storedValue,
        expiration,
        metadata,
      });

      lastWrite = {
        key: currentKey,
        value: storedValue,
        options: normalizedOptions,
      };
    },

    async delete(key: unknown): Promise<void> {
      store.delete(String(key));
    },

    async list(options?: unknown): Promise<any> {
      const prefix =
        options && typeof options === 'object'
          ? ((options as { prefix?: string | null }).prefix ?? '')
          : '';
      const nowSeconds = Math.ceil(Date.now() / 1000);

      const keys = Array.from(store.entries())
        .filter(([name, entry]) => {
          if (entry.expiration && entry.expiration <= nowSeconds) {
            store.delete(name);
            return false;
          }
          return prefix ? name.startsWith(prefix) : true;
        })
        .map(([name, entry]) => ({
          name,
          expiration: entry.expiration,
          metadata: entry.metadata,
        }));

      return {
        list_complete: true,
        keys,
        cacheStatus: null,
      };
    },
  } as Record<string, (...args: unknown[]) => unknown>;

  const namespace = namespaceImpl as unknown as KVNamespace;

  return {
    namespace,
    getLastWrite: () => (lastWrite ? { ...lastWrite } : null),
    readRaw: (key: string) => {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) return null;
      return entry.value;
    },
    readJSON: <T>(key: string) => {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) return null;
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    },
    clear: () => {
      store.clear();
      lastWrite = null;
    },
  };
}
