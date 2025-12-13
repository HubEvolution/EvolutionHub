---
description: Runbook für AI Image Enhancer Launch (Hybrid-Provider, Quoten, Cohorts)
owner: platform/ops
priority: high
lastSync: '2025-11-29'
codeRefs: 'src/pages/api/ai-image/**, src/lib/services/ai-image-service.ts, src/config/ai-image/**, src/lib/validation/schemas/ai-image.ts, src/lib/rate-limiter.ts'
testRefs: 'tests/integration/api/ai-image-*.test.ts, tests/e2e/specs/imag-enhancer.spec.ts, tests/unit/imag-enhancer/**, tests/unit/hooks/imag-enhancer/**, tests/unit/components/imag-enhancer/**'
---

# Runbook – AI Image Enhancer Launch

## Zweck

Betriebshandbuch für den Launch des AI Image Enhancers (Hybrid: Cloudflare Workers AI + Replicate), inklusive Provider-Gating, Plan-/Credits-Quoten, Cohorts und Rollback.

Ergänzt:

- `.windsurf/rules/image-enhancer.md`
- `docs/ops/runbook-image-enhancer-go-live.md` (bestehende Go-Live-Doku)
- `docs/ops/tool-launch-matrix.md` (globale Phasenmatrix)

## Environments & Provider-Gating

- **Provider / Bindings**
  - Cloudflare Workers AI: `[ai] binding = "AI"` in `wrangler.toml`.
  - Replicate: `REPLICATE_API_TOKEN` (nur in Staging/Production setzen, nicht in Testing/Local).
- **Env-Variablen (pro Env, Auszug)**
  - `ENVIRONMENT ∈ {development, testing, staging, production}`
  - `WORKERS_AI_ENABLED=0|1` – schaltet Workers-AI-Modelle frei.
  - Testing-spezifisch (Beispiel, siehe Config):
    - `TESTING_WORKERS_AI_ALLOW=0|1`
    - `TESTING_ALLOWED_CF_MODELS` (JSON-Liste erlaubter CF-Modelle in Testing/CI).
  - Plan-/Pricing-Umfeld:
    - `PRICING_TABLE`, `PRICING_TABLE_ANNUAL` (Plan → Stripe Price ID)
    - Credits-Konfiguration (z. B. `CREDITS_PRICING_TABLE`), falls Credits als Entitlement verwendet werden.

## Quoten, Limits & Entitlements

- **Rate-Limits**
  - `aiGenerateLimiter` (z. B. 15/min) – pro User/Gast für Generate-Requests.
  - `aiJobsLimiter` (z. B. 10/min) – für jobbasierte Operationen.
- **Quoten & Entitlements** (vereinfacht; Details in Config/Doku)
  - Gäste: Tageslimits über KV/D1 (z. B. wenige Enhances/Tag).
  - User: Plan-basierte Limits (free/pro/premium/enterprise), realisiert über Entitlements-Modul (`src/config/ai-image/entitlements.ts`).
  - Credits: zusätzliche Hart-Limits per Credits-System (UsagePill/Usage-API).

### Cohorts (global)

- **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
- **C1** – zahlende Pläne (Pro / Premium / Enterprise)
- **C2** – alle eingeloggten User (inkl. Free)
- **C3** – Gäste / nicht eingeloggte Besucher

## Phasenmatrix (AI Image Enhancer)

Auszug aus `docs/ops/tool-launch-matrix.md` für AI Image Enhancer:

| Tool              | Phase | Cohort            | Env/Flags (Prod, exemplarisch) | Limits / Notizen                                          |
|-------------------|-------|-------------------|---------------------------------|-----------------------------------------------------------|
| AI Image Enhancer | I1    | C1 (Pro/Premium)  | WORKERS_AI_ENABLED=1           | Free & Gäste aus; Pro/Premium mit Quoten + Credits        |
| AI Image Enhancer | I2    | C2 (alle User)    | wie I1                         | Free mit kleinen Quoten; Gäste optional 1 Enhance/Tag     |

- **I1**: Launch nur für zahlende Pläne (C1), mit Plan-/Credits-Gating; Gäste & Free zunächst ausgeschlossen.
- **I2**: Ausbau auf alle eingeloggten User (C2); Free mit strengeren Limits; Gäste nur optional.

## Launch-Prozedur

### Phase I1 – Launch für Pro/Premium (C1)

**Ziel**: AI Image Enhancer für zahlende Pläne (Pro/Premium/Enterprise) aktivieren, mit klaren Quoten & Credits.

#### Prod-Launch-Checkliste I1 (Kurzfassung)

Diese Checkliste gilt für **Production** und fasst die wichtigsten Schritte für I1 zusammen:

- **1. Technische Preflights**
  - `npm run openapi:validate`
  - `npm run test:integration -- ai-image`
  - `npm run test:e2e -- tests/e2e/specs/imag-enhancer.spec.ts`
  - `npm run test:unit -- imag-enhancer`
- **2. UI/API-Smokes (Prod)**
  - `POST /api/ai-image/generate` mit gültigem Bild + Modell → `200`, `success: true`, gültige Result-URL unter `/r2-ai/...`.
  - `GET /api/ai-image/usage` → sinnvolle Limits/Usage.
  - Im UI: Tool nur für `plan ∈ {pro, premium, enterprise}` sichtbar; Free/Gäste ohne funktionalen Zugriff.
- **3. Nach Deploy beobachten**
  - Fehler-/429-Rate, Credits-/Usage-Verbrauch pro Plan, Provider-Kosten.
- **4. Rollback-Pfad im Kopf behalten**
  - Bei Problemen: Plan-Gates wieder auf C1 verengen, Limits für Free/Gäste stärker drosseln oder auf 0 setzen (siehe Abschnitt „Rollback“).

1. **Preflight-Checks (Testing/Staging)**
   - `npm run openapi:validate` (Image-Enhancer-Endpunkte in OpenAPI konsistent).
   - `npm run test:integration -- ai-image` (bzw. alle `ai-image-*.test.ts`).
   - `npm run test:e2e -- tests/e2e/specs/imag-enhancer.spec.ts` (mind. Chromium-Smoke; ideal EN+DE).
   - `npm run test:unit -- imag-enhancer` (Hooks/Components/Service-Unit-Tests).
   - Sicherstellen, dass in Testing:
     - Replicate-Aufrufe serverseitig geblockt sind (403),
     - Workers-AI-Modelle nur gemäß Testing-Allowlist aktiv sind.

2. **Provider-Gating auf Staging**
   - `WORKERS_AI_ENABLED=1` setzen.
   - `REPLICATE_API_TOKEN` in Staging setzen (falls echtes Upscale/Face-Enhance getestet wird).
   - Testing/CI: keine `REPLICATE_API_TOKEN` setzen, nur Workers AI zulassen.

3. **UI-Exposure (Staging)**
   - Tool: `ImagEnhancerIsland` + Seiten unter `/tools/ai-image-enhancer` (EN/DE).
   - Sicherstellen, dass:
     - Tool nur für eingeloggte User mit `plan ∈ {pro, premium, enterprise}` sichtbar ist.
     - Free/Gäste entweder CTA/Upgrade sehen oder keinen funktionalen Zugriff erhalten.

4. **Prod-Rollout I1**
   - Bedingungen:
     - Alle relevanten Tests (Integration/E2E/Unit) grün.
     - Staging-Provider-Verhalten ok (Workers AI/Replicate gemäß Vorgaben).
   - Schritte:
     - In Prod-Env:
       - `WORKERS_AI_ENABLED=1` setzen.
       - `REPLICATE_API_TOKEN` setzen (falls nicht bereits erfolgt).
     - Deploy auf Production.
   - Direkt nach Deploy (Prod-Smokes, C1-User):
     - 1–2 Enhances mit typischen Bildern durchspielen (Standardmodell, ggf. Upscale/Face-Enhance).
     - Quoten/Credits testen:
       - Mehrere Enhances durchführen, bis Usage-/Plan-Limits sichtbar werden (UsagePill, 429, etc.).

5. **Beobachtung nach I1**
   - Über erste Tage/Wochen:
     - Fehlerquote (4xx/5xx), Provider-Fehler-Mapping (validation/forbidden/server_error).
     - Durchschnittliche Credits-/Plan-Nutzung für Pro/Premium.
     - Kosten (Workers AI + Replicate) vs. Stripe-Einnahmen.

### Phase I2 – Ausbau auf alle eingeloggten User (C2)

**Ziel**: AI Image Enhancer für alle eingeloggten User öffnen, Free mit strengeren Limits.

1. **Bedingungen für Start von I2**
   - Stabiler Betrieb in I1 (keine kritischen Incidents, akzeptable Kosten pro Enhance und pro Plan).
   - Entitlements & Credits-Verbrauch klar verstanden.

2. **UI-Exposure I2**
   - Plan-Gates anpassen:
     - Tool sichtbar für alle eingeloggten User (Free + Pro/Premium/Enterprise).
   - Quoten & Credits:
     - Free-Plan mit niedrigem Tageslimit (z. B. 1–3 Enhances/Tag) und ggf. ohne bestimmte Features (z. B. kein 4x-Upscale).
     - Pro/Premium/Enterprise behalten/erhalten höhere Limits + evtl. Zusatzfeatures.

3. **Gäste (C3) – optional**
   - Nur aktivieren, wenn Kosten & Abuse-Risiko im Rahmen sind.
   - Modell:
     - Gäste dürfen z. B. **max. 1 Enhance/Tag**, Klartext-Hinweis im UI.
     - Serverseitig harter Tages-Cap + Rate-Limit.

4. **Prod-Rollout I2**
   - UI-Änderungen (Plan-Gates) deployen.
   - Kurzfristig enges Monitoring für:
     - Zunahme an Usage/Costs.
     - 429-/Quota-Muster bei Free/Gästen.

## Smoke-Tests & Validierung

### API-Smokes (Prod)

- `POST /api/ai-image/generate`
  - Gültiges Bild (Upload oder R2-Referenz), erlaubtes Modell.
  - Erwartung: `200`, `success: true`, Ergebnis-URL unter `/r2-ai/...` (öffentlich), owner-gated für Results.
- Grenzfälle:
  - Nicht erlaubtes Modell → `validation_error`.
  - Überschreitung von Quoten → `429` + `Retry-After`.
  - Replicate-spezifische Fehler → korrekte Mapping-Typen (`validation_error`, `forbidden`, `server_error`).

### UI-Smokes

- `/tools/ai-image-enhancer` (DE/EN):
  - C1 in I1: Tool sichtbar, vollständige Funktionalität entsprechend Plan.
  - Free/Gäste in I1: kein funktionaler Zugriff (CTA/Upgrade oder Redirect).
  - C2 in I2: Free sieht das Tool mit Limit-Hinweis, Pro/Premium/Enterprise wie in I1.

## Monitoring

- **Metriken**
  - Requests auf AI Image APIs (Generate/Usage/Jobs) pro Tag.
  - Fehlertypen (validation/forbidden/rate_limit/server_error).
  - Nutzung pro Plan & pro Guest vs. User.
- **Limits & Quoten**
  - 429-Rate, besonders für Free/Gäste nach I2.
  - Credits-Verbrauch pro Tag/Monat und Plan.
- **Kosten**
  - Workers AI und Replicate-Kosten pro Monat.
  - Vergleichen mit Stripe-Einnahmen aus Plänen/Credits.

## Rollback

Rollback bringt das System auf I1 (nur C1) oder, falls nötig, in einen streng limitierten Zustand.

1. **UI-Rollback I2 → I1**
   - Plan-Gates wieder auf `plan ∈ {pro, premium, enterprise}` beschränken.
   - Free/Gäste sehen nur CTA/Upgrade oder Landing/Coming-Soon.

2. **API-/Quota-Rollback**
   - Tageslimits für Free/Gäste herunterschrauben oder auf 0 setzen.
   - Optional: bestimmte Modelle/Features (z. B. teure Upscaler) temporär deaktivieren.

3. **Provider-Rollback (nur wenn nötig)**
   - Bei Problemen mit Replicate:
     - Replicate-Modelle temporär deaktivieren (UI + Service-Checks).
     - Nur Workers AI aktiv lassen (`WORKERS_AI_ENABLED=1`, aber Pfad für Replicate geblockt).

4. **Nach Rollback prüfen**
   - Rückgang der Kosten sowie problematischer Fehlermuster.
   - Keine neuen 5xx-Spitzen durch fehlerhafte Gates.
   - UI spiegelt eingeschränkten Zustand korrekt wider.

## Referenzen

- **Regeln & Doku**
  - `.windsurf/rules/image-enhancer.md`
  - `docs/ops/runbook-image-enhancer-go-live.md`
  - `docs/ops/tool-launch-matrix.md`
- **Code**
  - `src/pages/api/ai-image/**`
  - `src/lib/services/ai-image-service.ts`
  - `src/config/ai-image/**`
  - `src/lib/validation/schemas/ai-image.ts`
  - `src/lib/rate-limiter.ts`
- **UI**
  - `src/components/tools/ImagEnhancerIsland.tsx`
  - `src/components/tools/imag-enhancer/**`
  - `src/pages/en/tools/ai-image-enhancer/`
  - `src/pages/de/tools/ai-image-enhancer/`
- **Tests**
  - `tests/integration/api/ai-image-*.test.ts`
  - `tests/e2e/specs/imag-enhancer.spec.ts`
  - `tests/unit/imag-enhancer/**`
  - `tests/unit/hooks/imag-enhancer/**`
  - `tests/unit/components/imag-enhancer/**`
