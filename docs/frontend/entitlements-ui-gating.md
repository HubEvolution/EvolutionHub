---
description: 'Entitlements & UI-Gating für den AI Image Enhancer (Plan-basiert)'
owner: 'Frontend Team'
priority: 'high'
lastSync: '2025-11-04'
codeRefs: 'src/components/tools/ImagEnhancerIsland.tsx, src/components/tools/imag-enhancer/**, src/pages/api/ai-image/**'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Entitlements & UI‑Gating (AI Image Enhancer)

This document explains how the Image Enhancer UI mirrors server‑side entitlements (plan‑based capabilities and quotas) and how to test it.

## Overview

- Source of truth: `GET /api/ai-image/usage` returns `ownerType`, `usage`, optional `plan`, and `entitlements`.

- UI consumes `entitlements` and renders controls accordingly. Server always enforces.

- Feature flag: `PUBLIC_ENHANCER_PLAN_GATING_V1` enables client‑side gating.

## Files

- Island: `src/components/tools/ImagEnhancerIsland.tsx`

- Controls: `src/components/tools/imag-enhancer/ModelControls.tsx`

- Gating helpers: `src/components/tools/imag-enhancer/gating.ts`

- UsagePill: `src/components/tools/imag-enhancer/UsagePill.tsx`

- API client: `src/components/tools/imag-enhancer/api.ts`

## Behavior

- Allowed scales: `allowedScales = [2,4].filter(s => s <= entitlements.maxUpscale)`

- Face enhance: `canUseFaceEnhance = model.supportsFaceEnhance && entitlements.faceEnhance`

- Controls beyond plan are hidden or disabled with an Upgrade tooltip.

- Upgrade CTA appears when quota exceeded or a requested feature is blocked by plan.

### Plan Caps

- `entitlements.monthlyImages` – Monthly image generation allowance (plan‑based)

- `entitlements.dailyBurstCap` – Max per 24h rolling window

- `entitlements.maxUpscale` – Highest allowed upscale (2 or 4)

- `entitlements.faceEnhance` – Boolean flag to allow face restoration controls

### Usage Semantics

- UI displays `usage.used` against `usage.limit` (authoritative, plan‑adjusted)

- Server still returns `limits.user/guest` for legacy/debug; may differ from `usage.limit`

- 24h rolling window for daily usage; separate monthly usage for credit accounting

### Credit Packs

- Units are tenths (1.0 credit = 10 tenths) to allow fractional charging

- FIFO consumption across multiple packs; oldest credits consumed first

- Expiry: 6 months + 14 days grace; expired packs no longer available for charge

- Idempotent ledger records by `jobId` (or server‑assigned id) to prevent double‑charge on retries

## Error Semantics

- Provider errors are normalized by the backend:
  - 401/403 → `forbidden`

  - 4xx → `validation_error`

  - 5xx → `server_error`

- API error shape: `{ success: false, error: { type, message, details? } }`

## Screenshots (placeholders)

- controls‑gated.png — Scale/Face controls gated by plan

- cta‑visible.png — Upgrade CTA visible on quota/feature block

Add screenshots to this folder once captured.

## Testing

- Unit
  - `gating.test.ts` covers allowedScales/canUseFaceEnhance derivations

  - Hooks/components tests under `__tests__` verify UI states

- Integration
  - `/api/ai-image/usage` returns entitlements and `X-Usage-*` headers

  - `/api/ai-image/generate` rejects over‑plan params with `validation_error`

- E2E
  - EN/DE routes: controls hidden/disabled per plan; CTA visibility scenarios

## Notes on Limits

- `usage.limit` is the authoritative, plan‑adjusted limit for display and validation.

- `limits.user/guest` are static defaults (legacy/debug) and may differ from the effective limit.

## Acceptance Criteria

- UI never presents actionable controls for blocked features/scales.

- Clear tooltips/CTAs for blocked actions.

- Errors from backend use the standardized contract.

- Smoke/E2E scenarios green in EN/DE.
