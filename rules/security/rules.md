---
category: security
version: 1.0
applies_to: src/lib/security-headers.ts, src/middleware.ts
rules:
  - Implementiere CSP-Nonce-Generierung für alle HTML-Responses
  - Verwende standardisierte Security-Headers (HSTS, COOP, X-Frame-Options)
  - Führe Sicherheits-Scans (npm audit, Snyk) in CI-Pipeline durch
  - Erzwinge Double-Submit-CSRF für unsichere Methoden
  - Rate-Limits dokumentieren und durchsetzen: aiGenerate 15/min, auth 10/min
  - Implementiere IP-Anonymisierung für alle Logs
  - Logge Verstöße strukturiert (SUSPICIOUS_ACTIVITY, RateLimitExceeded) mit minimalen PII
  - Unit- und Integration-Tests für Security-Features mit Vitest
---

### Security Rules

– Implementiere CSP-Nonce-Generierung für alle HTML-Responses
– Verwende standardisierte Security-Headers (HSTS, COOP, X-Frame-Options)
– Führe Sicherheits-Scans (npm audit, Snyk) in CI-Pipeline durch
– Erzwinge Double-Submit-CSRF für unsichere Methoden
– Rate-Limits dokumentieren und durchsetzen: aiGenerate 15/min, auth 10/min
– Implementiere IP-Anonymisierung für alle Logs
– Logge Verstöße strukturiert (SUSPICIOUS_ACTIVITY, RateLimitExceeded) mit minimalen PII
– Unit- und Integration-Tests für Security-Features mit Vitest