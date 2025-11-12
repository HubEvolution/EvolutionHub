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
const api_middleware_1 = require('@/lib/api-middleware');
const response_helpers_1 = require('@/lib/response-helpers');
/**
 * POST /api/user/password (deprecated)
 * Stytch-only Migration: Passwort-Änderungen sind nicht mehr unterstützt.
 * Liefert 410 Gone (HTML). Andere Methoden liefern 410 JSON mit Allow: POST.
 */
exports.POST = (0, api_middleware_1.withRedirectMiddleware)(async (context) => {
  return (0, response_helpers_1.createDeprecatedGoneHtml)(context);
});
const goneJson = (context) =>
  (0, response_helpers_1.createDeprecatedGoneJson)(
    context,
    'This endpoint has been deprecated. Password changes are no longer supported; use Stytch flows.',
    { Allow: 'POST' }
  );
exports.GET = goneJson;
exports.PUT = goneJson;
exports.PATCH = goneJson;
exports.DELETE = goneJson;
exports.OPTIONS = goneJson;
exports.HEAD = goneJson;
