'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
    void 0;
const response_helpers_1 = require('@/lib/response-helpers');
// Deprecated endpoint: serve 410 responses only
/**
 * POST /api/auth/change-password
 * Ändert das Passwort des aktuell eingeloggten Benutzers.
 *
 * Hinweise:
 * - Verwendet KEINE API-Middleware, da Redirects statt JSON zurückgegeben werden
 * - Implementiert Rate-Limiting, Validierung und Session-Checks
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
