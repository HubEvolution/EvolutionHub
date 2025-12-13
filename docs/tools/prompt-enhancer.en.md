---
description: 'Prompt Enhancer – API & Usage Documentation (English)'
owner: 'Prompt Team'
priority: 'medium'
lastSync: '2025-11-28'
codeRefs: 'src/pages/api/prompt-enhance.ts, docs/tools/prompt-enhancer.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Prompt Enhancer – AI‑powered prompt optimization (EN)

---

## Overview

The Prompt Enhancer turns raw text into clear, agent‑ready prompts for LLMs. It optionally uses OpenAI (text/vision and file_search for PDFs) and supports attachments (images, text files, PDFs). Quotas and security are enforced server‑side.

- Modes: agent, concise (UI labels "Creative/Professional" map to agent)

- Attachments: JPG/PNG/WEBP, PDF, TXT/Markdown

- Quotas (daily): guest 5, user 20

- Rate limiting: 15 requests/min (429 with Retry‑After)

- Validation: text required, 1–1000 chars

- Security: Same‑Origin + Double‑Submit CSRF (X‑CSRF‑Token == csrf_token cookie)

- UX: presets for common use cases (coding, data, content, research), before/after toggle, "What was improved?" hint, and a free‑plan usage banner in the tool UI.

---

## API

### POST /api/prompt-enhance

- Content types

  - application/json (text‑only)

  - multipart/form-data (with files)

- Body (JSON)

  - text: string (1..1000)

  - mode?: "agent" | "concise" (UI "creative"/"professional" → agent)

- Body (multipart)

  - text: string (1..1000)

  - mode?: string (same mapping)

  - files[]: up to 3 files of types: image/jpeg|png|webp, text/plain|markdown, application/pdf

- Success 200

  - { success: true, data: { enhancedPrompt: string, safetyReport?: { score: number, warnings: string[] }, usage: { used, limit, resetAt }, limits: { user, guest } } }

- Errors

  - 400 validation_error

  - 403 forbidden (feature disabled or quota exceeded)

  - 429 Too Many Requests (Retry‑After)

  - 500 server_error

Example (JSON):

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-CSRF-Token: 123' -H 'Cookie: csrf_token=123' \
  -H 'Origin: http://127.0.0.1:8787' \
  -d '{"text":"Improve this prompt","mode":"agent"}' \
  http://127.0.0.1:8787/api/prompt-enhance

```bash

Example (multipart):

```bash
curl -X POST \
  -H 'X-CSRF-Token: 123' -H 'Cookie: csrf_token=123' \
  -H 'Origin: http://127.0.0.1:8787' \
  -F 'text=Analyze this document' \
  -F 'mode=concise' \
  -F 'files[]=@tests/fixtures/tiny.png;type=image/png' \
  http://127.0.0.1:8787/api/prompt-enhance
```

### GET /api/prompt/usage

Returns current usage and limits (rolling 24h when USAGE_KV_V2=1).

- Response 200: { success: true, data: { ownerType, usage: { used, limit, resetAt }, limits: { user, guest } } }

- Headers: X-Usage-OwnerType, X-Usage-Limit

---

## Attachments

- Images: data URLs passed to vision model

- Text files: content clamped (per‑file) for context

- PDFs: uploaded to OpenAI Files and used with Responses API (file_search)

---

## Security & CSRF

- Same‑Origin enforced for unsafe methods

- Double‑Submit cookie: header X‑CSRF‑Token must match csrf_token cookie

---

## Quotas & Rate Limiting

The Prompt Enhancer behaves as a **Free Tool** with generous, plan‑based entitlements defined in `src/config/prompt/entitlements.ts`.

- Guest: `dailyBurstCap=10`, `monthlyRuns=100`
- free (user): `dailyBurstCap=100`, `monthlyRuns=2000`
- pro: `dailyBurstCap=500`, `monthlyRuns=15000`
- premium: `dailyBurstCap=2000`, `monthlyRuns=60000`
- enterprise: `dailyBurstCap=10000`, `monthlyRuns=1000000`

`/api/prompt/usage` returns `usage` for a rolling 24h window plus `dailyUsage`, `monthlyUsage` and an `entitlements` object based on these caps, so UIs can present Prompt Enhancer quotas per plan.

- Rate limiter: 15/min on POST /api/prompt-enhance

---

## Error shape (unified)

```json
{ "success": false, "error": { "type": "validation_error|forbidden|server_error", "message": "...", "details": {"…": "…"} } }

```text

---

## Example input prompts (for testing/demo)

The following German input prompts work well to test or demo the Prompt Enhancer in production:

1. **Coding / Bugfix (React useEffect)**

   > Ich habe eine React‑Komponente mit useEffect, die manchmal falsche Daten rendert. Schreib mir einen Prompt für eine KI, die meinen Code Schritt für Schritt auf typische Bugs (stale state, doppelte Requests, unvollständige Dependency Arrays) prüft und mir konkrete Refactor‑Vorschläge macht.

2. **Data / Analytics (monthly revenue)**

   > Hilf mir, einen Prompt zu formulieren, mit dem ich eine KI bitte, Monatsumsätze nach Ländern und Kanälen zu analysieren. Die KI soll mir Trends, Ausreißer, Kohorten und konkrete Hypothesen liefern, wie wir Conversion Rate und AOV steigern können.

3. **Content / LinkedIn (AI workflows)**

   > Ich möchte regelmäßig LinkedIn Posts über praktische AI‑Workflows für Knowledge Worker schreiben. Erstelle mir einen Prompt, der eine KI anweist, mir aus einer kurzen Stichwortliste je 3 Post‑Entwürfe zu generieren – mit Hook, Hauptteil und Call to Action.

4. **Research / Audience (Freelance Designer)**

   > Erstelle einen Prompt für eine KI, die mir hilft, meine Zielgruppe „Freelance Designer, die AI‑Tools zögerlich nutzen“ besser zu verstehen. Sie soll qualitative Interviewfragen, mögliche Antwortmuster und Interpretationshinweise liefern.

5. **Intentionally vague prompt (for before/after UX)**

   > Mach den folgenden Prompt deutlich besser: „Hilf mir einfach mal bei meinem Projekt, ich brauche ein bisschen Unterstützung.“ Es geht um ein internes Dashboard, das langsame Reports hat.

These are good baselines both for manual evaluation and for E2E smoke tests of the Prompt Enhancer UI.

---

## Notes

- Feature flag: PUBLIC_PROMPT_ENHANCER_V1 ("false" disables)

- Safe fallback when no OPENAI_API_KEY: deterministic rewrite path is used

- Output may be plain (LLM rewrite) or markdown sections (deterministic path)

---

See also: docs/api/README.md (CSRF/Origin, examples).

```text
