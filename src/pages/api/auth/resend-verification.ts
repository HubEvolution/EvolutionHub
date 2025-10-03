import type { APIContext } from 'astro';
import { createDeprecatedGoneJson } from '@/lib/response-helpers';

// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
export const prerender = false;

/**
 * POST /api/auth/resend-verification
 * Resendet eine E-Mail-Verifikation, ohne User-Existenz nach außen preiszugeben
 * - JSON Body: { email: string }
 * - Erfolgs-Response ist generisch, um Enumeration zu verhindern
 */
export const POST = async (context: APIContext) => {
  return createDeprecatedGoneJson(context);
};

// 410 für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext) =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    { Allow: 'POST' }
  );

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
