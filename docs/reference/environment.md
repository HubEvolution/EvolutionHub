---
title: Environment variables
description: Reference of configuration sourced from .env.example
---

<!-- markdownlint-disable MD051 -->

This reference is generated from the `.env.example` template and lists every environment variable consumed by the application.

| Name | Default | Description |
| --- | --- | --- |
| `PUBLIC_WORKER_URL` | `"http://localhost:8787"` | Die URL des lokal laufenden Cloudflare Workers, damit das Frontend weiß, wohin es Anfragen senden soll. |
| `PUBLIC_SITE_URL` | `"https://hub-evolution.com"` | Kanonische Site-URL (wird u.a. für die dynamische Sitemap genutzt) In Produktion auf die .com-Domain setzen |
| `AUTH_SECRET` | `"4dbd7e194fb217782190c3507531816e58cde5ea900319b26166a8ba86f1e601"` | Auth.js v5 Configuration Generate a secret with: openssl rand -hex 32 |
| `AUTH_TRUST_HOST` | `false` | — |
| `REPLICATE_API_TOKEN` | `"YOUR_REPLICATE_API_TOKEN"` | AI Image Enhancer Replicate API token (required for AI image generation) Obtain from <https://replicate.com/account/api-tokens> |
| `OPENAI_API_KEY` | `"sk-your-openai-api-key-here"` | OpenAI API Key (for Assistants API) Obtain from <https://platform.openai.com/api-keys> |
| `PROMPT_TEXT_MODEL` | `gpt-4o-mini` | — |
| `PROMPT_VISION_MODEL` | `gpt-4o-mini` | — |
| `PROMPT_MAX_FILES` | `3` | — |
| `PROMPT_MAX_FILE_BYTES` | `5242880` | — |
| `PROMPT_ALLOWED_TYPES` | `image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown` | — |
| `PROMPT_OUTPUT_TOKENS_MAX` | `400` | — |
| `PROMPT_TEMPERATURE` | `0.2` | — |
| `PROMPT_TOP_P` | `0.9` | — |
| `OPENAI_API_KEY` | `sk-…` | — |
| `PROMPT_REWRITE_V1` | `true` | — |
