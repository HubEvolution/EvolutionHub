<!-- markdownlint-disable MD051 -->

# Production-Readiness-Plan: Blog & Comment-System

## Übersicht

**Ziel**: Blog-System von 75% auf 95% und Comment-System von 80% auf 95% Production-Readiness bringen.

**Geschätzter Aufwand**: 3-5 Tage (1-2 Entwickler)

---

## Single Source of Truth – Aktueller Stand (Blog + Comments)

Diese Seite dient als zentrale Referenz für die aktuelle Blog- und Comments-Implementierung. Ergänzend zu den Phasen/Tasks unten werden hier die verbindlichen Konventionen, Komponenten und Schnittstellen festgehalten.

> Weitere Details zu Admin-APIs, Benachrichtigungs-Queue, Warmup und D1-Schema findest du in [docs/features/admin-notifications.md](./admin-notifications.md).

### Komponenten & Konventionen (Astro)

- **BlogPost Rendering** ([`src/components/BlogPost.astro`](../../src/components/BlogPost.astro))

  - Bilder über Astro `<Image>`; Frontmatter-Bilder als `ImageMetadata` getypt (defensive Guards für `src/width/height`).

  - Alt-Text strikt normalisiert (`imageAltText: string`); Caption nur bei `typeof imageAlt === 'string'`.

  - Share-URLs mit `new URL(post.url, Astro.site?.origin || 'http://127.0.0.1:8787')` und `encodeURIComponent(String(title))`.

  - CTA-Konfiguration: Branding-Varianten (`primary|secondary|subtle`) werden für `LeadMagnetCTA` auf Layout-Varianten gemappt (`primary→banner`, `secondary→inline`, `subtle→card`).

  - Kategorie-Handling: Normalisierung auf `categoryStr` für URL/Label.

- **CTAs**

  - `BlogCTA` ([`src/components/blog/BlogCTA.astro`](../../src/components/blog/BlogCTA.astro)): akzeptiert Branding-Varianten (`'primary'|'secondary'|'subtle'`).

  - `LeadMagnetCTA` ([`src/components/blog/LeadMagnetCTA.astro`](../../src/components/blog/LeadMagnetCTA.astro)): erwartet Layout-Varianten (`'card'|'inline'|'banner'`).

- **BlogCard** ([`src/components/BlogCard.astro`](../../src/components/BlogCard.astro))

  - Zeigt Comment-Count-Badge (über `/api/comments/count`).

  - Bilddarstellung konsistent mit Astro `<Image>` (siehe Phase 2.3 – Status: in Arbeit/teils umgesetzt).

#### Locale-bewusste Links (SSoT)

- Alle internen Blog-Links müssen locale-bewusst erzeugt werden: `localizePath(getLocale(Astro.url.pathname), href)`.

- Begründung: Die Middleware normalisiert neutrale Pfade abhängig von Cookies/Referer und verursacht sonst 30x-Redirects (weißes Redirect-Zwischendokument). Refs: `src/middleware.ts:332-356`, `src/middleware.ts:447-469`.

- Umsetzung:

  - Beitragstitel/Bilder/„Weiterlesen“ in `BlogCard` verwenden lokalisierte URL.

  - Kategorie-/Tag-Links in `BlogPost` lokalisieren.

  - Blog-Index (Such-Action, Tag-Links, Reset, CategoryFilter-Base) lokalisieren.

  - CategoryFilter hat einen locale-bewussten Default, falls `baseUrl` nicht gesetzt ist.

- Refs: `src/components/BlogCard.astro`, `src/components/BlogPost.astro`, `src/pages/blog/index.astro`, `src/components/CategoryFilter.astro`, `src/lib/locale-path.ts`.

Weitere UI-Details sind in [`docs/frontend/ui-components.md`](../frontend/ui-components.md) festgehalten (Abschnitt „Blog UI Konventionen (Astro)“).

### API & Security Integration

- Alle API-Routen werden über `withApiMiddleware` bzw. `withAuthApiMiddleware` gehärtet ([`src/lib/api-middleware.ts`](../../src/lib/api-middleware.ts)): Security-Header, Same-Origin-Checks für unsichere Methoden, Rate Limiting.

- Einheitliche JSON-Shapes via `createApiSuccess`/`createApiError` und `createMethodNotAllowed` (405 mit Allow-Header).

- Comments-Endpoints (u. a. `GET /api/comments/count`, Moderation/Performance/Admin) folgen diesen Regeln; siehe Implementierungen unter [`src/pages/api/comments/`](../../src/pages/api/comments/).

- KV-Caching für Comments (Phase 2.2): `KV_COMMENTS` Binding in `wrangler.toml`, TTL 5 min, Invalidation bei Mutationen.

### Relevante Dateien (Auszug)

- Blog Rendering: [`src/components/BlogPost.astro`](../../src/components/BlogPost.astro), [`src/pages/blog/[...slug].astro`](../../src/pages/blog/%5B...slug%5D.astro)

- CTAs: [`src/components/blog/BlogCTA.astro`](../../src/components/blog/BlogCTA.astro), [`src/components/blog/LeadMagnetCTA.astro`](../../src/components/blog/LeadMagnetCTA.astro)

- Comment-UI/Badge: [`src/components/BlogCard.astro`](../../src/components/BlogCard.astro)

- Admin UI: [`src/pages/admin/comments.astro`](../../src/pages/admin/comments.astro)

- Comments Services/APIs: [`src/lib/services/comment-service.ts`](../../src/lib/services/comment-service.ts), [`src/pages/api/comments/`](../../src/pages/api/comments/), [`src/pages/api/admin/comments/`](../../src/pages/api/admin/comments/)

- Notifications: [`src/lib/services/notification-service.ts`](../../src/lib/services/notification-service.ts), [`src/pages/api/notifications/queue/process.ts`](../../src/pages/api/notifications/queue/process.ts), [`migrations/0022_seed_email_templates_comments.sql`](../../migrations/0022_seed_email_templates_comments.sql)

- Regeln/Leitlinien: [API & Security](../../.windsurf/rules/api-and-security.md), [Project Structure](../../.windsurf/rules/project-structure.md), [Testing & CI](../../.windsurf/rules/testing-and-ci.md), [Tooling & Style](../../.windsurf/rules/tooling-and-style.md), sowie [`docs/frontend/ui-components.md`](../frontend/ui-components.md)

**Lösung**:

1. API-Endpoint: `GET /api/comments/count?entityType=blog&entityId=<slug>` (Batch via mehrfachen `entityId` möglich).
1. Endpoint mit `withApiMiddleware` absichern (Security-Header, Rate-Limit, CSRF-/Same-Origin-Checks für unsafe Methoden nicht erforderlich, da GET).
1. `src/components/BlogCard.astro` updaten: Comment-Count-Badge hinzufügen; optional Batch-Fetch pro Seite.
1. Request-Scoped Cache (SSR) oder leichter Client-LRU, sodass pro Karte max. 1 Request anfällt.

**Dateien**:

- `src/pages/api/comments/count.ts` (NEU; mit `withApiMiddleware`)

- `src/components/BlogCard.astro` (UPDATE: Z. 40-50 - Comment-Badge)

- `src/lib/blog.ts` (UPDATE: Cache-Strategie optional)

**Akzeptanzkriterien**:

- ✅ BlogCard zeigt "X Kommentare" Badge

- ✅ Badge ist klickbar → Scroll zu Comments

- ✅ Count ist gecached (max 1 Query pro Page-Load)

---

### 1.5 Blog-System: Fehlende Content

**Problem**: Nur 12 Blog-Posts, fehlende Images.

**Lösung**:

1. Mindestens 8 weitere Blog-Posts erstellen (Ziel: 20+)
1. Fehlende Images hochladen/erstellen:

   - `digital-detox-focus.webp`

   - Weitere Post-Images (min 1200x675)

1. Typo-Fix: "Gefiltered" → "Gefiltert" (blog/index.astro:196)

**Dateien**:

- `src/content/blog/` (8 neue .md Dateien)

- `src/content/blog/images/` (fehlende Images)

- `src/pages/blog/index.astro` (UPDATE: Z. 196 - Typo-Fix)

**Akzeptanzkriterien**:

- ✅ Mindestens 20 Blog-Posts vorhanden

- ✅ Alle referenzierten Images existieren

- ✅ Alle Posts haben korrekte Frontmatter-Validierung

---

## Phase 2: Performance-Optimierungen (SHOULD-HAVE) - 1 Tag

### 2.1 Blog-System: SSG/ISR aktivieren — Status: ✅ abgeschlossen

**Problem**: Blog-Posts nutzen SSR statt SSG (langsamer).

**Lösung**:

1. `prerender = true` in `[...slug].astro` aktivieren
1. Für dynamische Posts: ISR mit Revalidate (Astro 5 Feature)
1. CDN-Caching-Header setzen

**Dateien**:

- `src/pages/blog/[...slug].astro` (UPDATE: Z. 1-10 - prerender/revalidate)

- `astro.config.mjs` (UPDATE: ISR-Config falls nötig)

**Akzeptanzkriterien**:

- ✅ Blog-Posts werden als statische HTML gebaut

- ✅ Build-Zeit < 30s für 20 Posts

- ✅ CDN-Cache-Hit-Rate > 90%

Hinweis: Build-Warnungen zu `Astro.request.headers` auf SSG-Seiten wurden beobachtet; falls nötig, entfernen/absichern wir Header-Zugriffe in `[...slug].astro` in einem Folge-Refactor.

---

### 2.2 Comment-System: KV-Caching — Status: ⏳ in Arbeit

**Problem**: Jeder Comment-Load = DB-Query (keine Caching-Layer).

**Lösung**:

1. KV-Store für häufig abgerufene Entities (z.B. beliebte Posts)
1. Cache-Strategie: TTL 5min, Invalidation bei neuem Comment
1. Fallback zu DB bei Cache-Miss

**Dateien**:

- `src/lib/services/comment-service.ts` (UPDATE: Cache-Layer mit TTL 5m, Invalidation bei Mutationen)

- `wrangler.toml` (UPDATE: KV-Binding `KV_COMMENTS` pro Env)

Umsetzungsstand:

- ✅ KV Namespaces erstellt:

  - Testing `KV_COMMENTS`: `41475ea385094b3f9b13c12e06954dd5`

  - Staging `KV_COMMENTS`: `61878c1a1cd3402499476e7804ccc8ef`

- ✅ Testing wiring: API-Handler übergeben `KV_COMMENTS` an `CommentService`

- ✅ Staging wiring: Binding vorhanden und genutzt (siehe Deploy-Output `env.KV_COMMENTS`)

**Akzeptanzkriterien**:

- ✅ Beliebte Posts (>50 Comments) nutzen KV-Cache

- ✅ Cache-Invalidation bei neuem Comment funktioniert

- ✅ Fallback zu DB bei Cache-Miss

---

### 2.3 Blog-System: Image-Optimierung

**Problem**: Keine explizite Image-Optimierung für Blog-Images.

**Lösung**:

1. Astro Image-Component konsequent nutzen
1. Responsive Images (srcset) generieren
1. WebP-Konvertierung automatisieren

**Dateien**:

- `src/components/BlogCard.astro` (UPDATE: `<Image>` statt `<img>`)

- `src/components/BlogPost.astro` (UPDATE: `<Image>` Component)

**Akzeptanzkriterien**:

- ✅ Alle Blog-Images nutzen Astro `<Image>`

- ✅ Responsive srcset generiert (min 3 Größen)

- ✅ WebP-Format bevorzugt (Fallback zu JPEG/PNG)

---

## Phase 3: Testing & Monitoring (SHOULD-HAVE) - 1 Tag

### 3.1 E2E-Tests erweitern

**Problem**: E2E-Coverage für Comment-Moderation nur 70%.

**Lösung**:

1. Moderation-Flow-Tests:

   - Admin approved Pending Comment

   - Admin rejects Spam Comment

   - Bulk-Approve-Action

1. Email-Notification-Tests (mit Mock)
1. Load-Testing (100+ Comments pro Post)

**Dateien**:

- `test-suite-v2/src/e2e/features/comment-moderation.spec.ts` (NEU)

- `test-suite-v2/src/e2e/features/comment-notifications.spec.ts` (NEU)

- `test-suite-v2/fixtures/comment-helpers.ts` (UPDATE)

**Akzeptanzkriterien**:

- ✅ E2E-Coverage für Comment-System > 90%

- ✅ Moderation-Flow vollständig getestet

- ✅ Email-Notification-Tests (Mock) grün

---

### 3.2 Analytics & Monitoring

**Problem**: Keine Comment-Engagement-Metriken.

**Lösung**:

1. Analytics-Events:

   - `comment_created` (Props: entityType, isReply, isGuest)

   - `comment_moderated` (Props: action, reason)

   - `comment_reported` (Props: reason)

1. Dashboard-Widget: Comment-Stats (Total, Pending, Flagged)
1. Cloudflare Web Analytics Integration

**Dateien**:

- `src/lib/analytics.ts` (UPDATE: Comment-Events)

- `src/components/dashboard/CommentStatsWidget.tsx` (NEU)

- `src/pages/dashboard.astro` (UPDATE: Widget einbinden)

**Akzeptanzkriterien**:

- ✅ Analytics-Events werden getrackt

- ✅ Dashboard zeigt Comment-Stats

- ✅ Spam-Detection-Rate sichtbar

---

### 3.3 Load-Testing

**Problem**: Keine Performance-Tests unter Last.

**Lösung**:

1. K6 Load-Test-Skripte:

   - 100 concurrent users, 1000 Comments/min

   - Blog-Index mit 100+ Posts

1. Performance-Baselines definieren:

   - Comment-Creation: <500ms (p95)

   - Blog-Index: <1s (p95)

1. CI-Integration (optional)

**Dateien**:

- `tests/load/comment-load.js` (NEU - K6 Script)

- `tests/load/blog-load.js` (NEU - K6 Script)

**Akzeptanzkriterien**:

- ✅ 100 concurrent users ohne Errors

- ✅ Comment-Creation <500ms (p95)

- ✅ Blog-Index <1s (p95)

---

## Phase 4: Nice-to-Have (OPTIONAL) - 1 Tag

### 4.1 Markdown-Support für Comments

**Lösung**: Simple MD-Parser (marked.js) mit Sanitization.

**Dateien**:

- `src/lib/security/sanitize.ts` (UPDATE: MD-Parsing + DOMPurify)

---

### 4.2 Comment-Reactions (Like/Dislike)

**Lösung**:

- Table `comment_reactions` (comment_id, user_id, type)

- API: `POST /api/comments/[id]/react`

**Dateien**:

- `migrations/0023_add_comment_reactions.sql` (NEU)

- `src/pages/api/comments/[id]/react.ts` (NEU)

---

### 4.3 Breadcrumbs & XML-Sitemap

**Lösung**:

- Breadcrumb-Component für Blog-Posts

- Dedizierter Blog-Sitemap (`/blog-sitemap.xml`)

**Dateien**:

- `src/components/Breadcrumbs.astro` (NEU)

- `src/pages/blog-sitemap.xml.ts` (NEU)

---

## Deployment-Plan

### Pre-Deployment Checkliste

- [ ] Alle Tests grün (Unit, Integration, E2E)

- [ ] Coverage > 80% (Vitest)

- [ ] E2E-Coverage > 90% (Playwright)

- [ ] Lint & Format Check pass

- [ ] OpenAPI validiert (`npm run openapi:validate`)

- [ ] Security Audit (npm audit) keine kritischen Issues

- [ ] Performance-Baselines erfüllt (Load-Tests)

- [ ] Email-Service konfiguriert (Secrets in Wrangler)

- [ ] DB-Migrations getestet (Staging)

### Staging-Deployment

1. Migrations ausführen: `wrangler d1 migrations apply evolution-hub-main-local --env staging`
1. Secrets setzen:

   ```bash
   wrangler secret put RESEND_API_KEY --env staging
   wrangler secret put EMAIL_FROM --env staging
   wrangler secret put BASE_URL --env staging
   ```

1. Build & Deploy:

   ```bash
   npm run build:worker:staging
   wrangler deploy --env staging
   ```

1. Smoke-Tests: `/blog`, `/admin/comments`, `/rss.xml`

### Production-Deployment

1. Migrations ausführen: `wrangler d1 migrations apply evolution-hub-main --env production`
1. Secrets setzen (production)

   ```bash
   wrangler secret put RESEND_API_KEY --env production
   wrangler secret put EMAIL_FROM --env production
   wrangler secret put BASE_URL --env production
   ```

1. Deploy mit Manual Approval (GitHub Actions)
1. Health-Check: `npm run health-check -- --url https://hub-evolution.com`
1. Monitoring 24h (Cloudflare Analytics, Error-Logs)

---

**Falls kritische Fehler:**

1. Cloudflare Rollback: `wrangler rollback --env production`
1. DB-Rollback: Restore von Backup (Pre-Migration)
1. DNS-Failover (optional): Traffic zu alter Version

---

## Success-Metriken

**Blog-System (Ziel: 95%)**:

- ✅ 20+ Blog-Posts

- ✅ RSS-Feed aktiv

- ✅ SSG/ISR aktiviert

- ✅ Comment-Count Display

- ✅ Alle Images vorhanden

**Comment-System (Ziel: 95%)**:

- ✅ Email-Benachrichtigungen

- ✅ Admin-Panel UI

- ✅ KV-Caching

- ✅ E2E-Coverage > 90%

- ✅ Load-Tests bestanden

**Performance**:

- ✅ Blog-Index <1s (p95)

- ✅ Comment-Creation <500ms (p95)

- ✅ CDN-Cache-Hit-Rate > 90%

---

## Geschätzter Zeitplan

| Phase                          | Aufwand      | Dauer              |
| ------------------------------ | ------------ | ------------------ |
| Phase 1 (Kritische Blocker)    | Hoch         | 1-2 Tage           |
| Phase 2 (Performance)          | Mittel       | 1 Tag              |
| Phase 3 (Testing & Monitoring) | Mittel       | 1 Tag              |
| Phase 4 (Nice-to-Have)         | Niedrig      | 1 Tag (optional)   |
| **Gesamt**                     | **3-5 Tage** | **1-2 Entwickler** |

---

## Nächste Schritte

1. Phase 2.2 finalisieren (KV-Caching)

   - Staging: `KV_COMMENTS` Binding im `wrangler.toml` prüfen/fixieren → redeploy

   - Kurztest (Testing & Staging): zweimaliger GET auf identische Entity → Cache-Hit

   - Logging optional: Cache-Hit/Miss im `CommentService` (debug-level)

1. Phase 2.3 umsetzen (Image-Optimierung)

   - `src/components/BlogCard.astro` und `src/components/BlogPost.astro` auf `<Image>` + `srcset` + WebP

   - Build & Smoke; Light-Perf-Check

1. Step 3 abgeschlossen (Scripts/Stores/Tests/API)

   - Scripts/Stores gehärtet, Unit-Tests für Stores ergänzt, Dashboard-APIs angepasst (Env-Guards/Typen)

   - Optional: weitere Integrationstests für Dashboard-APIs hinzufügen
