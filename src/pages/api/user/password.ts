import type { APIContext } from 'astro';
import { withRedirectMiddleware } from '@/lib/api-middleware';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';

/**
 * POST /api/user/password (deprecated)
 * Stytch-only Migration: Passwort-Änderungen sind nicht mehr unterstützt.
 * Liefert 410 Gone (HTML). Andere Methoden liefern 410 JSON mit Allow: POST.
 */
export const POST = withRedirectMiddleware(async (context: APIContext) => {
  return createDeprecatedGoneHtml(context);
});

const goneJson = (context: APIContext): Response =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Password changes are no longer supported; use Stytch flows.',
    { Allow: 'POST' }
  );

export const GET = goneJson;
export const PUT = goneJson;
export const PATCH = goneJson;
export const DELETE = goneJson;
export const OPTIONS = goneJson;
export const HEAD = goneJson;