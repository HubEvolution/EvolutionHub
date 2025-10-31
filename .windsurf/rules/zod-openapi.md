---
trigger: always_on
---

# Zod ↔ OpenAPI (Hybrid)

## Ziel
- Zentrale, strikte Validierung mit Zod.
- OpenAPI bleibt die veröffentlichte, kuratierte Spezifikation.
- Drift minimieren, kuratierte Doku (Sicherheit/SSRF/Headers) erhalten.

## Was wird auto-überprüft?
- Einfache JSON-Requests (z. B. Newsletter Subscribe/Unsubscribe, Billing Credits/Cancel, Templates, Dashboard).
- Workflow:
  - `npm run openapi:zod:pilot` → generiert Components aus Zod
  - `npm run openapi:zod:diff` → vergleicht mit [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0) (Components), Report in `reports/`
  - CI: non-blocking, Artefakt-Upload

## Was bleibt manuell?
- Komplexe Endpunkte: Multipart/Form-Data (z. B. Voice), SSRF-/Sicherheits-Hinweise (z. B. Webscraper), spezielle Header (CSRF), Provider-spezifische Beschreibungen.
- Begründung: Kuratierte Doku, Beispiele und Sicherheitsvermerke sollen nicht durch Generierung verloren gehen.

## Guardrails
- Kein Auto-Overwrite der [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0).
- Bei strikten Objekten in Zod (`.strict()`): in OpenAPI `additionalProperties: false` setzen.
- Unterschiede im Diff prüfen und [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0) bewusst aktualisieren (nicht blind Zod ändern, wenn sicherheitsrelevante Texte in YAML vorliegen).

## PR-Check (Kurz)
- Zod-Schema vorhanden und verwendet (`safeParse` + `formatZodError`)?
- Handler typisiert (`APIContext`), Middleware korrekt?
- [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0) aktualisiert (components + requestBody)?
- Unit-Tests (valid/invalid) vorhanden?
- `openapi:validate`/`openapi:redoc` ok?
- Optional: Pilot+Diff geprüft, keine unerwarteten Changes?