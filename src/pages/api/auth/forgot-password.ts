import type { APIContext } from 'astro';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';

// Deprecated endpoint: serve 410 responses only

// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
export const prerender = false;

/**
 * POST /api/auth/forgot-password
 * Sendet eine E-Mail mit einem Passwort-Reset-Link
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
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
