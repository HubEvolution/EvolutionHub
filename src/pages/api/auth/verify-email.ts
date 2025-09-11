/**
 * E-Mail-Verifikations-API-Endpunkt
 * 
 * Implementiert Double-Opt-in E-Mail-Verifikation für neue Benutzerregistrierungen.
 * Basiert auf dem bewährten Newsletter-Confirmation-Pattern.
 */

import type { APIContext } from 'astro';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { withRedirectMiddleware } from '@/lib/api-middleware';

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
export const GET = async (context: APIContext) => {
  return createDeprecatedGoneHtml(context);
};

/**
 * 410 Gone für nicht unterstützte Methoden (Endpoint deprecated, nur GET existierte)
 */
const methodNotAllowed = (context: APIContext): Response =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    { Allow: 'GET' }
  );

// Enforce CSRF/Origin checks on unsafe methods via redirect middleware; it preserves response shape
export const POST = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const PUT = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const PATCH = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const DELETE = withRedirectMiddleware(async (context) => methodNotAllowed(context));
// Safe methods remain plain 410 JSON without CSRF enforcement
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
// Utilities removed due to deprecation of this endpoint

