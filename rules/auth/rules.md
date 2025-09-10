---
category: auth
version: 1.0
applies_to: src/pages/api/auth/
rules:
  - Registrierung nutzt Double-Opt-In; unverifizierte Nutzer erhalten bis zur Verifizierung keine Session
  - Middleware gated unverifizierte Nutzer: locale-aware Redirect auf `/<locale>/verify-email?email=…`
  - Logging redacts sensitive Felder in Auth-Logs
  - Implementiere Stytch-Auth mit Magic Links und E2E-Tests für Magic-Link-Flow mit Playwright
  - Validiere Stytch Tokens in allen API-Routen mit TypeScript-Typen
  - Session nur post-Verifizierung erstellen und KV-Namespace mit TTL verwenden
  - Rate-Limit für Auth-Endpunkte: 10/Minute
  - Teste alle Auth-Flows (Login, Register, Reset) in unterstützten Sprachen (de/en)
---

### Auth Rules

– Registrierung nutzt Double-Opt-In; unverifizierte Nutzer erhalten bis zur Verifizierung keine Session
– Middleware gated unverifizierte Nutzer: locale-aware Redirect auf `/<locale>/verify-email?email=…`
– Logging redacts sensitive Felder in Auth-Logs
– Implementiere Stytch-Auth mit Magic Links und E2E-Tests für Magic-Link-Flow mit Playwright
– Validiere Stytch Tokens in allen API-Routen mit TypeScript-Typen
– Session nur post-Verifizierung erstellen und KV-Namespace mit TTL verwenden
– Rate-Limit für Auth-Endpunkte: 10/Minute
– Teste alle Auth-Flows (Login, Register, Reset) in unterstützten Sprachen (de/en)