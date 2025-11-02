<!-- markdownlint-disable MD051 -->

# Rate-Limiting-Dokumentation

## Überblick

Das Rate-Limiting-System des Evolution Hub schützt die API vor Missbrauch, Brute-Force-Angriffen und Denial-of-Service (DoS)-Angriffen. Es begrenzt die Anzahl der Anfragen, die ein Client in einem bestimmten Zeitraum stellen kann, und sorgt so für eine faire Ressourcenverteilung und erhöhte Sicherheit.

## Implementierung

Die Rate-Limiting-Funktionalität ist in `src/lib/rate-limiter.ts` implementiert und verwendet einen In-Memory-Store zur Nachverfolgung von Anfragen. Die Implementierung basiert auf einem Token-Bucket-Algorithmus, der eine flexible und effiziente Ratenbegrenzung ermöglicht.

### Konfigurierte Limiter

Das System bietet drei vorkonfigurierte Limiter für verschiedene API-Typen:

1. **standardApiLimiter**

   - **Limit:** 50 Anfragen pro Minute

   - **Verwendung:** Standard-APIs, öffentliche Endpunkte, Lesezugriffe

   - **Anwendungsbereich:** Dashboard-APIs, Projekt-APIs (GET), User-APIs (GET), öffentliche APIs

1. **authLimiter**

   - **Limit:** 10 Anfragen pro Minute

   - **Verwendung:** Authentifizierungs-Endpunkte

   - **Anwendungsbereich:** Login, Registrierung, Passwort vergessen, Passwort zurücksetzen

1. **sensitiveActionLimiter**

   - **Limit:** 5 Anfragen pro Stunde

   - **Verwendung:** Besonders sensible Aktionen

   - **Anwendungsbereich:** Profiländerungen, Passwortänderungen, Projekt-Erstellung/-Löschung

## Verwendung im Code

Das Rate-Limiting wird als Middleware in den API-Routen implementiert:

```typescript
import { apiRateLimiter, authLimiter, sensitiveActionLimiter } from '@/lib/rate-limiter';

export const POST: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Normale API-Logik...
}

```text

## Antwort bei überschrittenem Limit

Wenn ein Client das Rate-Limit überschreitet, erhält er eine strukturierte JSON-Antwort mit HTTP-Status 429:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "success": false
}
```

Dazu werden entsprechende HTTP-Header gesetzt:

```text
Status: 429 Too Many Requests
Content-Type: application/json
Retry-After: 45

```text

## Konfigurationsoptionen

Die Rate-Limiter können mit verschiedenen Optionen konfiguriert werden:

```typescript
const customLimiter = createRateLimiter({
  windowMs: 60 * 1000,     // Zeitfenster in Millisekunden (hier: 1 Minute)
  maxRequests: 100,        // Maximale Anzahl von Anfragen im Zeitfenster
  message: 'Custom rate limit message',  // Benutzerdefinierte Fehlermeldung
  statusCode: 429,         // HTTP-Statuscode bei Überschreitung
  keyGenerator: (context) => {
    // Benutzerdefinierte Funktion zur Generierung des Schlüssels
    // Standardmäßig wird die IP-Adresse verwendet
    return context.clientAddress || 'unknown';
  }
});
```

## Aktuelle Einschränkungen und zukünftige Verbesserungen

### Einschränkungen

- Der aktuelle In-Memory-Store wird bei Worker-Neustarts zurückgesetzt

- Keine Persistenz über mehrere Worker-Instanzen hinweg

- Keine Berücksichtigung von IP-Proxies oder Load-Balancern

### Geplante Verbesserungen

1. **Persistente Speicherung**

   - Implementierung eines persistenten Speichers mit Cloudflare KV oder D1

   - Beibehaltung der Rate-Limit-Daten über Worker-Neustarts hinweg

1. **Erweiterte Identifikation**

   - Berücksichtigung von X-Forwarded-For und ähnlichen Headers

   - Optionale Authentifizierungsbasierte Rate-Limits (pro Benutzer statt pro IP)

1. **Dynamische Anpassung**

   - Automatische Anpassung der Limits basierend auf der Serverauslastung

   - Temporäre Erhöhung der Limits für vertrauenswürdige Benutzer

1. **Monitoring und Benachrichtigungen**

   - Echtzeit-Monitoring von Rate-Limit-Überschreitungen

   - Benachrichtigungen bei verdächtigen Mustern oder Angriffsversuchen

## Best Practices

1. **Angemessene Limits setzen**

   - Limits sollten hoch genug sein, um normale Nutzung zu erlauben

   - Limits sollten niedrig genug sein, um Missbrauch zu verhindern

   - Unterschiedliche Limits für verschiedene Endpunkttypen verwenden

1. **Benutzerfreundliche Fehlermeldungen**

   - Klare Informationen über das Limit und die Wartezeit

   - Retry-After-Header für automatisierte Clients

1. **Überwachung und Anpassung**

   - Regelmäßige Überprüfung der Rate-Limit-Überschreitungen

   - Anpassung der Limits basierend auf realen Nutzungsmustern

1. **Transparenz**

   - Dokumentation der Rate-Limits in der API-Dokumentation

   - Optionale Header mit verbleibenden Anfragen (X-RateLimit-Remaining)

## Anwendung auf API-Endpunkte

| API-Kategorie | Limiter | Limit | Begründung |
|---------------|---------|-------|------------|
| Auth-APIs | authLimiter | 10/min | Schutz vor Brute-Force-Angriffen auf Anmeldedaten |
| User-APIs (GET) | standardApiLimiter | 50/min | Normale Nutzung des Benutzerprofils |
| User-APIs (PUT/POST) | sensitiveActionLimiter | 5/min | Schutz sensibler Profiländerungen |
| Projekt-APIs (GET) | standardApiLimiter | 50/min | Normale Nutzung der Projektdaten |
| Projekt-APIs (POST/PUT/DELETE) | sensitiveActionLimiter | 5/min | Schutz vor Massenänderungen oder -löschungen |
| Dashboard-APIs | standardApiLimiter | 50/min | Normale Nutzung des Dashboards |
| Öffentliche APIs | standardApiLimiter | 50/min | Schutz vor Scraping und Missbrauch |
