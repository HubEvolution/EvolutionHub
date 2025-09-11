import type { APIContext } from 'astro';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { withRedirectMiddleware } from '@/lib/api-middleware';

// Deprecated endpoint: legacy email/password login has been removed.

// Main method: return HTML 410 (with security headers and logging)
export const POST = withRedirectMiddleware(async (context: APIContext) => {
  return createDeprecatedGoneHtml(context);
});

// All other methods: return JSON 410 with Allow: 'POST'
const goneJson = (context: APIContext): Response =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Please use Magic Link login instead.',
    { Allow: 'POST' }
  );

export const GET = goneJson;
export const PUT = goneJson;
export const PATCH = goneJson;
export const DELETE = goneJson;
export const OPTIONS = goneJson;
export const HEAD = goneJson;