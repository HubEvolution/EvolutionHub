# Kommentarsystem – Aktueller Stand (2025-10-02)

Diese Seite wurde überarbeitet. Veraltete Abschnitte weiter unten sind als Legacy markiert und werden entfernt. Dieser Kopfbereich spiegelt den tatsächlichen Implementierungsstand in der Codebasis wider.

## Aktuelle Architektur und Module

- **API (Hono/Workers)**
  - `src/pages/api/comments/index.ts`
    - `GET /api/comments` mit Filtern (`status`, `entityType`, `entityId`, `authorId`, `limit`, `offset`, `includeReplies`).
    - `POST /api/comments/create` mit CSRF-Validierung und Rate-Limit (5/min pro IP). Optionaler User-Context.
  - `src/pages/api/comments/performance.ts`
    - Zusatzrouten (z. B. `/search`, `/paginated/:postId`, `/batch/:postId`) mit korrektem `hono-rate-limiter` `keyGenerator` und `requireAuth()` da, wo nötig.
  - Einheitliche Antworten via `createApiSuccess()`/`createApiError()` in `src/lib/api-middleware.ts` (Format: `{ success: true|false, data|error }`).

- **Security**
  - CSRF Double-Submit: `src/lib/security/csrf.ts` (`createCsrfMiddleware()` für mutierende Routen; Header `X-CSRF-Token` == Cookie `csrf_token`).
  - **XSS-Schutz (NEU)**: `src/lib/security/sanitize.ts` mit DOMPurify für User-Generated Content.
  - Origin/Same‑Origin-Checks für unsichere Methoden in `withApiMiddleware()`.
  - Rate-Limiting: `src/lib/rate-limiter.ts` inkl. service-seitigem `rateLimit(key, max, windowSeconds)`; Hono-Routes nutzen zusätzlich `hono-rate-limiter`.

- **Datenmodell (D1/SQLite)**
  - Modernes `comments`‑Schema: `id, content, author_id, author_name, author_email, parent_id, entity_type, entity_id, status, is_edited, edited_at, created_at, updated_at`.
  - Ergänzende Tabellen: `comment_reports`, `comment_moderation`, `comment_audit_logs` inkl. Indizes.
  - Legacy‑Migration: `scripts/setup-local-dev.ts` migriert Alt-Spalten (`postId`, `author`, `createdAt`) → modernes Schema und legt fehlende Tabellen/Indizes idempotent an.

- **Auth/Rollen**
  - `src/lib/auth-helpers.ts`: `requireAuth()`, `requireRole()`, `requireAdmin()`, `requireModerator()`, `getAuthUser()`.
  - Rollen werden über Users‑Tabelle verwaltet (Migrationen vorhanden; siehe `migrations/`).

- **Spam Detection**
  - `src/lib/spam-detection.ts`: mehrstufige Heuristiken (Keywords, Patterns, Links/Blacklists, Wiederholungen, Längen, Caps‑Lock) mit Scoring und Strictness‑Levels.

- **Performance-Optimierungen (NEU)**
  - **Batch-Loading**: Replies werden in einem Query geladen statt N+1 Queries (`inArray()` in Drizzle).
  - **Optimistic UI**: Kommentare erscheinen sofort in der UI, Server-Sync im Hintergrund.

- **UX-Verbesserungen (NEU)**
  - **Keyboard-Navigation**: Strg+Enter zum Absenden, Escape zum Abbrechen.
  - **Error-Boundary**: Resilient gegen Client-seitige Fehler mit Fallback-UI.
  - **User-Context**: Session-Daten werden server-seitig an Client übergeben.

## Routen- und Sicherheitsrichtlinien

- Responses halten das globale Format ein (siehe `src/lib/api-middleware.ts`).
- 429 mit `Retry-After` Header, konsistente 405‐Antworten inkl. `Allow`.
- CSRF: Double‑Submit; mutierende Endpunkte fordern gültigen Header/Cookie.
- Deprecated Auth‑Endpoints liefern 410 Gone gemäß Projektregeln; Login bleibt aktiv (siehe `routes.md`).

## Tests & lokale Entwicklung

- Lokales Setup: `npm run db:setup` führt Migrationen/Guards aus (inkl. Comments‑Schema‑Migration). Test‑User werden angelegt.
- Integrationstests: `vitest.integration.config.ts`, z. B. gezielt
  - `npx vitest run -c vitest.integration.config.ts tests/integration/comments-api.test.ts -t "GET /api/comments should succeed for entity"`
  - Hinweis: Der Dev‑Worker nutzt Port 8787; ggf. alte Prozesse beenden, falls „Address already in use“ auftritt.

## Letzte Änderungen (2025-10-02)

### Sprint 1: Kritische Bugfixes & Quick-Wins (Abgeschlossen)

**Kritische Fixes:**
- **SQL-Query-Fehler behoben** (`src/lib/services/comment-service.ts:236-237`):
  - Verschachteltes `and()` in `whereConditions` entfernt → flache Conditions.
  - Fehler "Failed query" bei entity_type/entity_id-Filtern behoben.
- **User-Context-Integration** (`src/pages/blog/[...slug].astro`, `src/components/comments/CommentSection.tsx`):
  - Server-seitige Session-Daten werden an Client übergeben (`initialUser` prop).
  - "Du kommentierst als Gast"-Problem behoben → User wird korrekt erkannt.

**Quick-Wins (Performance & Security):**
- **XSS-Schutz implementiert** (`src/lib/security/sanitize.ts`):
  - DOMPurify-Integration für User-Generated Content.
  - Sanitization in `createComment()` und `updateComment()`.
  - Package installiert: `isomorphic-dompurify`.
- **N+1 Query-Problem behoben** (`src/lib/services/comment-service.ts:290-328`):
  - Batch-Load für Replies mit `inArray()` statt Loop.
  - Performance: 50 DB-Queries → 1 Query bei 50 Kommentaren mit Replies.
- **Optimistic UI** (`src/stores/comment-store.ts:117-190`):
  - Kommentare erscheinen sofort in der UI (temp ID).
  - Rollback bei Server-Fehler.
  - Deutlich bessere UX (keine Wartezeit).
- **Keyboard-Navigation** (`src/components/comments/CommentForm.tsx:65-79`):
  - Strg+Enter / Cmd+Enter zum Absenden.
  - Escape zum Abbrechen (wenn Cancel-Button aktiv).
  - Accessibility-Verbesserung (ARIA-Label).
- **Error-Boundary** (`src/components/comments/CommentErrorBoundary.tsx`):
  - Graceful Error-Handling für React-Fehler.
  - Fallback-UI mit "Erneut versuchen"-Funktion.
  - Dev-Mode zeigt Stacktrace.

**Frühere Änderungen:**
- **Schema-Guards aktualisiert** (`scripts/setup-local-dev.ts`):
  - Legt modernes `comments`-Schema an und migriert Legacy‑Spalten (`postId`, `author`, `createdAt`).
  - Erstellt idempotent: `comment_reports`, `comment_moderation`, `comment_audit_logs` inkl. Indizes.
- **Rate-Limiter Konfiguration korrigiert** (`src/pages/api/comments/performance.ts`):
  - `hono-rate-limiter` mit verpflichtendem `keyGenerator` auf `/search`.
- **Client-Store Typing** (`src/stores/comment-store.ts`):
  - Typensichere Fehlerauswertung bei `response.json()` durch Cast auf `Partial<ApiError>`.
- **Tests**:
  - `GET /api/comments` grün. Weitere Cases lassen sich gezielt mit `-t` ausführen.

## Abgrenzung zu früheren Annahmen

- Nicht Teil des aktuellen Stands: WebSockets für Live‑Benachrichtigungen, Redis‑gestütztes Caching/Rate‑Limit, E‑Mail‑Queues/Exports (CSV/XML) als implementierte Features. Solche Punkte gehören in die Roadmap und sind nicht in der Codebasis aktiv.
