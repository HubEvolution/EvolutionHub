<!-- markdownlint-disable MD051 -->

# ADR: Deterministischer Dev‑Echo in Nicht‑Production‑Umgebungen (AI Image Enhancer)

Datum: 2025-09-11
Status: Accepted
Owner: Platform/Frontend

## Kontext

Der Image‑Enhancer nutzt externen Provider (Replicate) für die Bildverbesserung. Für lokale Entwicklung, Integrationstests und fokussierte E2E‑Smoketests benötigen wir deterministisches Verhalten ohne externe Abhängigkeiten (Netzwerk, Quoten, Secrets, Modellverfügbarkeit), um:

- Flakes in Tests zu vermeiden (Geschwindigkeit, Stabilität).

- CI‑Läufe ohne Provider‑Secrets zu ermöglichen.

- Entwicklerproduktivität zu erhöhen (schnelle Iteration, reproduzierbare Ergebnisse).

## Entscheidung

In Nicht‑Production‑Umgebungen (ENVIRONMENT ∈ { `development`, `dev`, `testing`, `test`, `local`, `''` }) wird im AI Image Service ein **Dev‑Echo** aktiviert:

- Bei `generate()` wird kein externer Provider‑Call ausgeführt.

- Stattdessen wird `imageUrl = originalUrl` zurückgegeben.

- Die API behält das standardisierte Success‑Envelope bei (`{ success: true, data: { model, originalUrl, imageUrl, usage, limits } }`).

- Die UI kennzeichnet das als Demo‑Modus (leichter CSS‑Filter auf dem Result‑Bild), damit der Compare‑Slider sinnvoll demonstriert werden kann.

Referenz‑Implementierung: `src/lib/services/ai-image-service.ts` (`generate()` – Dev‑Echo Pfad über `isDevelopment()`).

## Konsequenzen

- Tests (Unit/Integration/E2E) sind deterministisch und schnell; keine externen Provider nötig.

- In Staging/Production erfolgt weiterhin der echte Provider‑Call (sofern Token konfiguriert), keine Demo‑Filter in der UI.

- Entwickler erkennen Demo‑Mode visuell (UI‑Filter) und können dennoch Flows (Upload/Quota/Compare/Download) vollständig testen.

## Alternativen (verworfen)

- Bedingtes Mocking auf API‑Ebene nur in Tests: aufwändig, weniger realitätsnah (Header/Cookies/Rate Limits/CSP greifen nicht natürlich).

- Feature Flag per Query‑Param: birgt Risiko, versehentlich in Prod gesetzt zu werden.

## Sicherheit & Compliance

- Keine Secrets in Tests erforderlich; geringeres Risiko bzgl. unbeabsichtigter Provider‑Nutzung.

- CSRF/Origin‑Checks, Rate‑Limits und Allowed‑Origins bleiben aktiv (werden in Tests realistisch validiert).

- Keine sensitiven Daten in Logs; Demo‑Mode ändert keine Persistenzpfade (R2 Keys) außer der ausgelassenen Provider‑Interaktion.

## Testing

- Integrationstests (`tests/integration/ai-image-enhancer.test.ts`): prüfen CSRF, Rate Limits, Magic‑Bytes‑Validierung, R2‑Proxy.

- E2E fokussiert (EN/DE) (`test-suite-v2/src/e2e/imag-enhancer.spec.ts`): Upload → Enhance → Compare → Download, Capabilities, i18n, Keyboard, Artefakte.

- CI‑Job „Enhancer E2E Smoke (EN+DE)“ führt die fokussierten E2E‑Tests mit Artefakten aus.

## Rollout

- Bereits aktiv durch `isDevelopment()`‑Heuristik in `AiImageService`.

- Dokumentation ergänzt (`docs/frontend/imag-enhancer-ui-upgrade.md`), CI‑Dokumentation erweitert (`docs/development/ci-cd.md`).
