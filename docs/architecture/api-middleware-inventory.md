# API- & Middleware-Inventar (EvolutionHub)

Stand: 2025-08-22 05:56 CEST
Scope Phase 1 – Bestandsaufnahme und Analyse ohne Codeänderungen.

---

## 1) Zusammenfassung (Executive Summary)

- Die globale Middleware in `src/middleware.ts` übernimmt Locale-Normalisierung, Welcome-Gate, Session-Validierung, Security-Header und selektive Content-Type-Korrekturen. Sie setzt `locals.session`/`locals.user` über `validateSession()`.
- Auth-APIs (`/api/auth/*`) verwenden Redirect-basierte Flows (Form POST → Redirect) und umgehen bewusst eine generische JSON-API-Middleware. Einheitlich sind: Schema-Validierung, Rate-Limiting, Service-Layer, sichere Redirects und explizite 405-Handler – mit einer Abweichung bei `logout.ts` (kein 405-Export).
- Sicherheits-Risiko: Die Middleware loggt alle Request-Header (inkl. `cookie`) auf Zeile 6–11 in `src/middleware.ts` – potenziell sensitiv. Empfehlung: Redaction/Whitelist.

---

## 2) Methodik & Quellen

- Dateien gelesen:
  - `src/middleware.ts`
  - Auth Batch 1: `src/pages/api/auth/{login.ts, register.ts, reset-password.ts, logout.ts}`
  - Auth Batch 2: `src/pages/api/auth/{change-password.ts, forgot-password.ts, resend-verification.ts, verify-email.ts}`
  - User Batch 3: `src/pages/api/user/{me.ts, profile.ts, password.ts, settings.ts, account.ts, avatar.ts, logout-v2.ts}`
- Analyse-Kriterien: Zweck, Pipeline-Position, Ein-/Ausgaben, Abhängigkeiten, Fehler-/Sicherheitsaspekte, Konsistenz.

---

## 3) Middleware-Inventar

### 3.1 `src/middleware.ts` – `onRequest`

- Zweck
  - Locale-Handling: Präfix-Erkennung `/de|/en`, Cookie `pref_locale`, neutrale Pfade → ggf. Redirect zu `/en/*`.
  - Welcome-Gate: Einmal pro Session (`session_welcome_seen`) Redirect auf `/welcome?next=...`.
  - Auth-Route-Schutz: Auth-Seiten nie normalisieren/unterbrechen.
  - Session-Validierung: `session_id`-Cookie → `validateSession(DB, sessionId)` → `locals.session`/`locals.user`.
  - Security: CSP (dev vs prod), HSTS, COOP, X-Frame-Options, Referrer-Policy für Reset-Password, `Content-Language`/`Vary`.
  - Content-Type-Korrektur: `.css`, `.js`, `.svg`.
  - Domain-Redirect: `www.hub-evolution.com` → `hub-evolution.com`.
- Position in Pipeline
  - Globale `astro:middleware` – läuft vor allen Routen/Seiten, setzt `locals` und Response-Header nach `next()`.
- Abhängigkeiten
  - `validateSession` aus `@/lib/auth-v2`
  - `Locale` Typ aus `@/lib/i18n`
  - `context.locals.runtime.env.DB` (Cloudflare D1)
- Inputs/Outputs & Side-Effects
  - Liest/setzt Cookies: `pref_locale`, `session_welcome_seen`, liest `session_id`.
  - Setzt `context.locals.{user,session}`.
  - Führt Redirects aus (302/308) für Locale/Welcome.
  - Modifiziert Response-Header (CSP, HSTS, CL, Vary, Referrer-Policy).
- Risiken/Beobachtungen
  - Logging: `console.log` mit vollständigen Headers (inkl. `cookie`) → sensibel; Redaction/Whitelist empfohlen.
  - Redirect-Komplexität: Mehrere Bedingungen für Bots/Referer/Cookies – sorgfältig testbar halten.
  - Content-Type-Override: Nur für `.css|.js|.svg`; keine JSON-Überschreibung, aber vorsichtig bei zukünftigen Typen.
  - `locals.runtime`-Guard vorhanden – gut für lokale/non-Workers.

---

## 4) API-Inventar (bisher erfasst)

Hinweis: Auth-Endpunkte setzen auf Redirect-Flows; JSON wird primär für 405-Fehler verwendet.

### 4.1 POST `/api/auth/login` → `src/pages/api/auth/login.ts`

- Eingaben (FormData)
  - `email: string` (email-format, ≤255)
  - `password: string` (6–100)
  - `rememberMe?: boolean` (`on`/`true` → true)
- Ablauf
  - `standardApiLimiter(context)`
  - Validierung via `createValidator`
  - Service: `createAuthService(...).login(email, password, clientAddress)`
  - Cookie: `session_id` gesetzt, `maxAge` 1 Tag oder 30 Tage (Remember Me)
  - Redirect: `/dashboard`
  - Fehler: `handleAuthError(error, '/login')` (Redirect mit Fehlersignal)
- Antworten
  - 302 Redirect (Erfolg/Fehlerpfade)
  - 405 JSON `{ error: true, message: 'Method Not Allowed' }`, `Allow: POST`
- Abhängigkeiten
  - `@/lib/rate-limiter`, `@/lib/response-helpers`, `@/lib/validators`
  - `@/lib/services/auth-service-impl`, `@/lib/services/types`, `@/lib/error-handler`

### 4.2 POST `/api/auth/register` → `src/pages/api/auth/register.ts`

- Eingaben (FormData)
  - `email: string` (email, ≤255)
  - `password: string` (6–100)
  - `name: string` (2–100)
  - `username: string` (3–50, `^[a-zA-Z0-9_-]+$`)
  - `locale?: 'de'|'en'` (optional, überschreibt Referer-Heuristik)
- Ablauf
  - Locale-Heuristik aus `Referer` (Fallback), optional Feld `locale`
  - `standardApiLimiter(context)`
  - Validation
  - Service: `createAuthService(...).register({...}, clientAddress)`
  - Cookie: kein Session-Cookie (Double-Opt-In)
  - Redirect: `/verify-email?email=<email>` (locale-aware via Query/Fall back Referer)
  - Fehler: bei `ServiceErrorType.CONFLICT` spezielle Codes (`UsernameExists`), sonst `handleAuthError(error, "/{locale}/register")`
- Antworten
  - 302 Redirect (Erfolg/Fehlerpfade)
  - 405 JSON, `Allow: POST`
- Abhängigkeiten
  - wie bei Login

### 4.3 POST `/api/auth/reset-password` → `src/pages/api/auth/reset-password.ts`

- Eingaben (FormData)
  - `token: string` (20–255)
  - `password: string` (6–100)
- Ablauf
  - `standardApiLimiter(context)`
  - Validation (Token zusätzlich für Fehlerkontext extrahiert)
  - Service: `createAuthService(...).resetPassword(token, password, clientAddress)`
  - Redirect: `/login?success=PasswordReset`
  - Fehler: Kontext (`token`) wird an `handleAuthError` gegeben; `baseUrl` ist `'/reset-password'` oder bei `NOT_FOUND` ggf. `'/login'`
- Antworten
  - 302 Redirect (Erfolg/Fehlerpfade)
  - 405 JSON, `Allow: POST`
- Abhängigkeiten
  - wie bei Login

### 4.4 POST `/api/auth/logout` → `src/pages/api/auth/logout.ts`

- Eingaben
  - keine (liest `locals.user` aus Middleware)
- Ablauf
  - `standardApiLimiter(context)`
  - Cookie `session_id` → gelöscht (`maxAge: 0`)
  - Security-Logging: `logAuthSuccess`/`logAuthFailure`
  - Redirect: `/login?loggedOut=true`
- Antworten
  - 302 Redirect (Erfolg/Fehlerpfade)
  - Abweichung: Kein expliziter 405-Export – inkonsistent zu anderen Auth-Endpunkten
- Abhängigkeiten
  - `@/lib/rate-limiter`, `@/lib/security-logger`, `@/lib/response-helpers`

### 4.5 POST `/api/auth/change-password` → `src/pages/api/auth/change-password.ts`

- Eingaben (FormData)
  - `currentPassword: string` (6–100)
  - `newPassword: string` (6–100, darf nicht identisch zu `currentPassword` sein)
- Ablauf
  - `standardApiLimiter(context)`
  - Validierung via `parseAndValidateFormData` und `createValidator`
  - `validateSession(DB, session_id)` via Cookie → `user.id`
  - Service: `authService.changePassword(user.id, currentPassword, newPassword, clientAddress)`
  - Redirect: `/account/settings?success=PasswordChanged`
  - Fehler: `handleAuthError(error, '/account/settings')`
- Antworten
  - 302 Redirect (Erfolg/Fehlerpfade)
  - 405 JSON, `Allow: POST`
- Abhängigkeiten
  - `@/lib/validators`, `@/lib/auth-v2`, `@/lib/services/auth-service-impl`, `@/lib/response-helpers`, `@/lib/rate-limiter`, `@/lib/services/types`

### 4.6 POST `/api/auth/forgot-password` → `src/pages/api/auth/forgot-password.ts`

- Eingaben (FormData)
  - `email: string`
- Ablauf
  - `standardApiLimiter(context)`
  - Form-Parsing; Basisvalidierung der E-Mail
  - DB: `users`-Lookup; Enumeration vermeiden → immer generische Redirects
  - Token-Erzeugung: `password_reset_tokens` (UUID, 1h gültig)
  - Reset-Link nutzt Fragment-Token: `/reset-password#token=...` (minimiert Token-Leaks in Logs/Proxys)
  - E-Mail-Versand via `Resend`
  - Audit-Logs (`logPasswordReset`, `logAuthFailure`)
  - Redirect: `/auth/password-reset-sent`
- Antworten
  - 302 Redirect (Erfolg/Fehlerpfade)
  - 405 JSON, `Allow: POST`
- Abhängigkeiten
  - `resend`, `@/lib/security-logger`, `@/lib/response-helpers`, D1 `DB`

### 4.7 POST `/api/auth/resend-verification` → `src/pages/api/auth/resend-verification.ts`

- Eingaben (JSON)
  - `{ email: string }` (Content-Type: `application/json` erforderlich)
- Ablauf
  - `authLimiter(context)`
  - Content-Type-Prüfung → sonst 415
  - Validierung via `zod`
  - DB: `users`-Lookup; Enumeration vermeiden → immer generische Success-JSON
  - Token-Erzeugung via `createEmailVerificationToken(db, user.id, email)` (löscht alte Tokens)
  - E-Mail-Versand via `createEmailService` → `sendVerificationEmail`
  - Security/Audit-Logs (`logAuthFailure`, `logApiAccess`)
- Antworten
  - 200 JSON generisch: `{ success: true, message: 'If an account exists, ...' }`
  - 400 bei invalidem Email-Format; 415 bei falschem Content-Type; 500 bei Serverfehlern
  - 405 JSON, `Allow: POST`
- Abhängigkeiten
  - `@/lib/rate-limiter` (authLimiter), `zod`, `@/lib/services/email-service-impl`, `@/pages/api/auth/verify-email` (Token-Helper), `@/lib/security-logger`

### 4.8 GET `/api/auth/verify-email` → `src/pages/api/auth/verify-email.ts`

- Eingaben (Query)
  - `token: string` (≥32)
  - `email?: string`
- Ablauf
  - Validierung via `zod`
  - DB: `email_verification_tokens` laden/prüfen (Existenz, used, expires)
  - Abgelaufene Tokens löschen; optionale E-Mail-Match-Prüfung
  - `users` laden; `email_verified = 1`, `email_verified_at = now` setzen
  - Token als verwendet markieren (`used_at`)
  - Session erstellen via `createSession(db, user.id)` und Cookie `session_id` (30 Tage) setzen
  - Willkommens-E-Mail non-blocking via `createEmailService().sendWelcomeEmail`
  - Audit-Log `logAuthSuccess`
- Antworten
  - Redirect: Erfolg → `/email-verified?welcome=true`
  - Fehler → Redirect zu `/register` mit spezifischen Codes (Invalid/Expired/AlreadyUsed/UserNotFound/ServerError)
  - Hinweis: kein expliziter 405-Export (nur `GET` implementiert)
- Abhängigkeiten
  - `@/lib/auth-v2` (`createSession`), `@/lib/services/email-service-impl`, `@/lib/security-logger`, D1 `DB`

### 4.9 GET `/api/user/me` → `src/pages/api/user/me.ts`

- Eingaben
  - keine (nutzt `locals.user` aus Middleware)
- Ablauf
  - `withAuthApiMiddleware` erzwingt Auth, Rate-Limit, Security-Header, Audit-Logs
  - Whitelist-Ausgabe: `id, email, name, username, created_at`
  - `rateLimiter` wird dynamisch importiert: `standardApiLimiter`
- Antworten
  - 200 JSON `{ success: true, data: { ...safeUser } }`
  - 401 JSON bei fehlender Auth: `{ error: { type: 'auth_error', message: 'Unauthorized' } }`
- Abhängigkeiten
  - `@/lib/api-middleware`, dynamisch `@/lib/rate-limiter`

### 4.10 POST `/api/user/profile` → `src/pages/api/user/profile.ts`

- Eingaben (FormData)
  - `name: string` (2–50)
  - `username: string` (3–30, `^[a-zA-Z0-9_]+$`)
- Ablauf
  - `withAuthApiMiddleware`
  - Prüft Username-Kollision nur bei Änderung (`SELECT id FROM users WHERE username = ? AND id != ?`)
  - `UPDATE users SET name = ?, username = ? WHERE id = ?`
  - Audit: `logProfileUpdate` (alt/neu)
- Antworten
  - 200 JSON `{ success: true, message, user: { id, name, username } }`
  - 400/500 via Middleware-Fehlerpfad (Exceptions werden gefangen)
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`

### 4.11 POST `/api/user/password` → `src/pages/api/user/password.ts`

- Eingaben (FormData)
  - `current-password: string`
  - `new-password: string` (≥6)
- Ablauf
  - `withAuthApiMiddleware`
  - `SELECT password_hash FROM users WHERE id = ?` → `compare`
  - Fehlerfälle: invalid input → `validation_error`, falsches aktuelles Passwort → `forbidden`
  - Hash mit `bcrypt-ts` (cost=10) → `UPDATE users SET password_hash = ? WHERE id = ?`
  - Audit: `logUserEvent` für Erfolg und Fehler; `logMetadata: password_update`; spezielles `onError`
- Antworten
  - 200 JSON `{ success: true, message }`
  - 404 JSON wenn User/Hash fehlt, 400/403 bei Validierungs-/Auth-Fehlern
- Abhängigkeiten
  - `bcrypt-ts`, `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`

### 4.12 PUT `/api/user/settings` → `src/pages/api/user/settings.ts`

- Eingaben
  - tbd (Platzhalter)
- Ablauf
  - `withAuthApiMiddleware`
  - Noch nicht implementiert (TODO-Kommentar im Code)
- Antworten
  - 200 JSON `{ success: true, message: 'Settings updated successfully' }`
  - Fehler via `onError` → `server_error`
- Abhängigkeiten
  - `@/lib/api-middleware`

### 4.13 DELETE `/api/user/account` → `src/pages/api/user/account.ts`

- Eingaben (JSON)
  - `{ confirm: boolean }` (erforderlich)
- Ablauf
  - `withAuthApiMiddleware`
  - Validiert Bestätigung; bei fehlender Bestätigung → `validation_error`
  - Batch-Operationen (D1 ersetzt Transaktionen):
    - `DELETE FROM sessions WHERE user_id = ?`
    - `DELETE FROM activities WHERE user_id = ?`
    - `UPDATE comments SET content='[Deleted comment]', author_name='[Deleted user]' WHERE user_id = ?`
    - `UPDATE projects SET title='[Deleted project]', description='' WHERE user_id = ?`
    - `UPDATE users SET email=anonymisiert, name='[Deleted User]', username='deleted_user_<id>', password_hash='', avatar='', is_deleted=1, deleted_at=NOW`
  - Audit: `account_deletion_successful`; spezielles `onError`
- Antworten
  - 204 No Content
  - 400 bei fehlender Bestätigung; 500 via Middleware/`onError`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`
- Hinweise
  - D1 hat keine echten Transaktionen → Risiko partieller Updates; Batch mindert, ersetzt aber nicht ACID
  - Spalten-Inkonsistenz: Diese Route setzt `avatar=''`, während `avatar.ts` die Spalte `image` aktualisiert

### 4.14 POST `/api/user/avatar` → `src/pages/api/user/avatar.ts`

- Eingaben (FormData)
  - `avatar: File`
- Ablauf
  - Keine `withAuthApiMiddleware`; manuelle Prüfung `locals.user`
  - CORS/Preflight wird erwähnt; tatsächliche CORS-Header werden jedoch nicht gesetzt (nur Security-Header via `applySecurityHeaders`)
  - Parsen von `formData` → Sicherstellen `avatar` ist `File`
  - Upload nach R2: `bucket.put(fileKey, arrayBuffer, { httpMetadata: { contentType } })`
  - Dateiname: `avatar-<user.id>-<timestamp>.<ext>` (aus Original-Filename abgeleitet)
  - DB-Update: `UPDATE users SET image = ? WHERE id = ?`
  - Audit: `logUserEvent` für Erfolg und Fehler; `logMetadata: avatar_update`
- Antworten
  - 200 JSON `{ success: true, message, imageUrl }`
  - 400/401/500 JSON bei Fehlern
- Abhängigkeiten
  - `@/lib/security-headers`, `@/lib/security-logger`, R2-Bucket `R2_AVATARS`, D1 `DB`
- Risiken/Abweichungen
  - Kein Rate-Limiting, keine zentrale Fehler-/Audit-Middleware
  - Keine Validierung von MIME-Typ/Dateiendung/Größe; Dateiendung aus User-Filename → Risiko für falsche Typen
  - Exzessives Logging (Headers, Umgebungsinfos)
  - Inkonsistenz zur `account.ts`-Spalte (`image` vs. `avatar`)

### 4.15 GET/POST `/api/user/logout-v2` → `src/pages/api/user/logout-v2.ts`

- Eingaben
  - Cookies: `session_id` (optional)
- Ablauf
  - Direkter Einsatz von `standardApiLimiter`
  - Bei Rate-Limit: Cookie löschen → Redirect `/login?error=TooManyRequests`
  - `createAuthService().logout({ sessionId | null, clientIp })` → Cookie löschen
  - Fehler werden geloggt (`logSecurityEvent`) mit `getErrorCode`; Redirect immer zu `/`
  - Unterstützt `GET` und `POST` (kein 405-Handler)
- Antworten
  - 302 Redirect (`/` oder `/login?...` bei TooManyRequests)
- Abhängigkeiten
  - `@/lib/rate-limiter`, `@/lib/response-helpers`, `@/lib/services/auth-service-impl`, `@/lib/error-handler`, `@/lib/security-logger`

### 4.16 GET `/api/dashboard/activity` → `src/pages/api/dashboard/activity.ts`

- Eingaben
  - keine (nutzt `locals.user` aus Middleware)
- Ablauf
  - `withAuthApiMiddleware` erzwingt Auth, Rate-Limit, Security-Header, Audit-Logs
  - D1-Query: Join `activities a` mit `users u` für `user`-Name/Bild; Filter auf `a.user_id = ?`; `LIMIT 10`
  - Map der Ergebnisse ins Frontend-Format inkl. Default-Icon/Farbe
  - Spezial-Logging über `logMetadata` und `onError` mit `logUserEvent`
- Antworten
  - 200 JSON Array (Plain) der Aktivitäten
  - 401 JSON via Middleware bei fehlender Auth
  - 500 JSON via `createApiError('server_error', ...)` im `onError`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`

### 4.17 GET `/api/dashboard/notifications` → `src/pages/api/dashboard/notifications.ts`

- Eingaben
  - keine (nutzt `locals.user`)
- Ablauf
  - `withAuthApiMiddleware`
  - D1-Query: `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`
  - Audit: `logUserEvent(user.id, 'notifications_viewed', { notificationCount })`
- Antworten
  - 200 JSON Wrapper via `createApiSuccess(results)`
  - 401 via Middleware; 500 via `createApiError('server_error', ...)` im `onError`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`

### 4.18 POST `/api/dashboard/perform-action` → `src/pages/api/dashboard/perform-action.ts`

- Eingaben (JSON)
  - `{ action: 'create_project' | 'create_task' | 'invite_member' | 'view_docs' }`
- Ablauf
  - `withAuthApiMiddleware`
  - `request.json()` parse; bei Fehler → `validation_error` + `logUserEvent('invalid_dashboard_request')`
  - Switch je `action`:
    - `create_project`: Insert in `projects` mit `crypto.randomUUID()`; `logUserEvent('project_created')`
    - `create_task`: Insert in `tasks` (Annahme: Tabelle existiert); `logUserEvent('task_created')`
    - `invite_member`: Placeholder-Message; `logUserEvent('member_invited')`
    - `view_docs`: Antwort `{ redirect: '/docs' }`; `logUserEvent('docs_viewed')`
  - Ungültige Aktion → `validation_error` + `logUserEvent('invalid_dashboard_action')`
- Antworten
  - 200 JSON Wrapper via `createApiSuccess(result)`
  - 400 JSON `validation_error` bei invalidem JSON/Aktion
  - 500 via `createApiError('server_error', ...)` im `onError`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`
- Hinweise/Risiken
  - Tabelle `tasks` ggf. nicht vorhanden → Risiko Laufzeitfehler
  - `redirect` als Feld im JSON, kein HTTP-Redirect → Frontend muss das interpretieren

### 4.19 GET `/api/dashboard/projects` → `src/pages/api/dashboard/projects.ts`

- Eingaben
  - keine (nutzt `locals.user`)
- Ablauf
  - `withAuthApiMiddleware`
  - User-ID Auflösung tolerant (`user.id` oder `user.sub`)
  - D1-Query: Projekte des Users, Mapping zu `ProjectCard[]`
  - Audit: `logApiAccess(userId, clientAddress, { action: 'projects_accessed', projectCount })`
- Antworten
  - 200 JSON Array (Plain) der Projekte (kein Wrapper)
  - 401 via Middleware; 500 eigener JSON-Fehler `{ type: 'server_error', ... }`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`
- Besonderheiten
  - Abweichendes Response-Format (Plain Array statt `createApiSuccess`)

### 4.20 GET `/api/dashboard/quick-actions` → `src/pages/api/dashboard/quick-actions.ts`

- Eingaben
  - keine
- Ablauf
  - `withApiMiddleware` mit `requireAuth: false` (öffentlich)
  - Statisches Array `quickActions`, Audit via `logApiAccess('anonymous', ...)`
- Antworten
  - 200 JSON Wrapper via `createApiSuccess(quickActions)`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`
- Hinweise/Risiken
  - Mögliche Pfad-Inkonsistenz beim Typ-Import: `../../../src/types/dashboard` (sollte `../../../types/dashboard` oder `@/types/dashboard` sein)
  - Öffentlich, aber statische Daten → geringes Risiko; dennoch Rate-Limit/Caching-Header prüfen

### 4.21 GET `/api/dashboard/stats` → `src/pages/api/dashboard/stats.ts`

- Eingaben
  - keine (nutzt `locals.user`)
- Ablauf
  - `withAuthApiMiddleware`
  - Drei Zähl-Queries: Projekte/Tasks pro User; Teammitglieder global (`SELECT count(*) FROM users`)
  - Audit: `logUserEvent(userId, 'dashboard_stats_viewed', { statCounts, ipAddress })`
- Antworten
  - 200 JSON Wrapper via `createApiSuccess(stats)`
  - 401 via Middleware; 500 via `createApiError('server_error', ...)`
- Abhängigkeiten
  - `@/lib/api-middleware`, `@/lib/security-logger`, D1 `DB`
- Hinweise/Risiken
  - `teamMembers` zählt alle Nutzer (nicht nur Team des Users) → fachliche Klärung
  - Tabelle `tasks` wird vorausgesetzt (in `perform-action.ts`, `stats.ts`) → Schema prüfen/migrieren.

### 4.22 POST `/api/newsletter/subscribe` → `src/pages/api/newsletter/subscribe.ts`

- Eingaben (JSON)
  - `email: string`
  - `firstName?: string`
  - `consent: boolean`
  - `source?: string`
- Ablauf
  - `request.json()` parsen (kein Content-Type-Guard, potenziell 415 sinnvoll)
  - Pflichtfelder prüfen: `email` vorhanden und Regex-Validierung; `consent` muss `true` sein
  - `createPendingSubscription(email, source || 'website')` aus `newsletter/confirm.ts` erzeugt Token (In-Memory-Map)
  - `confirmationUrl` wird als Query-Link generiert: `.../newsletter/confirm?token=...&email=...`
  - `sendConfirmationEmail(email, confirmationUrl)` (Stub) versendet Double-Opt-In-Mail
  - Analytics-Logging via `console.log` (Stub)
- Antworten
  - 200 JSON `{ success, message, email, next_step: 'confirmation_required', info }`
  - 400 JSON bei fehlender/ungültiger `email` oder fehlender `consent`
  - 500 JSON bei Serverfehlern
  - Hinweis: Kein expliziter 405-Export (nur `POST` implementiert)
- Abhängigkeiten
  - `createPendingSubscription` (In-Memory), `zod` (importiert, ungenutzt), `trackNewsletterSignup` (importiert, ungenutzt)
- Hinweise/Risiken
  - Sensible Logs: `console.log` enthält `confirmationUrl` mit Token sowie E-Mail → redigieren
  - Kein Rate-Limit/Anti-Spam (Captcha/Heuristiken) vorhanden
  - In-Memory-Persistenz des Tokens (über `confirm.ts`) skaliert nicht über Instanzen/Deployments

### 4.23 GET `/api/newsletter/confirm` → `src/pages/api/newsletter/confirm.ts`

- Eingaben (Query)
  - `token: string` (≥ 32)
  - `email?: string`
- Ablauf
  - Validierung via `zod`
  - Lookup in `pendingSubscriptions` (In-Memory-Map)
  - Ablaufprüfung: Token max. 24h gültig, sonst 410 + Cleanup
  - Optionaler E-Mail-Abgleich (`email` muss mit Pending-Record übereinstimmen)
  - Erfolg: Pending-Eintrag löschen, Analytics-Log (Stub)
- Antworten
  - 200 JSON `{ success, message, email, subscription_date }`
  - 400 JSON bei Validierungsfehlern oder E-Mail-Mismatch (liefert Details im Fehlerobjekt)
  - 404 JSON bei nicht gefundenem Token, 410 JSON bei abgelaufenem Token
  - 500 JSON bei Serverfehlern
  - Hinweis: Kein expliziter 405-Export (nur `GET` implementiert)
- Abhängigkeiten
  - `zod`; keine DB- oder E-Mail-Integration, Persistenz nur In-Memory
- Hinweise/Risiken
  - In-Memory-Persistenz → Token verliert Gültigkeit bei Neustart/Skalierung, nicht multi-instance-fähig
  - Validierungsfehler geben strukturierte Details zurück → potenziell übermäßig auskunftsfreudig
  - Keine Rate-Limits/Brute-Force-Schutz

### 4.24 `/api/lead-magnets/download` → `src/pages/api/lead-magnets/download.ts`

- Methoden & Eingaben
  - `POST` (JSON): `{ leadMagnetId: string, email: string, firstName?, lastName?, company?, source?, utmSource?, utmMedium?, utmCampaign? }`
  - `GET` (Query): `id: string`, optional `download=1`
  - `OPTIONS`: CORS Preflight
- Ablauf
  - `POST`: CORS-Header (`*`), JSON-Parsing, Validierung `leadMagnetId`/`email`
    - Lookup in statischem `LEAD_MAGNETS`
    - `saveLead()` (Stub) → Console-Log; optional `triggerEmailSequence()` (Stub)
    - `downloadUrl` abhängig von Quelle (`getLeadMagnetSource(locals)`):
      - `public` → statischer Asset-Pfad
      - `r2` → interner GET-Link `/api/lead-magnets/download?id=...&download=1`
  - `GET` ohne `download`: Liefert Metadaten zum Lead-Magneten (ohne Pfad)
  - `GET` mit `download=1`:
    - Quelle `r2`: liest Objekt aus `R2_LEADMAGNETS`, schreibt Audit-Log in D1 `download_audit`, streamt Datei mit `Content-Disposition: attachment`
    - Quelle `public`: 302 Redirect auf statischen Pfad
- Antworten
  - `POST`: 200 JSON `{ success, leadId, downloadUrl, fileName, title, message }`; 400/404 bei Validierungsfehlern; 500 Fehler
  - `GET`: 200 JSON (Metadaten) oder 302 Redirect (public) oder 200 Datei-Stream (R2); 404 wenn Datei fehlt
  - `OPTIONS`: 200 mit CORS-Headern
- Abhängigkeiten
  - `locals.runtime.env.R2_LEADMAGNETS` (R2), D1 `DB` (Audit-Tabelle `download_audit`), keine Auth
- Hinweise/Risiken
  - CORS `Access-Control-Allow-Origin: *` → prüfen/engen, je nach Frontend-Domain
  - Kein Rate-Limit/Abuse-Schutz; IP wird im Audit geloggt
  - Input-Validierung minimal (Regex-E-Mail), kein Captcha/Anti-Bot

### 4.25 POST `/api/billing/session` → `src/pages/api/billing/session.ts`

- Eingaben (JSON)
  - `{ plan: string, workspaceId: string }`
- Ablauf
  - `withAuthApiMiddleware` (Auth, Rate-Limit, Security-Header, Audit)
  - `logUserEvent(user.id, 'checkout_session_created', { ipAddress })`
  - `baseUrl` aus Env `BASE_URL` oder Request-URL
  - `pricingTable` aus Env `PRICING_TABLE` (JSON)
  - Stripe-Checkout-Session erstellen: `mode: 'subscription'`, `line_items: [{ price: priceId, quantity: 1 }]`, `metadata: { workspaceId }`
  - URLs: `success_url = {baseUrl}/dashboard?ws={workspaceId}`, `cancel_url = {baseUrl}/pricing`
- Antworten
  - 200 JSON `{ url }`
  - 400 JSON bei fehlenden Feldern/unknown `plan`
  - 500 JSON bei fehlender Stripe-Konfiguration/Fehler (`onError` liefert standardisierte Antwort)
  - 401 via Middleware
- Abhängigkeiten
  - `@/lib/api-middleware`, `stripe`, `@/lib/security-logger`; Env: `STRIPE_SECRET`, `PRICING_TABLE`, `BASE_URL`
- Hinweise/Risiken
  - Prüfung, ob `workspaceId` zum Benutzer gehört, ist aktuell nicht enthalten (Missbrauchsrisiko)
  - Konfigurationsfehler in `PRICING_TABLE` führen zu 400; Monitoring/Alerts empfohlen

---

## 5) Request-Flow (bisher für Auth)

1. Request → `src/middleware.ts`
   - Early Redirects (Locale/Welcome, Bot, Domain), Setzen/Lesen Cookies
   - Session-Validierung: `locals.session`/`locals.user`
   - Security-Header nach `next()`
2. Controller (API-Route)
   - Rate-Limit → Validierung → Service-Layer → Cookie-Setzen/Löschen → Redirect
   - Fehler zentral via `handleAuthError`
3. Service-Layer
   - `createAuthService(...)` führt Geschäftslogik/DB-Operationen aus (Details in späterer Phase)

---

## 7) Risiken & Empfehlungen (vorläufig)

- Sensible Logs: Header-Logging redigieren (z. B. `cookie`, `authorization`, `set-cookie`).
- Rate-Limits: Einheitlich vorhanden in Auth; später prüfen für alle APIs.
- Security-Header: CSP/Referrer-Policy gut; prüfen, ob weitere Seiten sensible Querys nutzen.
- Fehlerbehandlung: Zentral vorhanden; sicherstellen, dass alle Endpunkte konsistent `handleAuthError` bzw. standardisierte JSON-Fehler nutzen.
- Dashboard-APIs: Response-Formate vereinheitlichen (`createApiSuccess` vs. Plain Array in `projects.ts`/`activity.ts`).
- Öffentliche Endpunkte: `quick-actions` ist öffentlich → Rate-Limit/Caching-Header prüfen.
- Typ-Import-Konsistenz: Pfad in `quick-actions.ts` korrigieren (`../../../types/dashboard`).
- Datenmodell: `tasks`-Tabelle wird vorausgesetzt (in `perform-action.ts`, `stats.ts`) → Schema prüfen/migrieren.
- Fachlogik: `teamMembers` zählt aktuell alle Nutzer – gewünschte Definition klären (Team/Organisation vs. global).

---

## 8) Nächste Schritte (Phasenplan)

- Batch 4 (Dashboard): `activity.ts`, `notifications.ts`, `perform-action.ts`, `projects.ts`, `quick-actions.ts`, `stats.ts`.
- Batch 5 (Newsletter/Lead/Billing): `newsletter/{subscribe,confirm}.ts`, `lead-magnets/download.ts`, `billing/session.ts`.
- Batch 6 (Misc): `debug-login.ts`, `debug/logs-stream.ts`, `internal/users/sync.ts`, `tools.ts`, `projects/index.ts`.

Jede Gruppe wird hinsichtlich Methoden, Pfade, Schemata, Abhängigkeiten, Konsistenz und Risiken dokumentiert und hier ergänzt.

---

## 9) Offene Punkte zur Architektur-Übersicht (werden im Zuge der Batches gefüllt)

- Vollständige Endpunkt-Matrix (Methoden/Pfade/Input/Output)
- Service-Zuordnung (welcher Controller nutzt welche Services/Repo)
- DB-Interaktionen (über Services; inkl. Transaktionen, Fehlerfälle)
- Einheitliche Fehler-/Response-Formate (JSON vs Redirect)
- End-to-End-Request-Flow Diagramm

