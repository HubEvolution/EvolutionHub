<!-- markdownlint-disable MD051 -->

# Debug Panel - Benutzerhandbuch

Das Evolution Hub Debug Panel bietet Live-Log-Streaming für optimale Entwicklungserfahrung.

## Schnellstart

### URLs

```bash

# Astro Development

http://localhost:4322/debug

# Wrangler Development  

http://localhost:8787/debug

```text

## Interface-Überblick

```text
🎛️ Debugging Panel                           🟢 WEBSOCKET ●
────────────────────────────────────────────────────────────
Connected. Waiting for logs...

06:02:15  [INFO]   Server started successfully
06:02:16  [INFO]   User authentication successful: user-123
06:02:17  [WARN]   High memory usage detected: 85%
06:02:18  [ERROR]  Database connection timeout
```

## Connection-Status

### Badges

- **🟢 WEBSOCKET**: Real-time (Astro Dev) - <10ms Latenz

- **🔵 SSE**: Near real-time (Wrangler Dev) - 100-500ms Latenz

- **🟠 POLLING**: Fallback - 1-5s Latenz

### Live-Indicator

- **● (pulsierend)**: Aktive Verbindung

- **○ (statisch)**: Getrennt oder wird aufgebaut

## Log-Levels

- **[DEBUG]** (grau): Entwicklungsdetails

- **[INFO]** (blau): Normale Operationen

- **[WARN]** (orange): Warnungen

- **[ERROR]** (rot): Kritische Fehler

## Praktisches Debugging

### API-Requests verfolgen

```text
06:02:20  [INFO]   API request: POST /api/auth/login  
06:02:21  [INFO]   Authentication successful: user-123
06:02:21  [INFO]   Session created
06:02:21  [INFO]   Request completed: 187ms

```text

### Security-Events

```text
06:02:30  [WARN]   Multiple login attempts: 192.168.1.100
06:02:31  [ERROR]  Authentication failed: invalid_credentials
06:02:32  [INFO]   Account locked for security
```

## Troubleshooting

### Problem: Keine Logs angezeigt

**Lösung:**

```bash

# 1. Server-Status prüfen

npm run dev          # Astro
npm run dev:wrangler # Wrangler

# 2. Port prüfen (Astro)

netstat -an | grep 8081

# 3. Browser-Cache leeren

Ctrl+Shift+R

```bash

### Problem: Connection-Fehler

**Lösung:**

```bash
# WebSocket-Server testen
curl -I http://localhost:8081

# SSE-Endpoint testen
curl -N http://localhost:8787/api/debug/logs-stream
```

## Best Practices

### Strukturiertes Logging

```typescript
// ✅ Gut
import { log } from '@/server/utils/logger';
log('info', 'User action completed', { 
  userId: user.id, 
  action: 'profile_update' 
});

// ❌ Schlecht  
console.log(`User ${user.id} updated profile`);

```text

### Security-bewusst

```typescript
// ✅ Sicher
log('info', 'Password reset', {
  userId: user.id,
  email: maskEmail(user.email)  // user@x.com → u***@x.com
});

// ❌ Unsicher
log('info', 'Reset', { password: newPassword }); // Niemals!
```

## Quick Reference

```bash

# Integration

import { log } from '@/server/utils/logger';
log('info', 'Message', context);

# Features

- Auto-Scroll zu neuen Logs

- Max 500 Entries (Memory-Management)

- Real-time Updates ohne Reload

- Automatic Connection-Recovery

```bash

### Lokale E2E mit Debug-Login (Kurzüberblick)

1. Dev-Server inkl. DB-Setup starten:

```bash
npm run dev:e2e
```

1. Zielgerichtete E2E-Tests (Chromium, 1 Worker):

```bash
npm run test:e2e:chromium -- tests/e2e/specs/en-login-auth-redirect.spec.ts --workers=1

```bash

1. CSRF-Hinweis (wichtig für POST in Tests):

- Playwright sendet global einen same-origin `Origin`-Header. Details:
  [docs/development/ci-cd.md#csrf-schutz-in-e2e-tests-astrocloudflare-workers](./ci-cd.md#csrf-schutz-in-e2e-tests-astrocloudflare-workers)

1. Optional: Manuell testen (curl):

```bash
curl -i -X POST \
  -H 'Origin: http://127.0.0.1:8787' \
  http://127.0.0.1:8787/api/debug-login
```

**Pro-Tip:** Debug Panel immer parallel zur Entwicklung offen halten! 🚀
