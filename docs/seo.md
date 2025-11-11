---
description: 'SEO – Meta-Daten, hreflang und Read-only Launch Setup'
owner: 'SEO & Ops Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'src/lib/seo.ts, src/layouts/BaseLayout.astro, docs/seo-readonly-launch-2025-10-28.md, tests/e2e/specs/seo.spec.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# SEO Dokumentation

## Übersicht

Diese Dokumentation beschreibt die Implementierung und Pflege der SEO‑Meta‑Daten in der Evolution Hub‑Anwendung. Die SEO‑Daten sind mehrsprachig und werden dynamisch basierend auf dem aktuellen Locale generiert.

## Hauptimplementierung

Die SEO‑Daten und Hilfsfunktionen befinden sich in [`src/lib/seo.ts`](../src/lib/seo.ts). Dort sind die Funktionen

- `getSEOData(locale)` — liefert Titel, Description und ogImage für ein Locale

- `getAlternateUrls(pathname)` — erzeugt hreflang‑Alternativen für eine gegebene Route

Integriert wird das in Layouts (z. B. [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro)), die die Meta‑Tags setzen und die hreflang‑Links erzeugen.

## Datenstruktur

Für jedes Locale werden folgende Felder erwartet (siehe [`src/lib/seo.ts`](../src/lib/seo.ts)):

- `title` (string)

- `description` (string)

- `ogImage` (Pfad zum Open‑Graph‑Bild, string)

Beispiel aus `src/lib/seo.ts`:

```ts
const seoData = {
  de: { title: '...', description: '...', ogImage: '/assets/images/og-image-de.png' },
  en: { title: '...', description: '...', ogImage: '/assets/images/og-image-en.png' }
};

```json

## Verwendung (Beispiel)

In einem Layout (siehe [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro)):

```astro
---
import { getLocale } from '@/lib/i18n';
import { getSEOData, getAlternateUrls } from '@/lib/seo';
const locale = getLocale(Astro.url.pathname);
const seo = getSEOData(locale);
const alternates = getAlternateUrls(Astro.url.pathname);
---
<head>
 <meta name="description" content={seo.description} />
 <meta property="og:image" content={seo.ogImage} />
 <link rel="alternate" hreflang="de" href={alternates.de} />
 <link rel="alternate" hreflang="en" href={alternates.en} />
</head>
```

## Hinzufügen / Aktualisieren von SEO‑Daten

1. Fügen Sie ein neues Locale zum `Locale`‑Typ (`../src/lib/i18n.ts`) hinzu, falls nötig.
1. Ergänzen Sie die `seoData`‑Einträge in [`src/lib/seo.ts`](../src/lib/seo.ts).
1. Passen Sie bei Bedarf das Layout (`src/layouts/BaseLayout.astro`) an, insbesondere Canonical/Hreflang‑Regeln.

## Tests

Die SEO‑Meta‑Tags werden in Integrationstests geprüft (z. B. [`tests/integration/routing/seo-hreflang.test.ts`](../tests/integration/routing/seo-hreflang.test.ts)). Starten Sie die Tests mit:

```bash
npm run test:e2e -- --grep "seo"

```text

## Best Practices

- Titel sollten prägnant und lokalisiert sein (50–60 Zeichen empfehlenswert).

- Description: max. ~160 Zeichen für optimale Darstellung in Suchergebnissen.

- Open Graph Bilder sollten die empfohlenen Abmessungen haben (z. B. 1200×630).

- Stellen Sie sicher, dass hreflang‑Links auf allen relevanten Seiten vorhanden sind.

## Pflegehinweise

- Wenn Sie Übersetzungen ergänzen, synchronisieren Sie Länge und Aussage für Title/Description.

- Prüfen Sie die generierten hreflang‑Links in `BaseLayout` bei Änderungen an der Routenstruktur.

## Referenzen

- Implementierung: [`src/lib/seo.ts`](../src/lib/seo.ts)

- Layout‑Integration: [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro)

Ende.

```text
