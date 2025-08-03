---
trigger: always_on
description: Cloudflare Workers and D1 Patterns
---

# Cloudflare Patterns

## D1 Database Connection
- Verwende das standardisierte D1-Bindings-Pattern
- Implementiere Connection-Pooling über die Worker-Umgebung
- Vermeide direkte Instanziierung von D1-Clients

## Environment Variables
- Greife auf Environment-Variablen über das ctx.env Objekt zu
- Verwende Typisierung für alle Environment-Variablen
- Unterscheide zwischen dev und production Umgebungen

## Edge Runtime Optimization
- Minimiere Bundle-Größe durch Tree-Shaking
- Vermeide Node.js-spezifische APIs
- Nutze Cloudflare-spezifische APIs (caches, waitUntil, etc.)
- Optimiere für Cold Starts

## Error Handling
- Implementiere zentrales Error-Handling für Worker
- Verwende spezifische Error-Codes für D1-spezifische Fehler
- Logge wichtige Events über Cloudflare Logs