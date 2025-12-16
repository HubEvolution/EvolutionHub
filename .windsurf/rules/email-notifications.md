---
trigger: always_on
scope: feature
extends:
  - api-and-security.md
  - observability.md
  - background-jobs.md
  - database-migrations.md
  - caching-kv.md
  - testing-and-ci.md
priority: high
---

# Email Notifications Rules

## Zweck

Sichere, nachvollziehbare Email‑Versendung (Resend) für Produkt‑Notifications und Systemmails – mit klarer Trennung von:

- synchronen Mails (z. B. Kontaktformular, Auth‑Verifikation/Welcome)
- queued Mails (D1‑Queue + Processor Endpoint)

Ziele: kein PII‑Leak in Logs, kontrollierte Retries, stabile Templates, Abuse‑Prevention.

## Muss

- Provider & Secrets
  - Provider ist Resend (`resend` SDK) in `src/lib/services/email-service-impl.ts`.
  - Secrets werden ausschließlich über Runtime‑Env/Wrangler gesetzt (niemals im Code/Repo):
    - `RESEND_API_KEY` (required)
    - `EMAIL_FROM` (required für Queue Processor; Contact kann fallbacken)
    - `BASE_URL` (required für Queue Processor; Contact nutzt Request Origin als fallback)
  - Keine Provider‑Credentials im Client, keine Ausgabe im Response/Logs.

- Datenschutz / PII
  - Email‑Adressen sind PII:
    - In Logs nur maskiert/gekürzt (siehe `maskEmail()` in `email-service-impl.ts`).
    - Keine vollständigen HTML‑Bodies, keine kompletten Variablen‑JSONs in Logs.
  - Errors aus Provider‑Responses dürfen geloggt werden, aber nur als kurze, redacted Samples.

- Storage: Templates & Queue (D1)
  - Templates liegen in D1 (`email_templates`) und sind versionierbar über DB‑Migrations (`migrations/*.sql`).
  - Queue liegt in D1 (`email_queue`) mit:
    - `status`: `pending|sending|sent|failed|cancelled`
    - `scheduledFor`, `attempts`, `maxAttempts`, `lastError`, `sentAt`
  - Template‑Rendering erfolgt serverseitig; Variablen werden in `email_queue.variables` als JSON gespeichert.

- Queue Processing
  - Verarbeitung läuft über den dedizierten API‑Processor:
    - `POST /api/notifications/queue/process`
    - Auth‑geschützt via `withAuthApiMiddleware`
    - Unsafe Method → Same‑Origin enforced (konfiguriert)
    - `limit` wird serverseitig geclamped (1..50)
  - Verarbeitung:
    - [getPendingEmails(limit)](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:637:2-674:3) lädt `pending` Items, deren `scheduledFor <= now`.
    - Pro Item wird Template geladen ([getEmailTemplateById](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:470:2-497:3)) und gerendert.
    - Bei Erfolg: [markEmailAsSent(id)](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:676:2-689:3).
    - Bei Fehler: [markEmailAsFailed(id, message)](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:691:2-703:3) (increment attempts + lastError).
  - Alte `pending` Emails werden serverseitig als failed markiert (Timeout) via [NotificationService.processEmailQueue()](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:769:2-789:3).

- Rate‑Limits / Abuse‑Prevention
  - User‑initiated Email‑Events müssen rate‑limited sein (KV‑backed, wenn verfügbar):
    - In [NotificationService](cci:2://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:29:0-790:1) wird Email/Notification Erstellung begrenzt (z. B. [rateLimit(notification:\<userId\>:create, 10/min)](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/rate-limiter.ts:372:0-468:1)).
    - Kontaktformular nutzt `contactFormLimiter` (5/min in Prod).
  - Keine “unbounded” Email‑Enqueueing‑Loops (z. B. per Cron ohne Cap).

- Fehlerformen (APIs)
  - API‑Responses folgen den Baselines:
    - `createApiSuccess(...)`
    - `createApiError(type, message, details?)`
  - 405 nur via `createMethodNotAllowed(...)`.

## Sollte

- Template Governance
  - Templates sind semantisch benannt (z. B. `reply-notification`, `moderation-decision`) und werden eindeutig pro Locale verwaltet (`de|en`).
  - Template‑Variablen sollten dokumentiert sein (Feld `email_templates.variables` als JSON‑Array) und in Code/Docs konsistent bleiben.
  - Rendering sollte escape‑bewusst erfolgen (bei Contact wird HTML explizit escaped).

- Retries & Backoff
  - `maxAttempts` ist begrenzt (Default 3). Bei Provider‑Ausfällen sollen Retries zeitlich gestaffelt werden (z. B. `scheduledFor` in Zukunft setzen), statt sofortige Endlos‑Loops.
  - Bei permanenten Fehlern (z. B. invalid recipient) frühzeitig “failed” markieren.

- Observability
  - Queue Processor soll strukturierte Logs nutzen (mit requestId, emailId, templateId), aber ohne PII:
    - `emailId`, `templateId`, `status`, `attempts`, `messageId` (Provider)
  - Metrik‑Counter (z. B. `contact_send_success|failed`) sind ok, aber keine High‑Cardinality Labels.

- Security / Internal Usage
  - Queue Processor ist ein interner Maintenance‑Endpoint:
    - Nutzung idealerweise nur von Admin/Worker/Trusted automation.
    - Wenn später Cron‑Trigger hinzukommt: Token‑Guard gemäß [background-jobs.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/background-jobs.md:0:0-0:0) (Header `X-Internal-Health`) erwägen.

## Nicht

- Keine Email‑Bodies/HTML/kompletten Template‑Variablen in Logs.
- Keine Secrets (Resend API Key etc.) in Logs/DB.
- Keine offenen Queue‑Processor Endpoints ohne Auth.
- Kein Versand an beliebige Empfänger ohne klare Ownership/Use‑Case (insbesondere kein “mass mailing” ohne zusätzliche Safeguards).

## Checkliste

- [ ] `RESEND_API_KEY`/`EMAIL_FROM`/`BASE_URL` korrekt per Env gesetzt (keine Defaults in Prod).
- [ ] Email‑PII wird nicht geloggt (maskiert statt Klartext).
- [ ] Templates und Queue werden in D1 gemanaged (`email_templates`, `email_queue`).
- [ ] Queue Processor ist Auth‑geschützt + Same‑Origin enforced und clamped `limit`.
- [ ] Retries sind begrenzt (`maxAttempts`) und Failure wird persisted (`lastError`).
- [ ] Nach Änderungen: `npm run test:integration` (mindestens Notification/Queue Pfade) grün.

## Code‑Anker

- Email Service (Resend):
  - `src/lib/services/email-service.ts`
  - `src/lib/services/email-service-impl.ts`
- Queue + Templates (D1):
  - `src/lib/db/schema.ts` (`email_templates`, `email_queue`)
  - `migrations/*.sql` (Schema‑Änderungen)
- Notification/Queue Service:
  - [src/lib/services/notification-service.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/notification-service.ts:0:0-0:0)
  - `src/lib/types/notifications.ts`
- API Endpoints:
  - `src/pages/api/notifications/queue/process.ts`
  - [src/pages/api/contact/index.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/contact/index.ts:0:0-0:0)
- Rate Limits:
  - [src/lib/rate-limiter.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/rate-limiter.ts:0:0-0:0)

## CI/Gates

- `npm run lint`
- `npm run test`
- Bei Email/API/DB‑Änderungen:
  - `npm run test:integration`
  - `npm run openapi:validate` (falls Endpunkte/Shapes dokumentiert wurden)

## Referenzen

- [.windsurf/rules/api-and-security.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/api-and-security.md:0:0-0:0)
- [.windsurf/rules/observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0)
- [.windsurf/rules/background-jobs.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/background-jobs.md:0:0-0:0)
- [.windsurf/rules/database-migrations.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/database-migrations.md:0:0-0:0)
- [.windsurf/rules/caching-kv.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/caching-kv.md:0:0-0:0)
- [.windsurf/rules/testing-and-ci.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/testing-and-ci.md:0:0-0:0)

## Changelog

- 2025-12-16: Erstfassung Email Notifications (Resend, D1 templates+queue, Processor Endpoint, PII/Rate-Limits).
