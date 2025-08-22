# AOS-Animationen (AOSCoordinator)

Diese Dokumentation beschreibt die AOS-Integration über den `AOSCoordinator` und die bedingte Einbindung der AOS-Assets.

## Überblick
- AOS wird über CDN eingebunden, initialisiert und bei Navigationswechseln aktualisiert – umgesetzt in `src/components/scripts/AOSCoordinator.astro`.
- AOS-CSS wird nur geladen, wenn `enableAOS` auf `true` steht (siehe `src/layouts/BaseLayout.astro`).
- Auth-Seiten deaktivieren AOS bewusst: `src/layouts/AuthLayout.astro` übergibt `enableAOS={false}`.
- Nutzer mit `prefers-reduced-motion` erhalten automatisch keine Animationen.

## Relevante Dateien
- `src/components/scripts/AOSCoordinator.astro` – Initialisierung, Refresh auf Page-Transitions, Cleanup.
- `src/layouts/BaseLayout.astro` – Bedingte Einbindung von AOS-CSS und Mount des Coordinators.
- `src/layouts/AuthLayout.astro` – Deaktiviert AOS für Auth-Seiten.

## Funktionsweise
- AOS-CSS wird im `<head>` nur gesetzt, wenn `enableAOS === true`.
- Der Coordinator lädt das AOS-Script via CDN, initialisiert AOS nach `DOMContentLoaded` und ruft bei Astro View Transitions einen `refreshHard()` auf, um neue DOM-Knoten zu animieren.
- Sicherheits-Pass: Sichtbare Elemente bekommen initial keine „Pop-in“-Animation.
- Cleanup entfernt Event-Listener bei Unmount.

## Verwendung
- Standard: In allen Seiten, die `BaseLayout` nutzen, ist AOS aktiv – außer, eine Seite/Layout setzt `enableAOS={false}`.
- Daten-Attribute am Element setzen:

```html
<section data-aos="fade-up" data-aos-delay="100" data-aos-duration="600">
  <!-- Inhalt -->
</section>
```

- Reduzierte Bewegung respektieren: Es ist keine zusätzliche Arbeit nötig – Nutzerpräferenz wird automatisch erkannt.

## Deaktivieren auf Seitenebene
- Für Seiten, die keine Animationen benötigen (z. B. Auth), über `AuthLayout` oder in eigenem Layout `enableAOS={false}` setzen:

```astro
<BaseLayout title="…" enableAOS={false}>
  <slot />
</BaseLayout>
```

## View Transitions
- In `BaseLayout.astro` sind Astro View Transitions (`<ViewTransitions />`) aktiv. Der `AOSCoordinator` hört auf Transition-Events und führt `AOS.refreshHard()` aus, sodass neue Inhalte korrekt animiert werden.

## Troubleshooting
- Keine Animationen sichtbar: Prüfe `enableAOS`-Prop im verwendeten Layout.
- Flackern beim Ersteindruck: Stelle sicher, dass der Coordinator erst nach `DOMContentLoaded` initialisiert und dass der Sicherheits-Pass aktiv ist.
- Build-Fehler mit ESM-Imports: Die Integration nutzt CDN-Skripte, keine ESM-Imports – kompatibel mit SSR und Worker-Build.
