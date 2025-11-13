import type { APIContext } from 'astro';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { withRedirectMiddleware } from '@/lib/api-middleware';

// Deprecated endpoint: serve 410 responses only

/**
 * POST /api/auth/change-password
 * Ändert das Passwort des aktuell eingeloggten Benutzers.
 *
 * Hinweise:
 * - Verwendet KEINE API-Middleware, da Redirects statt JSON zurückgegeben werden
 * - Implementiert Rate-Limiting, Validierung und Session-Checks
 */
export const POST = withRedirectMiddleware(async (context: APIContext) => {
  return createDeprecatedGoneHtml(context);
});

// Explizite 410-Handler für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext) =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    {
      Allow: 'POST',
    }
  );

export const GET = methodNotAllowed;
export const PUT = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const PATCH = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const DELETE = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
