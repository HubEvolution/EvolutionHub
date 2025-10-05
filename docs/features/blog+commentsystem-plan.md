# Production-Readiness-Plan: Blog & Comment-System

## Übersicht

**Ziel**: Blog-System von 75% auf 95% und Comment-System von 80% auf 95% Production-Readiness bringen.

**Geschätzter Aufwand**: 3-5 Tage (1-2 Entwickler)

---

## Phase 1: Kritische Blocker (MUST-HAVE) - 1-2 Tage

### 1.1 Comment-System: Email-Benachrichtigungen

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

### 2.1 Blog-System: SSG/ISR aktivieren

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

---

### 2.2 Comment-System: KV-Caching

**Problem**: Jeder Comment-Load = DB-Query (keine Caching-Layer).

**Lösung**:

1. KV-Store für häufig abgerufene Entities (z.B. beliebte Posts)
2. Cache-Strategie: TTL 5min, Invalidation bei neuem Comment
3. Fallback zu DB bei Cache-Miss

**Dateien**:

- `src/lib/services/comment-service.ts` (UPDATE: Cache-Layer)
- `wrangler.toml` (UPDATE: KV-Binding `KV_COMMENTS` falls nötig)

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

- `src/components/BlogCard.astro` (UPDATE: <Image> statt <img>)
- `src/components/BlogPost.astro` (UPDATE: <Image> Component)

**Akzeptanzkriterien**:

- ✅ Alle Blog-Images nutzen Astro <Image>
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

3. Deploy: `npm run deploy:staging`
4. Smoke-Tests: `/blog`, `/admin/comments`, RSS-Feed

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

| Phase | Aufwand | Dauer |
|-------|---------|-------|
| Phase 1 (Kritische Blocker) | Hoch | 1-2 Tage |
| Phase 2 (Performance) | Mittel | 1 Tag |
| Phase 3 (Testing & Monitoring) | Mittel | 1 Tag |
| Phase 4 (Nice-to-Have) | Niedrig | 1 Tag (optional) |
| **Gesamt** | **3-5 Tage** | **1-2 Entwickler** |

---

## Nächste Schritte

1. **Jetzt**: Plan-Review & Priorisierung
2. **Tag 1-2**: Phase 1 (Kritische Blocker)
3. **Tag 3**: Phase 2 (Performance)
4. **Tag 4**: Phase 3 (Testing)
5. **Tag 5**: Staging-Deployment & Smoke-Tests
6. **Tag 6**: Production-Deployment (mit Monitoring)
