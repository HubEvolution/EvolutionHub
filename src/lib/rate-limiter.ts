/**
 * Rate-Limiting-Middleware für Evolution Hub
 * 
 * Dieses Modul bietet eine Middleware, die Rate-Limiting auf API-Ebene implementiert,
 * um die Anwendung vor Brute-Force-, DoS- und anderen Missbrauchsversuchen zu schützen.
 */

import { logRateLimitExceeded } from '@/lib/security-logger';

interface RateLimitConfig {
  // Maximale Anzahl von Anfragen innerhalb des Zeitfensters
  maxRequests: number;
  
  // Zeitfenster in Millisekunden
  windowMs: number;
  
  // Name des Rate-Limiters (für Protokollierungs- und Debugging-Zwecke)
  name?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-Memory-Store für Rate-Limiting-Daten (in Produktion durch Redis o.ä. ersetzen)
const limitStores: Record<string, RateLimitStore> = {};

/**
 * Ermittelt einen eindeutigen Schlüssel für einen Benutzer/eine Anfrage basierend auf IP und User-ID
 * 
 * @param context Der Astro-Kontext der Anfrage
 * @returns Ein eindeutiger Schlüssel für Rate-Limiting
 */
function getRateLimitKey(context: any): string {
  // In einer echten Umgebung würde man die IP-Adresse und optional die User-ID verwenden
  const clientIp = context.clientAddress || '0.0.0.0';
  const userId = context.locals?.user?.id || 'anonymous';
  
  return `${clientIp}:${userId}`;
}

/**
 * Erstellt einen Rate-Limiter mit der angegebenen Konfiguration
 * 
 * @param config Die Rate-Limiter-Konfiguration
 * @returns Eine Middleware-Funktion für Rate-Limiting
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiterName = config.name || 'default';
  
  // Stellt sicher, dass der Store für diesen Limiter existiert
  if (!limitStores[limiterName]) {
    limitStores[limiterName] = {};
  }
  
  const store = limitStores[limiterName];
  
  // Gibt in regelmäßigen Abständen abgelaufene Einträge aus dem Store frei
  // (In einer Produktionsumgebung würde man einen besseren Mechanismus verwenden)
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
      if (store[key].resetAt <= now) {
        delete store[key];
      }
    });
  }, 60000); // Einmal pro Minute aufräumen
  
  // Die eigentliche Rate-Limiting-Middleware
  return async function rateLimitMiddleware(context: any) {
    const key = getRateLimitKey(context);
    const now = Date.now();
    
    // Prüfen, ob es bereits einen Eintrag für diesen Schlüssel gibt
    if (!store[key]) {
      // Neuen Eintrag erstellen
      store[key] = {
        count: 1,
        resetAt: now + config.windowMs
      };
      return; // Erste Anfrage, kein Rate-Limiting
    }
    
    const entry = store[key];
    
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
        resetAt: entry.resetAt
      });
      
      // Berechnen, wann der Client wieder Anfragen stellen darf
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      
      // HTTP 429 Too Many Requests zurückgeben
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: retryAfterSeconds
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds)
        }
      });
    }
    
    // Anfragezähler erhöhen
    entry.count += 1;
  };
}

/**
 * Vorkonfigurierte Rate-Limiter für häufig verwendete Szenarien
 */

// Für normale API-Anfragen (50 Anfragen pro Minute)
export const standardApiLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 1000, // 1 Minute
  name: 'standardApi'
});

// Für Authentifizierungs-Endpunkte (10 Anfragen pro Minute)
export const authLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 Minute
  name: 'auth'
});

// Für sensible Endpunkte wie Passwort-Reset (5 Anfragen pro Stunde)
export const sensitiveActionLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 Stunde
  name: 'sensitiveAction'
});

// Für allgemeine API-Endpunkte (30 Anfragen pro Minute)
export const apiRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 Minute
  name: 'api'
});

// Für asynchrone AI-Job-Endpunkte (strenger: 10 Anfragen pro Minute)
export const aiJobsLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 Minute
  name: 'aiJobs'
});

// Für synchrone AI-Generierung (strenger als allgemeine API: 15 Anfragen pro Minute)
export const aiGenerateLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 Minute
  name: 'aiGenerate'
});
