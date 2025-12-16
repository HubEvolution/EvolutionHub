---
trigger: manual
---

# Windsurf Rules Index

> **Letzte Aktualisierung:** 2025-12-16
> **Maintainer:** Architecture Team
> **Status:** 🟢 22 aktive Rules | 🟡 3 geplante Rules

## Schnellstart

### Für KI-Agenten

1. **Starte mit Root:** Lies [`/AGENTS.md`](../../AGENTS.md) zuerst
2. **Folge der Kaskade:** Root → Feature-spezifische Rules → Lokale AGENTS.md
3. **Nutze Cross-References:** Beachte `extends:` Angaben für Dependencies
4. **Prüfe Changelog:** Aktuelle Änderungen am Ende jeder Rule
5. **Aktueller Stand:** Code ist derzeit temporär Source of Truth; Rules werden im nächsten Review synchronisiert.
6. **Hook-Scope:** `pre_write_guard` schützt nur `.env`/`.env.*` und `.windsurf/rules/**`; [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) und `openapi.yaml` sind bewusst ausgenommen. Details: `docs/tools/cascade/hooks.md` (lastSync 2025-11-14).

### Für Entwickler

- **Neue Features:** Erstelle dedizierte Rule-Datei (siehe Template)
- **Änderungen:** Aktualisiere Changelog in betroffenen Rules
- **Review:** Prüfe Cross-References und Code-Anker
- **CI:** Rules-Quality-Checks laufen automatisch (geplant)

## Übersicht

### Nach Kategorie

| Kategorie | Anzahl | Dateien |
|-----------|--------|---------|
| **Core Infrastructure** | 7 | api-and-security, auth, infra, project-structure, database-migrations, caching-kv, background-jobs |
| **Feature-Specific** | 7 | image-enhancer, video-enhancer, transcriptor, prompt, scraper, pricing, email-notifications |
| **Quality & Tooling** | 5 | testing-and-ci, tooling-and-style, zod-openapi, docs-documentation, agentic-workflow |
| **Cross-Cutting** | 3 | cookies-and-consent, content, observability |
| **Geplant (Phase 4)** | 3 | frontend-state, i18n, performance |

### Nach Priorität

| Priorität | Scope | Status | Dateien |
|-----------|-------|--------|---------|
| 🔴 **Critical** | Core, Infra | ✅ Aktiv | api-and-security, auth, testing-and-ci, database-migrations |
| 🟠 **High** | Features, Quality | ✅ Aktiv | pricing, image-enhancer, video-enhancer, infra, caching-kv, background-jobs, email-notifications, observability, tooling-and-style, zod-openapi |
| 🟡 **Medium** | Features, Docs | ✅ Aktiv | transcriptor, prompt, scraper, docs-documentation, agentic-workflow, cookies-and-consent, content |
| 🟢 **Low** | — | — | — |

## Vollständige Rules-Liste

Unverändert; nur Kontext oben ergänzt.

## Dependency-Graph

Unverändert.

## Geplante Erweiterungen

Unverändert.

## Konventionen / Verwendung / Tools & Automation / Ressourcen

Unverändert.

## Changelog

- 2025-12-16: Phase 3 abgeschlossen (observability, background-jobs, email-notifications aktiv). Phase 1-2: database-migrations/caching-kv aktiv; infra/content erweitert.
- 2025-12-08: Hook-Scope klargezogen
- 2025-12-06: Klarstellung temporärer SSoT (Code) und Hook-Scope (`pre_write_guard` schützt keine wrangler/openapi); Last-Update erneuert.
- 2025-11-12: Vorheriger Stand.
