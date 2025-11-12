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
const api_middleware_1 = require('@/lib/api-middleware');
/**
 * Gemeinsamer Logout-Handler für GET und POST
 * Meldet den Benutzer ab und löscht das Authentifizierungs-Cookie.
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
const handleLogout = async (context) => {
  // Deprecated legacy endpoint: return 410 Gone early with security logging
  return (0, response_helpers_1.createDeprecatedGoneHtml)(context);
};
// Enforce CSRF/Origin checks for POST via redirect middleware (HTML 410 on same-origin)
exports.POST = (0, api_middleware_1.withRedirectMiddleware)(handleLogout);
exports.GET = handleLogout;
// 410 Method Gone für alle anderen Methoden (Endpoint deprecated)
const methodNotAllowed = (context) =>
  (0, response_helpers_1.createDeprecatedGoneJson)(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    { Allow: 'GET, POST' }
  );
// Unsafe methods: enforce CSRF/Origin checks, return 410 JSON on same-origin
exports.PUT = (0, api_middleware_1.withRedirectMiddleware)(async (context) =>
  methodNotAllowed(context)
);
exports.PATCH = (0, api_middleware_1.withRedirectMiddleware)(async (context) =>
  methodNotAllowed(context)
);
exports.DELETE = (0, api_middleware_1.withRedirectMiddleware)(async (context) =>
  methodNotAllowed(context)
);
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
