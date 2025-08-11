# Hybrid Logging System - Evolution Hub

![Logging Banner](../public/assets/svg/monitoring.svg)

[![Logging System](https://img.shields.io/badge/Logging-Hybrid_WebSocket%2FSSE-brightgreen)](https://github.com/LucasBonnerue/evolution-hub)
[![Environment Support](https://img.shields.io/badge/Environment-Astro%2FWrangler-blue)](https://developers.cloudflare.com/)

Das Evolution Hub Hybrid-Logging-System bietet **umfassendes Live-Log-Streaming** für optimale Entwicklungserfahrung in beiden unterstützten Entwicklungsumgebungen.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Architektur](#architektur)
3. [Komponenten](#komponenten)
4. [Verwendung](#verwendung)
5. [Environment-Unterstützung](#environment-unterstützung)
6. [API-Integration](#api-integration)
7. [Debug Panel](#debug-panel)
8. [Konfiguration](#konfiguration)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Überblick

Das **Hybrid-Logging-System** von Evolution Hub ist eine **vollständig integrierte Logging-Lösung**, die sich automatisch an die jeweilige Entwicklungsumgebung anpasst und **Live-Log-Streaming** für optimale Developer Experience bietet.

### Kernfeatures

- ✅ **Environment-Adaptive Technologie**: Automatische Umgebungserkennung
- ✅ **WebSocket Live-Streaming**: Real-time Logs für Astro Dev (`npm run dev`)
- ✅ **SSE Live-Streaming**: Near real-time Logs für Wrangler Dev (`npm run dev:wrangler`)
- ✅ **Centralized Logging**: Einheitliche Logging-API für alle Anwendungskomponenten
- ✅ **Security Integration**: Vollständige Integration mit Security-Event-Logging
- ✅ **Visual Debug Panel**: Live-Monitoring-Dashboard mit Connection-Status
- ✅ **TypeScript-First**: Vollständig typisiert für maximale Entwicklerproduktivität

---

## Architektur

Das Hybrid-Logging-System basiert auf einer **dreischichtigen Architektur**:

### 1. Core Logger Layer
- **`src/server/utils/logger.ts`**: Zentraler Logger mit Environment-Detection
- **Dual-Mode Broadcasting**: WebSocket oder SSE basierend auf Umgebung
- **Memory Management**: Effiziente Log-Buffer-Verwaltung für Edge Runtime

### 2. Transport Layer
- **WebSocket Server**: `src/server/websocket/logServer.ts` (Port 8081)
- **SSE API Endpoint**: `/api/debug/logs-stream` für Cloudflare-Umgebungen
- **Polling Fallback**: POST-Endpoint für Environments ohne SSE-Support

### 3. Presentation Layer
- **Debug Panel**: `src/components/ui/DebugPanel.tsx` mit Hybrid-Connection-Logic
- **Auto-Connection**: Automatische Verbindungsart-Erkennung und Fallback
- **Visual Status**: Real-time Connection-Status und Log-Level-Badges

---

## Komponenten

### Central Logger (`src/server/utils/logger.ts`)

Der zentrale Logger ist das **Herzstück** des Hybrid-Systems:

```typescript
import { log } from '@/server/utils/logger';

// Automatisch hybrid - kein Environment-Code nötig!
log('info', 'User action completed', { userId: 123, action: 'profile_update' });
log('error', 'Database connection failed', { error: error.message, retries: 3 });
log('warn', 'High memory usage detected', { memoryUsage: '85%', threshold: '80%' });
log('debug', 'Request processing started', { endpoint: '/api/user/profile', method: 'PUT' });
```

**Environment-Detection:**
```typescript
// Automatische Erkennung der Umgebung
isAstroDevEnvironment(): boolean    // Node.js + development + !Wrangler
isWranglerEnvironment(): boolean   // Wrangler || CF_PAGES || Edge Runtime
```

### Security Logger Integration (`src/lib/security-logger.ts`)

Vollständig integriert mit dem Hybrid-System für **Security-Event-Streaming**:

```typescript
import { logAuthSuccess, logApiError, logPermissionDenied } from '@/lib/security-logger';

// Alle Security-Events werden automatisch live gestreamt
logAuthSuccess('user-123', '192.168.1.100', { method: 'POST', endpoint: '/api/login' });
logApiError('/api/users/profile', { statusCode: 404, message: 'User not found' });
logPermissionDenied('user-789', '/admin/dashboard', { reason: 'Insufficient privileges' });
```

### Debug Panel (`src/components/ui/DebugPanel.tsx`)

**Hybrid-fähiges Debug Panel** mit automatischer Connection-Mode-Erkennung:

**Features:**
- **Auto-Environment-Detection**: Erkennt automatisch Astro vs. Wrangler
- **WebSocket-First-Strategie**: Versucht zuerst WebSocket, dann SSE-Fallback
- **Visual Connection-Status**: 
  - 🟢 **WEBSOCKET**: Grünes Badge für Real-time Streaming
  - 🔵 **SSE**: Blaues Badge für Near real-time Streaming
  - 🟠 **POLLING**: Orange Badge für Fallback-Modus
- **Live Status Indicator**: Animierter grüner Punkt für aktive Verbindungen

---

## Verwendung

### 1. Debug Panel öffnen

```bash
# Astro Dev Environment
http://localhost:4322/debug

# Wrangler Dev Environment  
http://localhost:8787/debug
```

### 2. Logging in Anwendungscode

```typescript
// In API Routes
import { log } from '@/server/utils/logger';

export const POST: APIRoute = async (context) => {
  log('info', 'API request started', { 
    endpoint: context.url.pathname,
    method: context.request.method,
    userAgent: context.request.headers.get('user-agent')
  });
  
  try {
    // API Logic...
    const result = await processRequest(context);
    
    log('info', 'API request completed successfully', { 
      endpoint: context.url.pathname,
      responseTime: Date.now() - startTime
    });
    
    return new Response(JSON.stringify(result));
  } catch (error) {
    log('error', 'API request failed', { 
      endpoint: context.url.pathname,
      error: error.message,
      stack: error.stack
    });
    
    return new Response('Internal Server Error', { status: 500 });
  }
};
```

### 3. Security-Event-Integration

```typescript
// In Authentication Logic
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

if (validCredentials) {
  // Erscheint automatisch im Debug Panel
  logAuthSuccess(user.id, clientIP, { 
    method: 'password',
    userAgent: request.headers.get('user-agent')
  });
} else {
  logAuthFailure(clientIP, { 
    reason: 'invalid_credentials',
    attemptedUsername: username 
  });
}
```

---

## Environment-Unterstützung

### Astro Development (`npm run dev`)

**Connection-Modus:** WebSocket Real-time Streaming

```bash
# Startet automatisch WebSocket Server auf Port 8081
npm run dev

# Debug Panel: http://localhost:4322/debug
# Connection-Badge: 🟢 WEBSOCKET
# Latenz: <10ms (Real-time)
```

**Features:**
- ✅ **Echter Real-time Stream**: WebSocket-basiert, <10ms Latenz
- ✅ **Hot Module Replacement**: Logs während Code-Changes verfügbar
- ✅ **Bidirektionale Kommunikation**: WebSocket ermöglicht erweiterte Funktionen

### Wrangler Development (`npm run dev:wrangler`)

**Connection-Modus:** SSE Near real-time Streaming

```bash
# Verwendet SSE-API für Live-Logs
npm run dev:wrangler

# Debug Panel: http://localhost:8787/debug  
# Connection-Badge: 🔵 SSE
# Latenz: 100-500ms (Near real-time)
```

**Features:**
- ✅ **Cloudflare Edge-kompatibel**: Funktioniert in Workers/Pages Runtime
- ✅ **Automatic Fallback**: Polling-Fallback für Environments ohne SSE
- ✅ **Memory-efficient**: Log-Buffer mit Auto-Cleanup für Edge-Constraints

---

## API-Integration

### Automatische API-Route-Integration

**Über 21 API-Routes** sind bereits vollständig integriert:

```typescript
// Beispiel: /api/auth/login.ts
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

// Login-Erfolg → Live-Stream ins Debug Panel
logAuthSuccess(user.id, clientAddress, loginContext);

// Login-Fehler → Live-Stream ins Debug Panel  
logAuthFailure(clientAddress, { reason: 'invalid_password', endpoint: '/api/auth/login' });
```

**Integrierte API-Categories:**
- ✅ **Authentication APIs**: `/api/auth/*` (Login, Register, Password Reset)
- ✅ **User Management APIs**: `/api/user/*` (Profile, Settings, Preferences)  
- ✅ **Dashboard APIs**: `/api/dashboard/*` (Stats, Activities, Notifications)
- ✅ **Project APIs**: `/api/projects/*` (CRUD, Members, Settings)
- ✅ **Public APIs**: `/api/public/*` (Comments, Tools, Blog Content)

### Live-Activity-Beispiele

Das Debug Panel zeigt **alle Live-Aktivitäten** in Echtzeit:

```
[2025-08-10T05:12:34.567Z] [INFO] User logged in: user-123 (auth/login.ts)
[2025-08-10T05:12:35.123Z] [INFO] Dashboard stats requested (dashboard/stats.ts)  
[2025-08-10T05:12:36.789Z] [INFO] Profile updated successfully (user/profile.ts)
[2025-08-10T05:12:37.234Z] [WARN] Rate limit approached for user-123 (85% of limit)
[2025-08-10T05:12:38.456Z] [ERROR] Database query failed: Connection timeout after 5000ms
```

---

## Debug Panel

### Benutzeroberfläche

Das Debug Panel bietet eine **intuitive Benutzeroberfläche** für Live-Log-Monitoring:

#### Connection-Status-Header
```
🎛️ Debugging Panel                           🟢 WEBSOCKET ●
```

#### Log-Entry-Format
```
05:12:34  [INFO]   User authentication successful
05:12:35  [WARN]   High memory usage detected: 85%  
05:12:36  [ERROR]  Database connection failed: timeout
05:12:37  [DEBUG]  Processing user preference update...
```

#### Features
- **Timestamp-Display**: Präzise Zeitstempel für jede Log-Entry
- **Log-Level-Badges**: Farbkodierte Level-Anzeigen (INFO/WARN/ERROR/DEBUG)
- **Auto-Scroll**: Automatisches Scrollen zu neuen Log-Entries
- **Connection-Indicator**: Live-Status der Streaming-Verbindung
- **Entry-Limit**: Maximale 500 Entries im Client (Memory-Management)

---

## Konfiguration

### WebSocket-Konfiguration

```typescript
// astro.config.mjs - Zentrale Konfiguration
export default defineConfig({
  // ...
  loggingConfig: {
    websocketPort: 8081,
    websocketHost: 'localhost',
    maxLogBufferSize: 100,
    environment: 'development'
  }
});
```

### SSE-Endpoint-Konfiguration

```typescript
// /api/debug/logs-stream.ts
const SSE_CONFIG = {
  keepAliveInterval: 30000,  // 30s Keep-Alive
  maxBufferSize: 100,        // Max 100 Log-Entries im Buffer
  streamTimeout: 300000      // 5min Stream-Timeout
};
```

### Environment-Variables

```bash
# .env - Development-Konfiguration
NODE_ENV=development
LOGGING_WEBSOCKET_PORT=8081
LOGGING_WEBSOCKET_HOST=localhost
LOGGING_MAX_BUFFER_SIZE=100

# Wrangler-spezifische Variablen
WRANGLER_REMOTE=false
CF_PAGES_BRANCH=preview
CLOUDFLARE_ENVIRONMENT=development
```

---

## Troubleshooting

### Häufige Probleme und Lösungen

#### 1. Debug Panel zeigt keine Logs

**Problem:** Das Debug Panel lädt, aber keine Logs werden angezeigt.

**Lösung:**
```bash
# 1. Überprüfe Environment-Detection
# Öffne Browser DevTools Console für Debug-Nachrichten

# 2. Überprüfe WebSocket-Server (Astro)
netstat -an | grep 8081

# 3. Teste SSE-Endpoint (Wrangler) 
curl -N http://localhost:8787/api/debug/logs-stream

# 4. Überprüfe Log-Generation
# Triggere API-Calls zur Generierung von Logs
```

#### 2. Connection-Fehler im Debug Panel

**Problem:** "Connection failed" oder "WebSocket error" Meldungen.

**Lösung:**
```bash
# Prüfe Port-Verfügbarkeit
lsof -i :8081

# Neu-Start der Development-Server
npm run dev        # Für Astro
npm run dev:wrangler   # Für Wrangler

# Browser-Cache leeren und Debug Panel neu laden
```

#### 3. Logs erscheinen nur in Console, nicht im Panel

**Problem:** Logs sind in Terminal sichtbar, aber nicht im Debug Panel.

**Lösung:**
```typescript
// Überprüfe dass der zentrale Logger verwendet wird
import { log } from '@/server/utils/logger';  // ✅ Richtig
// NICHT: console.log()  // ❌ Falsch

// Überprüfe Logger-Initialisierung in src/server/index.ts
initializeLogger(wss);  // Muss aufgerufen werden
```

---

## Best Practices

### 1. Structured Logging

```typescript
// ✅ Gut - Strukturierte Log-Entries mit Context
log('info', 'User profile updated', {
  userId: user.id,
  changedFields: ['email', 'preferences'],  
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
  timestamp: new Date().toISOString()
});

// ❌ Schlecht - Unstrukturierte String-Nachrichten  
log('info', `User ${user.id} updated profile with email ${user.email}`);
```

### 2. Appropriate Log Levels

```typescript
// DEBUG: Detailed development information
log('debug', 'Processing user request', { endpoint, method, params });

// INFO: General operational information  
log('info', 'User successfully authenticated', { userId, loginMethod });

// WARN: Potentially problematic situations
log('warn', 'High API usage detected', { userId, requestCount, timeWindow });

// ERROR: Error conditions that need attention
log('error', 'Database operation failed', { query, error: error.message, retries });
```

### 3. Security-Sensitive Information

```typescript
// ✅ Gut - Sichere Datenfilterung
log('info', 'Password reset requested', {
  userId: user.id,
  email: maskEmail(user.email),  // user@example.com → u***@e***.com
  ipAddress: request.ip,
  timestamp: new Date().toISOString()
});

// ❌ Schlecht - Sensible Daten in Logs
log('info', 'Password reset', { 
  password: newPassword,        // ❌ Niemals Passwörter loggen
  token: resetToken,           // ❌ Niemals Security-Token loggen  
  creditCard: user.creditCard  // ❌ Niemals Finanz-Daten loggen
});
```

### 4. Performance Considerations

```typescript
// ✅ Gut - Conditional Logging für Performance
if (process.env.NODE_ENV === 'development') {
  log('debug', 'Detailed debugging info', { complexObject });
}

// ✅ Gut - Lazy Evaluation für teure Operations
log('debug', 'Database query executed', { 
  query: () => formatQuery(complexQuery),  // Nur wenn DEBUG-Level aktiv
  duration: performance.now() - startTime
});
```

### 5. Error Context Preservation

```typescript
try {
  await riskyOperation();
} catch (error) {
  // ✅ Gut - Vollständiger Error-Context
  log('error', 'Operation failed with context', {
    operation: 'riskyOperation',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context: {
      userId: user?.id,
      requestId: generateRequestId(),
      timestamp: new Date().toISOString()
    }
  });
  
  throw error;  // Re-throw für höhere Schichten
}
```

---

## Integration mit CI/CD

Das Hybrid-Logging-System ist **vollständig kompatibel** mit Evolution Hub's CI/CD-Pipeline:

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
- name: Run Tests with Logging
  run: |
    npm run test
    npm run test:e2e
  env:
    LOGGING_ENABLED: true
    LOGGING_LEVEL: debug
```

### Production Deployment

```typescript
// In Production: Automatisch Console-Logging + Cloudflare Analytics
if (isProduction()) {
  // Logs gehen an Cloudflare Analytics statt Debug Panel
  log('info', 'Production event', context);
}
```

---

**🎉 Das Evolution Hub Hybrid-Logging-System ist bereit für maximale Developer Productivity!**

Für weitere Fragen oder Support, siehe die [lokale Entwicklungsdokumentation](./local-development.md) oder die [Sicherheitsdokumentation](../SECURITY.md).
