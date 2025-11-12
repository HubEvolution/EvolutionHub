/**
 * Rate-Limiting-Middleware für Evolution Hub
 *
 * Dieses Modul bietet eine Middleware, die Rate-Limiting auf API-Ebene implementiert,
 * um die Anwendung vor Brute-Force-, DoS- und anderen Missbrauchsversuchen zu schützen.
 */

import type { APIContext } from 'astro';
import { logRateLimitExceeded } from '@/lib/security-logger';

export const MIN_KV_TTL_SECONDS = 60;

export interface RateLimitConfig {
  // Maximale Anzahl von Anfragen innerhalb des Zeitfensters
  maxRequests: number;

  // Zeitfenster in Millisekunden
  windowMs: number;

  // Name des Rate-Limiters (für Protokollierungs- und Debugging-Zwecke)
  name?: string;
}

export interface RateLimitStoreEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStoreMemory {
  [key: string]: RateLimitStoreEntry;
}

export type RateLimiterContext = {
  request: APIContext['request'];
  clientAddress?: APIContext['clientAddress'];
  locals?: APIContext['locals'];
};

export type RateLimiterResult = Response | { success?: boolean } | void;

export type RateLimiter = (context: RateLimiterContext) => Promise<RateLimiterResult>;

// In-Memory-Store (Fallback) – für lokale Tests/ohne KV
const limitStores: Record<string, RateLimitStoreMemory> = {};
const limiterConfigs: Record<string, Required<RateLimitConfig>> = {};

/**
 * Ermittelt einen eindeutigen Schlüssel für einen Benutzer/eine Anfrage basierend auf IP und User-ID
 *
 * @param context Der Astro-Kontext der Anfrage
 * @returns Ein eindeutiger Schlüssel für Rate-Limiting
 */
function getRateLimitKey(context: RateLimiterContext): string {
  // In einer echten Umgebung würde man die IP-Adresse und optional die User-ID verwenden
  const clientIp = context.clientAddress || '0.0.0.0';
  const locals = context.locals as { user?: { id?: string } | null } | undefined;
  const userId = locals?.user?.id || 'anonymous';

  return `${clientIp}:${userId}`;
}

// Intern: KV-Auflösung und Helpers
export type AnyEnv = Record<string, unknown>;
export interface MaybeKV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list?: (opts?: { prefix?: string }) => Promise<{ keys: Array<{ name: string }> }>;
}

function resolveRuntimeEnv(context: RateLimiterContext): AnyEnv | undefined {
  try {
    const env = (context.locals as unknown as { runtime?: { env?: AnyEnv } })?.runtime?.env;
    return env;
  } catch {
    return undefined;
  }
}

function resolveKvBinding(env?: AnyEnv): MaybeKV | undefined {
  if (!env) return undefined;
  // Priorität: expliziter RL-Binding, sonst generische vorhandene KV-Namespaces
  const candidates = [
    'KV_RATE_LIMITER',
    'RATE_LIMIT_KV',
    'KV_COMMENTS',
    'KV_WEBSCRAPER',
    'KV_AI_ENHANCER',
    'KV_PROMPT_ENHANCER',
    'SESSION',
  ];
  for (const name of candidates) {
    const ns = env[name] as unknown as MaybeKV | undefined;
    if (ns && typeof ns.get === 'function' && typeof ns.put === 'function') {
      return ns;
    }
  }
  return undefined;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 15): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      const delay = baseDelayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function kvKeyFor(limiterName: string, key: string): string {
  return `rl:${limiterName}:${key}`;
}

/**
 * Erstellt einen Rate-Limiter mit der angegebenen Konfiguration
 *
 * @param config Die Rate-Limiter-Konfiguration
 * @returns Eine Middleware-Funktion für Rate-Limiting
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const limiterName = config.name || 'default';

  // Stellt sicher, dass der Store für diesen Limiter existiert
  if (!limitStores[limiterName]) {
    limitStores[limiterName] = {};
  }

  // Konfiguration für Introspection registrieren
  limiterConfigs[limiterName] = {
    name: limiterName,
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  };

  // In-Memory Cleanup-Task (wirkt nur auf den In-Memory-Fallback)
  const memStore = limitStores[limiterName];
  setInterval(() => {
    const now = Date.now();
    Object.keys(memStore).forEach((key) => {
      if (memStore[key].resetAt <= now) {
        delete memStore[key];
      }
    });
  }, 60000);

  // Die eigentliche Rate-Limiting-Middleware
  const rateLimitMiddleware: RateLimiter = async (context) => {
    const key = getRateLimitKey(context);
    const now = Date.now();
    const windowMs = config.windowMs;
    const windowSeconds = Math.ceil(windowMs / 1000);

    // Bevorzugt KV-gestützte Persistenz
    const env = resolveRuntimeEnv(context);
    const kv = resolveKvBinding(env);

    if (kv) {
      const storageKey = kvKeyFor(limiterName, key);
      // KV get + update mit rudimentärem Retry
      const raw = await withRetry(() => kv.get(storageKey));
      if (!raw) {
        const entry = { count: 1, resetAt: now + windowMs };
        await withRetry(() =>
          kv.put(storageKey, JSON.stringify(entry), {
            expirationTtl: Math.max(MIN_KV_TTL_SECONDS, windowSeconds + 5),
          })
        );
        return;
      }
      let entry: { count: number; resetAt: number } | null = null;
      try {
        entry = JSON.parse(raw) as { count: number; resetAt: number };
      } catch {
        entry = null;
      }
      if (!entry) {
        const fresh = { count: 1, resetAt: now + windowMs };
        await withRetry(() =>
          kv.put(storageKey, JSON.stringify(fresh), {
            expirationTtl: Math.max(MIN_KV_TTL_SECONDS, windowSeconds + 5),
          })
        );
        return;
      }
      if (entry.resetAt <= now) {
        const reset = { count: 1, resetAt: now + windowMs };
        await withRetry(() =>
          kv.put(storageKey, JSON.stringify(reset), {
            expirationTtl: Math.max(MIN_KV_TTL_SECONDS, windowSeconds + 5),
          })
        );
        return;
      }
      if (entry.count >= config.maxRequests) {
        const targetResource = new URL(context.request.url).pathname;
        const clientIp = context.clientAddress || '0.0.0.0';
        logRateLimitExceeded(clientIp, targetResource, {
          limiterName,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
          resetAt: entry.resetAt,
        });
        const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: retryAfterSeconds,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfterSeconds),
            },
          }
        );
      }
      // increment and persist remaining TTL
      entry.count += 1;
      const ttlRemaining = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      await withRetry(() =>
        kv.put(storageKey, JSON.stringify(entry), {
          expirationTtl: Math.max(MIN_KV_TTL_SECONDS, ttlRemaining + 2),
        })
      );
      return;
    }

    // Fallback: In-Memory
    let entry = memStore[key];

    // Initialisierung, wenn noch kein Eintrag existiert
    if (!entry) {
      entry = { count: 1, resetAt: now + config.windowMs };
      memStore[key] = entry;
      return; // Erste Anfrage innerhalb des Fensters
    }

    // Prüfen, ob das Zeitfenster abgelaufen ist
    if (entry.resetAt <= now) {
      // Zurücksetzen für ein neues Zeitfenster
      entry.count = 1;
      entry.resetAt = now + config.windowMs;
      return; // Neue Periode, kein Rate-Limiting
    }

    // Prüfen, ob das Limit erreicht ist
    if (entry.count >= config.maxRequests) {
      // Rate-Limit überschritten, loggen und Fehler zurückgeben
      const targetResource = new URL(context.request.url).pathname;
      const clientIp = context.clientAddress || '0.0.0.0';

      logRateLimitExceeded(clientIp, targetResource, {
        limiterName,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        resetAt: entry.resetAt,
      });

      // Berechnen, wann der Client wieder Anfragen stellen darf
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

      // HTTP 429 Too Many Requests zurückgeben
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    // Anfragezähler erhöhen
    entry.count += 1;
    return undefined;
  };

  return rateLimitMiddleware;
}

/**
 * Vorkonfigurierte Rate-Limiter für häufig verwendete Szenarien
 */

// Für normale API-Anfragen (50 Anfragen pro Minute)
export const standardApiLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 1000, // 1 Minute
  name: 'standardApi',
});

// Für Authentifizierungs-Endpunkte (10 Anfragen pro Minute)
export const authLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 Minute
  name: 'auth',
});

// Für sensible Endpunkte wie Passwort-Reset (5 Anfragen pro Stunde)
export const sensitiveActionLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 Stunde
  name: 'sensitiveAction',
});

// Für allgemeine API-Endpunkte (30 Anfragen pro Minute in Prod; erhöht in Dev für Tests)
export const apiRateLimiter = createRateLimiter({
  maxRequests: import.meta.env.DEV ? 1000 : 30,
  windowMs: 60 * 1000, // 1 Minute
  name: 'api',
});

// Für asynchrone AI-Job-Endpunkte (strenger: 10 Anfragen pro Minute)
export const aiJobsLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 Minute
  name: 'aiJobs',
});

// Für synchrone AI-Generierung (strenger als allgemeine API: 15 Anfragen pro Minute)
export const aiGenerateLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 Minute
  name: 'aiGenerate',
});

// Für Voice-Transkription (15 Anfragen pro Minute)
export const voiceTranscribeLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 Minute
  name: 'voiceTranscribe',
});

export const contactFormLimiter = createRateLimiter({
  maxRequests: import.meta.env.DEV ? 50 : 5,
  windowMs: 60 * 1000,
  name: 'contactForm',
});

export const webEvalTaskLimiter = createRateLimiter({
  maxRequests: import.meta.env.DEV ? 1000 : 10,
  windowMs: 60 * 1000,
  name: 'webEvalTasks',
});

// For Cloudflare Browser Rendering run endpoint (stricter: 5/min)
export const webEvalBrowserLimiter = createRateLimiter({
  maxRequests: import.meta.env.DEV ? 200 : 5,
  windowMs: 60 * 1000,
  name: 'webEvalBrowser',
});

/**
 * Einfache Rate-Limiting-Funktion für Service-Layer
 * Nutzt die bestehende Store-Infrastruktur ohne Request-Kontext
 *
 * @param key - Eindeutiger Schlüssel für Rate-Limit (z.B. IP, User-ID, Action)
 * @param maxRequests - Maximale Anzahl erlaubter Anfragen
 * @param windowSeconds - Zeitfenster in Sekunden
 * @throws Error wenn Rate-Limit überschritten
 *
 * @example
 * // In Service-Methoden:
 * await rateLimit(`comment:${userId}`, 5, 60); // 5 Kommentare pro Minute
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  options?: {
    env?: Record<string, unknown>;
    kv?: MaybeKV;
    limiterName?: string;
    retry?: { attempts?: number; baseDelayMs?: number };
  }
): Promise<void> {
  const limiterName = 'service-limiter';
  const attempts = options?.retry?.attempts ?? 3;
  const baseDelayMs = options?.retry?.baseDelayMs ?? 15;
  const env = options?.env;
  const kv = options?.kv ?? resolveKvBinding(env);
  const useLimiterName = options?.limiterName || limiterName;

  if (kv) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const storageKey = kvKeyFor(useLimiterName, key);
    const raw = await withRetry(() => kv.get(storageKey), attempts, baseDelayMs);
    if (!raw) {
      const entry = { count: 1, resetAt: now + windowMs };
      await withRetry(
        () => kv.put(storageKey, JSON.stringify(entry), { expirationTtl: windowSeconds + 5 }),
        attempts,
        baseDelayMs
      );
      return;
    }
    let entry: { count: number; resetAt: number } | null = null;
    try {
      entry = JSON.parse(raw) as { count: number; resetAt: number };
    } catch {
      entry = null;
    }
    if (!entry || entry.resetAt <= now) {
      const reset = { count: 1, resetAt: now + windowMs };
      await withRetry(
        () => kv.put(storageKey, JSON.stringify(reset), { expirationTtl: windowSeconds + 5 }),
        attempts,
        baseDelayMs
      );
      return;
    }
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new Error(`Rate limit exceeded. Please retry after ${retryAfter} seconds.`);
    }
    entry.count += 1;
    const ttlRemaining = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    await withRetry(
      () => kv.put(storageKey, JSON.stringify(entry), { expirationTtl: ttlRemaining + 2 }),
      attempts,
      baseDelayMs
    );
    return;
  }

  // Fallback In-Memory
  if (!limitStores[limiterName]) {
    limitStores[limiterName] = {};
  }
  const store = limitStores[limiterName];
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  if (!store[key]) {
    store[key] = { count: 1, resetAt: now + windowMs };
    return;
  }
  const entry = store[key];
  if (entry.resetAt <= now) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return;
  }
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new Error(`Rate limit exceeded. Please retry after ${retryAfter} seconds.`);
  }
  entry.count += 1;
}

/**
 * Liefert den Zustand aller oder eines spezifischen Limiters.
 */
export async function getLimiterState(
  name?: string,
  options?: { env?: Record<string, unknown>; kv?: MaybeKV }
) {
  const names = name ? [name] : Object.keys(limitStores);
  const env = options?.env;
  const kv = options?.kv ?? resolveKvBinding(env);
  const result: Record<
    string,
    {
      maxRequests: number;
      windowMs: number;
      entries: Array<{ key: string; count: number; resetAt: number }>;
    }
  > = {};
  for (const n of names) {
    const cfg = limiterConfigs[n];
    const memEntries = Object.entries(limitStores[n] || {}).map(([key, v]) => ({
      key,
      count: v.count,
      resetAt: v.resetAt,
    }));
    let entries = memEntries;
    if (kv && typeof kv.list === 'function') {
      try {
        const list = await kv.list({ prefix: kvKeyFor(n, '') });
        const kvEntries: Array<{ key: string; count: number; resetAt: number }> = [];
        for (const k of list.keys) {
          const raw = await kv.get(k.name);
          if (!raw) continue;
          try {
            const data = JSON.parse(raw) as { count: number; resetAt: number };
            const logicalKey = k.name.replace(/^rl:[^:]*:/, '');
            kvEntries.push({ key: logicalKey, count: data.count, resetAt: data.resetAt });
          } catch {
            // ignore broken entries
          }
        }
        // KV hat Vorrang, wenn vorhanden
        if (kvEntries.length > 0) entries = kvEntries;
      } catch {
        // ignore KV listing errors
      }
    }
    result[n] = {
      maxRequests: cfg?.maxRequests ?? 0,
      windowMs: cfg?.windowMs ?? 0,
      entries,
    };
  }
  return result;
}

/**
 * Setzt einen bestimmten Schlüssel eines Limiters zurück.
 * Gibt true zurück, wenn der Schlüssel existierte und entfernt wurde.
 */
export async function resetLimiterKey(
  name: string,
  key: string,
  options?: { env?: Record<string, unknown>; kv?: MaybeKV }
): Promise<boolean> {
  let removed = false;
  const store = limitStores[name];
  if (store && store[key]) {
    delete store[key];
    removed = true;
  }
  const kv = options?.kv ?? resolveKvBinding(options?.env);
  if (kv) {
    try {
      await kv.delete(kvKeyFor(name, key));
      removed = true;
    } catch {
      // ignore
    }
  }
  return removed;
}
