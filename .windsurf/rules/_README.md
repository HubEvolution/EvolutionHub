---
trigger: manual
---

# Windsurf Rules Index

> **Letzte Aktualisierung:** 2025-12-06  
> **Maintainer:** Architecture Team  
> **Status:** 🟢 18 aktive Rules | 🟡 8 geplante Rules

## Schnellstart

### Für KI-Agenten

1. **Starte mit Root:** Lies [`/AGENTS.md`](../../AGENTS.md) zuerst
2. **Folge der Kaskade:** Root → Feature-spezifische Rules → Lokale AGENTS.md
3. **Nutze Cross-References:** Beachte `extends:` Angaben für Dependencies
4. **Prüfe Changelog:** Aktuelle Änderungen am Ende jeder Rule
5. **Aktueller Stand:** Code ist derzeit temporär Source of Truth; Rules werden im nächsten Review synchronisiert.
6. **Hook-Scope:** `pre_write_guard` schützt nur `.env`/`.env.*` und `.windsurf/rules/**`; `wrangler.toml` und `openapi.yaml` sind bewusst ausgenommen. Details: `docs/tools/cascade/hooks.md` (lastSync 2025-11-14).

### Für Entwickler

- **Neue Features:** Erstelle dedizierte Rule-Datei (siehe [Template](#template))
- **Änderungen:** Aktualisiere Changelog in betroffenen Rules
- **Review:** Prüfe Cross-References und Code-Anker
- **CI:** Rules-Quality-Checks laufen automatisch (geplant)

## Übersicht

### Nach Kategorie

| Kategorie | Anzahl | Dateien |
|-----------|--------|---------|
| **Core Infrastructure** | 4 | api-and-security, auth, infra, project-structure |
| **Feature-Specific** | 6 | image-enhancer, video-enhancer, transcriptor, prompt, scraper, pricing |
| **Quality & Tooling** | 5 | testing-and-ci, tooling-and-style, zod-openapi, docs-documentation, agentic-workflow |
| **Cross-Cutting** | 3 | cookies-and-consent, content, (prompt) |
| **Geplant (Phase 1-2)** | 8 | database-migrations, caching-kv, email-notifications, background-jobs, observability, frontend-state, i18n, performance |

### Nach Priorität

| Priorität | Scope | Status | Dateien |
|-----------|-------|--------|---------|
| 🔴 **Critical** | Core, Infra | ✅ Aktiv | api-and-security, auth, testing-and-ci |
| 🟠 **High** | Features, Quality | ✅ Aktiv | pricing, image-enhancer, video-enhancer, infra, tooling-and-style, zod-openapi |
| 🟡 **Medium** | Features, Docs | ✅ Aktiv | transcriptor, prompt, scraper, docs-documentation, agentic-workflow, cookies-and-consent |
| 🟢 **Low** | Content | ⚠️ Minimal | content |

## Vollständige Rules-Liste
*(unverändert; nur Kontext oben ergänzt)*

## Dependency-Graph
*(unverändert)*

## Geplante Erweiterungen
*(unverändert)*

## Konventionen / Verwendung / Tools & Automation / Ressourcen
*(unverändert)*

## Changelog
- 2025-12-08: Hook-Scope klargezogen
- 2025-12-06: Klarstellung temporärer SSoT (Code) und Hook-Scope (`pre_write_guard` schützt keine wrangler/openapi); Last-Update erneuert.
- 2025-11-12: Vorheriger Stand.