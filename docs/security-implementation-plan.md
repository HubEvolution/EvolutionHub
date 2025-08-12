# Security-Implementation-Plan

## Überblick
Dieses Dokument beschreibt die Strategie für die Implementierung und Erweiterung von Sicherheitsfeatures, insbesondere für API-Endpunkte, die noch nicht vollständig abgesichert sind. Es integriert Erkenntnisse über bekannte Sicherheitsprobleme und Verbesserungspotenziale bestehender Implementierungen.

## 1. Aktueller Status und bekannte Probleme

### 1.1 Bereits etablierte Sicherheitsmechanismen
Folgende Kernsicherheitsmechanismen sind systemweit implementiert und decken die meisten API-Endpunkte ab:
- **Rate-Limiting**: Implementiert zur Abwehr von Brute-Force- und DoS-Angriffen. (Bekanntes Problem: Die aktuelle In-Memory-Speicherung ist nicht persistent, siehe Abschnitt 1.2.3)
- **Security-Headers**: Breites Set an Headern zur Reduzierung gängiger Web-Sicherheitsrisiken.
- **Audit-Logging**: Umfassendes Logging sicherheitsrelevanter Ereignisse.
- **Input-Validierung**: Verhindert Injection-Angriffe und Datenmanipulation, insbesondere bei User-bezogenen APIs (`/api/user/me`, `/api/user/profile`).

### 1.2 Bekannte Sicherheitsprobleme und Verbesserungspotenziale
Bei der Überprüfung der bestehenden Implementierungen wurden spezifische Probleme identifiziert, die bei der weiteren Absicherung der APIs adressiert werden müssen:

#### 1.2.1 Auth-API-Probleme
Diese APIs sind als kritisch eingestuft und erfordern besondere Sorgfalt bei der Absicherung:
- **Unspezifische Fehlerbehandlung**: Insbesondere bei der `forgot-password.ts` API werden oft generische Fehlermeldungen zurückgegeben, anstatt spezifische Codes wie `InvalidToken` oder `ExpiredToken` zu nutzen. Dies erschwert die Fehleranalyse.
- **User-Enumeration-Risiken**: Die `forgot-password.ts` API gibt unterschiedliche Antworten basierend auf der Existenz eines Benutzers, was Rückschlüsse auf Benutzernamen zulässt. Die Antworten sollten konsistent gehalten werden.
- **Probleme beim E-Mail-Versand**: Der Versand von Passwort-Reset-E-Mails schlägt häufig fehl oder gibt generische Fehler zurück, was die Funktionalität beeinträchtigt.
- **Inkonsistente Redirect-URLs und Fehlerparameter**: Die URLs für Weiterleitungen nach Fehlern sind inkonsistent formatiert, was zu Inkonsistenzen in der Benutzererfahrung führt.

#### 1.2.2 API-Resilienz und Fehlerhandling
Generelle Empfehlungen zur Verbesserung der Robustheit aller APIs:
- **Konsistente try/catch-Blöcke**: Sicherstellen, dass alle APIs umfassend fehlerbehandelt sind.
- **Spezifische Fehlercodes**: Einführung spezifischer Fehlercodes (z.B. `ValidationError`, `NotFound`, `Forbidden`, `ExpiredToken`) zur klareren Kommunikation von Fehlern an den Client und für das Logging.
- **Zentrales Fehlerhandling**: Implementierung eines zentralen Moduls zur einheitlichen Fehlerbehandlung über alle APIs hinweg.

#### 1.2.3 Rate-Limiting-Einschränkungen
- **In-Memory-Speicherung**: Das aktuelle Rate-Limiting nutzt einen In-Memory-Store, der bei Worker-Neustarts zurückgesetzt wird. Dies bietet keine persistente Absicherung über Neustarts hinweg. Eine Umstellung auf eine persistente Lösung (z.B. Cloudflare KV oder D1) ist empfohlen, um die Konsistenz über verschiedene Instanzen hinweg zu gewährleisten.

### 1.3 APIs mit unvollständiger Implementierung der Kern-Sicherheitsfeatures
Die folgenden APIs sind noch nicht vollständig mit allen Kern-Sicherheitsfeatures ausgestattet oder weisen die oben genannten Probleme auf und erfordern eine gezielte Implementierung/Korrektur.

#### Hohe Priorität (Authentication)
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/forgot-password` (spezifische Behebung von Fehlhandling, User-Enumeration und E-Mail-Versand-Problemen notwendig)
- `/api/auth/reset-password` (spezifische Behebung von Fehlhandling notwendig)
- `/api/user/logout`

#### Mittlere Priorität (Projekt-APIs)
- `/api/projects/*` - Alle Projekt-bezogenen Endpunkte
- `/api/dashboard/*` - Dashboard-Endpunkte mit sensiblen Daten

#### Niedrige Priorität (Öffentliche APIs)
- `/api/comments` - Öffentliches Kommentar-System
- `/api/tools` - Öffentliche Utility-Endpunkte
- Weitere öffentliche Endpunkte

## 2. Implementierungsstrategie

### Phase 1: Security-Module einbinden und Kern-APIs absichern
Für jeden API-Endpoint müssen folgende Module eingebunden werden:
```typescript
// Rate-Limiting (mit Fokus auf Persistenz-Upgrade für Auth-APIs)
import { 
  standardApiLimiter, 
  authLimiter, 
  sensitiveActionLimiter 
} from '@/lib/rate-limiter';

// Security-Headers
import { 
  secureJsonResponse, 
  secureErrorResponse
} from '@/lib/security-headers';

// Audit-Logging
import {
  logAuthSuccess,
  logAuthFailure,
  logApiError,
  logPermissionDenied
} from '@/lib/security-logger';
```
**Anpassung für Auth-APIs**:
- Implementieren/korrigieren Sie spezifische Fehlerbehandlung (z.B. `InvalidToken`, `ExpiredToken`) und User-Enumeration-Schutz.
- Stellen Sie die korrekte und konsistente Weiterleitungs-URL-Struktur sicher.
- Beheben Sie Probleme bei der E-Mail-Versandlogik für Passwort-Resets.

### Phase 2: API-Endpunkte absichern (Musterbeispiel)

Für jeden API-Endpoint nach folgendem Muster implementieren, unter Berücksichtigung der spezifischen Fehlerbehandlung:
```typescript
export async function POST(context: APIContext): Promise<Response> {
  // 1. Rate-Limiting anwenden (je nach API-Typ, mit Blick auf Persistenz)
  const rateLimitResponse = await authLimiter(context); // Für Auth-APIs
  // ODER ...
  
  if (rateLimitResponse) {
    return rateLimitResponse; // Wenn Rate-Limit überschritten wurde
  }
  
  try {
    // 2. Ursprüngliche API-Logik (z.B. Authentifizierung, Datenverarbeitung)
    // ...
    
    // 3. Erfolgsfall protokollieren (wenn relevant)
    logAuthSuccess(userId, {
      action: 'login', 
      ip: context.clientAddress
    });
    
    // 4. Sichere Antwort mit Headers senden (prüfen auf spezifische Fehlercodes für Auth-APIs)
    return secureJsonResponse({ success: true, data: result }, 200);
  } catch (error) {
    // 5. Fehler protokollieren
    logApiError('/api/example', error, { 
      userId: userId || 'anonymous',
      action: 'example_action'
    });
    
    // 6. Spezifische Fehlerbehandlung für Auth-APIs, User-Enumeration vermeiden:
    //    - Z.B. Unterscheidung zwischen InvalidToken, ExpiredToken, EmailSendError
    //    - Zentrales Fehlerhandling nutzen, wo möglich
    //    - Generische, aber sichere Fehlermeldung für den Benutzer
    const specificErrorCode = getSpecificErrorCode(error); // Hilfsfunktion zur Fehlerkategorisierung
    return secureErrorResponse(`Ein Fehler ist aufgetreten (${specificErrorCode})`, getErrorStatusCode(specificErrorCode));
  }
}
```

## 3. Testing-Strategie

Für jeden angepassten API-Endpoint:
1.  **Unit-Tests erstellen/anpassen**:
    *   Tests für Rate-Limiting (inkl. Mocking für ggf. persistente Speicher).
    *   Tests für korrekte Security-Headers.
    *   Tests für korrektes Logging-Verhalten.
    *   **Tests für spezifische Auth-Fehlercodes, die Behebung von User-Enumeration und die korrekte E-Mail-Versandlogik.**
    *   Bestehende Funktionalitätstests anpassen.
2.  **Test-Mocks erweitern**:
    *   Sicherstellen, dass Mocks für Authentifizierung, Rate-Limiting und Logging die neuen Fehlercases abdecken und die persistente Speicherung simulieren können.

## 4. Umsetzungsplan (Angepasste Prioritäten)

Der Plan berücksichtigt die Behebung bekannter Probleme als Teil der Implementierung und Erweiterung der Funktionalität:

### Woche 1: Authentication-APIs & Kern-Fehlerbehebung
- Anpassen und Testen von `/api/auth/login` und `/api/auth/register` unter Beachtung der Kernsicherheitsfeatures.
- **Prioritäre Behebung der unspezifischen Fehlerbehandlung, User-Enumeration-Risiken und Probleme beim E-Mail-Versand in `/api/auth/forgot-password` und `/api/auth/reset-password`.**
- Anpassen und Testen von `/api/user/logout`.
- **Umstellung des Rate-Limitings auf eine persistente Lösung für alle Auth-APIs, um Konsistenz zu gewährleisten.**

### Woche 2: Projekt- und Dashboard-APIs
- Absicherung aller Projekt-APIs (`/api/projects/*`) mit Kern-Sicherheitsfeatures, inklusive robuster Fehlerbehandlung.
- Absicherung aller Dashboard-APIs (`/api/dashboard/*`) mit Kern-Sicherheitsfeatures.
- Erstellung/Anpassung von Unit- und ggf. Integrationstests für diese APIs.

### Woche 3: Übrige APIs und Abschluss
- Absicherung der restlichen öffentlichen APIs (`/api/comments`, `/api/tools`, etc.) mit Kern-Sicherheitsfeatures.
- Durchführung von erweiterten Integrationstests für alle betroffenen Endpunkte.
- **Qualitätssicherung und Überprüfung der behobenen Probleme (Fehlerbehandlung, User-Enumeration, Rate-Limiting-Persistenz, E-Mail-Versand).**
- Aktualisierung der Dokumentation für alle betroffenen APIs.

## 5. Monitoring und Validierung

Nach der Implementierung und Fehlerbehebung sind folgende Schritte zur Überwachung und Validierung essenziell:
1.  **Monitoring einrichten**: Konfiguration von Alerts für Rate-Limiting-Events (insbesondere auf persistente Speicherdaten), Überwachung von Fehlermeldungen im Audit-Log und Prüfung der korrekten Header.
2.  **Validierung**: Durchführung von Security-Scans (z.B. OWASP ZAP), manuellen Tests und ggf. Penetrationstests, mit besonderem Fokus auf die behobenen Auth-API-Probleme, um die erfolgreiche Integration der Sicherheitsmaßnahmen zu bestätigen.

## 6. Dokumentation
Für jeden API-Endpoint die Dokumentation zukünftig aktualisieren mit:
- Angewendete Rate-Limits und deren Persistenzstatus.
- Gesetzte Security-Headers.
- Logging-Verhalten und wichtige Event-Typen.
- Detaillierte Dokumentation der spezifischen Fehlercodes, des User-Enumeration-Schutzes und Empfehlungen zur API-Resilienz.
- Beispielantworten mit Headers und möglichen Fehlercodes.
