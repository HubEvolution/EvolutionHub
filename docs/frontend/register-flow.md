# Registrierung: API-Flow & Frontend

Diese Dokumentation beschreibt den End-to-End-Registrierungsfluss bestehend aus API-Endpoint, Formularseiten und Toast-Feedback via `AuthStatusNotifier`.

## Überblick

- POST-Endpunkt: `src/pages/api/auth/register.ts`
- Frontend-Seiten: `src/pages/de/register.astro`, `src/pages/en/register.astro`
- Toast-Feedback & URL-Cleanup: `src/components/scripts/AuthStatusNotifier.tsx`
- Layouts: `AuthLayout.astro` (AOS/Analytics aus), `BaseLayout.astro` (Toaster global)

## API-Endpunkt: `/api/auth/register` (POST)

Quelle: `src/pages/api/auth/register.ts`

- Validiert Eingaben strikt per Schema:
  - email (E-Mail-Format, max 255)
  - password (min 6, max 100)
  - name (min 2, max 100)
  - username (min 3, max 50, Regex: `^[a-zA-Z0-9_-]+# Registrierung: API-Flow & Frontend

Diese Dokumentation beschreibt den End-to-End-Registrierungsfluss bestehend aus API-Endpoint, Formularseiten und Toast-Feedback via `AuthStatusNotifier`.

## Überblick

- POST-Endpunkt: `src/pages/api/auth/register.ts`
- Frontend-Seiten: `src/pages/de/register.astro`, `src/pages/en/register.astro`
- Toast-Feedback & URL-Cleanup: `src/components/scripts/AuthStatusNotifier.tsx`
- Layouts: `AuthLayout.astro` (AOS/Analytics aus), `BaseLayout.astro` (Toaster global)

)
- Rate-Limiting: `authLimiter()`; bei Limit: Redirect `/{locale}/register?error=TooManyRequests`
- Service-Layer: `createAuthService().register(...)`; Konfliktcodes:
  - `UserExists` (E-Mail existiert)
  - `UsernameExists` (Benutzername existiert)
- Double-Opt-In: Kein Session-Cookie bei Erfolg; stattdessen Verifikations-E-Mail (non-blocking) und Redirect → `/verify-email?email=<email>`
- Locale-Ermittlung:
  - Primär: Hidden-Field `locale` aus dem Formular (`de`/`en`)
  - Fallback: `Referer`

## Frontend: Registrierungsseiten

Quellen:

- `src/pages/de/register.astro`
- `src/pages/en/register.astro`

Eigenschaften:

- Verwendung von `AuthLayout.astro` (setzt `enableAOS={false}`, Analytics aus)
- Formular POST → `/api/auth/register`
- Hidden-Feld `locale` gemäß Seiten-Sprache
- `AuthStatusNotifier` als React-Island: `<AuthStatusNotifier mode="register" client:load />`
- Clientseitiger Submit-Handler mit `fetch`:
  - verfolgt Redirects; wenn `response.redirected === true`, wird `window.location.href = response.url` gesetzt
  - bei `response.ok` Fallback-Redirect zu `/dashboard`
  - bei Fehlern: Inline-Fehleranzeige im Formular

### Beispiel (aus `src/pages/de/register.astro`)

```astro
---
import AuthLayout from '@/layouts/AuthLayout.astro';
import AuthStatusNotifier from '@/components/scripts/AuthStatusNotifier';
import Button from '@/components/ui/Button.astro';
import FormLabel from '@/components/ui/FormLabel.astro';
import Input from '@/components/ui/Input.astro';
---
<AuthLayout title="Konto erstellen">
  <form id="register-form" method="POST" action="/api/auth/register">
    <input type="hidden" name="locale" value="de" />
    <!-- Felder: name, username, email, password -->
    <Button type="submit" className="w-full">Konto erstellen</Button>
  </form>
  <AuthStatusNotifier mode="register" client:load />
</AuthLayout>
```

## Toasts & URL-Bereinigung

Quelle: `src/components/scripts/AuthStatusNotifier.tsx`

- Liest URL-Parameter `success` / `error` und zeigt passende, lokalisierte Sonner-Toasts an
- Bereinigt die URL anschließend per `history.replaceState`
- `mode="register"` aktiviert registrierungsspezifische Messages

Siehe Doku: `docs/frontend/toast-notifications.md`

## Sicherheit & Compliance

- Keine Tokens im Local/SessionStorage: Session-Cookie ist HttpOnly
- Sichere Cookie-Attribute gesetzt (s.o.)
- Strikte Validierung verhindert Injection- und Formatfehler
- Rate-Limiting schützt vor Brute-Force
- CSP: In Produktion strikt; devseitige Lockerungen nur für HMR (siehe Middleware-Notizen im Projekt)

## Fehlercodes (Auszug)

- `TooManyRequests` – Rate-Limit erreicht
- `UserExists` – E-Mail bereits vergeben
- `UsernameExists` – Benutzername bereits vergeben
- Ggf. weitere generische Fehler über zentralen Handler (`handleAuthError`)

## Tests

- E2E-Tests sollten folgende Pfade abdecken:
  - Erfolgreiche Registrierung → Redirect `/dashboard`
  - Fehlerhafte Eingaben → Redirect mit `error`-Param → Toast + URL-Cleanup
  - Konflikte (E-Mail/Username) → spezifische `error`-Codes sichtbar

## Troubleshooting

- Keine Toasts: Prüfen, ob `<Toaster client:load />` in `BaseLayout.astro` gerendert wird
- URL-Params verbleiben: Browser-Konsole auf `replaceState`-Fehler prüfen
- Redirect greift nicht im `fetch`-Pfad: `response.redirected` auswerten und `window.location.href` setzen
- Locale falsch: Hidden-Feld `locale` im Formular korrekt setzen (`de` oder `en`)

## E-Mail-Verifikation

Diese Phase bestätigt neue Benutzer per Double-Opt-in-Link und richtet die Session ein.

### API-Endpunkt: `/api/auth/verify-email` (GET)

Quelle: `src/pages/api/auth/verify-email.ts`

- Query-Parameter:
  - `token` (erforderlich)
  - `email` (optional; Validierung gegen gespeicherte Adresse)
- Ablauf bei Erfolg:
  - Markiert den Benutzer als verifiziert (`email_verified = 1`, Timestamps setzen)
  - Markiert den Token als verwendet und entfernt abgelaufene Tokens
  - Erstellt eine Session und setzt `session_id`-Cookie (HttpOnly, SameSite=lax, Secure bei HTTPS)
  - Sendet Willkommens-E-Mail (non-blocking; Fehler blockieren den Flow nicht)
  - Redirect → `/email-verified?welcome=true`
- Fehlerfälle → Redirect zu `/register?error=<Code>` mit Codes:
  - `InvalidVerificationLink`, `VerificationLinkExpired`, `VerificationLinkAlreadyUsed`, `UserNotFound`, `ServerError`

### Erfolgs-/Fehlerseite: `/email-verified`

Quelle: `src/pages/email-verified.astro`

- Layout: `AuthLayout.astro` (AOS/Analytics deaktiviert)
- UI-Zustände: `success` (Standard), `error` (über `?error=<Code>`), `no_session` (falls keine Session vorhanden)
- Verhalten:
  - Erfolgsfall: Auto-Redirect zum Dashboard nach 10 Sekunden; Nutzerinteraktion bricht den Countdown ab
  - Kein `AuthStatusNotifier`; stattdessen clientseitiger URL-Cleanup der Parameter `welcome`, `success`, `error` via `history.replaceState`
- Tests: `tests/e2e/specs/auth-url-status.spec.ts` prüft, dass `welcome` entfernt wird (kein Toast erwartet)
