# Routenübersicht

Dieses Dokument fasst alle Routen zusammen, abgeleitet aus dem Dateibaum in [`src/pages`](src/pages:1).
Enthalten sind UI Seiten, API Endpunkte und r2 Endpunkte mit den tatsächlich im Quellcode gefundenen HTTP Methoden.

Legende:

- Statische Route: /pfad
- Dynamische Route: :param  (z. B. [id] -> :id)
- Catch‑all: :...param (z. B. [...slug] -> :...slug)

Hinweis: Quellen sind als Links zur Ursprungsdatei angegeben; HTTP Methoden wurden aus den API Quelldateien extrahiert.

## UI Seiten — Flache Liste

- / — [`src/pages/index.astro`](src/pages/index.astro:1)
- /agb — [`src/pages/agb.astro`](src/pages/agb.astro:1)
- /cookie-einstellungen — [`src/pages/cookie-einstellungen.astro`](src/pages/cookie-einstellungen.astro:1)
- /dashboard — [`src/pages/dashboard.astro`](src/pages/dashboard.astro:1)
- /datenschutz — [`src/pages/datenschutz.astro`](src/pages/datenschutz.astro:1)
- /debug — [`src/pages/debug.astro`](src/pages/debug.astro:1)
- /email-verified — [`src/pages/email-verified.astro`](src/pages/email-verified.astro:1)
- /faq — [`src/pages/faq.astro`](src/pages/faq.astro:1)
- /forgot-password — [`src/pages/forgot-password.astro`](src/pages/forgot-password.astro:1)
- /impressum — [`src/pages/impressum.astro`](src/pages/impressum.astro:1)
- /kontakt — [`src/pages/kontakt.astro`](src/pages/kontakt.astro:1)
- /login — [`src/pages/login.astro`](src/pages/login.astro:1)
- /pricing — [`src/pages/pricing.astro`](src/pages/pricing.astro:1)
- /register — [`src/pages/register.astro`](src/pages/register.astro:1)
- /reset-password — [`src/pages/reset-password.astro`](src/pages/reset-password.astro:1)
- /verify-email — [`src/pages/verify-email.astro`](src/pages/verify-email.astro:1)
- /welcome — [`src/pages/welcome.astro`](src/pages/welcome.astro:1)
- /account/settings — [`src/pages/account/settings.astro`](src/pages/account/settings.astro:1)
- /auth/password-reset-sent — [`src/pages/auth/password-reset-sent.astro`](src/pages/auth/password-reset-sent.astro:1)
- /auth/password-reset-success — [`src/pages/auth/password-reset-success.astro`](src/pages/auth/password-reset-success.astro:1)
- /blog — [`src/pages/blog/index.astro`](src/pages/blog/index.astro:1)
- /blog/:...slug — [`src/pages/blog/[...slug].astro`](src/pages/blog/[...slug].astro:1)
- /docs — [`src/pages/docs/index.astro`](src/pages/docs/index.astro:1)
- /newsletter/confirm — [`src/pages/newsletter/confirm.astro`](src/pages/newsletter/confirm.astro:1)
- /tools — [`src/pages/tools/index.astro`](src/pages/tools/index.astro:1)

## Lokalisierte Seiten

- /de/ — [`src/pages/de/index.astro`](src/pages/de/index.astro:1)
- /de/agb — [`src/pages/de/agb.astro`](src/pages/de/agb.astro:1)
- /de/cookie-einstellungen — [`src/pages/de/cookie-einstellungen.astro`](src/pages/de/cookie-einstellungen.astro:1)
- /de/datenschutz — [`src/pages/de/datenschutz.astro`](src/pages/de/datenschutz.astro:1)
- /de/faq — [`src/pages/de/faq.astro`](src/pages/de/faq.astro:1)
- /de/forgot-password — [`src/pages/de/forgot-password.astro`](src/pages/de/forgot-password.astro:1)
- /de/impressum — [`src/pages/de/impressum.astro`](src/pages/de/impressum.astro:1)
- /de/login — [`src/pages/de/login.astro`](src/pages/de/login.astro:1)
- /de/register — [`src/pages/de/register.astro`](src/pages/de/register.astro:1)
- /de/reset-password — [`src/pages/de/reset-password.astro`](src/pages/de/reset-password.astro:1)

- /en/ — [`src/pages/en/index.astro`](src/pages/en/index.astro:1)
- /en/agb — [`src/pages/en/agb.astro`](src/pages/en/agb.astro:1)
- /en/cookie-settings — [`src/pages/en/cookie-settings.astro`](src/pages/en/cookie-settings.astro:1)
- /en/dashboard — [`src/pages/en/dashboard.astro`](src/pages/en/dashboard.astro:1)
- /en/datenschutz — [`src/pages/en/datenschutz.astro`](src/pages/en/datenschutz.astro:1)
- /en/email-verified — [`src/pages/en/email-verified.astro`](src/pages/en/email-verified.astro:1)
- /en/faq — [`src/pages/en/faq.astro`](src/pages/en/faq.astro:1)
- /en/forgot-password — [`src/pages/en/forgot-password.astro`](src/pages/en/forgot-password.astro:1)
- /en/impressum — [`src/pages/en/impressum.astro`](src/pages/en/impressum.astro:1)
- /en/kontakt — [`src/pages/en/kontakt.astro`](src/pages/en/kontakt.astro:1)
- /en/login — [`src/pages/en/login.astro`](src/pages/en/login.astro:1)
- /en/pricing — [`src/pages/en/pricing.astro`](src/pages/en/pricing.astro:1)
- /en/register — [`src/pages/en/register.astro`](src/pages/en/register.astro:1)
- /en/reset-password — [`src/pages/en/reset-password.astro`](src/pages/en/reset-password.astro:1)
- /en/verify-email — [`src/pages/en/verify-email.astro`](src/pages/en/verify-email.astro:1)
- /en/blog — [`src/pages/en/blog/index.astro`](src/pages/en/blog/index.astro:1)
- /en/blog/:...slug — [`src/pages/en/blog/[...slug].astro`](src/pages/en/blog/[...slug].astro:1)
- /en/account/settings — [`src/pages/en/account/settings.astro`](src/pages/en/account/settings.astro:1)
- /en/docs — [`src/pages/en/docs/index.astro`](src/pages/en/docs/index.astro:1)
- /en/tools — [`src/pages/en/tools/index.astro`](src/pages/en/tools/index.astro:1)

## API Endpunkte (mit HTTP Methoden)

- POST /api/csp-report — [`src/pages/api/csp-report.ts`](src/pages/api/csp-report.ts:1)
- POST /api/debug-login — [`src/pages/api/debug-login.ts`](src/pages/api/debug-login.ts:1)
- GET  /api/tools — [`src/pages/api/tools.ts`](src/pages/api/tools.ts:1)

- POST /api/auth/change-password — [`src/pages/api/auth/change-password.ts`](src/pages/api/auth/change-password.ts:1)
- POST /api/auth/forgot-password — [`src/pages/api/auth/forgot-password.ts`](src/pages/api/auth/forgot-password.ts:1)
- POST /api/auth/login — [`src/pages/api/auth/login.ts`](src/pages/api/auth/login.ts:1)
- POST /api/auth/logout — [`src/pages/api/auth/logout.ts`](src/pages/api/auth/logout.ts:1)
- POST /api/auth/register — [`src/pages/api/auth/register.ts`](src/pages/api/auth/register.ts:1)
- POST /api/auth/resend-verification — [`src/pages/api/auth/resend-verification.ts`](src/pages/api/auth/resend-verification.ts:1)
- POST /api/auth/reset-password — [`src/pages/api/auth/reset-password.ts`](src/pages/api/auth/reset-password.ts:1)
- GET  /api/auth/verify-email — [`src/pages/api/auth/verify-email.ts`](src/pages/api/auth/verify-email.ts:1)

- POST /api/billing/session — [`src/pages/api/billing/session.ts`](src/pages/api/billing/session.ts:1)

- GET  /api/dashboard/activity — [`src/pages/api/dashboard/activity.ts`](src/pages/api/dashboard/activity.ts:1)
- GET  /api/dashboard/notifications — [`src/pages/api/dashboard/notifications.ts`](src/pages/api/dashboard/notifications.ts:1)
- POST /api/dashboard/perform-action — [`src/pages/api/dashboard/perform-action.ts`](src/pages/api/dashboard/perform-action.ts:1)
- GET  /api/dashboard/projects — [`src/pages/api/dashboard/projects.ts`](src/pages/api/dashboard/projects.ts:1)
- GET  /api/dashboard/quick-actions — [`src/pages/api/dashboard/quick-actions.ts`](src/pages/api/dashboard/quick-actions.ts:1)
- GET  /api/dashboard/stats — [`src/pages/api/dashboard/stats.ts`](src/pages/api/dashboard/stats.ts:1)

- GET, POST /api/debug/logs-stream — [`src/pages/api/debug/logs-stream.ts`](src/pages/api/debug/logs-stream.ts:1)

- POST /api/internal/users/sync — [`src/pages/api/internal/users/sync.ts`](src/pages/api/internal/users/sync.ts:1)

- POST, GET, OPTIONS /api/lead-magnets/download — [`src/pages/api/lead-magnets/download.ts`](src/pages/api/lead-magnets/download.ts:1)

- GET  /api/newsletter/confirm — [`src/pages/api/newsletter/confirm.ts`](src/pages/api/newsletter/confirm.ts:1)
- POST /api/newsletter/subscribe — [`src/pages/api/newsletter/subscribe.ts`](src/pages/api/newsletter/subscribe.ts:1)

- POST /api/projects — [`src/pages/api/projects/index.ts`](src/pages/api/projects/index.ts:1)

- GET  /api/test/seed-email-token — [`src/pages/api/test/seed-email-token.ts`](src/pages/api/test/seed-email-token.ts:1)

- DELETE /api/user/account — [`src/pages/api/user/account.ts`](src/pages/api/user/account.ts:1)
- POST   /api/user/avatar — [`src/pages/api/user/avatar.ts`](src/pages/api/user/avatar.ts:1)  (implementiert intern eine OPTIONS CORS-Response)
- GET, POST /api/user/logout-v2 — [`src/pages/api/user/logout-v2.ts`](src/pages/api/user/logout-v2.ts:1)
- GET, POST /api/user/logout — [`src/pages/api/user/logout.ts`](src/pages/api/user/logout.ts:1)
- GET  /api/user/me — [`src/pages/api/user/me.ts`](src/pages/api/user/me.ts:1)
- POST /api/user/password — [`src/pages/api/user/password.ts`](src/pages/api/user/password.ts:1)
- POST /api/user/profile — [`src/pages/api/user/profile.ts`](src/pages/api/user/profile.ts:1)
- PUT  /api/user/settings — [`src/pages/api/user/settings.ts`](src/pages/api/user/settings.ts:1)

## r2 Endpunkte

- /r2/:...path — [`src/pages/r2/[...path].ts`](src/pages/r2/[...path].ts:1) (Catch‑all für R2 asset proxying; Methoden abhängig von Implementierung)

## Deprecated Auth API Endpunkte (410 Gone)

Die folgenden Endpunkte sind deprecatet und liefern konsistent 410 Gone. Für unsichere Methoden (POST/PUT/PATCH/DELETE) wird zusätzlich über `withRedirectMiddleware` CSRF/Origin enforced. JSON-Antworten folgen dem Schema `{ success: false, error: { type: 'gone', message, details? } }`.

- `/api/auth/change-password`
  - HTML 410: `POST`
  - JSON 410: `GET, PUT, PATCH, DELETE, OPTIONS, HEAD`
  - JSON Details: `{ Allow: 'POST' }`

- `/api/auth/forgot-password`
  - HTML 410: `POST`
  - JSON 410: `GET, PUT, PATCH, DELETE, OPTIONS, HEAD`
  - JSON Details: `{ Allow: 'POST' }`

- `/api/auth/reset-password`
  - HTML 410: `POST`
  - JSON 410: `GET, PUT, PATCH, DELETE, OPTIONS, HEAD`
  - JSON Details: `{ Allow: 'POST' }`

- `/api/auth/register`
  - HTML 410: `POST`
  - JSON 410: `GET, PUT, PATCH, DELETE, OPTIONS, HEAD`
  - JSON Details: `{ Allow: 'POST' }`

- `/api/auth/logout`
  - HTML 410: `GET, POST`
  - JSON 410: `PUT, PATCH, DELETE, OPTIONS, HEAD`
  - JSON Details: `{ Allow: 'GET, POST' }`

- `/api/auth/verify-email`
  - HTML 410: `GET`
  - JSON 410: `POST, PUT, PATCH, DELETE, OPTIONS, HEAD`
  - JSON Details: `{ Allow: 'GET' }`

Hinweis: Der aktive Login-Endpunkt `/api/auth/login` ist nicht deprecatet. Fehler führen zu sicheren 302-Redirects (locale-aware), keine 410-Antworten.

## Routenhierarchie (Baum)

- /
  - agb
  - cookie-einstellungen
  - dashboard
  - datenschutz
  - debug
  - email-verified
  - faq
  - forgot-password
  - impressum
  - kontakt
  - login
  - pricing
  - register
  - reset-password
  - verify-email
  - welcome
  - account
    - settings
  - auth
    - password-reset-sent
    - password-reset-success
  - blog
    - index
    - :...slug
  - docs
  - newsletter
    - confirm
  - tools
  - de
    - index
    - agb
    - cookie-einstellungen
    - datenschutz
    - faq
    - forgot-password
    - impressum
    - login
    - register
    - reset-password
  - en
    - index
    - agb
    - cookie-settings
    - dashboard
    - datenschutz
    - email-verified
    - faq
    - forgot-password
    - impressum
    - kontakt
    - login
    - pricing
    - register
    - reset-password
    - verify-email
    - blog
      - index
      - :...slug
    - account
      - settings
    - docs
    - tools
  - api
    - csp-report (POST)
    - debug-login (POST)
    - tools (GET)
    - auth
      - change-password (POST)
      - forgot-password (POST)
      - login (POST)
      - logout (POST)
      - register (POST)
      - resend-verification (POST)
      - reset-password (POST)
      - verify-email (GET)
    - billing
      - session (POST)
    - dashboard
      - activity (GET)
      - notifications (GET)
      - perform-action (POST)
      - projects (GET)
      - quick-actions (GET)
      - stats (GET)
    - debug
      - logs-stream (GET, POST)
    - internal
      - users
        - sync (POST)
    - lead-magnets
      - download (GET, POST, OPTIONS)
    - newsletter
      - confirm (GET)
      - subscribe (POST)
    - projects
    - test
      - seed-email-token (GET)
    - user
      - account (DELETE)
      - avatar (POST)
      - logout-v2 (GET, POST)
      - logout (GET, POST)
      - me (GET)
      - password (POST)
      - profile (POST)
      - settings (PUT)

## Mermaid Diagram der Routenhierarchie

```
graph TD
  Root[/] --> agb[/agb]
  Root --> cookie[/cookie-einstellungen]
  Root --> dashboard[/dashboard]
  Root --> datenschutz[/datenschutz]
  Root --> debug[/debug]
  Root --> email_verified[/email-verified]
  Root --> faq[/faq]
  Root --> forgot_password[/forgot-password]
  Root --> impressum[/impressum]
  Root --> kontakt[/kontakt]
  Root --> login[/login]
  Root --> pricing[/pricing]
  Root --> register[/register]
  Root --> reset_password[/reset-password]
  Root --> verify_email[/verify-email]
  Root --> welcome[/welcome]
  Root --> account[/account]
  account --> account_settings[/account/settings]
  Root --> auth[/auth]
  auth --> pwd_reset_sent[/auth/password-reset-sent]
  auth --> pwd_reset_success[/auth/password-reset-success]
  Root --> blog[/blog]
  blog --> blog_index[/blog]
  blog --> blog_slug[/blog/:...slug]
  Root --> docs[/docs]
  Root --> newsletter[/newsletter]
  newsletter --> newsletter_confirm[/newsletter/confirm]
  Root --> tools[/tools]
  Root --> de[/de]
  de --> de_index[/de/]
  de --> de_agb[/de/agb]
  de --> de_cookie[/de/cookie-einstellungen]
  de --> de_datenschutz[/de/datenschutz]
  de --> de_faq[/de/faq]
  de --> de_forgot[/de/forgot-password]
  de --> de_impressum[/de/impressum]
  de --> de_login[/de/login]
  de --> de_register[/de/register]
  de --> de_reset[/de/reset-password]
  Root --> en[/en]
  en --> en_index[/en/]
  en --> en_agb[/en/agb]
  en --> en_cookie[/en/cookie-settings]
  en --> en_dashboard[/en/dashboard]
  en --> en_datenschutz[/en/datenschutz]
  en --> en_email_verified[/en/email-verified]
  en --> en_faq[/en/faq]
  en --> en_forgot[/en/forgot-password]
  en --> en_impressum[/en/impressum]
  en --> en_kontakt[/en/kontakt]
  en --> en_login[/en/login]
  en --> en_pricing[/en/pricing]
  en --> en_register[/en/register]
  en --> en_reset[/en/reset-password]
  en --> en_verify_email[/en/verify-email]
  en --> en_blog[/en/blog]
  en_blog --> en_blog_index[/en/blog]
  en_blog --> en_blog_slug[/en/blog/:...slug]
  en --> en_account[/en/account]
  en_account --> en_account_settings[/en/account/settings]
  en --> en_docs[/en/docs]
  en --> en_tools[/en/tools]
  Root --> api[/api]
  api --> api_csp[/api/csp-report POST]
  api --> api_debug_login[/api/debug-login POST]
  api --> api_tools[/api/tools GET]
  api --> api_auth[/api/auth]
  api_auth --> api_auth_login[/api/auth/login POST]
  api_auth --> api_auth_register[/api/auth/register POST]
  api_auth --> api_auth_logout[/api/auth/logout POST]
  api_auth --> api_auth_change_pwd[/api/auth/change-password POST]
  api_auth --> api_auth_forgot_pwd[/api/auth/forgot-password POST]
  api_auth --> api_auth_resend_verif[/api/auth/resend-verification POST]
  api_auth --> api_auth_reset_pwd[/api/auth/reset-password POST]
  api_auth --> api_auth_verify_email[/api/auth/verify-email GET]
  api --> api_billing[/api/billing]
  api_billing --> api_billing_session[/api/billing/session POST]
  api --> api_dashboard[/api/dashboard]
  api_dashboard --> api_dash_activity[/api/dashboard/activity GET]
  api_dashboard --> api_dash_notifications[/api/dashboard/notifications GET]
  api_dashboard --> api_dash_perform_action[/api/dashboard/perform-action POST]
  api_dashboard --> api_dash_projects[/api/dashboard/projects GET]
  api_dashboard --> api_dash_quick_actions[/api/dashboard/quick-actions GET]
  api_dashboard --> api_dash_stats[/api/dashboard/stats GET]
  api --> api_debug[/api/debug]
  api_debug --> api_debug_logs_stream[/api/debug/logs-stream GET POST]
  api --> api_internal[/api/internal]
  api_internal --> api_internal_users[/api/internal/users]
  api_internal_users --> api_internal_users_sync[/api/internal/users/sync POST]
  api --> api_lead_magnets[/api/lead-magnets]
  api_lead_magnets --> api_lm_download[/api/lead-magnets/download GET POST OPTIONS]
  api --> api_newsletter[/api/newsletter]
  api_newsletter --> api_newsletter_confirm[/api/newsletter/confirm GET]
  api_newsletter --> api_newsletter_subscribe[/api/newsletter/subscribe POST]
  api --> api_projects[/api/projects POST]
  api --> api_test[/api/test]
  api_test --> api_test_seed[/api/test/seed-email-token GET]
  api --> api_user[/api/user]
  api_user --> api_user_account[/api/user/account DELETE]
  api_user --> api_user_avatar[/api/user/avatar POST]
  api_user --> api_user_logout_v2[/api/user/logout-v2 GET POST]
  api_user --> api_user_logout[/api/user/logout GET POST]
  api_user --> api_user_me[/api/user/me GET]
  api_user --> api_user_password[/api/user/password POST]
  api_user --> api_user_profile[/api/user/profile POST]
  api_user --> api_user_settings[/api/user/settings PUT]
  Root --> r2[/r2]
  r2 --> r2_path[/r2/:...path]
```

## JSON export (flache Route Objekte)

```
[
  { "path": "/", "source": "src/pages/index.astro", "type": "page" },
  { "path": "/agb", "source": "src/pages/agb.astro", "type": "page" },
  { "path": "/cookie-einstellungen", "source": "src/pages/cookie-einstellungen.astro", "type": "page" },
  { "path": "/dashboard", "source": "src/pages/dashboard.astro", "type": "page" },
  { "path": "/datenschutz", "source": "src/pages/datenschutz.astro", "type": "page" },
  { "path": "/debug", "source": "src/pages/debug.astro", "type": "page" },
  { "path": "/email-verified", "source": "src/pages/email-verified.astro", "type": "page" },
  { "path": "/faq", "source": "src/pages/faq.astro", "type": "page" },
  { "path": "/forgot-password", "source": "src/pages/forgot-password.astro", "type": "page" },
  { "path": "/impressum", "source": "src/pages/impressum.astro", "type": "page" },
  { "path": "/kontakt", "source": "src/pages/kontakt.astro", "type": "page" },
  { "path": "/login", "source": "src/pages/login.astro", "type": "page" },
  { "path": "/pricing", "source": "src/pages/pricing.astro", "type": "page" },
  { "path": "/register", "source": "src/pages/register.astro", "type": "page" },
  { "path": "/reset-password", "source": "src/pages/reset-password.astro", "type": "page" },
  { "path": "/verify-email", "source": "src/pages/verify-email.astro", "type": "page" },
  { "path": "/welcome", "source": "src/pages/welcome.astro", "type": "page" },
  { "path": "/account/settings", "source": "src/pages/account/settings.astro", "type": "page" },
  { "path": "/blog", "source": "src/pages/blog/index.astro", "type": "page" },
  { "path": "/blog/:...slug", "source": "src/pages/blog/[...slug].astro", "type": "page" },
  { "path": "/docs", "source": "src/pages/docs/index.astro", "type": "page" },
  { "path": "/newsletter/confirm", "source": "src/pages/newsletter/confirm.astro", "type": "page" },
  { "path": "/tools", "source": "src/pages/tools/index.astro", "type": "page" },
  { "path": "/de", "source": "src/pages/de/index.astro", "type": "page" },
  { "path": "/de/agb", "source": "src/pages/de/agb.astro", "type": "page" },
  { "path": "/de/cookie-einstellungen", "source": "src/pages/de/cookie-einstellungen.astro", "type": "page" },
  { "path": "/de/datenschutz", "source": "src/pages/de/datenschutz.astro", "type": "page" },
  { "path": "/de/faq", "source": "src/pages/de/faq.astro", "type": "page" },
  { "path": "/de/forgot-password", "source": "src/pages/de/forgot-password.astro", "type": "page" },
  { "path": "/de/impressum", "source": "src/pages/de/impressum.astro", "type": "page" },
  { "path": "/de/login", "source": "src/pages/de/login.astro", "type": "page" },
  { "path": "/de/register", "source": "src/pages/de/register.astro", "type": "page" },
  { "path": "/de/reset-password", "source": "src/pages/de/reset-password.astro", "type": "page" },
  { "path": "/en", "source": "src/pages/en/index.astro", "type": "page" },
  { "path": "/en/agb", "source": "src/pages/en/agb.astro", "type": "page" },
  { "path": "/en/cookie-settings", "source": "src/pages/en/cookie-settings.astro", "type": "page" },
  { "path": "/en/dashboard", "source": "src/pages/en/dashboard.astro", "type": "page" },
  { "path": "/en/datenschutz", "source": "src/pages/en/datenschutz.astro", "type": "page" },
  { "path": "/en/email-verified", "source": "src/pages/en/email-verified.astro", "type": "page" },
  { "path": "/en/faq", "source": "src/pages/en/faq.astro", "type": "page" },
  { "path": "/en/forgot-password", "source": "src/pages/en/forgot-password.astro", "type": "page" },
  { "path": "/en/impressum", "source": "src/pages/en/impressum.astro", "type": "page" },
  { "path": "/en/kontakt", "source": "src/pages/en/kontakt.astro", "type": "page" },
  { "path": "/en/login", "source": "src/pages/en/login.astro", "type": "page" },
  { "path": "/en/pricing", "source": "src/pages/en/pricing.astro", "type": "page" },
  { "path": "/en/register", "source": "src/pages/en/register.astro", "type": "page" },
  { "path": "/en/reset-password", "source": "src/pages/en/reset-password.astro", "type": "page" },
  { "path": "/en/verify-email", "source": "src/pages/en/verify-email.astro", "type": "page" },
  { "path": "/en/blog", "source": "src/pages/en/blog/index.astro", "type": "page" },
  { "path": "/en/blog/:...slug", "source": "src/pages/en/blog/[...slug].astro", "type": "page" },
  { "path": "/en/account/settings", "source": "src/pages/en/account/settings.astro", "type": "page" },
  { "path": "/en/docs", "source": "src/pages/en/docs/index.astro", "type": "page" },
  { "path": "/en/tools", "source": "src/pages/en/tools/index.astro", "type": "page" },
  { "path": "/api/csp-report", "source": "src/pages/api/csp-report.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/debug-login", "source": "src/pages/api/debug-login.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/tools", "source": "src/pages/api/tools.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/auth/change-password", "source": "src/pages/api/auth/change-password.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/forgot-password", "source": "src/pages/api/auth/forgot-password.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/login", "source": "src/pages/api/auth/login.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/logout", "source": "src/pages/api/auth/logout.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/register", "source": "src/pages/api/auth/register.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/resend-verification", "source": "src/pages/api/auth/resend-verification.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/reset-password", "source": "src/pages/api/auth/reset-password.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/auth/verify-email", "source": "src/pages/api/auth/verify-email.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/billing/session", "source": "src/pages/api/billing/session.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/dashboard/activity", "source": "src/pages/api/dashboard/activity.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/dashboard/notifications", "source": "src/pages/api/dashboard/notifications.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/dashboard/perform-action", "source": "src/pages/api/dashboard/perform-action.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/dashboard/projects", "source": "src/pages/api/dashboard/projects.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/dashboard/quick-actions", "source": "src/pages/api/dashboard/quick-actions.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/dashboard/stats", "source": "src/pages/api/dashboard/stats.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/debug/logs-stream", "source": "src/pages/api/debug/logs-stream.ts", "type": "api", "methods": ["GET","POST"] },
  { "path": "/api/internal/users/sync", "source": "src/pages/api/internal/users/sync.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/lead-magnets/download", "source": "src/pages/api/lead-magnets/download.ts", "type": "api", "methods": ["GET","POST","OPTIONS"] },
  { "path": "/api/newsletter/confirm", "source": "src/pages/api/newsletter/confirm.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/newsletter/subscribe", "source": "src/pages/api/newsletter/subscribe.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/projects", "source": "src/pages/api/projects/index.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/test/seed-email-token", "source": "src/pages/api/test/seed-email-token.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/user/account", "source": "src/pages/api/user/account.ts", "type": "api", "methods": ["DELETE"] },
  { "path": "/api/user/avatar", "source": "src/pages/api/user/avatar.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/user/logout-v2", "source": "src/pages/api/user/logout-v2.ts", "type": "api", "methods": ["GET","POST"] },
  { "path": "/api/user/logout", "source": "src/pages/api/user/logout.ts", "type": "api", "methods": ["GET","POST"] },
  { "path": "/api/user/me", "source": "src/pages/api/user/me.ts", "type": "api", "methods": ["GET"] },
  { "path": "/api/user/password", "source": "src/pages/api/user/password.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/user/profile", "source": "src/pages/api/user/profile.ts", "type": "api", "methods": ["POST"] },
  { "path": "/api/user/settings", "source": "src/pages/api/user/settings.ts", "type": "api", "methods": ["PUT"] },
  { "path": "/r2/:...path", "source": "src/pages/r2/[...path].ts", "type": "r2" }
]

## Hinweise

- Die HTTP Methoden wurden programmgesteuert aus den oben gelesenen Quelldateien extrahiert. Bei einigen Endpunkten gibt es zusätzlich interne Handling-Fälle (z. B. CORS OPTIONS im Code), die nur erwähnt werden, wenn sie explizit exportiert sind oder im Kommentar klar erscheinen.
- Backup- oder .bak Dateien (z. B. [`src/pages/api/projects/index.corrupted.ts.bak`](src/pages/api/projects/index.corrupted.ts.bak:1)) werden nicht als aktive Routen behandelt.
- Falls du möchtest, kann ich:
  - die HTTP Methoden in ein maschinenlesbares Format (openapi, YAML) exportieren,
  - pro API Route die erwarteten Response Codes und Beispielfragen extrahieren,
  - oder ein CI Check Script schreiben, das die Routen automatisch aktualisiert.

## Auth-Flow Hinweise (Login/Register UI)

- Login-Seiten (`/login`, `/:locale/login`): E‑Mail‑basiertes Magic‑Link‑Formular (nur E‑Mail). Das optionale Profil (Name, Benutzername) wird hier nicht abgefragt. Der Legacy‑E‑Mail/Passwort‑Login wird nur angezeigt, wenn `AUTH_PROVIDER !== 'stytch'`. Der Link „Passwort vergessen?“ befindet sich innerhalb dieses Legacy‑Formulars und ist somit im Stytch‑Modus nicht sichtbar.

- Register-Seiten (`/register`, `/:locale/register`): Magic‑Link‑Formular mit E‑Mail und optionalen Profildaten (Name, Benutzername). Diese werden serverseitig in einem kurzlebigen HttpOnly‑Cookie `post_auth_profile` (10 Min) gespeichert und beim Callback für das erstmalige Anlegen des Users genutzt (Username‑Kollisionen werden wie gehabt mit Suffix aufgelöst).

- Redirect‑Policy: Ein optionaler Weiterleitungs‑Pfad `r` (nur relative Pfade, kein `//`) wird als HttpOnly‑Cookie `post_auth_redirect` gesetzt. Im Callback hat dieses Cookie Vorrang vor einem Query‑`r`. Nach der Verwendung werden die Cookies gelöscht.

- Response auf `POST /api/auth/magic/request`: JSON `{ "success": true, "data": { "sent": true } }`. Die UI weist darauf hin, dass nach Absenden eine Bestätigungs‑Antwort angezeigt wird.

--- Ende
