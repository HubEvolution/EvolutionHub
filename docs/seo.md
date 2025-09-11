# SEO Dokumentation

## Übersicht

Diese Dokumentation beschreibt die Implementierung und Pflege der SEO‑Meta‑Daten in der Evolution Hub‑Anwendung. Die SEO‑Daten sind mehrsprachig und werden dynamisch basierend auf dem aktuellen Locale generiert.

## Hauptimplementierung

Die SEO‑Daten und Hilfsfunktionen befinden sich in [`src/lib/seo.ts:22`]. Dort sind die Funktionen

- `getSEOData(locale)` — liefert Titel, Description und ogImage für ein Locale
- `getAlternateUrls(pathname)` — erzeugt hreflang‑Alternativen für eine gegebene Route

Integriert wird das in Layouts (z. B. [`src/layouts/BaseLayout.astro:44`]), die die Meta‑Tags setzen und die hreflang‑Links erzeugen.

## Datenstruktur

Für jedes Locale werden folgende Felder erwartet (siehe [`src/lib/seo.ts:9`]):

- `title` (string)
- `description` (string)
- `ogImage` (Pfad zum Open‑Graph‑Bild, string)

Beispiel aus `src/lib/seo.ts`:

```ts
const seoData = {
  de: { title: '...', description: '...', ogImage: '/assets/images/og-image-de.png' },
  en: { title: '...', description: '...', ogImage: '/assets/images/og-image-en.png' }
};
```

## Verwendung (Beispiel)

In einem Layout (siehe [`src/layouts/BaseLayout.astro:44`]):

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

1. Fügen Sie ein neues Locale zum `Locale`‑Typ (`src/lib/i18n.ts:12`) hinzu, falls nötig.
2. Ergänzen Sie die `seoData`‑Einträge in [`src/lib/seo.ts:9`].
3. Passen Sie bei Bedarf das Layout (`src/layouts/BaseLayout.astro:44`) an, insbesondere Canonical/Hreflang‑Regeln.

## Tests

Die SEO‑Meta‑Tags werden in E2E‑Tests geprüft (z. B. `tests/e2e/specs/seo.spec.ts`). Starten Sie die Tests mit:

```bash
npm run test:e2e -- --grep "seo"
```

## Best Practices

- Titel sollten prägnant und lokalisiert sein (50–60 Zeichen empfehlenswert).
- Description: max. ~160 Zeichen für optimale Darstellung in Suchergebnissen.
- Open Graph Bilder sollten die empfohlenen Abmessungen haben (z. B. 1200×630).
- Stellen Sie sicher, dass hreflang‑Links auf allen relevanten Seiten vorhanden sind.

## Pflegehinweise

- Wenn Sie Übersetzungen ergänzen, synchronisieren Sie Länge und Aussage für Title/Description.
- Prüfen Sie die generierten hreflang‑Links in `BaseLayout` bei Änderungen an der Routenstruktur.

## Referenzen

- Implementierung: [`src/lib/seo.ts:22`]
- Layout‑Integration: [`src/layouts/BaseLayout.astro:44`]

Ende.
