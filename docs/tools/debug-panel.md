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
