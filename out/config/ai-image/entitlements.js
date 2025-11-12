'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ENTITLEMENTS = void 0;
exports.getEntitlementsFor = getEntitlementsFor;
exports.computeEnhancerCost = computeEnhancerCost;
exports.roundToTenth = roundToTenth;
exports.toTenths = toTenths;
exports.fromTenths = fromTenths;
const ai_image_1 = require('@/config/ai-image');
// Guest entitlements: conservative 3/day aligned with FREE_LIMIT_GUEST
// Keep other capabilities minimal to encourage upgrading, while still allowing a useful trial.
const GUEST_ENTITLEMENTS = Object.freeze({
  monthlyImages: ai_image_1.FREE_LIMIT_GUEST * 30, // e.g., ~90 per month if 3/day
  dailyBurstCap: ai_image_1.FREE_LIMIT_GUEST,
  maxUpscale: 2,
  faceEnhance: false,
});
exports.ENTITLEMENTS = Object.freeze({
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
function getEntitlementsFor(ownerType, plan) {
  if (ownerType === 'guest') {
    return GUEST_ENTITLEMENTS;
  }
  const p = plan ?? 'free';
  return exports.ENTITLEMENTS[p];
}
// Base cost per model; unknown models fall back to 1.0
const MODEL_BASE_COST = {
  // Workers AI SDXL has a slightly higher base
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': 1.2,
  // Default for others (e.g., SD 1.5 img2img, ESRGAN, CodeFormer/GFPGAN)
  default: 1.0,
};
// Upscale add-on cost (2x is included, 4x adds +1.0)
const UPSCALE_ADDON = {
  2: 0,
  4: 1.0,
};
// Face enhance add-on
const FACE_ENHANCE_ADDON = 0.5;
function computeEnhancerCost(input) {
  const base = MODEL_BASE_COST[input.modelSlug] ?? MODEL_BASE_COST.default;
  const upscaleAddon = input.scale ? (UPSCALE_ADDON[input.scale] ?? 0) : 0;
  const faceAddon = input.faceEnhance ? FACE_ENHANCE_ADDON : 0;
  const raw = base + upscaleAddon + faceAddon;
  return roundToTenth(Math.max(0.1, raw));
}
function roundToTenth(n) {
  return Math.round(n * 10) / 10;
}
// Helpers to represent credits in tenths (integers) to avoid float drift.
function toTenths(n) {
  return Math.round(n * 10);
}
function fromTenths(n) {
  return Math.round(n) / 10;
}
