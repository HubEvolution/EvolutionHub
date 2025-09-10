import type { APIContext } from "astro";
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';

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
export const POST = async (context: APIContext) => {
  return createDeprecatedGoneHtml(context);
};

// Explizite 410-Handler für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext) =>
  createDeprecatedGoneJson(
    context,
    "This endpoint has been deprecated. Please migrate to the new authentication flow.",
    {
      Allow: "POST",
    }
  );

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
