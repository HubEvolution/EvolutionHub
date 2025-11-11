---
description: 'Kurzübersicht mit Entwicklungs- und Deployment-Befehlen für Evolution Hub'
owner: 'Platform Team'
priority: 'low'
lastSync: '2025-11-03'
codeRefs: 'package.json, docs/cheat-sheet.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Evolution Hub Cheat-Sheet

## 🚀 Schnellstart

| Befehl | Beschreibung |
|--------|--------------|
| `npm run menu` | **Interaktives Entwicklungsmenü starten** |
| `npm run dev:astro` | Lokalen Entwicklungsserver starten |
| `npm run setup:local` | Lokale Entwicklungsumgebung einrichten |

## 🔄 Entwicklungsbefehle

### Lokale Entwicklung

```bash

# Interaktives Menü (empfohlen für Einsteiger)

npm run menu

# Lokale Entwicklungsumgebung einrichten

npm run setup:local

# Lokalen Entwicklungsserver starten (mit lokalen Ressourcen)

npm run dev:astro

# Entwicklungsserver mit Remote-Ressourcen starten (Vorsicht!)

wrangler dev --remote

```bash

### Datenbank-Verwaltung

```bash
# Lokale Datenbank einrichten
npm run db:setup

# Schema generieren
npm run db:generate

# Migrationen ausführen
npm run db:migrate
```

### Build & Deployment

```bash

# Build erstellen

npm run build

# Build mit Watch-Modus

npm run build:watch

# Preview starten

npm run preview

```bash

## 🧪 Tests

```bash
# Unit-Tests ausführen
npm run test

# Unit-Tests im Watch-Modus
npm run test:watch

# E2E-Tests ausführen
npm run test:e2e

# E2E-Tests mit UI
npm run test:e2e:ui
```

## 🔍 Wrangler-Befehle

### D1-Datenbank

```bash

# D1-Datenbanken auflisten

npx wrangler d1 list

# SQL-Abfrage ausführen

npx wrangler d1 execute evolution-hub-main-local --command="SELECT * FROM users"

# SQL-Datei ausführen

npx wrangler d1 execute evolution-hub-main-local --file=./migrations/your_migration.sql

```bash

### R2-Bucket

```bash
# R2-Buckets auflisten
npx wrangler r2 bucket list

# Dateien im Bucket auflisten
npx wrangler r2 object list evolution-hub-avatars-local
```

### KV-Namespace

```bash

# KV-Namespaces auflisten

npx wrangler kv:namespace list

# Schlüssel auflisten

npx wrangler kv:key list --namespace-id=SESSION_LOCAL

```bash

## 📋 Tipps & Tricks

- **Verwenden Sie das interaktive Menü** (`npm run menu`), wenn Sie sich nicht an die Befehle erinnern können

- Fügen Sie diese Befehle zu Ihren Shell-Aliassen hinzu für schnelleren Zugriff

- Verwenden Sie `--remote` nur, wenn Sie wirklich mit den Produktionsdaten arbeiten müssen

- Führen Sie `npm run setup:local` aus, wenn Sie Probleme mit der lokalen Entwicklungsumgebung haben

## 🔄 Workflow-Beispiel

1. **Einrichtung**: `npm run setup:local`
1. **Entwicklung**: `npm run dev:astro`
1. **Testen**: `npm run test`
1. **Build**: `npm run build`
1. **Preview**: `npm run preview`

```text
