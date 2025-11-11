---
status: active
date: '2024-03-12'
supersededBy: ''
description: 'ADR zur Normalisierung der Locale-abhängigen Auth-Routen in der Middleware.'
owner: 'team:architecture'
priority: 'medium'
lastSync: '2025-11-11'
codeRefs: 'src/middleware.ts, src/components/auth/AuthStatusNotifier.tsx'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# ADR-0005: Auth-Routen – Locale-Normalisierung (DE/EN)

## Status

Vorgeschlagen | **Akzeptiert** | Abgelehnt | Überholt | Ersetzt

## Kontext

Die Middleware normalisierte bisher `/de/*`-Pfade abhängig von der bevorzugten Nutzer-Locale (Cookie/Accept-Language) auf neutrale oder `/en/*`-Pfade. Dadurch kam es zu Inkonsistenzen bei Auth-Seiten (z. B. `/de/login`, `/de/reset-password`), weil die Client-Logik für Toasts (Sonner) die Sprache strikt aus dem URL-Pfad ableitet. Ergebnis: Auf deutschen Routen erschienen gelegentlich englische Toasts, was E2E-Tests flakey machte und die UX inkonsistent erscheinen ließ.

Rahmenbedingungen:

- Astro + React Islands, strikte CSP in Produktion.

- Locale-Ermittlung via URL-Prefix (`/de`, `/en`), Cookie und `Accept-Language`.

- Zentrale Toast-/URL-Cleanup-Logik in `AuthStatusNotifier` (Client-Seite).

- E2E-Tests prüfen sowohl Toast-Texte als auch Param-Removal (URL-Bereinigung).

## Entscheidung

1. Auth-Routen unter `/de/*` werden in der Middleware nicht mehr normalisiert/umgeleitet. Damit bleibt die Locale auf DE stabil, wenn die Route mit `de`-Präfix aufgerufen wird.
1. Symmetrischer Guard: Auch Auth-Routen unter `/en/*` werden nicht normalisiert (präventiver no-op, falls zukünftig eine EN-Normalisierung eingeführt würde).
1. Der `AuthStatusNotifier` leitet die Locale strikt aus dem URL-Pfad ab (`pathname.startsWith('/de')`).
1. E2E-Tests stellen wieder strikt auf die erwarteten lokalen Toast-Texte ab (DE auf `/de/*`, EN auf `/` bzw. `/en/*`).

Betroffene Stellen:

- Middleware: `src/middleware.ts`

  - Schutz vor Normalisierung für `/de/*`-Auth-Routen (Option B umgesetzt)

  - Symmetrischer Schutz für `/en/*`-Auth-Routen (präventiver Guard)

- Client: `src/components/scripts/AuthStatusNotifier.tsx`

  - Locale strikt aus URL-Pfad; keine Änderung erforderlich (Option A bereits erfüllt)

- Tests: `tests/e2e/specs/*-url-status.spec.ts`

  - DE-Assertions wieder strikt deutsch

## Konsequenzen

Positiv:

- Konsistente, deterministische Locale auf Auth-Routen; UX und E2E stabil.

- Klarer Verantwortlichkeitszuschnitt: URL-Präfix entscheidet über Sprache.

- Kein Leaken sensibler Infos über Query-Params; Cleanup bleibt erhalten.

Negativ/Trade-offs:

- Nutzer mit EN-Präferenz sehen bei direktem Aufruf einer DE-Auth-Route deutsche Texte (intended by design).

- Mehr Verantwortung in Routing-Konventionen (URL-Prefix als „single source of truth“ für Locale auf Auth-Seiten).

### Hinweis: Blog-Routen und UI-Links

- Um zusätzliche Normalisierungs-Redirects zu vermeiden, müssen Blog-Links in der UI stets locale-bewusst erzeugt werden (via `localizePath(getLocale(Astro.url.pathname), href)`).

- Dadurch entfallen neutrale → `/en/*` Redirects der Middleware beim Navigieren aus `/en/*` heraus.

- Refs: `src/lib/locale-path.ts`, `src/components/BlogCard.astro`, `src/components/BlogPost.astro`, `src/pages/blog/index.astro`, Middleware-Regeln `src/middleware.ts:332-356`, `447-469`.

## Alternativen

- Weiterhin Normalisierung erzwingen und Tests tolerant gegenüber EN/DE gestalten.

  - Pro: Einheitliche Cookie-/Header-Steuerung der Locale.

  - Contra: Flakey UX/E2E bei Deep Links auf `/de/*`.

- Reines Client-Side-Handling (nur `AuthStatusNotifier` ändern), Middleware unverändert.

  - Pro: Kleinere Serveränderung.

  - Contra: Redirects könnten trotzdem Route/Locale ändern; weiterhin Inkonsistenzen möglich.

- Vollständiger i18n-Router, der sämtliche Routen strikt pro Locale mappt.

  - Pro: Maximal klare Trennung.

  - Contra: Höherer Implementierungs- und Pflegeaufwand; aktuell nicht erforderlich.

## Referenzen

- Middleware: `src/middleware.ts`

- Notifier: `src/components/scripts/AuthStatusNotifier.tsx`

- E2E: `tests/e2e/specs/forgot-password-url-status.spec.ts`, `reset-password-url-status.spec.ts`, `register-url-status.spec.ts`

- Architektur- und Sicherheitsdokumente in `docs/architecture/`, `docs/api/`.
