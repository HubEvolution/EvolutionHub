---
description: 'Serien-Plan für die Blogreihe "Story hinter Evolution Hub" (Content-Strategie)'
owner: 'Content Team'
priority: 'medium'
lastSync: '2025-11-30'
codeRefs: 'docs/content.md, docs/features/blog+commentsystem-plan.md, src/content/**, src/pages/blog/**'
testRefs: 'N/A'
---

# Blog Series Plan – Story hinter Evolution Hub

Diese Doku beschreibt die geplante Blogreihe zur Aufbaugeschichte des Evolution Hub. Sie ergänzt die allgemeinen Content-Guidelines in `docs/content.md` und den technischen Plan für Blog & Comment-System in `docs/features/blog+commentsystem-plan.md`.

## Ziel & Zielgruppe

- **Ziel:** Aufbau einer zusammenhängenden Story-Serie, die Architektur-, Security- und Produktentscheidungen hinter Evolution Hub erklärt.
- **Zielgruppe:** Technische, aber nicht-hardcore Devs; Gründer:innen, Product‑People und neugierige Tech‑Interessierte.
- **Kanäle:** Blog als Primärquelle; Ableitung für X/LinkedIn, Instagram, TikTok.

## Serienübersicht (Staffel 1)

### A1 – Image Enhancer

- **Slug:** `ai-bild-verbessern-button`
- **Arbeitstitel:** Was hinter einem einfachen "Bild verbessern"-Button wirklich steckt
- **Status:** Draft in Contentful (`blogPost`, ID `63w1xjLJcHVuSdo4Iv2RWu`)
- **Kernwinkel:**
  - Service-Layer statt direkter Provider-Anbindung
  - R2-Storage (uploads vs. results) und Ownership
  - Rate-Limits, Quoten und Kostenkontrolle
- **Doku-Anker:** `.windsurf/rules/image-enhancer.md`, `src/config/ai-image/**`, `src/pages/api/ai-image/**`

### B1 – Auth & Magic Link

- **Slug:** `warum-wir-passwort-login-begraben-haben`
- **Arbeitstitel:** Warum wir klassischen Passwort-Login begraben haben
- **Status:** Draft-Entry in Contentful (Platzhalter-Content)
- **Kernwinkel:**
  - Gründe gegen Passwort-Login (Security, UX, Wartung)
  - Magic Link + Stytch + PKCE + Access-Proxy
  - Session-Cookies, CSRF, Middleware
- **Doku-Anker:** `.windsurf/rules/auth.md`, `.windsurf/rules/api-and-security.md`, `src/middleware.ts`, `src/lib/api-middleware.ts`, `src/pages/api/auth/**`

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
2. **B1 – Auth & Magic Link**
3. **C1 – Webscraper**
4. **C2 – Web-Eval**
5. **C3 – Video Enhancer**
6. **C4 – Voice Transcriptor**
7. **C5 – Pricing & Credits**

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
