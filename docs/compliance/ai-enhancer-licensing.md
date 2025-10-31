# AI Enhancer — Licensing & Compliance Notes

This document summarizes licensing and usage notes for the Image/Video Enhancer MVP powered by Replicate providers. Keep this page updated as providers or models change.

## Models in MVP

- Topaz Labs — Image Upscale (Replicate)
  - Model page: https://replicate.com/topazlabs/image-upscale
  - Pricing: Priced per unit (see Readme). Replicate announced increase to $0.08/unit (Oct 31, 2025, 9am PT).
  - Notes: Commercial usage expected to be permitted via Replicate ToS; confirm with provider if needed for your use case.

- Topaz Labs — Video Upscale (Replicate)
  - Model page: https://replicate.com/topazlabs/video-upscale
  - Notes: Supports 720p/1080p/4k upscaling, up to 60fps. Pricing follows Replicate units. Commercial usage expected to be permitted via Replicate ToS.

- TencentARC — GFPGAN (Replicate)
  - Model page: https://replicate.com/tencentarc/gfpgan
  - License (GitHub): https://github.com/TencentARC/GFPGAN/blob/master/LICENSE (Apache 2.0 with noted third‑party components)
  - Notes: Apache‑2.0 is generally permissive for commercial use. Review any third‑party component exceptions in the repo.

## Not Included (Removed)

- CodeFormer (Replicate: sczhou/codeformer)
  - Notes: Model page indicates non‑commercial usage; omitted from MVP.

## Replicate Terms of Service

- Replicate ToS: https://replicate.com/terms
- Always verify current ToS and model‑specific licensing before commercial usage.

## Internal Usage Policies

- Environments
  - Local/Testing: Replicate models are gated/disabled server‑side to avoid unintended spend.
  - Staging/Production: Replicate models enabled per configuration.

- Credits & Pricing (MVP)
  - 1 Credit = $0.08 (internal conversion).
  - Image MVP: Topaz Image Upscale = 1 credit/run; GFPGAN = 1 credit/run.
  - Video MVP (Topaz Video Upscale tiers):
    - 720p ≤ 60s: 5 credits/run
    - 1080p ≤ 45s: 8 credits/run

- Storage & Retention (R2)
  - Images: 30 days; Videos: 14 days (via lifecycle policy or scheduled cleanup).

## Responsibilities

- Engineering: Ensure model allowlist and environment gating reflect the above; maintain compliance notes updated upon provider changes.
- Product/Legal: Review Replicate ToS and specific model licenses for commercial usage; escalate any constraints.

## Change Log
- 2025‑10‑29: Initial version; Topaz Image/Video + GFPGAN included; CodeFormer removed due to non‑commercial notice.
