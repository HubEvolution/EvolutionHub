---
description: Zentrale Launch-Matrix für AI-Tools (Phasen, Cohorts, Flags, Limits)
owner: platform/ops
priority: high
lastSync: 2025-12-03
codeRefs:
  - src/pages/api/**
  - src/lib/services/**
  - src/components/tools/**
testRefs:
  - tests/integration/api/**
  - tests/e2e/specs/**
---

# Tool-Launch-Matrix – AI Tools

Dieses Dokument bündelt die Launch-Phasen für die sechs AI-Tools (Prompt Enhancer, Webscraper, Voice/Transcriptor, Web-Eval, AI Image Enhancer, AI Video Enhancer).

- **Cohorts**
  - **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
  - **C1** – zahlende Pläne (Pro / Premium / Enterprise)
  - **C2** – alle eingeloggten User
  - **C3** – Gäste / nicht eingeloggte Besucher

- **Ziel**
  - Kontrollierter Rollout mit klaren Phasen, harten Kosten-/Missbrauchslimits und schnellem Rollback pro Tool.

## Matrix-Übersicht

| Tool                     | Phase | Cohort            | Status      | Env/Flags (Prod, exemplarisch)                             | Limits / Notizen                                            |
|--------------------------|-------|-------------------|------------:|------------------------------------------------------------|-------------------------------------------------------------|
| Prompt Enhancer          | P1    | C1 + C2 (User)    | ga          | –                                                          | Quoten & Rate-Limit wie spezifiziert; Gäste noch aus        |
| Prompt Enhancer          | P2    | C3 (Guests)       | beta        | –                                                          | Gäste optional; 5/Tag strikt durchsetzen                    |
| Webscraper               | S1    | C1 → C2 (User)    | beta        | –                                                          | Nur eingeloggte User; geringe Limits (z. B. 5/min, Tagescap)|
| Webscraper               | S2    | optional C3       | beta        | –                                                          | Nur wenn Abuse niedrig; sonst dauerhaft account-only        |
| Voice / Transcriptor     | V1    | C1 (Pro/Premium)  | beta        | VOICE_STREAM_SSE=1, VOICE_STREAM_POLL=1, VOICE_R2_ARCHIVE=0| Konservative Tagesquoten, kurze Clips bevorzugt             |
| Voice / Transcriptor     | V2    | C2 (alle User)    | beta        | wie V1                                                     | Quoten nach realer Nutzung nachziehen                       |
| Web-Eval                 | W1    | C1 (Power User)   | incubating  | WEB_EVAL_ENABLE_PROD=1, WEB_EVAL_EXEC_ALLOW_PROD=1        | UI nur für Admin/Power-User; Auto-Assertions ggf. off       |
| Web-Eval                 | W2    | C2 (User)         | incubating  | wie W1, optional WEB_EVAL_AUTO_ASSERTIONS_ENABLE=1        | Mehr Logging; SSRF-/429-Tests im CI                         |
| AI Image Enhancer        | I1    | C1 (Pro/Premium)  | beta        | WORKERS_AI_ENABLED=1                                      | Free & Gäste aus; Pro/Premium mit Quoten + Credits          |
| AI Image Enhancer        | I2    | C2 (alle User)    | ga          | wie I1                                                     | Free mit kleinen Quoten; Gäste optional 1 Enhance/Tag       |
| AI Video Enhancer        | Vd1   | C1 klein (Premium)| incubating  | ggf. ENABLE_VIDEO_ENHANCER=1                              | 1–2 Videos/Tag, 720p; klares Beta-Label                     |
| AI Video Enhancer        | Vd2   | C1 erweitert/C2   | beta        | wie Vd1                                                    | Nur nach Kostenreview; Free und Gäste ausgeschlossen        |

## Verwendung in Runbooks

- Jedes Tool-Runbook (z. B. `runbook-ai-image-enhancer-launch.md`) referenziert diese Matrix als zentrale Quelle.
- Pro Runbook werden nur die jeweils relevanten Zeilen übernommen und mit:
  - konkreter Launch-Prozedur (Staging → Prod),
  - Smoke-Tests,
  - Monitoring- und Rollback-Schritten
  angereichert.

## Pflege & Änderungen

- Änderungen an Phasen, Cohorts, Flags oder Limits werden **zuerst hier** eingetragen.
- Runbooks werden anschließend bei Bedarf synchronisiert (insbesondere Textstellen, die Limits/Phasen wörtlich nennen).
