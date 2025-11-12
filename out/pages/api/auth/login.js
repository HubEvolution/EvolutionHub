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
// Deprecated endpoint: legacy email/password login has been removed.
// Main method: return HTML 410 (with security headers and logging)
exports.POST = (0, api_middleware_1.withRedirectMiddleware)(async (context) => {
  return (0, response_helpers_1.createDeprecatedGoneHtml)(context);
});
// All other methods: return JSON 410 with Allow: 'POST'
const goneJson = (context) =>
  (0, response_helpers_1.createDeprecatedGoneJson)(
    context,
    'This endpoint has been deprecated. Please use Magic Link login instead.',
    { Allow: 'POST' }
  );
exports.GET = goneJson;
exports.PUT = goneJson;
exports.PATCH = goneJson;
exports.DELETE = goneJson;
exports.OPTIONS = goneJson;
exports.HEAD = goneJson;
