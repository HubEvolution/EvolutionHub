'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const validation_1 = require('@/lib/validation');
const templates_1 = require('@/lib/validation/schemas/templates');
// Add to existing file, append after GET
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { locals, request } = context;
    const user = locals.user;
    if (!user)
      return (0, api_middleware_1.createApiError)(
        'auth_error',
        'Authentication required for saving templates'
      );
    const unknownBody = await request.json().catch(() => null);
    const parsed = templates_1.templateSaveSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
        details: (0, validation_1.formatZodError)(parsed.error),
      });
    }
    const { templateId, prompt, name, description } = parsed.data;
    const ownerId = user.id;
    const key = `prompt:templates:user:${ownerId}:${templateId}`;
    const env = locals.runtime?.env ?? {};
    const kv = env.KV_PROMPT_ENHANCER;
    if (!kv) return (0, api_middleware_1.createApiError)('server_error', 'KV not available');
    await kv.put(key, JSON.stringify({ id: templateId, name, description, prompt }), {
      expirationTtl: 2592000,
    }); // 30 days
    return (0, api_middleware_1.createApiSuccess)({ message: 'Template saved', templateId });
  },
  {
    enforceCsrfToken: true,
  }
);
