# Security-Headers-Dokumentation

## Überblick

Security-Headers sind HTTP-Antwort-Header, die dazu beitragen, die Sicherheit von Webanwendungen zu verbessern, indem sie Browser-Sicherheitsmechanismen aktivieren und verschiedene Arten von Angriffen wie Cross-Site-Scripting (XSS), Clickjacking und andere Code-Injections verhindern. Im Evolution Hub werden diese Headers systematisch auf allen API-Endpunkten implementiert.

## Implementierte Security-Headers

Das Evolution Hub implementiert folgende Security-Headers für alle API-Antworten:

### 1. Content-Security-Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://secure.gravatar.com; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';
```

**Zweck:** Schützt vor XSS-Angriffen, indem festgelegt wird, welche Ressourcen geladen werden dürfen.

**Details:**

- `default-src 'self'`: Standardmäßig dürfen Ressourcen nur von der eigenen Domain geladen werden
- `script-src 'self'`: JavaScript darf nur von der eigenen Domain geladen werden
- `style-src 'self'`: CSS darf nur von der eigenen Domain geladen werden
- `img-src 'self' data: https://secure.gravatar.com`: Bilder dürfen von der eigenen Domain, als Data-URLs und von Gravatar geladen werden
- `object-src 'none'`: Keine Plugins wie Flash oder Java erlaubt
- `frame-ancestors 'none'`: Die Seite darf nicht in Frames eingebettet werden (ähnlich wie X-Frame-Options: DENY)

### 2. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Zweck:** Verhindert, dass der Browser den MIME-Typ einer Ressource "errät" und stattdessen strikt den vom Server angegebenen Content-Type verwendet.

**Details:**

- Schützt vor MIME-Type-Sniffing-Angriffen
- Besonders wichtig für Dateien, die vom Benutzer hochgeladen werden

### 3. X-Frame-Options

```
X-Frame-Options: DENY
```

**Zweck:** Verhindert, dass die Seite in einem Frame, iframe oder object eingebettet wird.

**Details:**

- `DENY`: Verbietet jegliches Einbetten der Seite
- Schützt vor Clickjacking-Angriffen

### 4. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Zweck:** Aktiviert den XSS-Filter im Browser.

**Details:**

- `1`: Aktiviert den XSS-Filter
- `mode=block`: Blockiert die gesamte Seite, wenn ein XSS-Angriff erkannt wird
- Obwohl dieser Header in modernen Browsern als veraltet gilt (zugunsten von CSP), wird er für ältere Browser beibehalten

### 5. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Zweck:** Kontrolliert, welche Referrer-Informationen an andere Websites gesendet werden.

**Details:**

- `strict-origin-when-cross-origin`: Sendet die vollständige URL als Referrer bei Anfragen an dieselbe Herkunft, nur die Herkunft bei Anfragen an andere sichere Herkunft (HTTPS → HTTPS) und kein Referrer bei Anfragen an unsichere Herkunft (HTTPS → HTTP)

### 6. Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Zweck:** Erzwingt HTTPS-Verbindungen und verhindert SSL-Stripping-Angriffe.

**Details:**

- `max-age=31536000`: Der Browser sollte diese Domain für ein Jahr (in Sekunden) als HTTPS-only behandeln
- `includeSubDomains`: Die Regel gilt auch für alle Subdomains
- `preload`: Die Domain kann in die HSTS-Preload-Liste der Browser aufgenommen werden

### 7. Cache-Control

```
Cache-Control: no-store, max-age=0
```

**Zweck:** Verhindert das Caching sensibler Daten.

**Details:**

- `no-store`: Der Browser darf die Antwort nicht speichern
- `max-age=0`: Die Antwort ist sofort veraltet

### 8. Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

**Zweck:** Kontrolliert, welche Browser-Features die Anwendung nutzen darf.

**Details:**

- Deaktiviert den Zugriff auf Kamera, Mikrofon, Geolocation und FLoC (Federated Learning of Cohorts)
- Verhindert unerwünschten Zugriff auf Benutzergeräte und -daten

## Implementierung im Code

Die Security-Headers werden in `src/lib/security.ts` implementiert und als Middleware in allen API-Routen verwendet:

```typescript
import { applySecurityHeaders } from '@/lib/security';

export const POST: APIRoute = async (context) => {
  // Security-Headers anwenden
  const response = await handler(context);
  return applySecurityHeaders(response);
}
```

Die `applySecurityHeaders`-Funktion fügt alle oben genannten Headers zu jeder API-Antwort hinzu:

```typescript
export function applySecurityHeaders(response: Response): Response {
  // Bestehende Headers kopieren
  const headers = new Headers(response.headers);
  
  // Security-Headers hinzufügen
  headers.set('Content-Security-Policy', 'default-src \'self\'; script-src \'self\'; ...');
  headers.set('X-Content-Type-Options', 'nosniff');
  // ... weitere Headers ...
  
  // Neue Response mit den aktualisierten Headers erstellen
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

## Anpassung für spezifische Endpunkte

Für bestimmte Endpunkte können die Standard-Security-Headers angepasst werden:

```typescript
export function applyCustomSecurityHeaders(response: Response, options: SecurityHeaderOptions): Response {
  // Standard-Headers anwenden
  const secureResponse = applySecurityHeaders(response);
  const headers = new Headers(secureResponse.headers);
  
  // Benutzerdefinierte Anpassungen
  if (options.allowFrames) {
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    // CSP frame-ancestors entsprechend anpassen
  }
  
  if (options.allowInlineScripts) {
    // CSP script-src anpassen, um 'unsafe-inline' hinzuzufügen
    const csp = headers.get('Content-Security-Policy') || '';
    headers.set('Content-Security-Policy', csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
  }
  
  // Neue Response mit den angepassten Headers erstellen
  return new Response(secureResponse.body, {
    status: secureResponse.status,
    statusText: secureResponse.statusText,
    headers
  });
}
```

## Überprüfung und Validierung

Die korrekte Implementierung der Security-Headers kann mit folgenden Tools überprüft werden:

1. **Mozilla Observatory**: <https://observatory.mozilla.org/>
2. **Security Headers**: <https://securityheaders.com/>
3. **CSP Evaluator**: <https://csp-evaluator.withgoogle.com/>

## Best Practices

### 1. Regelmäßige Überprüfung

- Regelmäßige Überprüfung der Security-Headers mit den oben genannten Tools
- Anpassung der Header basierend auf neuen Sicherheitsstandards und Bedrohungen

### 2. Content-Security-Policy

- Beginnen Sie mit einer strengen CSP und lockern Sie sie nur bei Bedarf
- Verwenden Sie `report-uri` oder `report-to`, um CSP-Verstöße zu protokollieren
- Vermeiden Sie `unsafe-inline` und `unsafe-eval`, wenn möglich

### 3. HSTS

- Beginnen Sie mit einer kurzen `max-age` und erhöhen Sie sie schrittweise
- Testen Sie gründlich, bevor Sie `includeSubDomains` aktivieren
- Fügen Sie die Domain zur HSTS-Preload-Liste hinzu, wenn Sie sicher sind

### 4. Caching-Kontrolle

- Verwenden Sie `no-store` für sensible Daten
- Verwenden Sie `private` für benutzerspezifische, aber nicht sensible Daten
- Setzen Sie angemessene `max-age`-Werte für statische Ressourcen

## Anwendung auf API-Endpunkte

| API-Kategorie | Besondere Header-Anpassungen | Begründung |
|---------------|------------------------------|------------|
| Auth-APIs | Cache-Control: no-store | Verhindert das Caching von Authentifizierungsdaten |
| User-APIs | Cache-Control: no-store | Schützt persönliche Benutzerdaten |
| Projekt-APIs | Standard-Headers | Ausreichender Schutz für Projektdaten |
| Dashboard-APIs | Standard-Headers | Ausreichender Schutz für Dashboard-Daten |
| Öffentliche APIs | Angepasste CSP für Drittanbieter-Inhalte | Erlaubt die Integration von Drittanbieter-Ressourcen |

## Zukünftige Verbesserungen

1. **Report-Only-Modus**
   - Implementierung von `Content-Security-Policy-Report-Only` für neue CSP-Regeln
   - Sammlung von Verstößen, bevor strikte Regeln durchgesetzt werden

2. **Subresource Integrity (SRI)**
   - Hinzufügen von Integritätsprüfungen für externe Skripte und Stylesheets
   - Schutz vor kompromittierten CDNs

3. **Feature-Policy/Permissions-Policy**
   - Erweiterung der Permissions-Policy um weitere Browser-Features
   - Feinere Kontrolle über erlaubte Features

4. **Expect-CT**
   - Implementierung von Certificate Transparency
   - Erkennung von falsch ausgestellten SSL-Zertifikaten
