import type { APIContext } from 'astro';
import type { KVNamespace } from '@cloudflare/workers-types';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { formatZodError } from '@/lib/validation';
import { templateSaveSchema } from '@/lib/validation';

// Add to existing file, append after GET
export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const user = locals.user;
    if (!user) return createApiError('auth_error', 'Authentication required for saving templates');

    const unknownBody: unknown = await request.json().catch(() => null);
    const parsed = templateSaveSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid JSON body', {
        details: formatZodError(parsed.error),
      });
    }
    const { templateId, prompt, name, description } = parsed.data;

    const ownerId = user.id;
    const key = `prompt:templates:user:${ownerId}:${templateId}`;

    const env = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const kv = env.KV_PROMPT_ENHANCER as KVNamespace | undefined;
    if (!kv) return createApiError('server_error', 'KV not available');

    await kv.put(key, JSON.stringify({ id: templateId, name, description, prompt }), {
      expirationTtl: 2592000,
    }); // 30 days

    return createApiSuccess({ message: 'Template saved', templateId });
  },
  {
    enforceCsrfToken: true,
  }
);
