---
trigger: always_on
---

# AI Image Enhancer Rules

## Zweck

Klarer Rahmen für Hybrid‑Provider (Workers AI + Replicate), Env‑Gating, Quoten/Entitlements, public R2 und Fehler‑Mapping.

## Muss

- Provider/Env‑Gating
  - Testing/Local: Replicate serverseitig verboten (403); UI blendet Replicate aus.
  - Staging/Prod: Beide Provider erlaubt; Workers AI via `[ai] binding = "AI"`.
- R2‑Ablage
  - Uploads unter `.../uploads/*` sind öffentlich (Provider‑Fetch).
  - Ergebnisse unter `.../results/<ownerType>/<ownerId>/*` sind owner‑gegated und werden über `/r2-ai/**` ausgeliefert.
- Quoten/Entitlements: Server erzwingt Limits (Plan/Gast); UI zeigt nur an (kein Enforce in UI).
- Rate‑Limits: `aiGenerateLimiter` (15/min) und `aiJobsLimiter` (10/min) nutzen.
- Validierung: Eingaben strikt über Zod; in Testing Parameterkappen (z. B. strength/guidance/steps) geltend machen.
- Fehlerschapes: Provider‑Fehler auf `validation_error | forbidden | server_error` mappen.

## Sollte

- UI‑Gating: Controls abhängig von Modell‑Flags (`supportsScale`, `supportsFaceEnhance`) ein/ausblenden.
- Telemetrie/Observability: Client Events sparsam, serverseitige Logs mit Redaction.

## Nicht

- Keine Provider‑Secrets im Client.
- Keine Serverkosten in Testing/Local (Replicate hart geblockt).

## Checkliste

- [ ] Testing: Replicate 403 serverseitig; UI zeigt nur Workers AI Modelle.
- [ ] R2‑Schreiben ok; `/r2-ai/**` erreichbar; `uploads/*` öffentlich, `results/*` owner‑gegated.
- [ ] Rate‑Limits aktiv; 429 enthält `Retry-After`.
- [ ] Zod‑Validierung aktiv; Param‑Caps in Testing greifen.
- [ ] Fehler‑Mapping korrekt (4xx→validation/forbidden, 5xx→server_error).

## Code‑Anker

- `src/lib/services/ai-image-service.ts`
- `src/config/ai-image.ts`, `src/config/ai-image/entitlements.ts`
- `src/pages/api/ai-image/**`
- `src/pages/r2-ai/**`

## CI/Gates

- `npm run test:integration` (Enhancer APIs)
- `npm run test:e2e` (Gating/Flows; ggf. `--workers=1`)
- `npm run openapi:validate`

## Referenzen

- Global Rules, API & Security Rules
- `.windsurf/rules/enhancer.md`

## Changelog

- 2025‑11‑13: R2‑Ablage präzisiert: `uploads/*` öffentlich; `results/<ownerType>/<ownerId>/*` owner‑gegated; Checkliste angepasst.
- 2025‑10‑31: Hybrid‑Gating/Quoten/R2/Rate‑Limits/Fehler‑Mapping festgelegt.
