"use strict";
/**
 * E-Mail-Verifikations-API-Endpunkt
 *
 * Implementiert Double-Opt-in E-Mail-Verifikation für neue Benutzerregistrierungen.
 * Basiert auf dem bewährten Newsletter-Confirmation-Pattern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const response_helpers_1 = require("@/lib/response-helpers");
const api_middleware_1 = require("@/lib/api-middleware");
// Deprecated endpoint: serve 410 responses only
/**
 * GET /api/auth/verify-email
 * Verarbeitet E-Mail-Verifikations-Links von registrierten Benutzern
 *
 * Query Parameter:
 * - token: Der Verifikations-Token (erforderlich)
 * - email: Die E-Mail-Adresse zur Validierung (optional)
 *
 * Redirect-Ziele:
 * - Bei Erfolg: /email-verified (neue Seite)
 * - Bei Fehlern: /register mit entsprechendem error-Parameter
 */
const GET = async (context) => {
    return (0, response_helpers_1.createDeprecatedGoneHtml)(context);
};
exports.GET = GET;
/**
 * 410 Gone für nicht unterstützte Methoden (Endpoint deprecated, nur GET existierte)
 */
const methodNotAllowed = (context) => (0, response_helpers_1.createDeprecatedGoneJson)(context, 'This endpoint has been deprecated. Please migrate to the new authentication flow.', { Allow: 'GET' });
// Enforce CSRF/Origin checks on unsafe methods via redirect middleware; it preserves response shape
exports.POST = (0, api_middleware_1.withRedirectMiddleware)(async (context) => methodNotAllowed(context));
exports.PUT = (0, api_middleware_1.withRedirectMiddleware)(async (context) => methodNotAllowed(context));
exports.PATCH = (0, api_middleware_1.withRedirectMiddleware)(async (context) => methodNotAllowed(context));
exports.DELETE = (0, api_middleware_1.withRedirectMiddleware)(async (context) => methodNotAllowed(context));
// Safe methods remain plain 410 JSON without CSRF enforcement
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
// Utilities removed due to deprecation of this endpoint
