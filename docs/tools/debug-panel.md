---
description: 'Debug Panel – Filter, Vorschläge, Regex-Mutes und Undo-Funktionen'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'src/components/ui/DebugPanel.tsx, src/pages/api/debug/logs-stream.ts, package.json'
---

<!-- markdownlint-disable MD051 -->

# Debug Panel – Filter, Vorschläge, Regex-Mutes & Undo

Dieses Dokument beschreibt die erweiterten Filter-Funktionen des Debug Panels.

## Features

- **Suggested filters (Vorschläge)**

  - Analysiert die letzten ~300 Logs.

  - Schlägt vor:

    - Häufige Pfade (≥5% Anteil) als Stummschaltungen.

    - Häufige Nachrichtenanfänge (≥3 Vorkommen) als Stummschaltungen.

    - Überrepräsentierte Quellen (≥60%) zu verbergen (NETWORK/CONSOLE/CLIENT/SERVER).

    - `DEBUG` auszublenden, wenn ≥50% der letzten Logs `DEBUG` sind.

  - Chips sind klickbar; „Apply all“ wendet mehrere Vorschläge auf einmal an.

- **Regex mutes (Regex-Modus)**

  - Umschaltbar per Checkbox „Regex mutes“ neben dem Mute-Input.

  - `mutePatterns` werden als kommaseparierte, case-insensitive Regex-Ausdrücke interpretiert.

  - Ungültige Regex werden sicher ignoriert.

- **Undo last apply (Rückgängig)**

  - „Undo“-Button im Vorschlagsbereich.

  - Stellt den letzten Filterzustand wieder her (max. 20 Schritte History).

## Bedienung

- **Mute patterns**: Kommaseparierte Liste von Teilstrings oder (im Regex-Modus) Regex.

- **Quellen umschalten**: SERVER, CLIENT, CONSOLE, NETWORK per Button.

- **Level-Filter**: ERROR/WARN/INFO/DEBUG/LOG gezielt ein-/ausblenden.

- **Grouping**: „Group repeats“ bündelt identische aufeinanderfolgende Logs.

- **Window/Auto-Scroll**: Fenstergröße für angezeigte Logs und automatisches Scrollen steuern.

## Persistenz (LocalStorage)

- `debugPanel.levelFilter` – Array der sichtbaren Levels.

- `debugPanel.sourceFilters` – Sichtbarkeits-Flags je Quelle.

- `debugPanel.mutePatterns` – Kommaseparierte Mutes.

- `debugPanel.muteIsRegex` – Boolean für Regex-Modus.

- `debugPanel.groupRepeats` – Boolean für Gruppierung.

- `debugPanel.logs` – Letzte Logs (bis 500) für lokale Ansicht.

## Best Practices

- **Klein anfangen**: Erst laute Pfade (z. B. 404s) stummschalten, bevor ganze Quellen/Level ausgeblendet werden.

- **Fehler sichtbar halten**: `error`/`warn` zunächst nicht muten; stattdessen Ursachen beheben.

- **Regex mit Vorsicht**: Präzise Muster verwenden, um nicht versehentlich relevante Logs zu verbergen.

- **Undo nutzen**: Bei zu aggressiven Filtern schnell zum letzten guten Zustand zurückkehren.

## Troubleshooting

- Keine Vorschläge sichtbar: Es müssen aktuelle Logs im Panel eintreffen; ggf. Self‑Test‑Button verwenden.

- Zu viele Treffer im Regex-Modus: Muster verfeinern (Anchors, Gruppen, Quantifier), oder Regex-Modus deaktivieren.

## Build‑Modus & ENV (lokale Entwicklung)

- Der Debug‑Stream und die Interceptors sind buildzeitlich über `PUBLIC_ENABLE_DEBUG_PANEL` gated.

- Für lokale Worker‑Entwicklung muss im **Development‑Mode** gebaut werden, damit `.env.development` (mit `PUBLIC_ENABLE_DEBUG_PANEL=true`) greift.

- Verwende die aktualisierten Scripts in `package.json`:

  - `npm run dev:worker` bzw. `dev:worker:dev` bauen jetzt mit `astro build --mode development` über `build:worker:dev` und starten anschließend Wrangler.

  - Produktions‑Builds (CI/Deploy) nutzen weiterhin `build:worker` (ohne `--mode development`) und respektieren `.env.production` (Panel aus).

- Quick‑Check:

  - EventSource auf `GET /api/debug/logs-stream` sollte 200 liefern; bei deaktiviertem Panel kommt 404 gemäß `src/pages/api/debug/logs-stream.ts`.

  - Query‑Param `?debugPanel=1` oder LocalStorage‑Flag `debugPanel.force=1` kann das Overlay zusätzlich erzwingen.

## Staging‑Policy

- In Staging ist das Debug Panel bewusst **aktiv**.

- `.env.staging` enthält `PUBLIC_ENABLE_DEBUG_PANEL=true`.

- Der Staging‑Deploy verwendet `npm run build:worker:staging` (Astro `--mode staging`), siehe `.github/workflows/deploy.yml`.

- Production bleibt unverändert: `build:worker` (ohne `--mode staging`) respektiert `.env.production` → Panel aus.
