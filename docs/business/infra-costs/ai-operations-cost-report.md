---
description: "Cost model for AI-powered features (image, video, prompt, voice, webscraper)"
owner: "Operations & Finance"
priority: high
lastSync: "2025-11-10"
codeRefs: "src/config/ai-image.ts, src/config/ai-image/entitlements.ts, src/config/ai-video.ts, src/config/ai-video/entitlements.ts, src/config/prompt-enhancer.ts, src/config/voice/index.ts, src/config/webscraper/entitlements.ts"
testRefs: "N/A"
---

# AI Operations Cost Report / Kostenbericht

## Abschnitt A – Deutsch

### A1. Zielsetzung und Geltungsbereich

Dieser Bericht konsolidiert sämtliche produktiven KI-Funktionen der Plattform, beschreibt deren Provider-Abhängigkeiten und leitet daraus die notwendigen Kostenannahmen ab. Grundlage sind Quellcode-Konfigurationen (Stand 2025-11-10) sowie öffentlich verfügbare Preislisten. Ergänzend werden Datenlücken markiert, die für belastbare Business-Kennzahlen geschlossen werden müssen.

### A2. Funktionsinventar und Technologie-Stacks

| Feature | Technologie-Stack | Code-Referenzen |
| --- | --- | --- |
| AI Image Enhancer | Cloudflare Workers AI, Replicate, R2, KV | @src/config/ai-image.ts#17-105; @src/config/ai-image/entitlements.ts#1-102 |
| AI Video Enhancer | Replicate, R2 | @src/config/ai-video.ts#1-32; @src/config/ai-video/entitlements.ts#1-27 |
| Prompt Enhancer | OpenAI GPT (Standard `gpt-4o-mini`) | @src/config/prompt-enhancer.ts#1-57 |
| Voice Visualizer & Transcriptor | OpenAI Whisper (`whisper-1` via Workers AI), KV | @src/config/voice/index.ts#3-28 |
| Webscraper | Cloudflare Workers (Compute only) | @src/config/webscraper/entitlements.ts#3-26 |
| Gemeinsame Infrastruktur | Cloudflare Workers Standard, R2, KV, Stripe, D1 | Wrangler-Bindings; Architektur-Dokument @docs/architecture/ai-image-enhancer.md#145-175 |

### A3. Preis-Baselines (Stand 10.11.2025, USD)

| Komponente | Listenpreis | Quelle |
| --- | --- | --- |
| Cloudflare Workers Standard | $5/Monat Basis, +$0.30 pro zusätzl. 1 Mio Requests, +$0.02 pro zusätzl. 1 Mio CPU-ms (30 Mio CPU-ms inkl.) | Cloudflare Workers Pricing (2025-09-09) |
| Workers AI Neuronen | 10.000 Neuronen/Tag frei; $0.011 pro 1.000 Neuronen darüber | Cloudflare Workers AI Pricing (2025-10-27) |
| Modell `@cf/runwayml/stable-diffusion-v1-5-img2img` | 4.8 Neuronen pro 512×512 Tile + 9.6 Neuronen pro Schritt | Cloudflare Workers AI Pricing |
| Workers AI Whisper | $0.0005 pro Audiominute (≈46,63 Neuronen/Minute) | Cloudflare Workers AI Pricing |
| OpenAI GPT-4o mini | $0.00015 pro 1k Input-Token, $0.0006 pro 1k Output-Token | OpenAI Pricing Portal (Login erforderlich) |
| Replicate Real-ESRGAN / GFPGAN | GPU-Sekunden-Abrechnung (~$0.002/s auf A40) | Replicate Dashboard (Login erforderlich) |
| Cloudflare R2 Storage | 10 GB frei, danach $0.015/GB-Monat (Speicher) + $0.015/GB (Abruf) | Cloudflare R2 Pricing |

> **Hinweis:** Authentifizierte Exporte (Neuronen-CSV, Replicate Usage, OpenAI Billing) sind einzupflegen, um Platzhalterwerte zu verifizieren.

### A4. Kostenformeln pro Feature

#### A4.1 AI Image Enhancer

- **Workers-AI-Anteil:**
  `cost_job_cf = ((tiles * 4.8) + (steps * 9.6)) / 1000 * 0.011`
  Beispiel: 1024×1024 Bild, 20 Schritte ⇒ `neurons = 4 * 4.8 + 20 * 9.6 = 211.2` → `$0.00232` pro Job.
- **Replicate-Aufschläge:** Basierend auf `computeEnhancerCost` (Grundwert 1.0, +1.0 für 4× Upscale, +0.5 für Face Enhance). Verbrauchte Credits × Verkaufspreis je Credit vergleichen mit GPU-Laufzeitkosten (Sekunden × Tarif).
- **Speicher:** Durchschnittliche Bildgröße × Aufbewahrungsdauer × `$0.015/GB-Monat`, zuzüglich Abrufkosten.

#### A4.2 AI Video Enhancer

- Credits laut `TIER_CREDITS` (5 Credits 720p, 8 Credits 1080p). Laufzeitkosten = Sekunden × Replicate-Tarif (z. B. `$0.012/s`). Ergebnisse verbleiben 14 Tage in R2.

#### A4.3 Prompt Enhancer

- Formel: `cost_job = (input_tokens / 1000 * 0.00015) + (output_tokens / 1000 * 0.0006)`.
- Bei aktivierter PDF-Suche (`PROMPT_PDF_FILE_SEARCH`) zusätzlich `$0.10` pro Datei und 24 h (OpenAI File Search).

#### A4.4 Voice Visualizer & Transcriptor

- Audiominuten × `$0.0005` (Workers AI Whisper). Vergleich mit direktem OpenAI-Preis (`$0.006/min`), falls Umgebung Workers AI umgeht.
- Tageslimits: Gäste 60 Chunks, Nutzer 300 Chunks.

#### A4.5 Webscraper

- Reine Workers-CPU: `(total_cpu_ms - 30_000_000) / 1_000_000 * 0.02` für Verbrauch außerhalb des inkludierten Kontingents.

### A5. Beispielhafte Monatsrechnung (Austausch durch Realwerte empfohlen)

| Komponente | Annahme | Kosten |
| --- | --- | --- |
| Workers Grundgebühr | Standard-Plan | $5.00 |
| Workers Requests + CPU | 30 Mio dynamische Aufrufe/Monat @ 10 ms | ~$18 (Requests) + ~$5.40 (CPU) |
| Workers AI (img2img) | 3.000 Jobs/Tag, 20 Schritte, 1 Tile | ~$210 |
| Replicate Add-ons | 1.800 Jobs/Tag mit Upscale + Face, 8 s | ~$29 |
| Video (Topaz) | 150 Jobs/Monat, Ø45 s | ~$81 |
| Prompt Enhancer | 1.500 Requests/Tag, 1k Input + 350 Output Tokens | ~$32 |
| Whisper | 200 Minuten/Tag | ~$3 |
| R2 Storage | 135 GB Durchschnitt (Bilder) | ~$3 |
| Stripe Gebühren | Umsatzabhängig | TBD |

*Ergebnis: ca. **$386/Monat** Infrastrukturkosten (ohne Personal & Support).*

### A6. Benötigte Telemetrie und Exporte

1. Workers-AI-Dashboard: Neuronen, CPU-ms, Request-Zahlen (CSV).
2. Replicate Billing API: GPU-Sekunden je Modell (authentifizierter Token nötig).
3. OpenAI Billing Export: Token-Verbrauch für GPT-4o mini & Whisper.
4. R2 Analytics: Speicher-Durchschnitt und Egress.
5. Stripe: Plan-Umsätze, Transaktionsgebühren.
6. Applikationslogs: Strukturierte Events (`generate_start`, `generate_success` …) zur Plausibilisierung.

### A7. Maßnahmenplan

- Tägliche Provider-Exporte automatisieren und in D1/Analytics-Store persistieren.
- Gemeinsames Kosten-Workbook mit obigen Formeln pflegen.
- Alerting auf Neuronen- oder GPU-Spikes gegenüber Forecast etablieren.
- Plan-Grenzen und Preismodelle nach Kostenvalidierung prüfen.

### A8. Nächste Schritte

1. Letzte 30 Tage Workers-AI- und Replicate-Nutzung exportieren.
2. OpenAI-Tokens für GPT-4o mini & Whisper herunterladen.
3. Werte in Spreadsheet einpflegen und mit Formeln aus Abschnitt A4 evaluieren.
4. Kosten je Feature den Umsätzen gegenüberstellen und ggf. Entitlements anpassen.

## Section B – English

### B1. Purpose and Scope

This section mirrors the German narrative and delivers a complete English briefing for stakeholders. It consolidates all production AI features, their providers, and the assumptions required to model operating expenditure. References are aligned with the codebase as of 2025-11-10.

### B2. Feature Inventory and Provider Stack

| Feature | Technology stack | Key references |
| --- | --- | --- |
| AI Image Enhancer | Cloudflare Workers AI, Replicate, R2, KV | @src/config/ai-image.ts#17-105; @src/config/ai-image/entitlements.ts#1-102 |
| AI Video Enhancer | Replicate, R2 | @src/config/ai-video.ts#1-32; @src/config/ai-video/entitlements.ts#1-27 |
| Prompt Enhancer | OpenAI GPT (default `gpt-4o-mini`) | @src/config/prompt-enhancer.ts#1-57 |
| Voice Visualizer & Transcriptor | OpenAI Whisper (`whisper-1` via Workers AI), KV | @src/config/voice/index.ts#3-28 |
| Webscraper | Cloudflare Workers compute only | @src/config/webscraper/entitlements.ts#3-26 |
| Shared infrastructure | Cloudflare Workers Standard, R2, KV, Stripe, D1 | Wrangler bindings; architecture doc @docs/architecture/ai-image-enhancer.md#145-175 |

### B3. Pricing Baselines (as of 2025-11-10, USD)

| Component | List price | Source |
| --- | --- | --- |
| Cloudflare Workers Standard | $5/month base, +$0.30 per extra 1M requests, +$0.02 per extra 1M CPU ms (30M CPU ms included) | Cloudflare Workers pricing (2025-09-09) |
| Workers AI neurons | 10k neurons/day free; $0.011 per 1k neurons beyond that | Cloudflare Workers AI pricing (2025-10-27) |
| Model `@cf/runwayml/stable-diffusion-v1-5-img2img` | 4.8 neurons per 512×512 tile + 9.6 neurons per diffusion step | Cloudflare Workers AI pricing |
| Workers AI Whisper | $0.0005 per audio minute (≈46.63 neurons/minute) | Cloudflare Workers AI pricing |
| OpenAI GPT-4o mini | $0.00015 per 1k input tokens; $0.0006 per 1k output tokens | OpenAI pricing portal (authentication required) |
| Replicate Real-ESRGAN / GFPGAN | GPU-second billing (~$0.002/s on A40) | Replicate dashboard (authentication required) |
| Cloudflare R2 storage | 10 GB free, then $0.015/GB-month storage + $0.015/GB retrieval | Cloudflare R2 pricing |

> **Action:** Pull authenticated exports (Workers AI neuron CSV, Replicate usage, OpenAI billing) to validate and refine these baseline inputs.

### B4. Unit Cost Formulas by Feature

#### B4.1 AI Image Enhancer

- **Workers AI share:**
  `cost_job_cf = ((tiles * 4.8) + (steps * 9.6)) / 1000 * 0.011`
  Example: 1024×1024 asset, 20 steps ⇒ `neurons = 211.2` → `$0.00232` per job.
- **Replicate add-ons:** Leverage `computeEnhancerCost` (base 1.0, +1.0 for 4× upscale, +0.5 for face enhance). Multiply consumed credits by the commercial credit price and contrast with GPU runtime (seconds × provider tariff).
- **Storage:** Average file size × retention × `$0.015/GB-month`, plus retrieval fees.

#### B4.2 AI Video Enhancer

- Credits via `TIER_CREDITS` (5 for 720p, 8 for 1080p). Runtime expense = seconds × Replicate rate (e.g. `$0.012/s`). Outputs persist in R2 for 14 days.

#### B4.3 Prompt Enhancer

- Formula: `cost_job = (input_tokens / 1000 * 0.00015) + (output_tokens / 1000 * 0.0006)`.
- If PDF file search is enabled (`PROMPT_PDF_FILE_SEARCH`), add `$0.10` per file per 24 hours (OpenAI File Search pricing).

#### B4.4 Voice Visualizer & Transcriptor

- Audio minutes × `$0.0005` (Workers AI Whisper). Benchmark against OpenAI direct price (`$0.006/min`) if Workers AI is bypassed.
- Daily caps: 60 chunks for guests, 300 chunks for authenticated users.

#### B4.5 Webscraper

- Workers compute only: `(total_cpu_ms - 30_000_000) / 1_000_000 * 0.02` for usage exceeding the inclusive allotment.

### B5. Illustrative Monthly Scenario (replace with telemetry as it becomes available)

| Component | Assumption | Cost |
| --- | --- | --- |
| Workers base fee | Standard plan | $5.00 |
| Workers requests & CPU | 30M dynamic hits/month @ 10 ms | ~$18 (requests) + ~$5.40 (CPU) |
| Workers AI (img2img) | 3k jobs/day, 20 steps, single tile | ~$210 |
| Replicate add-ons | 1.8k jobs/day with upscale + face, 8 s average | ~$29 |
| Video (Topaz) | 150 jobs/month, 45 s average runtime | ~$81 |
| Prompt Enhancer | 1.5k requests/day, 1k input + 350 output tokens | ~$32 |
| Whisper | 200 minutes/day | ~$3 |
| R2 storage | 135 GB average footprint (images) | ~$3 |
| Stripe fees | Dependent on revenue volume | TBD |

*Indicative infrastructure OPEX ≈ **$386/month** (excluding staffing and support overhead).*

### B6. Required Telemetry and Exports

1. Workers AI dashboard exports: neurons, CPU milliseconds, request counts.
2. Replicate billing API: GPU seconds per model (requires authenticated token).
3. OpenAI billing export: token consumption for GPT-4o mini and Whisper.
4. R2 analytics: average storage footprint and egress volumes.
5. Stripe reporting: plan revenue and transaction fees.
6. Application logs: use structured events (`generate_start`, `generate_success`, etc.) to reconcile counts.

### B7. Implementation Plan

- Automate daily provider exports and persist them in D1 or the analytics warehouse.
- Maintain a shared cost workbook populated with the formulas above.
- Establish alerting when neurons or GPU seconds exceed forecast.
- Revisit plan entitlements and pricing after validating gross margin per feature.

### B8. Immediate Next Actions

1. Retrieve the last 30 days of Workers AI and Replicate usage data.
2. Download GPT-4o mini and Whisper token usage from the OpenAI billing portal.
3. Populate the spreadsheet with the collected figures, applying Section B4 formulas.
4. Compare feature-level operating cost against revenue to steer pricing or entitlement adjustments.
