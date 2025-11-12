'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.POST =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const voice_transcribe_service_1 = require('@/lib/services/voice-transcribe-service');
const voice_1 = require('@/config/voice');
const entitlements_1 = require('@/config/voice/entitlements');
function ensureGuestIdCookie(context) {
  const cookies = context.cookies;
  let guestId = cookies.get('guest_id')?.value;
  if (!guestId) {
    guestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const url = new URL(context.request.url);
    cookies.set('guest_id', guestId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return guestId;
}
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
  const { locals } = context;
  const ownerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? String(locals.user.id) : ensureGuestIdCookie(context);
  const env = locals.runtime?.env ?? {};
  const service = new voice_transcribe_service_1.VoiceTranscribeService({
    KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    WHISPER_MODEL: env.WHISPER_MODEL,
    ENVIRONMENT: env.ENVIRONMENT,
  });
  try {
    const plan = ownerType === 'user' ? (locals.user?.plan ?? 'free') : undefined;
    const ent = (0, entitlements_1.getVoiceEntitlementsFor)(ownerType, plan);
    const limit = ent.dailyBurstCap;
    const usage = await service.getUsage(ownerType, ownerId, limit);
    const resp = (0, api_middleware_1.createApiSuccess)({
      ownerType,
      usage,
      limits: { user: voice_1.VOICE_FREE_LIMIT_USER, guest: voice_1.VOICE_FREE_LIMIT_GUEST },
      plan: locals.user?.plan || 'free',
      entitlements: ent,
    });
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-OwnerType', ownerType);
      resp.headers.set(
        'X-Usage-Plan',
        ownerType === 'user' ? String(locals.user?.plan || 'free') : ''
      );
      resp.headers.set('X-Usage-Limit', String(limit));
    } catch {}
    return resp;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (0, api_middleware_1.createApiError)('server_error', message);
  }
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
