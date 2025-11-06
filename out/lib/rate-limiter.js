"use strict";
/**
 * Rate-Limiting-Middleware für Evolution Hub
 *
 * Dieses Modul bietet eine Middleware, die Rate-Limiting auf API-Ebene implementiert,
 * um die Anwendung vor Brute-Force-, DoS- und anderen Missbrauchsversuchen zu schützen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactFormLimiter = exports.voiceTranscribeLimiter = exports.aiGenerateLimiter = exports.aiJobsLimiter = exports.apiRateLimiter = exports.sensitiveActionLimiter = exports.authLimiter = exports.standardApiLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
exports.rateLimit = rateLimit;
exports.getLimiterState = getLimiterState;
exports.resetLimiterKey = resetLimiterKey;
const security_logger_1 = require("@/lib/security-logger");
// In-Memory-Store für Rate-Limiting-Daten (in Produktion durch Redis o.ä. ersetzen)
const limitStores = {};
const limiterConfigs = {};
/**
 * Ermittelt einen eindeutigen Schlüssel für einen Benutzer/eine Anfrage basierend auf IP und User-ID
 *
 * @param context Der Astro-Kontext der Anfrage
 * @returns Ein eindeutiger Schlüssel für Rate-Limiting
 */
function getRateLimitKey(context) {
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
function createRateLimiter(config) {
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
    const store = limitStores[limiterName];
    // Gibt in regelmäßigen Abständen abgelaufene Einträge aus dem Store frei
    // (In einer Produktionsumgebung würde man einen besseren Mechanismus verwenden)
    setInterval(() => {
        const now = Date.now();
        Object.keys(store).forEach((key) => {
            if (store[key].resetAt <= now) {
                delete store[key];
            }
        });
    }, 60000); // Einmal pro Minute aufräumen
    // Die eigentliche Rate-Limiting-Middleware
    return async function rateLimitMiddleware(context) {
        const key = getRateLimitKey(context);
        const now = Date.now();
        // Prüfen, ob es bereits einen Eintrag für diesen Schlüssel gibt
        if (!store[key]) {
            // Neuen Eintrag erstellen
            store[key] = {
                count: 1,
                resetAt: now + config.windowMs,
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
            (0, security_logger_1.logRateLimitExceeded)(clientIp, targetResource, {
                limiterName,
                maxRequests: config.maxRequests,
                windowMs: config.windowMs,
                resetAt: entry.resetAt,
            });
            // Berechnen, wann der Client wieder Anfragen stellen darf
            const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
            // HTTP 429 Too Many Requests zurückgeben
            return new Response(JSON.stringify({
                error: 'Rate limit exceeded',
                retryAfter: retryAfterSeconds,
            }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(retryAfterSeconds),
                },
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
exports.standardApiLimiter = createRateLimiter({
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 Minute
    name: 'standardApi',
});
// Für Authentifizierungs-Endpunkte (10 Anfragen pro Minute)
exports.authLimiter = createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 Minute
    name: 'auth',
});
// Für sensible Endpunkte wie Passwort-Reset (5 Anfragen pro Stunde)
exports.sensitiveActionLimiter = createRateLimiter({
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 Stunde
    name: 'sensitiveAction',
});
// Für allgemeine API-Endpunkte (30 Anfragen pro Minute in Prod; erhöht in Dev für Tests)
exports.apiRateLimiter = createRateLimiter({
    maxRequests: import.meta.env.DEV ? 1000 : 30,
    windowMs: 60 * 1000, // 1 Minute
    name: 'api',
});
// Für asynchrone AI-Job-Endpunkte (strenger: 10 Anfragen pro Minute)
exports.aiJobsLimiter = createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 Minute
    name: 'aiJobs',
});
// Für synchrone AI-Generierung (strenger als allgemeine API: 15 Anfragen pro Minute)
exports.aiGenerateLimiter = createRateLimiter({
    maxRequests: 15,
    windowMs: 60 * 1000, // 1 Minute
    name: 'aiGenerate',
});
// Für Voice-Transkription (15 Anfragen pro Minute)
exports.voiceTranscribeLimiter = createRateLimiter({
    maxRequests: 15,
    windowMs: 60 * 1000, // 1 Minute
    name: 'voiceTranscribe',
});
exports.contactFormLimiter = createRateLimiter({
    maxRequests: import.meta.env.DEV ? 50 : 5,
    windowMs: 60 * 1000,
    name: 'contactForm',
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
async function rateLimit(key, maxRequests, windowSeconds) {
    const limiterName = 'service-limiter';
    // Stelle sicher, dass Store existiert
    if (!limitStores[limiterName]) {
        limitStores[limiterName] = {};
    }
    const store = limitStores[limiterName];
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    // Neuer Eintrag
    if (!store[key]) {
        store[key] = {
            count: 1,
            resetAt: now + windowMs,
        };
        return;
    }
    const entry = store[key];
    // Zeitfenster abgelaufen - zurücksetzen
    if (entry.resetAt <= now) {
        entry.count = 1;
        entry.resetAt = now + windowMs;
        return;
    }
    // Rate-Limit überschritten
    if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        throw new Error(`Rate limit exceeded. Please retry after ${retryAfter} seconds.`);
    }
    // Zähler erhöhen
    entry.count += 1;
}
/**
 * Liefert den Zustand aller oder eines spezifischen Limiters.
 */
function getLimiterState(name) {
    const names = name ? [name] : Object.keys(limitStores);
    const state = names.reduce((acc, n) => {
        const cfg = limiterConfigs[n];
        const store = limitStores[n] || {};
        acc[n] = {
            maxRequests: cfg?.maxRequests ?? 0,
            windowMs: cfg?.windowMs ?? 0,
            entries: Object.entries(store).map(([key, v]) => ({
                key,
                count: v.count,
                resetAt: v.resetAt,
            })),
        };
        return acc;
    }, {});
    return state;
}
/**
 * Setzt einen bestimmten Schlüssel eines Limiters zurück.
 * Gibt true zurück, wenn der Schlüssel existierte und entfernt wurde.
 */
function resetLimiterKey(name, key) {
    const store = limitStores[name];
    if (!store)
        return false;
    if (store[key]) {
        delete store[key];
        return true;
    }
    return false;
}
