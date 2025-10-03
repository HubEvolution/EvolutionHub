import type { APIContext } from 'astro';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';

// Deprecated endpoint: serve 410 responses only

/**
 * POST /api/auth/change-password
 * Ändert das Passwort des aktuell eingeloggten Benutzers.
 *
 * Hinweise:
 * - Verwendet KEINE API-Middleware, da Redirects statt JSON zurückgegeben werden
 * - Implementiert Rate-Limiting, Validierung und Session-Checks
 */
export const POST = async (context: APIContext) => {
  return createDeprecatedGoneHtml(context);
};

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
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
