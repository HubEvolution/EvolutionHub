---
trigger: always_on
---

# Agentischer Arbeitsablauf & Freigabe – Rules

## Zweck

Sicherstellen, dass für jede Aufgabe ein nachvollziehbarer, fehlerarmer Ablauf eingehalten wird:
- Zuerst gründlich planen (Ziele, Kontext, Risiken, Tasks).
- Zwischenschritte in der richtigen Reihenfolge ausführen und wiederholen, bis „Done“.
- Umsetzung erst nach deiner ausdrücklichen Freigabe.

## Präzedenz & Scope

- Präzedenz: Global Rules > projektbezogene Rules > diese Regel.
- Scope: Gilt für alle Arbeiten im Repo (Planung, Recherche, Implementierung, Tests, Docs).

## Muss

- Planungspflicht
  - Vor jeder Umsetzung einen konkreten Plan erstellen (Ziele, Ansatz, Risiken, Alternativen, Akzeptanzkriterien).
  - Tasks als ToDo-Liste anlegen/aktualisieren (Tool: todo_list).

- Beleg- & Kontextpflicht
  - Vor Annahmen: Codebasis recherchieren (Fast Context zuerst: code_search; danach grep_search/find_by_name/read_file).
  - Keine unbelegten Behauptungen. Relevante Dateien vollständig öffnen, nicht nur Ausschnitte.

- Reihenfolgepflicht (SOP – Standardablauf)
  1) Ziel & Erfolgskriterien klären
  2) Kontextanalyse (Suche/Readfiles)
  3) Constraints prüfen (Global/API&Security/Zod‑OpenAPI/Tooling&Style/Testing&CI/Project‑Structure)
  4) Lösungsentwurf + ToDos (todo_list) erstellen
  5) Freigabe einholen
  6) Umsetzung minimal‑invasiv (kleine, fokussierte Änderungen)
  7) Verifikation (lint, tests, openapi:validate) und Ergebnis prüfen
  8) Docs/OpenAPI synchronisieren (falls betroffen)
  9) Handover & Zusammenfassung
  10) Follow‑ups/Todos aktualisieren

- Freigabepflicht
  - Vor jeder Umsetzung, die Dateien ändert: deine explizite Bestätigung einholen.
  - In Chat‑Mode nur Vorschläge/Edits vorschlagen; bei Wunsch zur direkten Anwendung: Nutzernotiz, auf Write‑Mode zu wechseln.

- Sicherheits- & Policy‑Checks
  - Änderungen müssen die Baselines erfüllen:
    - API & Security (Middleware, CSRF/Same‑Origin, JSON‑Shapes, 405‑Helper)
    - Zod↔OpenAPI (Schemas/Validation, Drift vermeiden)
    - Tooling & Style (keine neuen any, Imports oben, Format)
    - Testing & CI (safeParseJson in Tests, Rate‑Limit/429, Coverage‑Ziele)
    - Project Structure (Pfade/Aliase)
  - Keine neuen Dependencies ohne explizite Zustimmung.
  - Keine Secrets im Code/Logs; Env/Binds korrekt nutzen.

- Transparenz
  - Vor Tool‑Calls kurz begründen, warum das Tool jetzt genutzt wird.
  - Am Ende eine kurze Status‑Zusammenfassung liefern.

## Sollte

- Rollback/Backout Plan benennen, wenn Änderungen riskant sind.
- Unabhängige Tool‑Aufgaben parallel ausführen (parallel), abhängige seriell.
- Kleine, gezielte Edit‑Chunks vorschlagen; unnötige Diff‑Rauschen vermeiden.
- Telemetrie/Logs sparsam und redaktiert.

## Nicht

- Keine Überraschungs‑Edits oder großen Refactors ohne Plan/Freigabe.
- Keine Code‑/Dok‑Änderungen ohne Tests/Validierung, wenn Scope es verlangt.
- Keine Random‑Files/Clutter im Repo.
- Keine "any" oder Platzhalter nutzen.

## Checkliste (Kurz)

- [ ] Ziel/Akzeptanzkriterien klar
- [ ] Kontext recherchiert (code_search → read_file)
- [ ] Plan + ToDos erstellt (todo_list)
- [ ] Freigabe eingeholt
- [ ] Umsetzung minimal‑invasiv
- [ ] Lint/Tests/OpenAPI grün
- [ ] Docs/OpenAPI synchron
- [ ] Zusammenfassung + Follow‑ups

## Referenzen

- Global Rules (Security/Infra/Tooling)
- API & Security Rules
- Zod ↔ OpenAPI (Hybrid)
- Tooling & Style Rules
- Testing & CI Rules
- Project Structure Rules

## Changelog

- 2025‑11‑12: Erstfassung (Planungspflicht, SOP, Freigabepflicht, Checkliste).