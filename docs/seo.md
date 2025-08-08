# SEO Dokumentation

## Übersicht

Diese Dokumentation beschreibt die Implementierung und Pflege der SEO-Meta-Daten in der Evolution Hub-Anwendung. Die SEO-Daten sind mehrsprachig und werden dynamisch basierend auf dem aktuellen Locale generiert.

## Struktur

Die SEO-Daten werden in der Datei `src/lib/seo.ts` verwaltet. Diese Datei exportiert Funktionen zum Abrufen von SEO-Daten für jedes Locale sowie zum Generieren von alternativen URLs für hreflang-Links.

## Pflege der Locale-spezifischen Meta-Daten

### SEO-Daten

Die SEO-Daten für jedes Locale sind in der `seoData`-Variable in `src/lib/seo.ts` definiert. Für jedes Locale (de, en) werden folgende Daten benötigt:

- `title`: Der Titel der Seite
- `description`: Die Beschreibung der Seite
- `ogImage`: Der Pfad zum Open Graph-Bild

### Hinzufügen neuer Locales

Um ein neues Locale hinzuzufügen, müssen folgende Schritte ausgeführt werden:

1. Fügen Sie das neue Locale zum `Locale`-Typ in `src/lib/i18n.ts` hinzu
2. Fügen Sie die SEO-Daten für das neue Locale in `src/lib/seo.ts` hinzu
3. Aktualisieren Sie die hreflang-Links in `src/layouts/BaseLayout.astro`, falls erforderlich

### Aktualisieren bestehender SEO-Daten

Um die SEO-Daten für ein bestehendes Locale zu aktualisieren, passen Sie einfach die entsprechenden Werte in der `seoData`-Variable in `src/lib/seo.ts` an.

## Testen

Die SEO-Implementierung wird durch Playwright-Tests in `tests/e2e/specs/seo.spec.ts` überprüft. Diese Tests prüfen, ob die Meta-Tags für jedes Locale korrekt gerendert werden.

Um die Tests auszuführen, verwenden Sie den folgenden Befehl:

```bash
npm run test:e2e seo