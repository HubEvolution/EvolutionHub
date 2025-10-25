export type Plan = 'free' | 'pro' | 'premium' | 'enterprise';

export interface PlanEntitlements {
  monthlyImages: number; // total images per calendar month
  dailyBurstCap: number; // max images per rolling 24h window
  maxUpscale: 2 | 4 | 6 | 8; // allowed upscale factor
  faceEnhance: boolean; // allow face enhancement toggle
  // Future: add maxMegapixels, batchMax, api monthly calls, queue priority, commercial use, support SLA
}

import { FREE_LIMIT_GUEST } from '@/config/ai-image';

// Guest entitlements: conservative 3/day aligned with FREE_LIMIT_GUEST
// Keep other capabilities minimal to encourage upgrading, while still allowing a useful trial.
const GUEST_ENTITLEMENTS: Readonly<PlanEntitlements> = Object.freeze({
  monthlyImages: FREE_LIMIT_GUEST * 30, // e.g., ~90 per month if 3/day
  dailyBurstCap: FREE_LIMIT_GUEST,
  maxUpscale: 2,
  faceEnhance: false,
});

export const ENTITLEMENTS: Readonly<Record<Plan, PlanEntitlements>> = Object.freeze({
  free: {
    monthlyImages: 30,
    dailyBurstCap: 3,
    maxUpscale: 2,
    faceEnhance: false,
  },
  pro: {
    monthlyImages: 300,
    dailyBurstCap: 30,
    maxUpscale: 4,
    faceEnhance: true,
  },
  premium: {
    monthlyImages: 1000,
    dailyBurstCap: 100,
    maxUpscale: 6,
    faceEnhance: true,
  },
  enterprise: {
    monthlyImages: 4000,
    dailyBurstCap: 400,
    maxUpscale: 8,
    faceEnhance: true,
  },
});

export function getEntitlementsFor(ownerType: 'user' | 'guest', plan?: Plan): PlanEntitlements {
  if (ownerType === 'guest') {
    return GUEST_ENTITLEMENTS;
  }
  const p = plan ?? 'free';
  return ENTITLEMENTS[p];
}

// --- Enhancer cost model (decimal credits) ---
// We measure costs in the same units as plan monthly quotas and paid credits.
// Rounds to nearest 0.1 and enforces a minimum of 0.1 per job.
export interface EnhancerCostInput {
  modelSlug: string;
  scale?: 2 | 4;
  faceEnhance?: boolean;
}

// Base cost per model; unknown models fall back to 1.0
const MODEL_BASE_COST: Record<string, number> = {
  // Workers AI SDXL has a slightly higher base
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': 1.2,
  // Default for others (e.g., SD 1.5 img2img, ESRGAN, CodeFormer/GFPGAN)
  default: 1.0,
};

// Upscale add-on cost (2x is included, 4x adds +1.0)
const UPSCALE_ADDON: Record<2 | 4, number> = {
  2: 0,
  4: 1.0,
};

// Face enhance add-on
const FACE_ENHANCE_ADDON = 0.5;

export function computeEnhancerCost(input: EnhancerCostInput): number {
  const base = MODEL_BASE_COST[input.modelSlug] ?? MODEL_BASE_COST.default;
  const upscaleAddon = input.scale ? (UPSCALE_ADDON[input.scale] ?? 0) : 0;
  const faceAddon = input.faceEnhance ? FACE_ENHANCE_ADDON : 0;
  const raw = base + upscaleAddon + faceAddon;
  return roundToTenth(Math.max(0.1, raw));
}

export function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10;
}

// Helpers to represent credits in tenths (integers) to avoid float drift.
export function toTenths(n: number): number {
  return Math.round(n * 10);
}

export function fromTenths(n: number): number {
  return Math.round(n) / 10;
}
