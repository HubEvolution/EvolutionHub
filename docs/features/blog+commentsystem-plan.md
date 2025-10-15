# Production-Readiness-Plan: Blog & Comment-System

## Übersicht

**Ziel**: Blog-System von 75% auf 95% und Comment-System von 80% auf 95% Production-Readiness bringen.

**Geschätzter Aufwand**: 3-5 Tage (1-2 Entwickler)

---

<!-- markdownlint-disable-next-line MD033 -->

<a id="ssot-blog-comments"></a>

<!-- markdownlint-enable MD033 -->

## Single Source of Truth – Aktueller Stand (Blog + Comments)

Diese Seite dient als zentrale Referenz für die aktuelle Blog- und Comments-Implementierung. Ergänzend zu den Phasen/Tasks unten werden hier die verbindlichen Konventionen, Komponenten und Schnittstellen festgehalten.

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

## Fortschritt (Stand: laufend)

- ✅ Feature-Branch erstellt: `feat/blog-comments-phase1`
- ✅ Admin-UI Mismatch behoben: `src/pages/admin/comments.astro`
  - Normalisierung der API-Response (`adminCommentsList`)
  - Moderations-Request sendet `{ action: 'approve'|'reject' }`
- ✅ Notifications-Hooks ergänzt: `src/lib/services/comment-service.ts`
  - Reply → In-App + E-Mail-Queue
  - Moderation (approve/reject) → In-App + E-Mail-Queue
- ✅ Queue-Processor-API: `POST /api/notifications/queue/process` (mit `withAuthApiMiddleware`)
- ✅ Seed-Migration für E-Mail-Templates: `migrations/0022_seed_email_templates_comments.sql`
- ✅ Plan-Doc aktualisiert (Security/Middleware, Secrets, Deployment)
- ✅ Comment-Count Endpoint: `GET /api/comments/count` + Badge in `src/components/BlogCard.astro`
- ✅ Admin-UI erweitert: Filter, Pagination, Auswahl-Checkboxen, Bulk-Actions (`/api/admin/comments/bulk-moderate`)
- ✅ RSS-Feed implementiert: `GET /rss.xml` (ohne zusätzliche Dependencies)
- ✅ Comments- & Dashboard-API-Cluster gehärtet (`src/pages/api/comments/{moderate,performance}.ts`, `src/pages/api/dashboard/activity.ts`, `src/pages/api/dashboard/billing-summary.ts`, `src/pages/api/debug/{client-log,debug-login}.ts`, `src/pages/api/templates.ts`, `src/pages/api/user/{me,profile}.ts`)

**Aktualisierung (Staging/CI):**

- ✅ Seeds verifiziert: `email_templates` vorhanden; `reply-notification`, `moderation-decision` aktiv (DE)
- ✅ Secrets gesetzt: `EMAIL_FROM = noreply@hub-evolution.com` (Testing & Staging)
- ✅ Deploys live: Testing (`ci.hub-evolution.com`) & Staging (`staging.hub-evolution.com`)
- ✅ Smoke: `/rss.xml` 200; `/blog` gated (302 → `/welcome?next=...`)
- ✅ Comments-APIs stabil: 500er behoben; Diagnose liefert `schema: "legacy"`
- ✅ Admin-UI erweitert: Schema-Diagnose-Badge & Approved-Count in Übersicht
- ✅ Blog-Detail 404s gefixt (`src/pages/blog/[...slug].astro`, `wrangler.toml`)
  - Catch-All-Slug normalisiert (`getStaticPaths` → String) und Worker-Assets auf `auto-trailing-slash`
  - `dist/blog/<slug>/index.html` wird im Build erzeugt
- ✅ Integration-Suiten ergänzt: `tests/integration/routing/blog-routes.test.ts`, `tests/integration/api/comments-routes.test.ts`
  - Smoke prüft `/blog/` + Detailseiten inkl. Redirects (Welcome-Gate tolerant)
  - Comments-APIs (`/api/comments`, `/api/comments/count`) werden auf Shape/Diag validiert
- ✅ Integration-Suites laufen grün (`npm run test:integration -- tests/integration/routing/blog-routes.test.ts tests/integration/api/comments-routes.test.ts`)
  - Wrangler-Dev-Server liefert 200er für Blog-Detailseiten; Comments-API-Responses bestehen Shape-Checks
- ⚠️ `npx astro check` schlägt an: Altbestand an Unit-Tests (`tests/unit/**`) enthält TypeScript-Fehler (z.B. fehlende Exporte, veraltete Imports)
- ✅ Lint-Setup bereinigt:
  - `npm install -D eslint-plugin-prettier@^5.1.3`
  - `npm install -D eslint-plugin-react-hooks@^6.1.1`
  - `npm install -D prettier-plugin-astro@^0.13.0`
- ⚠️ Lint-Ausgabe 2025-10-09: `npm run lint` liefert 10 Errors / 550 Warnings (v. a. `no-useless-escape` + Format in `src/pages/rss.xml.ts`, viele `@typescript-eslint/no-explicit-any` Treffer, diverse Prettier-Hinweise)
- ✅ Kurzfristige ToDos (Lint/Format) – erledigt 2025-10-10:
  1. `src/pages/rss.xml.ts` vollständig Prettier-konform, keine Format-Warnungen mehr
  2. `src/pages/api/projects/index.ts` nutzt typisierte Locals + Request-Parsen ohne `any`
  3. `src/pages/api/prompt-enhance.ts` mit strikt typisierten JSON-/Env-Helpern & Error-Handling
  4. `src/pages/api/webscraper/extract.ts` typisiert (Payload/Env/Error), keine `any`
  5. `src/server/utils/logger.ts` ersetzt `Record<string, any>` durch `LogContextPayload`
  6. Nach jedem Fix: `npx eslint <file>` + `npm run lint -- --max-warnings=280`
- ⏳ Mittelfristig (`any`-Bereinigung Runde 2):
  - `src/pages/api/templates.ts`
  - `src/pages/api/user/me.ts`, `src/pages/api/user/profile.ts`
  - `src/pages/api/test/seed-email-token.ts`
  - `src/server/utils/logger-factory.ts`
  - `src/pages/api/debug/*` (after logs-stream cleanup bleiben `client-log.ts`, `debug-login.ts`)
- 🛠️ Nächste Priorität (Q4 2025 Sprint):
  - ✅ `src/pages/api/notifications/index.ts` jetzt mit typisiertem Query-Parsing & Env-Zugriff
  - ✅ `src/pages/api/notifications/queue/process.ts` strikte Env-/Template-Typen
  - ✅ `src/pages/api/debug/logs-stream.ts` SSE/Polling Typing + Abort-Handhabung
  - ➡️ Fokus verschiebt sich auf `src/pages/api/comments/moderate.ts`, `src/pages/api/comments/performance.ts`, `src/pages/api/csp-report.ts`, `src/pages/api/dashboard/**` (siehe Lint-Ausgabe 2025-10-10)
- 📊 Lint-Status 2025-10-10 (`npm run lint -- --max-warnings=280`):
  - 8 Errors / 329 Warnings verbleibend (hauptsächlich `@typescript-eslint/no-explicit-any`)
  - Cluster (nach Abschluss Step 3 – Scripts/Stores/Tests/API):
    - Scripts gehärtet: `src/scripts/orchestrate-entrance.ts`, `src/scripts/settings.ts`
    - Stores verfeinert: `src/stores/projectStore.ts`, `src/stores/quickActionStore.ts`
    - Tests ergänzt: `tests/unit/dashboard/{projectStore.test.ts,quickActionStore.test.ts}`; Setup säubert Mocks (`src/setupTests.ts`)
    - Dashboard-APIs angepasst: `src/pages/api/dashboard/{perform-action,projects,stats}.ts` (Env-Guards, Typen, Response-Shape)
- 💡 Zwischenexkurs: Dashboard-Komponente "Meine letzten Kommentare"
  - Ziel: Im User-Dashboard ein Widget (`DashboardRecentComments`) bereitstellen, das die zuletzt verfassten Kommentare des Nutzers (z. B. die letzten fünf) mit Blogpost-Titel, Auszug, Status (`published | pending | rejected`) und Zeitstempel darstellt.
  - Backend: Neuer Endpoint `GET /api/comments/recent?limit=5` (mit `withAuthApiMiddleware`) nutzt eine `CommentService.getRecentCommentsByUser(userId, limit)`-Hilfsfunktion, die auf bestehenden Moderationsqueries aufsetzt.
  - Frontend: React-Island `src/components/dashboard/RecentCommentsCard.tsx`, lädt Daten via SWR/Fetch, zeigt Skeleton- und Error-State, verlinkt jeden Eintrag zu `/blog/<slug>#comments`.
  - Empty State: "Noch keine Kommentare – entdecke unseren Blog und diskutiere mit!" inkl. CTA-Button `Zum Blog` (`/blog`).
  - Tracking: Optionales Event `dashboard_recent_comments_opened` zur Nutzungsmessung.
- 🪜 Langfristig (Cleanup / Test-Infrastruktur):
  - `src/setupTests.ts`
  - `src/scripts/orchestrate-entrance.ts`, `src/scripts/settings.ts`
  - `src/stores/projectStore.ts`, `src/stores/quickActionStore.ts`
  - Konsolidierte Error-Mapping-Helper (`WebscraperService`, `PromptEnhancerService`) prüfen

### Phase 1 Status

- ✅ Phase 1 abgeschlossen: Notifications (Queue + Gating + Templates), Admin-UI (Filter/Pagination/Bulk/Details), Comment-Count, RSS.
- Nächste Schritte (Staging & CI-Domain):
  - ✅ Staging Deploy & Smoke-Tests: `/blog`, `/rss.xml`
  - ℹ️ Admin-UI Smoke folgt nach Abschluss Phase 2.2 (KV-Caching)

**Problem**: Keine Email-Benachrichtigungen bei neuen Replies oder Moderation-Entscheidungen.

**Lösung**:

1. Vorhandene Infrastruktur nutzen:
   - Versand über `ResendEmailService` in `src/lib/services/email-service-impl.ts` (Secrets: `RESEND_API_KEY`, `EMAIL_FROM`, `BASE_URL`).
   - Benachrichtigungen/Queue/Settings über `src/lib/services/notification-service.ts` und bestehende Tabellen `notification_settings`, `email_templates`, `email_queue`.
2. Email-Templates per Migration seeden:
   - `reply-notification` (DE/EN)
   - `moderation-decision` (DE/EN)
3. Hooks in `CommentService` ergänzen:
   - In `createComment()`: Bei Reply den Parent-Autor ermitteln → In-App-Notification `comment_reply` und (gemäß Settings) Email in Queue stellen.
   - In `moderateComment()`: Nach Entscheidung `comment_approved`/`comment_rejected` erzeugen und (gemäß Settings) Email enqueuen.
4. Queue-Verarbeitung:
   - API-Route `src/pages/api/notifications/queue/process.ts` (NEU): Pending-Emails laden, Template rendern, via Resend versenden, Status aktualisieren. Admin-geschützt mit `withAuthApiMiddleware` (Security-Header, Rate-Limit, Same-Origin für unsafe Methoden).
5. User-Preferences nutzen:
   - Bestehende `notification_settings` verwenden (kein Schema-Update nötig). Settings-UI/Route (`src/pages/api/notifications/settings.ts`) einbinden/verlinken.

**Dateien**:

- `src/lib/services/email-service-impl.ts` (REUSE)
- `src/lib/services/notification-service.ts` (UPDATE: Template-IDs/Queue-Aufrufe)
- `src/lib/services/comment-service.ts` (UPDATE: Hooks in `createComment()`/`moderateComment()`)
- `migrations/0022_seed_email_templates_comments.sql` (NEU)
- `src/pages/api/notifications/queue/process.ts` (NEU)

**Akzeptanzkriterien**:

- ✅ User erhält Email bei neuen Replies
- ✅ User erhält Email bei Moderation-Entscheidung
- ✅ Email-Preferences in Account-Settings konfigurierbar
- ✅ Unsubscribe-Link in allen Emails

---

### 1.2 Comment-System: Admin-Panel UI

**Problem**: UI vorhanden (`src/pages/admin/comments.astro`), aber Payload/Response weichen von API ab; Filter/Pagination/Bulk fehlen.

**Lösung**:

1. Bestehende Seite `src/pages/admin/comments.astro` an API anpassen (Protected: Admin/Moderator-Rolle bleibt):
   - POST-Body für Moderation auf `{ action: 'approve'|'reject'|'flag'|'hide', reason?, notifyUser? }` umstellen (`/api/admin/comments/[id]/moderate`).
   - Response-Mapping für `GET /api/admin/comments` korrigieren: Daten aus `data.comments.comments` (Array) und `data.stats` lesen.
2. Komponenten ergänzen:
   - `src/components/admin/ModerationQueue.tsx` (NEU): Tabelle mit Filtern (Pending, Flagged, Reported), Datum, Entity-Type, Reporter-Count.
   - `src/components/admin/CommentModerationCard.tsx` (NEU): Einzelansicht mit Actions.
   - `src/components/admin/BulkActions.tsx` (NEU): Approve/Reject/Hide/Flag für Mehrfachauswahl (`POST /api/admin/comments/bulk-moderate`).
3. API-Integration korrekt nutzen: `GET /api/admin/comments?status=pending&includeReports=true&limit=50&offset=0` (weitere Filter: `entityType`, `entityId`, `authorId`).
4. Pagination & Filter im UI implementieren; Fehlerbehandlung für 401/403/500 sicht- und nutzbar.

**Dateien**:

- `src/pages/admin/comments.astro` (UPDATE)
- `src/components/admin/ModerationQueue.tsx` (NEU)
- `src/components/admin/CommentModerationCard.tsx` (NEU)
- `src/components/admin/BulkActions.tsx` (NEU)

**Akzeptanzkriterien**:

- ✅ Moderator sieht Moderation-Queue mit Pending/Flagged Comments
- ✅ Approve/Reject/Flag-Actions funktionieren
- ✅ Bulk-Actions (Approve/Reject All) verfügbar
- ✅ Filter nach Datum, Entity-Type, Report-Count

---

### 1.3 Blog-System: RSS-Feed

**Problem**: Kein RSS-Feed für SEO/Discovery.

**Lösung**:

1. Astro-RSS-Integration nutzen (`@astrojs/rss`)
2. Route `/rss.xml` erstellen
3. Feed-Items: Title, Description, Link, PubDate, Category, Enclosure (Image)

**Dateien**:

- `src/pages/rss.xml.ts` (NEU)
- `package.json` (UPDATE: "@astrojs/rss": "^4.0.7")

**Akzeptanzkriterien**:

- ✅ `/rss.xml` liefert validen RSS-Feed
- ✅ Alle Blog-Posts enthalten (außer drafts)
- ✅ Feed-Validator (feedvalidator.org) zeigt keine Fehler

---

### 1.4 Blog-System: Comment-Count Display

**Problem**: Keine Anzeige der Comment-Anzahl in BlogCard.

**Lösung**:

1. API-Endpoint: `GET /api/comments/count?entityType=blog&entityId=<slug>` (Batch via mehrfachen `entityId` möglich).
2. Endpoint mit `withApiMiddleware` absichern (Security-Header, Rate-Limit, CSRF-/Same-Origin-Checks für unsafe Methoden nicht erforderlich, da GET).
3. `src/components/BlogCard.astro` updaten: Comment-Count-Badge hinzufügen; optional Batch-Fetch pro Seite.
4. Request-Scoped Cache (SSR) oder leichter Client-LRU, sodass pro Karte max. 1 Request anfällt.

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
2. Fehlende Images hochladen/erstellen:
   - `digital-detox-focus.webp`
   - Weitere Post-Images (min 1200x675)
3. Typo-Fix: "Gefiltered" → "Gefiltert" (blog/index.astro:196)

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
2. Für dynamische Posts: ISR mit Revalidate (Astro 5 Feature)
3. CDN-Caching-Header setzen

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
2. Cache-Strategie: TTL 5min, Invalidation bei neuem Comment
3. Fallback zu DB bei Cache-Miss

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
2. Responsive Images (srcset) generieren
3. WebP-Konvertierung automatisieren

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
2. Email-Notification-Tests (mit Mock)
3. Load-Testing (100+ Comments pro Post)

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
2. Dashboard-Widget: Comment-Stats (Total, Pending, Flagged)
3. Cloudflare Web Analytics Integration

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
2. Performance-Baselines definieren:
   - Comment-Creation: <500ms (p95)
   - Blog-Index: <1s (p95)
3. CI-Integration (optional)

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
2. Secrets setzen:

   ```bash
   wrangler secret put RESEND_API_KEY --env staging
   wrangler secret put EMAIL_FROM --env staging
   wrangler secret put BASE_URL --env staging
   ```

3. Build & Deploy:

   ```bash
   npm run build:worker:staging
   wrangler deploy --env staging
   ```

4. Smoke-Tests: `/blog`, `/admin/comments`, `/rss.xml`

### Production-Deployment

1. Migrations ausführen: `wrangler d1 migrations apply evolution-hub-main --env production`
2. Secrets setzen (production)

   ```bash
   wrangler secret put RESEND_API_KEY --env production
   wrangler secret put EMAIL_FROM --env production
   wrangler secret put BASE_URL --env production
   ```

3. Deploy mit Manual Approval (GitHub Actions)
4. Health-Check: `npm run health-check -- --url https://hub-evolution.com`
5. Monitoring 24h (Cloudflare Analytics, Error-Logs)

---

**Falls kritische Fehler:**

1. Cloudflare Rollback: `wrangler rollback --env production`
2. DB-Rollback: Restore von Backup (Pre-Migration)
3. DNS-Failover (optional): Traffic zu alter Version

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
2. Phase 2.3 umsetzen (Image-Optimierung)
   - `src/components/BlogCard.astro` und `src/components/BlogPost.astro` auf `<Image>` + `srcset` + WebP
   - Build & Smoke; Light-Perf-Check
3. Step 3 abgeschlossen (Scripts/Stores/Tests/API)
   - Scripts/Stores gehärtet, Unit-Tests für Stores ergänzt, Dashboard-APIs angepasst (Env-Guards/Typen)
   - Optional: weitere Integrationstests für Dashboard-APIs hinzufügen
