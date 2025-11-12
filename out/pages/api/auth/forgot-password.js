'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
  exports.prerender =
    void 0;
const response_helpers_1 = require('@/lib/response-helpers');
// Deprecated endpoint: serve 410 responses only
// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
exports.prerender = false;
/**
 * POST /api/auth/forgot-password
 * Sendet eine E-Mail mit einem Passwort-Reset-Link
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
const POST = async (context) => {
  return (0, response_helpers_1.createDeprecatedGoneHtml)(context);
};
exports.POST = POST;
// Explizite 410-Handler für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context) =>
  (0, response_helpers_1.createDeprecatedGoneJson)(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    {
      Allow: 'POST',
    }
  );
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
