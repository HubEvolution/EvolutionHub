# AI-Orchestrator: Antworten, Risiken und Qualitätsleitplanken

## Beantwortete Architekturfragen

### 1. Integration in den bestehenden Service-Layer

- **Frage:** Wie wird der Orchestrator eingebunden, ohne bestehende API-Verträge zu brechen?
- **Empfohlene Lösung:** Wir führen einen `AiOrchestratorService` unter `src/lib/services/ai-orchestrator-service.ts` ein, der von `AbstractBaseService` erbt. Damit übernimmt er das vorhandene Transaktions- und Fehlerhandling, wie es in `src/lib/services/base-service.ts` etabliert ist. API-Routen konsumieren den Service analog zu `src/pages/api/prompt-enhance.ts`: Die Route bleibt stabil, nutzt weiterhin `withApiMiddleware`, Rate-Limiter und das bestehende Response-Envelope (`createApiSuccess`/`createApiError`). Lediglich der interne Service-Aufruf wechselt auf den Orchestrator.
- **Begründung:** Dieses Muster entspricht der dokumentierten Schichtenarchitektur (`Service Layer` vermittelt zwischen API und D1`, siehe `docs/architecture/system-overview.md`) und vermeidet Breaking Changes, weil API-Signaturen und Middleware-Stapel unverändert bleiben. Der Ansatz lässt sich in bestehenden Tests wie `tests/integration/...` wiederverwenden, da die HTTP-Verträge identisch bleiben.

### 2. Datenmodell für Sessions, Tasks und Kontext in D1

- **Frage:** Welche Tabellen sind notwendig und wie gestalten wir Migrationen?
- **Empfohlene Lösung:**
  - `agent_sessions` (id, user_id/guest_id, persona, state_json, created_at, updated_at, expires_at)
  - `agent_tasks` (id, session_id, type, status, priority, payload_json, result_json, cost_cents, created_at, updated_at, completed_at)
  - `agent_context_chunks` (id, session_id, task_id, chunk_type, embedding_vector BLOB/null, content_text, metadata_json, created_at)
  - `agent_audit_log` (id, session_id, task_id, action, actor, details_json, created_at)
    Migrationen folgen der bestehenden Namenskonvention `00xx_description.sql` und werden über `scripts/setup-local-dev.ts` in allen D1-Instanzen ausgerollt.
- **Begründung:** Das Schema setzt auf bereits dokumentierte Patterns (`ai_jobs` nutzt JSON-Spalten für Provider-Metadaten) und ermöglicht referenzielle Integrität. Ein Audit-Log deckt DSGVO- und Observability-Anforderungen ab. Die klare Trennung erlaubt gezieltes Retention-Management (z. B. Sessions nach 30 Tagen löschen, Audit länger aufbewahren) und passt zur beschriebenen Migrationsstrategie in `docs/db_schema_update.md`.

### 3. Autorisierung orchestrierter Aktionen

- **Frage:** Wie stellen wir sicher, dass der Orchestrator keine weitergehenden Rechte erhält als die bestehenden Tools?
- **Empfohlene Lösung:** Der API-Entry-Point bleibt zuständig für AuthN/AuthZ (`withApiMiddleware` + `locals.user`). Der Orchestrator-Service akzeptiert ausschließlich bereits autorisierte Commands, validiert Feature-Entitlements über eine zentralisierte Policy-Funktion (z. B. `canInvokeSkill(user, skillId)`) und nutzt bestehende Rate-Limiter sowie Feature-Flags (`src/utils/feature-flags.ts`). Für Gäste übernimmt er das Gast-ID-Cookie und Limit-Handling, wie es der Prompt Enhancer bereits vormacht.
- **Begründung:** Wir vermeiden neue privilegierte Tokens und bleiben konsistent mit der aktuellen Autorisationskette. Die wiederverwendeten Entitlement-Checks verhindern, dass orchestrierte Workflows Grenzen umgehen, und passen zur Governance in den KI-Konfigurationsdateien.

### 4. Governance für Kosten- und Rate-Limits

- **Frage:** Wie erzwingen wir Budget- und Provider-Limits auf Orchestrator-Ebene?
- **Empfohlene Lösung:** Wir kapseln eine zentrale `CostGuard`, die vor jeder Skill-Ausführung den erwarteten Verbrauch anhand der Formeln aus dem Kostenreport (`docs/business/infra-costs/ai-operations-cost-report.md`) berechnet, das Nutzerbudget prüft und anschließend Usage-Telemetrie persistiert. Technisch kombiniert das Modul bestehende Ratelimits (`createRateLimiter`) mit Plan-Limits aus den Konfigurationsdateien (z. B. `src/config/ai-image.ts`) und schreibt Aggregationen in D1 (`agent_tasks.cost_cents`) sowie optional KV für Rolling Windows. Alerts laufen über die bestehende Logging-Pipeline.
- **Begründung:** Damit bleiben Limit-Formeln konsistent mit den dokumentierten Kostenannahmen, und Budgetverletzungen werden frühzeitig erkannt. Gleichzeitig profitieren wir von den vorhandenen KV- und Logging-Utilities, ohne zusätzliche Infrastruktur einzuführen.

## Risikoanalyse und Gegenmaßnahmen

- **Komplexität / Single Point of Failure:** Der Orchestrator wird wie andere Services mit strukturiertem Logging versehen (`logger-utils.ts`). Health- und Circuit-Breaker-Checks laufen über die vorhandenen Observability-Routinen aus dem Logging-Runbook (`docs/runbooks/logging-pipeline.md`). Ein Feature-Flag erlaubt kontrollierte Aktivierung.
- **Kostenkontrolle:** `CostGuard` erzwingt Pre-Flight-Budget-Checks, Persistenz von `cost_cents` ermöglicht Finanzreporting. Fällt der Guard aus, greifen die bestehenden Provider-Limits als letzte Verteidigung.
- **Datensicherheit & DSGVO:** Sessions und Kontext werden verschlüsselt (falls PII) gespeichert, `expires_at` + regelmäßige Housekeeping-Jobs löschen Daten fristgerecht. Audit-Logs dokumentieren Zugriffspfad für Compliance.
- **Skalierbarkeit:** Job-Queues priorisieren Tasks, Retry-Strategien orientieren sich an den Worker-Limits. Bei Überlast wird die Ausführung gestaffelt (Queue + Rate-Limiter), um Workerkosten zu senken.

## Typisierung und Zod-Validierung

- Zentrale Input-Schemata liegen unter `src/lib/validation/schemas/ai-orchestrator.ts`. `z.strictObject` stellt sicher, dass API-Contracts keine unbekannten Felder akzeptieren. Per `z.infer` generierte Typen bilden die Service-Interfaces.
- Interne Commands nutzen `type`-Discriminators (z. B. `AiTaskCommand<'generateBrief'>`), wodurch Exhaustiveness-Checks greifen.
- Persistente JSON-Felder erhalten begleitende Typeguards für sichere Deserialisierung, kombiniert mit `safeParse` beim Lesen aus D1.

## Qualitätssicherung & Checks

- `npm run lint` – Code-Stil & Dead-Code-Prüfungen
- `npm run typecheck` – Verifikation aller Inferenz-Typen und Zod-Ableitungen
- `npm run astro:check` – UI-Integrationspunkte im Dashboard, sofern UI für den Orchestrator entsteht
- `npm run test:unit` – Tests für `AiOrchestratorService`, `CostGuard` und Policy-Layer (Mocks für Provider/Skills)
- `npm run test:integration` – End-to-End-Flows (z. B. orchestrierter Prompt → Tool-Ausführung → Persistenz → Audit)
- Optionale Budget-Simulation als zusätzliches Integration-Szenario, das Providerkosten durchspielt

## Entscheidungen (vormals Entscheidungs-Backlog)

- **Provider-Strategie:** Hybrid-Ansatz mit Primär-Provider (Workers AI/OpenAI) gemäß Feature-Konfiguration; Skill-Adapter lesen Model- und Limit-Informationen aus den bestehenden Config-Dateien, wodurch Umschaltungen ohne Codeänderung möglich sind.
- **Fallbacks:** Jeder Skill-Adapter implementiert ein Fallback-Array (`preferredProviders[]`), das den nächsten kompatiblen Provider nutzt, wenn der primäre ausfällt. Fehler werden protokolliert, und der Task bleibt in `pending_retry`, bis ein Fallback greift oder das Budget erschöpft ist.
- **KPIs:** Kernmetriken sind Task-Durchlaufzeit, Erfolgsquote, Kosten pro Task und Budget-Drift. Werte stammen aus den neuen D1-Spalten (`status`, `completed_at`, `cost_cents`) und werden für ein künftiges Admin-Dashboard aggregiert.
