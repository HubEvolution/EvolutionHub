---
status: deprecated
date: '2023-10-20'
supersededBy: 'docs/architecture/auth-migration-stytch.md'
---

<!-- markdownlint-disable MD051 -->

# ADR-0002: JWT-basierte Authentifizierung mit HttpOnly-Cookies

## Status

Akzeptiert

## Kontext

Die Authentifizierung ist ein kritischer Bestandteil des Evolution Hub Systems. Bei der Entwicklung mussten wir eine Entscheidung über die Authentifizierungsmethode treffen, die folgende Anforderungen erfüllt:

1. Sicherheit gegen gängige Angriffe (XSS, CSRF, Token-Diebstahl)
1. Skalierbarkeit in einer serverless Umgebung
1. Gute Benutzererfahrung mit persistenten Sitzungen
1. Kompatibilität mit dem Cloudflare-Ökosystem
1. Einfache Implementierung und Wartung

Die Authentifizierung sollte sowohl für die Web-Oberfläche als auch für die API-Endpunkte funktionieren und eine rollenbasierte Zugriffskontrolle ermöglichen.

## Entscheidung

Wir haben uns für eine JWT-basierte (JSON Web Token) Authentifizierung mit HttpOnly-Cookies entschieden:

1. **JWT-Tokens** für die Authentifizierung:

   - Zustandslose Authentifizierung, ideal für serverless Umgebungen

   - Enthält Benutzer-ID, Rollen und Ablaufzeit

   - Signiert mit einem sicheren Algorithmus (HS256)

1. **HttpOnly-Cookies** für die Token-Speicherung:

   - Schutz vor XSS-Angriffen durch JavaScript-Zugriffsbeschränkung

   - Automatische Übermittlung bei jeder Anfrage

   - Secure-Flag für HTTPS-only Übertragung

   - SameSite=Strict zur Verhinderung von CSRF-Angriffen

1. **Kurze Token-Lebensdauer** mit automatischer Erneuerung:

   - Token-Gültigkeit von 1-7 Tagen

   - Automatische Erneuerung bei Aktivität

   - Absolute Ablaufzeit für Langzeit-Tokens

1. **Zentrale Auth-Middleware**:

   - Einheitliche Authentifizierungslogik für alle geschützten Routen

   - Automatische Token-Validierung und -Erneuerung

   - Bereitstellung des Benutzerkontexts für API-Handler

## Konsequenzen

### Positive Konsequenzen

1. **Verbesserte Sicherheit**:

   - HttpOnly-Cookies schützen vor XSS-Angriffen

   - SameSite=Strict schützt vor CSRF-Angriffen

   - Kurze Token-Lebensdauer minimiert das Risiko bei Token-Diebstahl

1. **Skalierbarkeit**:

   - Zustandslose Authentifizierung passt gut zu serverless Architekturen

   - Keine Notwendigkeit für eine separate Sitzungsdatenbank

   - Reduzierte Datenbankabfragen bei Authentifizierung

1. **Benutzererfahrung**:

   - Persistente Anmeldung über Browser-Neustarts hinweg

   - Nahtlose Token-Erneuerung ohne Benutzerinteraktion

   - Konsistente Authentifizierung für Web-UI und API-Zugriffe

1. **Entwicklungseffizienz**:

   - Einheitliche Authentifizierungslogik in der Middleware

   - Einfache Integration mit Cloudflare Workers

   - Klare Trennung von Authentifizierung und Geschäftslogik

### Negative Konsequenzen

1. **Eingeschränkte Token-Widerrufung**:

   - JWTs sind zustandslos, was die sofortige Widerrufung erschwert

   - Workaround durch kurze Token-Lebensdauer und Blacklisting

1. **Cookie-Limitierungen**:

   - Größenbeschränkungen für Cookies (max. 4KB)

   - Potenziell problematisch bei komplexen Berechtigungsmodellen

   - Erfordert möglicherweise Minimierung der Token-Payload

1. **Cross-Origin-Herausforderungen**:

   - HttpOnly-Cookies mit SameSite=Strict können Cross-Origin-API-Aufrufe erschweren

   - Zusätzliche Konfiguration für legitime Cross-Origin-Szenarien erforderlich

1. **Debugging-Komplexität**:

   - Cookie-basierte Authentifizierung ist schwieriger zu debuggen als Header-basierte

   - Erfordert Browser-Tools für Cookie-Inspektion

## Alternativen

### Alternative 1: Bearer-Token in Authorization-Header

**Vorteile**:

- Einfachere API-Nutzung für externe Clients

- Bessere Kontrolle über Token-Speicherung und -Übermittlung

- Standardkonformität mit OAuth 2.0

**Nachteile**:

- Erhöhtes Risiko von XSS-Angriffen bei Client-seitiger Speicherung

- Erfordert zusätzliche Client-seitige Logik für Token-Management

- Komplexere Integration mit Browser-basierter Authentifizierung

### Alternative 2: Session-basierte Authentifizierung mit Server-seitiger Speicherung

**Vorteile**:

- Einfache sofortige Token-Widerrufung

- Geringere Datenmenge in Cookies (nur Session-ID)

- Bessere Kontrolle über Sitzungsdauer und -validität

**Nachteile**:

- Erfordert zusätzliche Datenbankabfragen bei jeder Anfrage

- Schlechtere Skalierbarkeit in serverless Umgebungen

- Höhere Latenz durch zusätzliche Datenbankabfragen

### Alternative 3: OAuth 2.0 mit externem Identitätsanbieter

**Vorteile**:

- Auslagern der Authentifizierungskomplexität an spezialisierte Dienste

- Unterstützung für Single Sign-On (SSO)

- Standardisierte Protokolle und Implementierungen

**Nachteile**:

- Erhöhte Komplexität und externe Abhängigkeiten

- Potenziell höhere Kosten für externe Dienste

- Weniger Kontrolle über den Authentifizierungsprozess

## Referenzen

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

- [JWT.io Introduction](https://jwt.io/introduction)

- [MDN HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

- [Cloudflare Workers Authentication Documentation](https://developers.cloudflare.com/workers/examples/auth-with-headers)

- Interne Sicherheitsanalysen und Penetrationstests

- [IETF RFC 6749 - The OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
