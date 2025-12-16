---
scope: infra
extends:
  - infra.md
  - api-and-security.md
priority: high
---

# Caching & KV Rules

## Zweck

Klar definierte Nutzung von Cloudflare KV und R2 für Caching, Quoten, Usage‑Tracking und Credits – mit konsistenten TTL‑Strategien, Key‑Schemas und ohne PII‑Leakage.

## Muss

- Namensräume & Verantwortung
  - Alle produktiv verwendeten KV‑Namespaces müssen in [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) und hier dokumentiert sein. Dazu gehören insbesondere:
    - `SESSION` (Sessions, ggf. Feature‑Flags)
    - `KV_AI_ENHANCER` (AI Image Enhancer Usage/Quoten)
    - `KV_PROMPT_ENHANCER` (Prompt Enhancer Usage/Quoten)
    - `KV_WEBSCRAPER` (Webscraper Usage/Quoten)
    - `KV_WEB_EVAL` (Web‑Eval Usage/Quoten)
    - `KV_COMMENTS` (Kommentare/Moderation, falls aktiviert)
  - Neue Namespaces oder Feature‑Caches dürfen erst nach Ergänzung in dieser Rule + [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) eingeführt werden.

- Key‑Schemas für Usage & Quoten
  - **Usage‑Counter** (Rate‑Limits/Quoten) folgen den zentralen Helpers in [src/lib/kv/usage.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:0:0-0:0):
    - Daily Keys: `prefix:daily:YYYY-MM-DD:<ownerType>:<ownerId>`
    - Monthly Keys: `prefix:monthly:YYYY-MM:<ownerType>:<ownerId>`
    - Rolling‑Window Keys: `prefix:usage:<ownerType>:<ownerId>`
  - **Credit Packs** (Tenths‑basiert):
    - Packs‑Key: `ai:credits:user:<userId>:packs`
    - Consumption‑Record‑Key: `ai:credits:consume:<userId>:<jobId>`
  - **Video‑Monatsquote**:
    - Quota‑Key: `ai:quota:video:tenths:<userId>:<YYYYMM>`
    - Tx‑Key: `ai:quota:video:tx:<userId>:<YYYYMM>:<txKey>`
  - Diese Schemas sind verbindlich; neue Feature‑Quoten sollen diese Patterns wiederverwenden (Präfixe/Owner‑Semantik anpassen, nicht ad‑hoc).

- TTL‑Strategien (KV)
  - Usage‑Counter:
    - Täglich begrenzte Limits nutzen TTL bis zum Ende des UTC‑Tages ([endOfDayTtlSeconds()](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:42:0-47:1)).
    - Monatliche Limits nutzen TTL bis zum Ende des Monats ([endOfMonthTtlSeconds()](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:49:0-56:1)).
    - Mindestens `MIN_KV_TTL_SECONDS` (aktuell 60s) einhalten.
  - Rolling‑Window‑Limits:
    - Verwenden [incrementRollingWindow](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:130:0-157:1) mit einem klar definierten Fenster (`windowSeconds`, z. B. 24h).
  - Credit Packs:
    - Ablauffrist wird über [addMonthsWithGrace()](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:236:0-252:1) berechnet (z. B. 6 Monate + 14 Tage Grace).
    - TTLs für Consumption‑Records (Idempotenz) sind so zu setzen, dass Replays für den Zeitraum der Gültigkeit verhindert werden (aktuell 180 Tage).

- R2‑Buckets & Caching

  - **AI Image/Video/Voice**:
    - Upload‑Pfad und Result‑Pfad folgen dem in den Feature‑Rules definierten Layout:
      - Image: `.../uploads/*` (öffentlich), `.../results/<ownerType>/<ownerId>/*` (owner‑gegated über `/r2-ai/**`).
      - Video: `ai-video/uploads/...` (öffentlich), `ai-video/results/...` (owner‑gegated über `/r2-ai/**`).
      - Voice: `R2_VOICE` für Transkriptions‑Uploads; Retention gemäß Transcriptor‑Rules.
    - Retention/TTL muss pro Bucket klar definiert sein (z. B. 14 Tage für AI‑Video‑Ergebnisse).
  - Keine dauerhafte Speicherung sensibler Rohdaten ohne explizite Entscheidung (siehe Observability/Privacy).

- PII & Security

  - In KV und R2 werden **keine unnötigen PII‑Daten** gespeichert:
    - Benutzer werden, wo möglich, über IDs/Hashes referenziert (z. B. `userId`, `guestId`), nicht über E‑Mail im Klartext.
  - Keys und Values dürfen keine Secrets (Tokens, API‑Keys, Passwörter) enthalten.
  - Zugriffe auf KV/R2 für sicherheitskritische Features (Auth, Billing) unterliegen den API‑Security‑Rules (keine Umgehung von Rate‑Limits/CSRF/Same‑Origin).

## Sollte

- Konsistente Helper‑Nutzung

  - Neue Features mit Usage/Quoten sollen die bestehenden Helpers aus [src/lib/kv/usage.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:0:0-0:0) verwenden, statt eigene, leicht abweichende Varianten zu implementieren.
  - Für neue Features ist ein klarer **Prefix** zu definieren (z. B. `webscraper`, `voice`, `web-eval`) und in dieser Rule zu dokumentieren.

- TTL bewusst wählen

  - TTLs sollen die **fachliche Semantik** widerspiegeln:
    - Usage‑Limits: Ausrichtung an Tages/Monats‑Rhythmus des Features.
    - Credit Packs: hinreichend langer Nutzungszeitraum, aber mit klarer Obergrenze.
    - Caches: TTL abgestimmt auf Aktualisierungshäufigkeit (z. B. Pricing, Tools‑Konfiguration).

- Monitoring & Debug

  - Für kritische Namespaces sollten einfache **Debug‑/Admin‑Tools** existieren (z. B. Admin‑Endpoints oder Skripte), um:
    - Usage/Quota‑Stände zu inspizieren.
    - Offensichtliche Inkonsistenzen zu erkennen (z. B. negative Werte, defekte JSONs).

## Nicht

- Keine „freien“ JSON‑Blobs mit inkonsistenter Struktur in denselben Keys speichern.
- Keine unbounded TTLs für Nutzer‑ oder Feature‑spezifische Limits (Verwaisungsrisiko/Kosten).
- Keine Speicherung von kompletten Request‑Bodies oder Audiodaten in KV (für binäre/mediale Daten ist R2 zuständig).

## Checkliste

- [ ] Genutzter KV‑Namespace ist in [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) und dieser Rule dokumentiert.
- [ ] Key‑Schema folgt einem bestehenden Prefix‑/Owner‑Pattern (daily/monthly/rolling/credits/quotas).
- [ ] TTL entspricht der fachlichen Semantik (Tag/Monat/Pack‑Laufzeit).
- [ ] Keine PII/Secrets im Value.
- [ ] Für neue Feature‑Quoten: Usage‑Helper ([incrementDaily](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:97:0-105:1), [incrementMonthly](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:107:0-120:1), [incrementRollingWindow](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:130:0-157:1)) oder analoge Funktionen wiederverwendet.
- [ ] R2‑Pfadstruktur und Retention sind in der jeweiligen Feature‑Rule (Image/Video/Voice) dokumentiert und hier referenziert.

## Code‑Anker

- [src/lib/kv/usage.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:0:0-0:0)
- AI‑Features:
  - `src/lib/services/ai-image-service.ts`
  - `src/lib/services/ai-video-service.ts` (falls vorhanden)
  - `src/lib/services/voice-transcribe-service.ts`
- Feature‑Configs:
  - `src/config/ai-image.ts`, `src/config/ai-image/entitlements.ts`
  - `src/config/ai-video.ts`, `src/config/ai-video/entitlements.ts`
  - `src/config/voice/index.ts`
- Infra:
  - [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) (KV/R2/AI Bindings)
  - [.windsurf/rules/image-enhancer.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/image-enhancer.md:0:0-0:0)
  - [.windsurf/rules/video-enhancer.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/video-enhancer.md:0:0-0:0)
  - [.windsurf/rules/transcriptor.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/transcriptor.md:0:0-0:0)

## CI/Gates

- Indirekt über bestehende Tests:
  - `npm run test:integration` (Usage/Quota‑APIs, AI‑Features, Billing/Credits)
  - `npm run openapi:validate` (Dokumentation der Header/Usage‑Antworten)
  - `npm run lint` (keine ad‑hoc KV‑Zugriffe mit hartcodierten Keys ohne Helper)

## Referenzen

- [.windsurf/rules/infra.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/infra.md:0:0-0:0)
- [.windsurf/rules/api-and-security.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/api-and-security.md:0:0-0:0)
- [.windsurf/rules/image-enhancer.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/image-enhancer.md:0:0-0:0)
- [.windsurf/rules/video-enhancer.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/video-enhancer.md:0:0-0:0)
- [.windsurf/rules/transcriptor.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/transcriptor.md:0:0-0:0)
- [.windsurf/rules/pricing.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/pricing.md:0:0-0:0) (Credits/Entitlements)

## Changelog

- 2025-12-09: Erstfassung für KV/R2‑Nutzung (Namespaces, Key‑Schemas, TTL‑Strategien, Credit Packs, Video‑Quoten).
