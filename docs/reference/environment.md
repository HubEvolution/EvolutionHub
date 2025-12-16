---
title: Environment variables
description: Referenz der Environment-Variablen (Cloudflare Worker & Astro)
owner: Platform Team
priority: medium
lastSync: 2025-12-16
codeRefs: .env.example, wrangler.toml, src/config/**
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

This reference is generated from the `.env.example` template and lists every environment variable consumed by the application.

| Name                       | Default                                                                    | Description                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_WORKER_URL`        | `"http://localhost:8787"`                                                  | Die URL des lokal laufenden Cloudflare Workers, damit das Frontend weiß, wohin es Anfragen senden soll.                         |
| `PUBLIC_SITE_URL`          | `"https://hub-evolution.com"`                                              | Kanonische Site-URL (wird u.a. für die dynamische Sitemap genutzt) In Produktion auf die .com-Domain setzen                     |
| `AUTH_SECRET`              | `"4dbd7e194fb217782190c3507531816e58cde5ea900319b26166a8ba86f1e601"`       | Auth.js v5 Configuration Generate a secret with: openssl rand -hex 32                                                           |
| `AUTH_TRUST_HOST`          | `false`                                                                    | —                                                                                                                               |
| `REPLICATE_API_TOKEN`      | `"YOUR_REPLICATE_API_TOKEN"`                                               | AI Image Enhancer Replicate API token (required for AI image generation) Obtain from <https://replicate.com/account/api-tokens> |
| `OPENAI_API_KEY`           | `"sk-your-openai-api-key-here"`                                            | OpenAI API Key (for Assistants API) Obtain from <https://platform.openai.com/api-keys>                                          |
| `PROMPT_TEXT_MODEL`        | `gpt-4o-mini`                                                              | —                                                                                                                               |
| `PROMPT_VISION_MODEL`      | `gpt-4o-mini`                                                              | —                                                                                                                               |
| `PROMPT_MAX_FILES`         | `3`                                                                        | —                                                                                                                               |
| `PROMPT_MAX_FILE_BYTES`    | `5242880`                                                                  | —                                                                                                                               |
| `PROMPT_ALLOWED_TYPES`     | `image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown` | —                                                                                                                               |
| `PROMPT_OUTPUT_TOKENS_MAX` | `400`                                                                      | —                                                                                                                               |
| `PROMPT_TEMPERATURE`       | `0.2`                                                                      | —                                                                                                                               |
| `PROMPT_TOP_P`             | `0.9`                                                                      | —                                                                                                                               |
| `OPENAI_API_KEY`           | `sk-…`                                                                     | —                                                                                                                               |
| `PROMPT_REWRITE_V1`        | `true`                                                                     | —                                                                                                                               |

| `CONTENTFUL_SPACE_ID`        | `""`        | Contentful space id (required for Contentful blog loading). |
| `CONTENTFUL_ENVIRONMENT`     | `"master"`  | Contentful environment. Use `master` in production; staging can use `preview`. |
| `CONTENTFUL_DELIVERY_TOKEN`  | `""`        | Contentful Delivery API token (read-only; recommended for runtime). |
| `CONTENTFUL_PREVIEW_TOKEN`   | `""`        | Optional: Contentful Preview API token (draft preview). |
| `CONTENTFUL_MANAGEMENT_TOKEN`| `""`        | Contentful Management token (migration scripts; not required at runtime). |

Note: “preview environment” (`CONTENTFUL_ENVIRONMENT=preview`) and “Preview API” (`CONTENTFUL_PREVIEW_TOKEN` / `preview.contentful.com`) are separate concepts.

### Recommendation (Staging token setup)

- **Published-only preview (recommended default):**
  - Use `CONTENTFUL_ENVIRONMENT=preview` and a normal `CONTENTFUL_DELIVERY_TOKEN`.
  - This lets staging read the *published* state of the `preview` Contentful environment.
- **Draft preview (optional):**
  - Use the Preview API via `CONTENTFUL_PREVIEW_TOKEN` if staging should also show *unpublished* drafts.
  - Ensure requests go to `preview.contentful.com` (either implicitly by not setting a delivery/access token, or explicitly via `CONTENTFUL_API_HOST`).
