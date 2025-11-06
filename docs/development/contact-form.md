---
description: 'Kontaktformular-Implementierung: Architektur, API-Vertrag, Frontend-Flow und Deployment-Checkliste'
owner: 'Development Team'
priority: 'high'
lastSync: '2025-11-06'
codeRefs: 'src/pages/api/contact/index.ts, src/pages/kontakt.astro, src/lib/validation/schemas/contact.ts, wrangler.toml, openapi.yaml'
testRefs: 'HAR/hub-evolution.pages.HARAcontactform.har'
---

# Contact Form Integration

Dieser Leitfaden dokumentiert den kompletten Kontaktformular-Flow – von der Client-Einbindung über die API bis zur E-Mail-Zustellung via Resend. Zielgruppe sind Entwickler:innen, die das Feature warten, erweitern oder in anderen Umgebungen bereitstellen.

## Architekturüberblick

| Bestandteil | Beschreibung | Referenz |
|-------------|--------------|----------|
| Frontend (Astro) | Formular, Turnstile-Widget, CSRF-Helper, Feedback-UI | `@src/pages/kontakt.astro` |
| BaseLayout | Lädt Turnstile-Script global bei vorhandenem Site-Key | `@src/layouts/BaseLayout.astro` |
| Validation | Zod-Schema `contactMessageSchema` steuert Request-Validierung | `@src/lib/validation/schemas/contact.ts` |
| API-Endpoint | `POST /api/contact` – Middleware, Turnstile-Check, Resend-Aufruf | `@src/pages/api/contact/index.ts` |
| Email Service | Resend-Integration (HTML-Mail, Fehler-Handling) | `@src/lib/services/email-service-impl.ts` |
| Konfiguration | `wrangler.toml` + Secrets für Turnstile & Resend | `@wrangler.toml` |
| Spezifikation | OpenAPI-Eintrag inkl. Schema/Responses | `@openapi.yaml#1726-2907` |

## Request-Vertrag

Die API erwartet JSON. Formularfelder werden im Frontend bereits getrimmt; Validierung erfolgt serverseitig über das Zod-Schema.

| Feld | Typ | Validation | Quelle |
|------|-----|------------|--------|
| `firstName` | string | min 1, max 100 | Pflichtfeld im Formular |
| `lastName` | string | min 1, max 100 | Pflichtfeld |
| `email` | string | RFC-kompatibel, max 320 | Pflichtfeld |
| `subject` | string | min 1, max 200 | Pflichtfeld |
| `message` | string | min 10, max 4000 | Pflichtfeld, Textarea |
| `consent` | boolean | muss `true` sein (`privacy-policy` Checkbox) | Pflichtfeld |
| `locale` | enum (`de`\|`en`) | optional | Hidden/Client |
| `turnstileToken` | string | min 10 Zeichen | Cloudflare Turnstile |
| `source` | string | optional, max 120 | aktuell `kontakt-page` |

Bei Multipart-Formularen akzeptiert `parseBody` die Felder analog (Fallback für zukünftige Clients).

## Response & Fehler

- **200** – `{ success: true, data: { status: 'queued' } }`
- **400** – `validation_error` inkl. Zod-Issues (`turnstile_missing`, `message_too_short`, …)
- **400** – `validation_error` bei fehlschlagender Turnstile-Verifikation (`Turnstile verification failed`)
- **429** – Rate-Limit (`contactFormLimiter`)
- **500** – `server_error` wenn keine Empfänger konfiguriert oder Resend sendet Fehler zurück

## Security & Limits

- Middleware `withApiMiddleware` erzwingt Same-Origin, CSRF (`X-CSRF-Token` vs. Cookie `csrf_token`) und Security-Header.
- Rate-Limit über `contactFormLimiter` (Konfiguration in `@src/lib/rate-limiter.ts`).
- Cloudflare Turnstile Double-Submit (Client-Widget + Server-Verifikation).
- Responses nutzen ausschließlich `createApiSuccess`/`createApiError`.

## Externe Integrationen

| Service | Zweck | Wichtige Einstellungen |
|---------|-------|------------------------|
| Cloudflare Turnstile | Bot-Schutz | Site-Key (`PUBLIC_TURNSTILE_SITE_KEY`) im Client, Secret (`TURNSTILE_SECRET_KEY`) im Worker; Script-Load im BaseLayout |
| Resend | E-Mail-Versand | `RESEND_API_KEY`, `EMAIL_FROM`, Empfängerliste `CONTACT_RECIPIENTS`; HTML-Template in `createEmailService()` |

## Konfiguration & Secrets

| Variable | Scope | Pflege | Beschreibung |
|----------|-------|--------|---------------|
| `RESEND_API_KEY` | Secret | `wrangler secret put ...` | Authentifizierung gegenüber Resend |
| `TURNSTILE_SECRET_KEY` | Secret | `wrangler secret put ...` | Serverseitige Turnstile-Verifikation |
| `CONTACT_RECIPIENTS` | Env | `wrangler.toml` (`[vars]`, `[env.*.vars]`) | Kommagetrennte Empfänger; Fallback auf `contactInfo.email` |
| `EMAIL_FROM` | Env | `wrangler.toml` | Absenderadresse (muss bei Resend verifiziert sein) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Env | `wrangler.toml` | Clientseitiger Site-Key (auch für weitere Seiten nutzbar) |
| `BASE_URL` | Env | `wrangler.toml` | Wird an Email-Service weitergegeben (Links) |

> **Hinweis:** Secrets lassen sich nicht doppelt mit identischem Namen setzen. Bei Anpassungen an `CONTACT_RECIPIENTS` genügt eine Änderung in `wrangler.toml` und erneutes Deployment.

## Frontend-Flow

1. Seite wird nicht vorgerendert (`export const prerender = false`) – der Worker liefert dynamisch den CSRF-Cookie.
2. `BaseLayout` lädt das Turnstile-Script, sobald ein Site-Key verfügbar ist.
3. Beim Submit erzeugt `ensureCsrfToken()` (inline) einen Token und setzt den Cookie, falls keiner existiert.
4. Das Form-Script sammelt Eingaben, liest den Turnstile-Token (`cf-turnstile-response`) und sendet JSON via `fetch` an `/api/contact`.
5. Statusmeldungen (`sending`, `success`, `error`) stammen aus `data-*` Attributen. Bei Erfolg werden Formular, Turnstile und Feedback zurückgesetzt.

## Deployment-Checkliste

1. **Secrets setzen (einmalig / bei Änderungen):**

   ```bash
   wrangler secret put RESEND_API_KEY --env production
   wrangler secret put TURNSTILE_SECRET_KEY --env production
   ```

2. **Empfänger aktualisieren:** `wrangler.toml` (`[env.production.vars].CONTACT_RECIPIENTS`). Mehrere Adressen via Komma.
3. **Site-Key prüfen:** `PUBLIC_TURNSTILE_SITE_KEY` in `wrangler.toml`.
4. **Deploy:** `npm run deploy:production`.
5. **Gesundheitschecks** (Wrangler Warmup meldet 200 für `/api/health`).

## Verifikation nach Deployment

- **Browser-Test:** Formular ausfüllen, Turnstile lösen – sollte `200` liefern und Erfolgsmeldung anzeigen.
- **HAR/Netzwerk:** Sicherstellen, dass `turnstileToken` im Request vorhanden ist. Beispiel: `HAR/hub-evolution.pages.HARAcontactform.har`.
- **Resend-Logs:** Status `202` bzw. `200` für `/emails` prüfen; Empfänger & HTML kontrollieren.
- **Mailbox:** E-Mail-Eingang bei allen Adressen (inkl. Spam) verifizieren.

## Troubleshooting

| Symptom | Ursache | Lösung |
|---------|---------|--------|
| Turnstile-Token leer / 400 `turnstile_missing` | Widget nicht gerendert (fehlender Site-Key oder Script-Block) | Site-Key in Env setzen, Seite neuladen; Console-Warnung beachten |
| 500 `Resend API Key ist erforderlich` | Secret nicht gesetzt | `wrangler secret put RESEND_API_KEY --env production`, danach deploy |
| 500 `No contact recipient configured` | `CONTACT_RECIPIENTS` leer & `contactInfo.email` nicht definiert | Env-Wert ergänzen und deployen |
| Keine Mail trotz Erfolg | Falsches bzw. internes `CONTACT_RECIPIENTS` | Empfänger in `wrangler.toml` auf lesbare Adresse setzen |
| 400 `Turnstile verification failed` | Token abgelaufen/ungültig | Turnstile-Widget neu laden oder Secrets prüfen |

## Erweiterungen / TODOs

- Integrationstest (z. B. Worker Mocks + Resend Stub) ergänzen.
- UI-Hinweis für unterschiedliche Fehlerfälle (z. B. Turnstile vs. Resend) granularisieren.
- Monitoring/Alerting für fehlgeschlagene Resend-Sendungen ausbauen.

## Referenzen

- API-Implementierung: `@src/pages/api/contact/index.ts`
- Frontend & Script: `@src/pages/kontakt.astro`
- Validation: `@src/lib/validation/schemas/contact.ts`
- Resend-Service: `@src/lib/services/email-service-impl.ts`
- OpenAPI: `@openapi.yaml#1726-2907`
- Konfiguration: `@wrangler.toml#31-269`
