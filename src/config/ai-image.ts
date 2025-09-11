/*
 * AI Image Enhancer configuration and allowlist.
 * Keep in sync with docs/architecture/ai-image-enhancer.md
 */

export type OwnerType = 'user' | 'guest';

export interface AllowedModel {
  slug: string; // Replicate model slug (verify exact tags)
  label: string; // Human-readable name
  provider: 'replicate';
  defaultParams?: Record<string, unknown>;
  supportsScale?: boolean;
  supportsFaceEnhance?: boolean;
}

export const ALLOWED_MODELS: readonly AllowedModel[] = [
  {
    slug: 'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a', // Pinned Real-ESRGAN version: https://replicate.com/nightmareai/real-esrgan/versions/f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a
    label: 'Real-ESRGAN 4x',
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
] as const;

// Quota (24h window)
export const FREE_LIMIT_GUEST = 3; // production default
export const FREE_LIMIT_USER = 20; // per design

// Upload limits
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// R2 key prefix
export const AI_R2_PREFIX = 'ai-enhancer';

// Default OpenAI Assistant ID (optional, can be overridden)
export const DEFAULT_ASSISTANT_ID = '';