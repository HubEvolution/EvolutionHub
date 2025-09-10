---
category: logging
version: 1.0
applies_to: src/server/utils/logger.ts
rules:
  - Strukturierte JSON-Logs mit Leveln (`debug`, `info`, `warn`, `error`)
  - Korrelation/Request-ID pro Request generieren und in Logs/Responses propagieren (ohne PII)
  - IP-Anonymisierung beibehalten; keine sensiblen Daten in Logs
  - Stacktraces bereinigen in Error-Logs
  - Standardisiertes Access-Log-Format für API-Requests (Methode, Pfad, Status, Dauer, RateLimit-Hits)
  - Logge Verstöße (SUSPICIOUS_ACTIVITY, RateLimitExceeded) strukturiert
  - Verwende Logger-Factory für konsistente Logging in Services
  - Teste Logging in Unit-Tests mit Vitest, inkl. Redaction
---

### Logging Rules

– Strukturierte JSON-Logs mit Leveln (`debug`, `info`, `warn`, `error`)
– Korrelation/Request-ID pro Request generieren und in Logs/Responses propagieren (ohne PII)
– IP-Anonymisierung beibehalten; keine sensiblen Daten in Logs
– Stacktraces bereinigen in Error-Logs
– Standardisiertes Access-Log-Format für API-Requests (Methode, Pfad, Status, Dauer, RateLimit-Hits)
– Logge Verstöße (SUSPICIOUS_ACTIVITY, RateLimitExceeded) strukturiert
– Verwende Logger-Factory für konsistente Logging in Services
– Teste Logging in Unit-Tests mit Vitest, inkl. Redaction