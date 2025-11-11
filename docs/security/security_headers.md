---
description: 'Übersicht und Richtlinien zu HTTP Security Headers in Evolution Hub'
owner: 'Security Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/middleware.ts, src/lib/api-middleware.ts, docs/security/'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Security-Headers-Dokumentation

## Überblick

Security-Headers aktivieren Browser-Sicherheitsmechanismen gegen XSS, Clickjacking, Downgrade-Angriffe & Co. Im Evolution Hub werden sie an zwei Stellen gesetzt:

1. **Globale Middleware (`src/middleware.ts`)** – betrifft alle HTML/SSR-Antworten. Hier wird pro Request ein CSP-Nonce generiert, die CSP dynamisch aufgebaut, HSTS/Permissions-Policy gesetzt und Logging vorgenommen.
2. **API-Middleware (`@/lib/api-middleware.ts` bzw. `applySecurityHeaders`)** – betrifft JSON-/API-Antworten. Sie ergänzt Standard-Header (z. B. Nosniff, X-Frame-Options) und respektiert die in der globalen Middleware bereits gesetzte CSP.

## Header-Übersicht

| Header | Quelle | Wert / Hinweis |
| --- | --- | --- |
| **Content-Security-Policy** | Globale Middleware | Dynamisch, nonce-basiert (`default-src 'self'; script-src 'self' 'nonce-...' https://static.cloudflareinsights.com ...`). Werte variieren je Umgebung (Dev vs. Prod) und werden in `src/middleware.ts` erzeugt. |
| **Strict-Transport-Security** | API & HTML | `max-age=31536000; includeSubDomains` (Preload wird nur global in Prod aktiven Instanzen gesetzt). |
| **Referrer-Policy** | API & HTML | `strict-origin-when-cross-origin`. |
| **X-Content-Type-Options** | API & HTML | `nosniff`. |
| **X-Frame-Options** | API & HTML | `DENY`. |
| **Permissions-Policy** | API & HTML | `camera=(), microphone=(), geolocation=(), interest-cohort=()`. |
| **Cache-Control** | API | `no-store, max-age=0` für sicherheitskritische Antworten. |
| **X-XSS-Protection** | API | `1; mode=block` (Legacy-Header, für alte Browser belassen; moderne Browser ignorieren ihn). |

> Hinweis: Die CSP wird bewusst nur in der globalen Middleware gesetzt, damit HTML- und Island-Antworten nonce-basierte Skripte nutzen können. API-Antworten sollen keine CSP erzwingen, um Clients nicht einzuschränken.

## Implementierungspfade

- **Globale Middleware:** Siehe `src/middleware.ts` → Abschnitt `generateNonce()` und Response-Header-Setup (nach `await next()`). Dort werden CSP, HSTS, Referrer-Policy, Permissions-Policy u. a. gesetzt.
- **API-Antworten:** `applySecurityHeaders()` in `@/lib/api-middleware.ts` (Quelle `src/lib/security-headers.ts`). Jeder API-Handler, der über `withApiMiddleware` läuft, erhält die Header automatisch – inklusive Rate-Limit-Antworten.

### Beispiel (API)

```typescript
import { withApiMiddleware } from '@/lib/api-middleware';

export const POST = withApiMiddleware(async (context) => {
  // ... API-Logik ...
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Der Rückgabewert wird automatisch durch `applySecurityHeaders` angereichert.

### Beispiel (globale Middleware, Ausschnitt)

```typescript
const cspNonce = generateNonce();
context.locals.cspNonce = cspNonce;

const response = await next();
const headers = response.headers;
headers.set('Content-Security-Policy', buildCsp({ nonce: cspNonce, env: cfEnv }));
headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
headers.set('Permissions-Policy', 'camera=(); microphone=(); geolocation=(); interest-cohort=()');
// ... weitere Header ...

return new Response(response.body, { status: response.status, headers });
```

## Überprüfung und Validierung

Die korrekte Implementierung der Security-Headers kann mit folgenden Tools überprüft werden:

1. **Mozilla Observatory**: <https://observatory.mozilla.org/>
1. **Security Headers**: <https://securityheaders.com/>
1. **CSP Evaluator**: <https://csp-evaluator.withgoogle.com/>

## Best Practices

### 1. Regelmäßige Überprüfung

- Regelmäßige Überprüfung der Security-Headers mit den oben genannten Tools

- Anpassung der Header basierend auf neuen Sicherheitsstandards und Bedrohungen

### 2. Content-Security-Policy

- Beginnen Sie mit einer strengen CSP und lockern Sie sie nur bei Bedarf

- Verwenden Sie `report-uri` oder `report-to`, um CSP-Verstöße zu protokollieren

- Vermeiden Sie `unsafe-inline` und `unsafe-eval`, wenn möglich

### 3. HSTS & Caching

- Prod: `max-age=31536000; includeSubDomains`, optional `preload` (per Flag in Middleware).
- Sensible API-Antworten: `Cache-Control: no-store, max-age=0` (default in API-Middleware).
- Öffentliche Assets/SSR-Seiten können ihre eigenen Cache-Header setzen (Astro-Routen).

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

1. **Subresource Integrity (SRI)**

   - Hinzufügen von Integritätsprüfungen für externe Skripte und Stylesheets

   - Schutz vor kompromittierten CDNs

1. **Erweiterte Permissions-Policy**

   - Bewertung zusätzlicher Browser-Features (z. B. `fullscreen`, `payment`).

1. **Expect-CT / Reporting**

   - Optionales Certificate-Transparency-Reporting für frühere Zertifikatwarnungen.

```text
