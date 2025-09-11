import type { APIContext } from 'astro';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { withRedirectMiddleware } from '@/lib/api-middleware';

/**
 * Gemeinsamer Logout-Handler für GET und POST
 * Meldet den Benutzer ab und löscht das Authentifizierungs-Cookie.
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
const handleLogout = async (context: APIContext) => {
  // Deprecated legacy endpoint: return 410 Gone early with security logging
  return createDeprecatedGoneHtml(context);
};

// Enforce CSRF/Origin checks for POST via redirect middleware (HTML 410 on same-origin)
export const POST = withRedirectMiddleware(handleLogout);
export const GET = handleLogout;

// 410 Method Gone für alle anderen Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext): Response =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    { Allow: 'GET, POST' }
  );

// Unsafe methods: enforce CSRF/Origin checks, return 410 JSON on same-origin
export const PUT = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const PATCH = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const DELETE = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;