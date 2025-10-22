/*
 * AI Image Enhancer configuration and allowlist.
 * Keep in sync with docs/architecture/ai-image-enhancer.md
 */

export type OwnerType = 'user' | 'guest';

export interface PlanLimits {
  free: number;
  pro: number;
  premium: number;
  enterprise: number;
}

export type Plan = keyof PlanLimits; // 'free' | 'pro' | 'premium' | 'enterprise'

export interface AllowedModel {
  slug: string; // Replicate model slug (verify exact tags)
  label: string; // Human-readable name
  provider: 'replicate' | 'workers_ai';
  defaultParams?: Record<string, unknown>;
  supportsScale?: boolean;
  supportsFaceEnhance?: boolean;
}

export const ALLOWED_MODELS: readonly AllowedModel[] = [
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
  {
    slug: 'sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56', // Pinned CodeFormer version: https://replicate.com/sczhou/codeformer/versions/7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56
    label: 'CodeFormer',
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
  {
    slug: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    label: 'Enhance XL (SDXL img2img)',
    provider: 'workers_ai',
    supportsScale: false,
    supportsFaceEnhance: false,
    defaultParams: {
      prompt:
        'photo restoration, high quality, detailed, natural, sharp focus, accurate colors, noise reduction',
      negative_prompt:
        'cartoon, anime, text, watermark, oversharpen, artifacts, deformed, painting, unrealistic',
      strength: 0.25,
      guidance: 6,
      steps: 30,
    },
  },
] as const;

// Quota (24h window)
export const FREE_LIMIT_GUEST = 3; // production default
export const FREE_LIMIT_USER = 20; // per design

// Fixed plan limits (per-user unless otherwise specified)
// If we later want to override via env, we can parse a JSON and hydrate this at runtime.
export const PLAN_LIMITS: Readonly<PlanLimits> = Object.freeze({
  free: 20,
  pro: 200,
  premium: 1000,
  enterprise: 5000,
});

/**
 * Resolve the effective daily limit for an owner based on type and optional user plan.
 * Guests always use the guest limit. Users use the plan-based mapping, defaulting to 'free'.
 */
export function getAiLimitFor(ownerType: OwnerType, plan?: Plan): number {
  if (ownerType === 'guest') return FREE_LIMIT_GUEST;
  const p = plan ?? 'free';
  return PLAN_LIMITS[p] ?? PLAN_LIMITS.free;
}

// Upload limits
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// R2 key prefix
export const AI_R2_PREFIX = 'ai-enhancer';

// Default OpenAI Assistant ID (optional, can be overridden)
export const DEFAULT_ASSISTANT_ID = '';
