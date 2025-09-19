import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';

// Add to existing file, append after GET
export const POST = withApiMiddleware(async (context) => {
  const { locals, request } = context;
  const user = locals.user;
  if (!user) return createApiError('auth_error', 'Authentication required for saving templates');

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return createApiError('validation_error', 'Invalid JSON body');
  }
  const anyBody = body as Record<string, unknown>;
  const templateId = typeof anyBody.templateId === 'string' ? anyBody.templateId : undefined;
  const prompt = typeof anyBody.prompt === 'string' ? anyBody.prompt : undefined;
  const name = typeof anyBody.name === 'string' ? anyBody.name : undefined;
  const description = typeof anyBody.description === 'string' ? anyBody.description : undefined;

  if (!templateId || !prompt || !name || !description) {
    return createApiError('validation_error', 'templateId, prompt, name, description required');
  }

  const ownerId = user.id;
  const key = `prompt:templates:user:${ownerId}:${templateId}`;

  const env = locals.runtime?.env ?? {};
  const kv = (env as any).KV_PROMPT_ENHANCER as KVNamespace<string> | undefined;
  if (!kv) return createApiError('server_error', 'KV not available');

  await kv.put(key, JSON.stringify({ id: templateId, name, description, prompt }), { expirationTtl: 2592000 }); // 30 days

  return createApiSuccess({ message: 'Template saved', templateId });
}, { 
  enforceCsrfToken: true 
});