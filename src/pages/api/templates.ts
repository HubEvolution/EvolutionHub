// Add to existing file, append after GET
export const POST = withApiMiddleware(async (context) => {
  const { locals, request } = context;
  const user = locals.user;
  if (!user) return createApiError('auth_error', 'Authentication required for saving templates');

  const { templateId, prompt, name, description } = await request.json();
  if (!templateId || !prompt || !name || !description) {
    return createApiError('validation_error', 'templateId, prompt, name, description required');
  }

  const ownerId = user.id;
  const key = `prompt:templates:user:${ownerId}:${templateId}`;

  const env = locals.runtime?.env ?? {};
  const kv = env.KV_PROMPT_ENHANCER;
  if (!kv) return createApiError('server_error', 'KV not available');

  await kv.put(key, JSON.stringify({ id: templateId, name, description, prompt }), { expirationTtl: 2592000 }); // 30 days

  return createApiSuccess({ message: 'Template saved', templateId });
}, { 
  rateLimiter: undefined, // Or custom for save
  enforceCsrfToken: true 
});