# ADR 0001: JWT-basierte Authentifizierung

## Status

Abgelöst (Superseded)

## Datum

2023-10-15

> Hinweis (2025-09-11): Diese ADR ist historisch und wurde abgelöst. Evolution Hub verwendet keine JWT-basierte oder Passwort-Authentifizierung mehr. Die aktuelle Architektur setzt ausschließlich auf Stytch Magic Link mit serverseitiger Session und dem Cookie `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/). Siehe `docs/architecture/auth-migration-stytch.md`.

## Kontext

Evolution Hub benötigt ein sicheres, skalierbares und benutzerfreundliches Authentifizierungssystem. Die Anwendung wird auf Cloudflare Pages gehostet und verwendet Cloudflare D1 als Datenbank. Wir müssen eine Authentifizierungsstrategie wählen, die:

1. Sicher gegen gängige Angriffe ist
2. Mit der Edge-Computing-Architektur von Cloudflare kompatibel ist
3. Gute Performance bietet, auch bei hoher Last
4. Zustandslose Skalierung ermöglicht
5. Eine gute Benutzererfahrung bietet

## Entscheidung

Wir haben uns für eine JWT (JSON Web Token)-basierte Authentifizierung mit HttpOnly-Cookies entschieden. Die Implementierung umfasst:

1. **Token-Speicherung**: JWTs werden in HttpOnly, Secure, SameSite=Strict Cookies gespeichert
2. **Token-Lebensdauer**: Access-Tokens mit kurzer Lebensdauer (1 Stunde)
3. **Passwort-Hashing**: Bcrypt mit angemessenem Work-Faktor (12)
4. **Rate-Limiting**: IP-basiertes Rate-Limiting für alle Authentifizierungsendpunkte
5. **CSRF-Schutz**: Durch SameSite=Strict Cookies und zusätzliche CSRF-Token für kritische Operationen

## Begründung

### Warum JWT?

- **Zustandslosigkeit**: JWTs enthalten alle notwendigen Informationen und erfordern keine Sitzungsspeicherung auf dem Server
- **Edge-Kompatibilität**: Perfekt für Cloudflare Workers, da keine zentrale Sitzungsspeicherung erforderlich ist
- **Performance**: Reduziert Datenbankabfragen für Authentifizierungsprüfungen
- **Skalierbarkeit**: Ermöglicht horizontale Skalierung ohne gemeinsame Sitzungsspeicherung

### Warum HttpOnly-Cookies statt LocalStorage?

- **Sicherheit**: HttpOnly-Cookies sind gegen XSS-Angriffe geschützt
- **Automatische Übertragung**: Cookies werden automatisch mit jeder Anfrage gesendet
- **Bessere UX**: Keine manuelle Token-Verwaltung im Client-Code erforderlich

### Warum kurze Token-Lebensdauer?

- **Sicherheit**: Begrenzt das Schadenspotenzial bei Token-Diebstahl
- **Balance**: Bietet ausreichend Zeit für normale Benutzerinteraktionen, ohne zu häufige Neuanmeldungen zu erfordern

## Konsequenzen

### Positive Konsequenzen

- Verbesserte Sicherheit durch moderne Best Practices
- Gute Performance durch Reduzierung von Datenbankabfragen
- Einfache Skalierung durch zustandslose Architektur
- Verbesserte Benutzerfreundlichkeit durch automatische Token-Verwaltung

### Negative Konsequenzen

- Erhöhte Komplexität bei der Implementierung von Token-Invalidierung
- Notwendigkeit für zusätzliche Sicherheitsmaßnahmen (CSRF-Schutz, Rate-Limiting)
- Potenziell größere Cookie-Header bei komplexen Benutzerberechtigungen

### Mitigationsstrategien

- Implementierung einer Token-Blacklist für kritische Abmeldeszenarien
- Verwendung von kompakten JWT-Payloads, um die Cookie-Größe zu minimieren
- Regelmäßige Sicherheitsaudits der Authentifizierungsimplementierung

## Alternativen

### Session-basierte Authentifizierung

- **Vorteile**: Einfachere Token-Invalidierung, kleinere Cookie-Größe
- **Nachteile**: Erfordert Sitzungsspeicherung, schlechtere Performance an der Edge, komplexere Skalierung

### OAuth/OIDC mit externen Anbietern

- **Vorteile**: Delegierte Authentifizierung, weniger eigener Code
- **Nachteile**: Abhängigkeit von externen Diensten, komplexere Integration, potenziell schlechtere UX

### API-Keys

- **Vorteile**: Einfache Implementierung, gut für Service-zu-Service-Kommunikation
- **Nachteile**: Schlechtere Benutzererfahrung, höheres Sicherheitsrisiko bei unsachgemäßer Handhabung

## Implementierungsdetails

Die JWT-Authentifizierung wird wie folgt implementiert:

1. **Login-Prozess**:
   - Benutzer sendet Anmeldedaten (E-Mail/Passwort)
   - Server validiert Anmeldedaten gegen die Datenbank
   - Bei erfolgreicher Validierung generiert der Server ein JWT
   - JWT wird in einem HttpOnly-Cookie gesetzt
   - Benutzerinformationen werden an den Client zurückgegeben

2. **Authentifizierungsprüfung**:
   - Middleware extrahiert JWT aus dem Cookie-Header
   - JWT wird validiert (Signatur, Ablaufzeit, Aussteller)
   - Bei erfolgreicher Validierung wird der Benutzerkontext zur Anfrage hinzugefügt
   - Bei fehlgeschlagener Validierung wird ein 401-Fehler zurückgegeben

3. **Logout-Prozess**:
   - Cookie wird mit leerem Wert und sofortigem Ablauf überschrieben

4. **Token-Erneuerung**:
   - Implementierung eines stillen Token-Refresh-Mechanismus vor Ablauf

## Referenzen

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-jwt-bcp)
- [Cloudflare Workers Authentication Guide](https://developers.cloudflare.com/workers/examples/auth-with-headers)
