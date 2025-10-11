# Bugfix: Session Cookie Fallback (2025-10-01)

## Problem

Nach dem Login (Dashboard) zeigte der Plan-Badge "Starter" an, aber beim Navigieren zum AI Image Enhancer wurde der Badge auf "Guest" gewechselt, obwohl der User eingeloggt war.

### Root Cause

Die Middleware (`src/middleware.ts`) las nur das `session_id`-Cookie (SameSite=Lax), aber nicht das `__Host-session`-Cookie (SameSite=Strict).

Beim Auth-Callback werden **beide Cookies** gesetzt:

- `session_id`: SameSite=Lax, für Cross-Site-Navigation
- `__Host-session`: SameSite=Strict, sicherer, aber nur Same-Site

Bei bestimmten Navigationen (z.B. Client-Side-Navigation oder nach Redirects) konnte es vorkommen, dass nur `__Host-session` verfügbar war, aber die Middleware dieses nicht las → `locals.user` blieb `null` → API erkannte User als Guest.

## Lösung

**Middleware** (`src/middleware.ts`, Zeile 455):

```typescript
// Try __Host-session first (stricter, SameSite=Strict), fallback to session_id (SameSite=Lax)
const sessionId = context.cookies.get('__Host-session')?.value ?? context.cookies.get('session_id')?.value ?? null;
```

Die Middleware prüft jetzt **beide Cookie-Namen** mit Fallback-Logik:

1. Erst `__Host-session` (bevorzugt, da sicherer)
2. Falls nicht vorhanden, `session_id` (Fallback für Kompatibilität)

## Betroffene Dateien

- `src/middleware.ts`: Session-Cookie-Lesung mit Fallback
- `src/pages/api/ai-image/usage.ts`: Keine Änderung nötig (nutzt `locals.user` korrekt)

## Testing

1. **Login** via Magic Link oder OAuth
2. **Navigiere zum Dashboard** → Plan-Badge sollte "Starter" (oder dein Plan) zeigen
3. **Navigiere zum Image Enhancer** (`/en/tools/imag-enhancer`) → Plan-Badge sollte **gleich bleiben** (nicht "Guest")
4. **Prüfe DevTools** → Network → `/api/ai-image/usage`:
   - Response Header `X-Usage-OwnerType` sollte `user` sein
   - Response Header `X-Usage-Plan` sollte `free` (oder dein Plan) sein

## Weitere Schritte

- [ ] Testen auf allen Umgebungen (Dev, Testing, Staging, Production)
- [ ] Überlegen: Langfristig nur `__Host-session` nutzen (Migration)
- [ ] Dokumentieren: Cookie-Strategie in `docs/architecture/auth-migration-stytch.md`
