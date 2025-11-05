"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const response_helpers_1 = require("@/lib/response-helpers");
/**
 * POST /api/auth/register
 * Registriert einen neuen Benutzer und triggert E-Mail-Verifikation (keine Session bei Registrierung)
 *
 * Features:
 * - Verwendung der Service-Layer für Geschäftslogik
 * - Strikte Typisierung und Validierung der Eingabedaten
 * - Rate-Limiting zum Schutz vor Brute-Force-Angriffen
 * - Security-Headers gegen XSS und andere Angriffe
 * - Umfassendes Audit-Logging für Sicherheitsanalysen
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
const POST = async (context) => {
    return (0, response_helpers_1.createDeprecatedGoneHtml)(context);
};
exports.POST = POST;
// Explizite 410-Handler für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context) => (0, response_helpers_1.createDeprecatedGoneJson)(context, 'This endpoint has been deprecated. Please migrate to the new authentication flow.', {
    Allow: 'POST',
});
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
