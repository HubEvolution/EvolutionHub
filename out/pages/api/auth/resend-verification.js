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
// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
exports.prerender = false;
/**
 * POST /api/auth/resend-verification
 * Resendet eine E-Mail-Verifikation, ohne User-Existenz nach außen preiszugeben
 * - JSON Body: { email: string }
 * - Erfolgs-Response ist generisch, um Enumeration zu verhindern
 */
const POST = async (context) => {
  return (0, response_helpers_1.createDeprecatedGoneJson)(context);
};
exports.POST = POST;
// 410 für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context) =>
  (0, response_helpers_1.createDeprecatedGoneJson)(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    { Allow: 'POST' }
  );
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
