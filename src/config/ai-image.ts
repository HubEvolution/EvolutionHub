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
}

export const ALLOWED_MODELS: readonly AllowedModel[] = [
  {
    slug: 'nightmareai/real-esrgan:latest', // Official Real-ESRGAN on Replicate: https://replicate.com/nightmareai/real-esrgan
    label: 'Real-ESRGAN 4x',
    provider: 'replicate',
  },
  {
    slug: 'tencentarc/gfpgan:latest', // Official GFPGAN: https://replicate.com/tencentarc/gfpgan
    label: 'GFPGAN',
    provider: 'replicate',
  },
  {
    slug: 'sczhou/codeformer:latest', // Official CodeFormer: https://replicate.com/sczhou/codeformer
    label: 'CodeFormer',
    provider: 'replicate',
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
