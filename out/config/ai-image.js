'use strict';
/*
 * AI Image Enhancer configuration and allowlist.
 * Keep in sync with docs/architecture/ai-image-enhancer.md
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.DEFAULT_ASSISTANT_ID =
  exports.AI_R2_PREFIX =
  exports.ALLOWED_CONTENT_TYPES =
  exports.MAX_UPLOAD_BYTES =
  exports.PLAN_LIMITS =
  exports.FREE_LIMIT_USER =
  exports.FREE_LIMIT_GUEST =
  exports.ALLOWED_MODELS =
    void 0;
exports.getAiLimitFor = getAiLimitFor;
exports.ALLOWED_MODELS = [
  {
    slug: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    label: 'Real-ESRGAN 4x',
    provider: 'replicate',
    supportsScale: true,
    supportsFaceEnhance: true,
  },
  {
    slug: 'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a',
    label: 'Real-ESRGAN 4x (legacy)',
    provider: 'replicate',
    supportsScale: true,
    supportsFaceEnhance: true,
  },
  {
    slug: 'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c', // Pinned GFPGAN version: https://replicate.com/tencentarc/gfpgan/versions/0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c
    label: 'GFPGAN',
    provider: 'replicate',
    supportsScale: false,
    supportsFaceEnhance: false,
  },
  // Topaz Labs — Image Upscale (Replicate)
  {
    slug: 'topazlabs/image-upscale',
    label: 'Topaz Image Upscale',
    provider: 'replicate',
    supportsScale: false,
    supportsFaceEnhance: false,
  },
  // Cloudflare Workers AI — Enhance (img2img)
  {
    slug: '@cf/runwayml/stable-diffusion-v1-5-img2img',
    label: 'Enhance (SD 1.5 img2img)',
    provider: 'workers_ai',
    supportsScale: false,
    supportsFaceEnhance: false,
    defaultParams: {
      prompt:
        'photo restoration, high quality, detailed, natural, sharp focus, accurate colors, noise reduction',
      negative_prompt:
        'cartoon, anime, text, watermark, oversharpen, artifacts, deformed, painting, unrealistic',
      strength: 0.25,
      guidance: 5,
      steps: 20,
    },
  },
];
// Quota (24h window)
exports.FREE_LIMIT_GUEST = 3; // production default
exports.FREE_LIMIT_USER = 20; // per design
// Fixed plan limits (per-user unless otherwise specified)
// If we later want to override via env, we can parse a JSON and hydrate this at runtime.
exports.PLAN_LIMITS = Object.freeze({
  free: 20,
  pro: 200,
  premium: 1000,
  enterprise: 5000,
});
/**
 * Resolve the effective daily limit for an owner based on type and optional user plan.
 * Guests always use the guest limit. Users use the plan-based mapping, defaulting to 'free'.
 */
function getAiLimitFor(ownerType, plan) {
  if (ownerType === 'guest') return exports.FREE_LIMIT_GUEST;
  const p = plan ?? 'free';
  return exports.PLAN_LIMITS[p] ?? exports.PLAN_LIMITS.free;
}
// Upload limits
exports.MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
exports.ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// R2 key prefix
exports.AI_R2_PREFIX = 'ai-enhancer';
// Default OpenAI Assistant ID (optional, can be overridden)
exports.DEFAULT_ASSISTANT_ID = '';
