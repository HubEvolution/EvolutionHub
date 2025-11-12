'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ensureCsrfToken = ensureCsrfToken;
exports.validateCsrfToken = validateCsrfToken;
exports.createCsrfMiddleware = createCsrfMiddleware;
/**
 * Client-seitige CSRF-Token-Generierung und -Verwaltung
 * Wird im Browser ausgeführt um Token zu erzeugen und in Cookie zu speichern
 */
function ensureCsrfToken() {
  try {
    const cookie = document.cookie || '';
    const m = cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    const buf = new Uint8Array(16);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    const token = Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const attrs = [
      'Path=/',
      'SameSite=Lax',
      typeof location !== 'undefined' && location.protocol === 'https:' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
    document.cookie = `csrf_token=${encodeURIComponent(token)}; ${attrs}`;
    return token;
  } catch {
    return '';
  }
}
/**
 * Server-seitige CSRF-Token-Validierung
 * Prüft ob Token im Request-Body/Header mit Cookie übereinstimmt
 *
 * @param token - Token aus Request-Body oder Header
 * @param cookieHeader - Cookie-Header-String aus Request
 * @returns true wenn Token gültig, false sonst
 */
async function validateCsrfToken(token, cookieHeader) {
  if (!token) {
    return false;
  }
  // Format-Validierung: 32 Hex-Zeichen
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return false;
  }
  // Cookie-Abgleich wenn Cookie-Header vorhanden
  if (cookieHeader) {
    const match = cookieHeader.match(/csrf_token=([^;]+)/);
    const cookieToken = match ? decodeURIComponent(match[1]) : null;
    if (cookieToken !== token) {
      return false;
    }
  }
  // TODO: Für Production gegen Session-Store oder KV prüfen
  // Dies würde Replay-Attacken verhindern durch Token-Ablauf/Einmalnutzung
  return true;
}
/**
 * CSRF-Middleware für Hono
 * Validiert CSRF-Token für mutierende HTTP-Methoden
 *
 * @example
 * app.use('*', createCsrfMiddleware());
 */
function createCsrfMiddleware() {
  return async function csrfMiddleware(c, next) {
    const method = c.req.method;
    // Nur für mutierende Requests prüfen
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // Token aus Header oder Body holen
      const headerToken = c.req.header('X-CSRF-Token') ?? undefined;
      const cookie = c.req.header('Cookie') ?? undefined;
      let bodyToken;
      try {
        const bodyUnknown = await c.req.json();
        const maybe = bodyUnknown.csrfToken;
        bodyToken = typeof maybe === 'string' ? maybe : undefined;
      } catch {
        // Kein JSON-Body oder kein csrfToken-Feld
      }
      const token = headerToken || bodyToken;
      if (!token) {
        return c.json(
          {
            success: false,
            error: {
              type: 'csrf_error',
              message: 'CSRF token required',
            },
          },
          403
        );
      }
      const isValid = await validateCsrfToken(token, cookie);
      if (!isValid) {
        return c.json(
          {
            success: false,
            error: {
              type: 'csrf_error',
              message: 'Invalid CSRF token',
            },
          },
          403
        );
      }
    }
    return next();
  };
}
