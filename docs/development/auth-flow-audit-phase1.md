# Auth-Flow Audit Phase 1

## Aktueller Stand des Auth-Flows

Der aktuelle Auth-Flow basiert auf einer Kombination aus traditioneller Email/Password-Authentifizierung und Magic-Link-Unterstützung. Der Flow umfasst Registrierung, Login, Logout, Passwort-Reset und Session-Management. Die Implementierung verwendet TypeScript-Interfaces in src/lib/services/auth-service.ts und Hono für API-Routen.

## Hinweis: /auth/notify deprecatet

- Der `/auth/notify`‑Zwischenschritt wurde entfernt. Der Callback leitet nun direkt auf das Ziel um. Alle Middleware‑Sonderpfade sowie Cache‑Header rund um `/auth/notify` wurden bereinigt.

## Architektonische Entscheidungen

### Trennung von Server- und Client-Logik
- Server-seitige Logik in src/lib/services/auth-service.ts und API-Routen (z.B. src/pages/api/auth/*).
- Client-seitige Interaktionen in Astro-Komponenten mit client:load-Direktiven, z.B. src/components/scripts/AuthSessionPoller.tsx für Polling.
- Islands-Architektur für optimale Hydration: MagicLinkForm.astro als Island mit client:load für Event-Handling.

### Sicherheitsmaßnahmen
- Double-Opt-In für Registrierung: Unverifizierte Nutzer erhalten keine Session; Middleware redirectet zu /verify-email.
- Rate-Limiting in src/lib/rate-limiter.ts für auth-Endpunkte (10/Minute).
- Session-Management mit KV-Storage und TTL; Logging mit IP-Anonymisierung.
- CSRF-Schutz mit Double-Submit-Cookie für POST/PUT/DELETE.

### i18n-Integration
- Locale-aware Redirects in Middleware.
- Keys in src/locales/de.json/en.json für Auth-Texts (z.B. "emailVerification").

### Cloudflare-Integration
- D1 für User-Daten, KV für Sessions.
- Edge-Worker für API-Routen mit Hono-Typing.

## Setup-Anweisungen

### Lokale Entwicklung
1. Installiere Dependencies: `npm install`.
2. Konfiguriere .env.local mit D1/KV-Bindings (siehe .env.example).
3. Starte Dev-Server: `npm run dev`.
4. Für Tests: `npm run test` (Vitest für Unit/Integration, Playwright für E2E gegen Wrangler).
5. Astro-Check: `npm run check` für TypeScript-Validierung.

### Deployment
- Wrangler für Cloudflare: `wrangler deploy`.
- Separate Environments (dev/staging/prod) mit expliziten Bindings in wrangler.toml.
- Post-Deploy Health-Check via Smoke-Tests.

## Nutzungsbeispiele

### MagicLinkForm.astro
Diese Komponente handhabt Magic-Link-Submission und Polling für Session-Status.

**Beispiel-Code (src/components/auth/MagicLinkForm.astro):**
```astro
---
// Server-seitige Props-Validierung
interface Props {
  email?: string;
}
const { email } = Astro.props as Props;
---

<form client:load action="/api/auth/magic/request" method="POST">
  <Input type="email" name="email" value={email || ''} label="E-Mail" />
  <Button type="submit">Magic Link senden</Button>
</form>

<script client:load>
  import { AuthSessionPoller } from '../scripts/AuthSessionPoller.tsx';
  <AuthSessionPoller />;
</script>
```

**Nutzung in Login-Seite:**
In src/pages/login.astro importieren und rendern. Nach Submission, Poller prüft Session und redirectet bei Erfolg.

### Auth-Service-Nutzung
In API-Routen:
```ts
import { createAuthService } from '@/lib/services/auth-service';
const authService = createAuthService();

const result = await authService.login(email, password);
if (result) {
  setCookie(response, 'sessionId', result.sessionId);
}
```

## Bekannte Einschränkungen
- Kein 2FA (geplant für Phase 2).
- Session-Polling kann Batterie verbrauchen; optimiere mit WebSockets in Zukunft.
- i18n-Keys müssen compile-time validiert werden (siehe scripts/i18n-validate.mjs).

## Changelog
- v1.0: Initial Audit.
- v1.1: TSDoc-Ergänzungen und i18n-Validierung.