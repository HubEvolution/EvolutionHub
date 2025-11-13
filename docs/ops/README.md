---
description: 'Operative Dokumentation, Deployment und Third-Party-Service-Management für Evolution Hub'
owner: 'Operations Team'
priority: 'medium'
lastSync: '2025-10-27'
codeRefs: 'wrangler.toml, package.json, .github/workflows'
testRefs: 'test-suite-v2/src/e2e/smoke'
---

<!-- markdownlint-disable MD051 -->

# Operations Documentation

**Scope** — Diese Kategorie dokumentiert alle operativen Aspekte von Evolution Hub: Deployment-Prozesse, Third-Party-Integrationen, Monitoring und Produktionsbetrieb. Umfasst Cloudflare-Setup, Stytch-Konfiguration und Service-Management. Zielgruppe sind DevOps-Ingenieure und System-Administratoren. Nicht enthalten: Code-Entwicklung (→ Development-Kategorie) oder Security-Implementation (→ Security-Kategorie).

## Primärdokumente

- **[Runbook: Image Enhancer Go-Live](./runbook-image-enhancer-go-live.md)** — Schritt-für-Schritt-Ablauf für Deployments & Rollbacks

- **[Runbook: Web‑Eval Executor](./web-eval-executor-runbook.md)** — Auth, Secrets, Start/Stop, Prod‑Gating, Rate‑Limits

- **[Monitoring & Runbook](./monitoring.md)** — Monitoring-Baseline, Healthchecks und Incident-Prozesse
- **[Deployment Guide — Cloudflare Workers](./deployment-guide.md)** — Deploy ausschließlich via Wrangler CLI; GitHub Actions = Pre‑Release Validierung

## Sekundär-/Spezialdokumente

- **[Cloudflare Cache Rules (CI/Staging)](./cloudflare-cache-rules.md)** — HTTP Cache Bypass-Regeln & API-Skripte

- **[AI Generate KV/DO Limiter Plan](./ai-generate-kv-limiter-plan.md)** — Konzept für deterministisches Rate-Limiting über KV/Durable Objects

> TODO: Ergänzung eines allgemeinen Deployment-Guides (Worker + Pages), sobald feststehender Prozess dokumentiert ist.

## Cross-Referenzen

- **[Development](../development/)** — CI/CD-Pipelines und Development-Workflows

- **[Architecture](../architecture/)** — System-Architektur und Cloudflare-Setup

- **[Security](../security/)** — Produktions-Security und Compliance

- **[Testing](../testing/)** — Produktions-Tests und Smoke-Tests

## Ownership & Maintenance

**Owner:** Operations Team (Lead: DevOps Lead)
**Update-Frequenz:** Bei Deployment-Änderungen oder Service-Updates
**Review-Prozess:** Operations-Review + Security-Check
**Eskalation:** Bei Produktionsproblemen → Incident-Response-Team

## Standards & Konventionen

- **Deployment:** Manuell via Wrangler CLI (`wrangler deploy --env <env>`). GitHub Actions dienen nur als Qualitäts‑Gate (keine Deployments).

- **Environment-Config:** Einheitlich via `wrangler.toml`, keine hardcoded Secrets

- **Monitoring:** Strukturiertes Logging, Metriken via Cloudflare Analytics

- **Backups:** Automatisiert, verschlüsselt, regelmäßig getestet

- **Incident-Response:** Dokumentierte Prozesse, regelmäßige Drills

## Bekannte Lücken

- TODO: Vollständige Disaster-Recovery-Dokumentation (Backups, R2 Restore)

- TODO: Performance-Monitoring und SLO-Definitionen

- TODO: Cost-Optimierung für Cloudflare-Ressourcen (KV/R2/Queue)

## Übersicht

Operative Dokumentation umfasst:

- Integration-Status von Third-Party-Services

- Custom-Domain-Konfigurationen

- Deployment-spezifische Setups

## Ergänzende Hinweise

- Stytch-/Auth-spezifische Ops-Schritte sind in `docs/development/stytch-oauth-dev-guide.md` und den Security-Dokumenten beschrieben.

- Third-Party-Service-Änderungen (Stripe, Replicate, OpenAI) werden in den jeweiligen Feature-Dokumenten gepflegt (z. B. `docs/features/admin-notifications.md`, `docs/tools/image-enhancer.md`).

## Verwandte Dokumentation

- **[Architecture Documentation](../architecture/)** — Auth-Architektur und Flow-Dokumentation

- **[Development Documentation](../development/)** — Setup und lokale Entwicklung

- **[Security Documentation](../security/)** — Sicherheits-Features und Best Practices
