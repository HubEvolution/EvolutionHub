---
description: 'Operative Dokumentation, Deployment und Third-Party-Service-Management für Evolution Hub'
owner: 'Operations Team'
priority: 'medium'
lastSync: '2025-10-27'
codeRefs: 'wrangler.toml, package.json, .github/workflows'
testRefs: 'test-suite-v2/src/e2e/smoke'
---

# Operations Documentation

**Scope** — Diese Kategorie dokumentiert alle operativen Aspekte von Evolution Hub: Deployment-Prozesse, Third-Party-Integrationen, Monitoring und Produktionsbetrieb. Umfasst Cloudflare-Setup, Stytch-Konfiguration und Service-Management. Zielgruppe sind DevOps-Ingenieure und System-Administratoren. Nicht enthalten: Code-Entwicklung (→ Development-Kategorie) oder Security-Implementation (→ Security-Kategorie).

## Primärdokumente

- **[Deployment Guide](./deployment.md)** — **Hauptdokument** für Production-Deployment und Rollout
- **[Cloudflare Setup](./cloudflare-setup.md)** — Cloudflare-Worker- und R2-Konfiguration
- **[Monitoring Setup](./monitoring.md)** — Logging, Metriken und Alerting

## Sekundär-/Spezialdokumente

- **[Stytch Integration](./stytch-integration.md)** — Stytch-Authentifizierung und Custom-Domain-Setup
- **[Third-Party Services](./third-party-services.md)** — Stripe, OpenAI, Replicate-Integration
- **[Backup & Recovery](./backup-recovery.md)** — Daten-Backup und Disaster-Recovery

## Dokumentation

### Stytch Integration

- **[Custom Domains](./stytch-custom-domains.md)** — Stytch-Custom-Domain-Konfiguration
- **[OAuth Setup](./stytch-oauth.md)** — GitHub/Google OAuth-Integration
- **[Magic Link Flow](./stytch-magic-link.md)** — Magic-Link-Authentifizierungsflow

### Service Management

- **[Environment Management](./environment-management.md)** — Umgebungs-Konfiguration (Dev, Testing, Staging, Prod)
- **[Secrets Management](./secrets-management.md)** — Geheime Schlüssel und KV-Bindings
- **[Cron Jobs](./cron-jobs.md)** — Automatisierte Tasks und Worker-Scripts

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

- **Deployment:** Automatisiert via GitHub Actions, manuelle Rollouts nur in Ausnahmefällen
- **Environment-Config:** Einheitlich via `wrangler.toml`, keine hardcoded Secrets
- **Monitoring:** Strukturiertes Logging, Metriken via Cloudflare Analytics
- **Backups:** Automatisiert, verschlüsselt, regelmäßig getestet
- **Incident-Response:** Dokumentierte Prozesse, regelmäßige Drills

## Bekannte Lücken

- [TODO] Vollständige Disaster-Recovery-Dokumentation
- [TODO] Performance-Monitoring und SLO-Definitionen
- [TODO] Cost-Optimization für Cloudflare-Ressourcen

## Übersicht

Operative Dokumentation umfasst:

- Integration-Status von Third-Party-Services
- Custom-Domain-Konfigurationen
- Deployment-spezifische Setups

## Dokumentation

### Stytch Integration

- Stytch-Integration und Custom-Domain-Status sind in der konsolidierten Entwicklungsdokumentation beschrieben.

## Verwandte Dokumentation

- **[Architecture Documentation](../architecture/)** — Auth-Architektur und Flow-Dokumentation
- **[Development Documentation](../development/)** — Setup und lokale Entwicklung
- **[Security Documentation](../security/)** — Sicherheits-Features und Best Practices
