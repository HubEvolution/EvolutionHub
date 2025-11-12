---
description: 'Toast Notifications mit Sonner und AuthStatusNotifier (URL-gesteuertes Feedback)'
owner: 'Frontend Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'src/layouts/BaseLayout.astro, src/components/scripts/AuthStatusNotifier.tsx, tests/e2e/specs/auth-url-status.spec.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Toast Notifications (Sonner) & AuthStatusNotifier

Diese Dokumentation beschreibt die zentralisierte Toast-Architektur mit Sonner und die URL-gesteuerte Rückmeldung über `AuthStatusNotifier`.

## Überblick

- Sonner-Toaster wird global als React-Island in `src/layouts/BaseLayout.astro` über `<Toaster client:load />` bereitgestellt.

- Die Komponente `src/components/scripts/AuthStatusNotifier.tsx` zeigt kontextspezifische Toaster basierend auf URL-Parametern (`success`, `error`, optional `loggedOut`) und bereinigt die URL anschließend.

- Unterstützte Modi (`mode`-Prop): `login`, `register`, `forgot-password`, `reset-password`, `password-reset-sent`.

## Relevante Dateien

- `src/layouts/BaseLayout.astro` – Mount des globalen Toasters.

- `src/components/scripts/AuthStatusNotifier.tsx` – Toast-Logik inkl. URL-Cleanup.

Beispielseiten:

- `src/pages/en/register.astro`

- `src/pages/de/register.astro`

### Hinweis: E-Mail-Verifizierungsseite

- Die Seite `src/pages/email-verified.astro` verwendet bewusst keinen `AuthStatusNotifier`.

- Stattdessen bereinigt sie selbst die URL-Parameter (inkl. `welcome`) clientseitig und rendert eine eigene Erfolgs-/Fehleransicht.

- Quelle Redirect-Parameter: `src/pages/api/auth/verify-email.ts` leitet bei Erfolg auf `/email-verified?welcome=true` weiter.

- Testabdeckung: `tests/e2e/specs/auth-url-status.spec.ts` prüft, dass `welcome` ohne Reload entfernt wird (kein Toast erwartet).

## Funktionsweise (`AuthStatusNotifier.tsx`)

- Wartet beim Mount kurz auf den Toaster (`[data-sonner-toaster]`), um Race-Conditions zu vermeiden.

- Liest je nach `mode` relevante URL-Parameter:
  - `login`: `loggedOut`, `success`, `error`

  - alle anderen: `success`, `error`

- Zeigt lokalisierte Meldungen basierend auf der Pfadsprache (`/de` vs. `/en`).

- Löscht die bekannten Parameter anschließend und ersetzt den Verlaufseintrag (`history.replaceState`) – keine Seitenneulandung.

## Verwendung

- Stelle sicher, dass `BaseLayout` genutzt wird (Toaster vorhanden). Auf Auth-Seiten wird über `AuthLayout` der Toaster ebenfalls bereitgestellt.

- Füge auf Seiten mit Rückmeldungen das React-Island ein, z. B. auf Register-Seiten:

````astro
---
import AuthStatusNotifier from '@/components/scripts/AuthStatusNotifier';
---

<AuthStatusNotifier mode="register" client:load />

```text - Für Login-Seiten verwende `mode="login"` (unterstützt zusätzlich `loggedOut`). ## CSP &
Sicherheit - In Production bleibt die CSP strikt. In Development wurde CSP in `src/middleware.ts`
nur für HMR gelockert (siehe Projekt-Memory). `AuthStatusNotifier` arbeitet ohne `eval`/ESM-Imports
und bleibt CSP-konform. ## Tests - E2E-Spezifikation für URL-Status-Handling:
`tests/e2e/specs/auth-url-status.spec.ts` (sollte vollständig grün laufen). ## Troubleshooting -
Keine Toaster sichtbar: Prüfen, ob `<Toaster client:load />` in `BaseLayout` gerendert wird. -
Meldungen fehlen: Sicherstellen, dass die erwarteten Query-Parameter gesetzt sind und `mode` korrekt
ist. - URL wird nicht bereinigt: Browser-Konsole auf Fehler prüfen; `history.replaceState` erfordert
HTTPS/korrekte Basis-URL in Testumgebungen. ```text
````
