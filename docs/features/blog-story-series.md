---
description: 'Serien-Plan für die Blogreihe "Story hinter Evolution Hub" (Content-Strategie)'
owner: 'Content Team'
priority: 'medium'
lastSync: '2025-12-16'
codeRefs: 'docs/content.md, docs/features/blog+commentsystem-plan.md, src/content/**, src/pages/blog/**'
testRefs: 'N/A'
---

# Blog Series Plan – Story hinter Evolution Hub

Diese Doku beschreibt die geplante Blogreihe zur Aufbaugeschichte des Evolution Hub. Sie ergänzt die allgemeinen Content-Guidelines in `docs/content.md` und den technischen Plan für Blog & Comment-System in `docs/features/blog+commentsystem-plan.md`.

## Ziel & Zielgruppe

- **Ziel:** Aufbau einer zusammenhängenden Story-Serie, die Architektur-, Security- und Produktentscheidungen hinter Evolution Hub erklärt.
- **Zielgruppe:** Technische, aber nicht-hardcore Devs; Gründer:innen, Product‑People und neugierige Tech‑Interessierte.
- **Kanäle:** Blog als Primärquelle; Ableitung für X/LinkedIn, Instagram, TikTok.

## Contentful Environments (Preview vs Master)

- **Production:** `CONTENTFUL_ENVIRONMENT=master`
- **Staging:** `CONTENTFUL_ENVIRONMENT=preview`
- **Preview API Token (optional):**
  - Falls Staging auch **unpublizierte** Inhalte aus Contentful anzeigen soll, kann zusätzlich ein Preview‑Token genutzt werden.
  - Aktuelles Verhalten im Code: standardmäßig Delivery API (`cdn.contentful.com`); Preview API (`preview.contentful.com`) wird nur genutzt, wenn **kein** Delivery/Access Token gesetzt ist, aber `CONTENTFUL_PREVIEW_TOKEN` vorhanden ist (oder wenn explizit `CONTENTFUL_API_HOST` gesetzt wird).

## Serienübersicht (Staffel 1)

### A1 – Image Enhancer

- **Slug:** `ai-bild-verbessern-button`
- **Arbeitstitel:** Was hinter einem einfachen "Bild verbessern"-Button wirklich steckt
- **Status:** Published in Contentful (`blogPost`, ID `63w1xjLJcHVuSdo4Iv2RWu`)
- **Kernwinkel:**
  - Service-Layer statt direkter Provider-Anbindung
  - R2-Storage (uploads vs. results) und Ownership
  - Rate-Limits, Quoten und Kostenkontrolle
- **Doku-Anker:** `.windsurf/rules/image-enhancer.md`, `src/config/ai-image/**`, `src/pages/api/ai-image/**`

### A2 – Prompt Enhancer (Slot)

- **Vorschlag-Slug:** `prompt-optimieren-statt-copy-paste`
- **Arbeitstitel:** Warum ein Prompt-Enhancer mehr ist als "Text umformulieren"
- **Status:** Slot (noch kein Contentful-Entry)
- **Kernwinkel:**
  - Strikte Validierung und Sicherheitsgrenzen (keine Prompt-Leaks)
  - Rate-Limits/Quoten und vorhersehbare Kosten
  - UX: hilfreiche Fehler, klare Grenzen statt "magischer" Antworten
- **Doku-Anker:** `.windsurf/rules/prompt.md`, `src/lib/validation/schemas/prompt.ts`, `src/lib/rate-limiter.ts`, `src/pages/api/prompt/**`

### A3 – AI Usage & Quotas (Slot)

- **Vorschlag-Slug:** `warum-ai-limits-kein-ux-killer-sind`
- **Arbeitstitel:** Warum Limits, Retry-After und Quoten die Voraussetzung für gute AI-UX sind
- **Status:** Slot (noch kein Contentful-Entry)
- **Kernwinkel:**
  - 429 + `Retry-After` als UX-Signal statt "random failures"
  - Server als Quelle der Wahrheit (Entitlements/Quoten)
  - Transparenz: Nutzungsanzeigen ohne Security- oder Cost-Leaks
- **Doku-Anker:** `.windsurf/rules/frontend-state.md`, `.windsurf/rules/performance.md`, `src/lib/rate-limiter.ts`, `src/lib/kv/usage.ts`

### B1 – Auth & Magic Link

- **Slug:** `warum-wir-passwort-login-begraben-haben`
- **Arbeitstitel:** Warum wir klassischen Passwort-Login begraben haben
- **Status:** Published in Contentful (`blogPost`, ID `5xhq2PoX3Fuq2VOlQfKL8`)
- **Kernwinkel:**
  - Gründe gegen Passwort-Login (Security, UX, Wartung)
  - Magic Link + Stytch + PKCE + Access-Proxy
  - Session-Cookies, CSRF, Middleware
- **Doku-Anker:** `.windsurf/rules/auth.md`, `.windsurf/rules/api-and-security.md`, `src/middleware.ts`, `src/lib/api-middleware.ts`, `src/pages/api/auth/**`

### B2 – API Middleware & Security Baseline (Slot)

- **Vorschlag-Slug:** `warum-wir-api-middleware-als-baseline-haben`
- **Arbeitstitel:** Warum unsere API-Middleware (Rate-Limits, Security Header, Fehlerformen) nicht optional ist
- **Status:** Slot (noch kein Contentful-Entry)
- **Kernwinkel:**
  - Einheitliche Fehlerformen (`createApiSuccess`/`createApiError`) und 405-Handling
  - Same-Origin + CSRF bei unsafe methods
  - Rate-Limits als Security- und Cost-Control
- **Doku-Anker:** `.windsurf/rules/api-and-security.md`, `src/lib/api-middleware.ts`, `src/middleware.ts`, `src/lib/rate-limiter.ts`

### B3 – Observability ohne PII (Slot)

- **Vorschlag-Slug:** `wie-wir-logging-machen-ohne-pii-zu-leaken`
- **Arbeitstitel:** Wie wir debuggen, ohne Cookies, Tokens oder E-Mails in Logs zu verewigen
- **Status:** Slot (noch kein Contentful-Entry)
- **Kernwinkel:**
  - Request IDs und redacted Logs als Standard
  - Debug Panel / Client Logs env-gated
  - Security Events getrennt von Feature-Logs
- **Doku-Anker:** `.windsurf/rules/observability.md`, `src/config/logging.ts`, `src/server/utils/logger.ts`, `src/lib/security-logger.ts`

### C1 – Webscraper

- **Vorschlag-Slug:** `warum-unser-webscraper-kein-risiko-ist`
- **Arbeitstitel:** Wie wir unseren Webscraper gebaut haben, ohne uns das Netz abzufackeln
- **Kernwinkel:**
  - SSRF-Schutz (private IP-Ranges, Ports, Weiterleitungen)
  - Content-Type- und Größen-Limits
  - Rate-Limits und klare Fehlerformen
- **Doku-Anker:** `.windsurf/rules/scraper.md`, `src/lib/validation/schemas/webscraper.ts`, `src/lib/rate-limiter.ts`, `src/pages/api/webscraper/**`

### C2 – Web-Eval

- **Vorschlag-Slug:** `warum-wir-web-eval-gebaut-haben`
- **Arbeitstitel:** Warum wir ein eigenes Web-Eval gebaut haben, statt Features einfach in Produktion zu testen
- **Kernwinkel:**
  - Evaluieren von Prompts/Flows gegen echte Seiten
  - Task-/Report-Architektur und Browser-Zugriff
  - Sicherheitsgrenzen, Limits und Tests
- **Doku-Anker:** `docs/ops/runbook-web-eval-launch.md`, `src/lib/testing/web-eval/**`, `src/config/web-eval/**`, `tests/integration/api/web-eval-*.test.ts`

### C3 – Video Enhancer

- **Vorschlag-Slug:** `warum-video-upscaling-kein-kleines-feature-ist`
- **Arbeitstitel:** Was hinter unserem AI-Video-Upscaling steckt – und warum Credits Pflicht sind
- **Kernwinkel:**
  - Teure, lange Jobs (Replicate Topaz etc.)
  - Credits, Quoten und Job-Ownership
  - R2-Storage für Uploads und Results
- **Doku-Anker:** `.windsurf/rules/video-enhancer.md`, `src/pages/api/ai-video/**`, `src/config/ai-video/**`, `src/lib/kv/usage.ts`

### C4 – Voice Transcriptor

- **Vorschlag-Slug:** `wie-wir-unsere-sprach-transkription-zahm-gehalten-haben`
- **Arbeitstitel:** Warum unsere Sprach-Transkription harte Grenzen hat – und das gut so ist
- **Kernwinkel:**
  - Multipart-Upload, MIME-Allowlist, Größen-Limits
  - Rate-Limits und Quoten
  - Permissions-Policy und API-Fehlerformen
- **Doku-Anker:** `.windsurf/rules/transcriptor.md`, `src/lib/services/voice-transcribe-service.ts`, `src/config/voice/**`, `src/pages/api/voice/**`

### C5 – Pricing & Credits

- **Vorschlag-Slug:** `wie-wir-unsere-plans-und-credits-strukturiert-haben`
- **Arbeitstitel:** Warum wir Pricing, Credits und Stripe streng getrennt halten
- **Kernwinkel:**
  - `users.plan` als Ausgangspunkt, aber nicht alleinige Wahrheit
  - Stripe-Webhooks, Plan-Änderungen, Admin-APIs
  - Entitlements für AI-Features (Image, Video, Voice, Prompt)
- **Doku-Anker:** `.windsurf/rules/pricing.md`, `src/pages/api/billing/**`, `src/config/ai-image/entitlements.ts`, `src/config/ai-video/entitlements.ts`

## Veröffentlichungs-Reihenfolge (Empfehlung)

Empfohlene Reihenfolge für Staffel 1 der Serie:

1. **A1 – Image Enhancer**
2. **A2 – Prompt Enhancer**
3. **B1 – Auth & Magic Link**
4. **C1 – Webscraper**
5. **C2 – Web-Eval**
6. **C3 – Video Enhancer**
7. **C4 – Voice Transcriptor**
8. **C5 – Pricing & Credits**

Diese Reihenfolge baut von einem sichtbaren Produkt-Feature (Image Enhancer) über Sicherheit/UX (Auth), hin zu Tooling (Webscraper, Web-Eval) und schließlich Kostenmodell und Entitlements auf.

## Workflow für neue Story-Artikel

- **1. Thema wählen:** Aus obiger Liste oder aus zukünftigen Doku-Themen.
- **2. Outline erstellen:** Hook, Kontext, Optionen, Entscheidung, Implementierung, Learnings.
- **3. Draft schreiben:** Erst im Editor (z. B. Notion oder direkt in Contentful), danach als `content` in den entsprechenden `blogPost`-Eintrag übernehmen.
- **4. Review & Feinschliff:** Inhaltlich prüfen, auf Zielgruppe und Kanäle optimieren, Social-Snippets ableiten.
- **5. Publishing:**
  - Draft in Contentful publishen (mit Hero-Image + imageAlt)
  - Social-Posts aus Snippets erstellen

Diese Datei dient als Referenz, um die Story-Serie konsistent zu halten und neue Artikel planbar zu ergänzen.
