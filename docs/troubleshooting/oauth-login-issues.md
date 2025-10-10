# OAuth Login Troubleshooting Guide

> **Zielgruppe:** Entwickler, die OAuth-Login-Probleme in Evolution Hub debuggen
> **Letzte Aktualisierung:** 2025-10-04

---

## 🎯 Übersicht

Dieses Dokument beschreibt häufige OAuth-Login-Probleme und ihre Lösungen für die Evolution Hub Plattform mit Stytch-Integration.

## 🔍 Problem-Kategorien

### 1. "ServerConfig"-Fehler beim OAuth-Button

**Symptom:**

- User klickt auf "Continue with GitHub"
- Browser redirected zu `/login?magic_error=ServerConfig`
- Keine Server-Logs für OAuth-Callback

**Ursache:**
`STYTCH_PUBLIC_TOKEN` fehlt in der Umgebungskonfiguration.

**Lösung:**

1. **Token aus Stytch Dashboard holen:**

   ```bash
   # Stytch Dashboard → API Keys → Public tokens
   # Kopiere den Token für dein Environment (Test/Live)
   ```

2. **Zur `.env` hinzufügen:**

   ```bash
   STYTCH_PUBLIC_TOKEN="public-token-test-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

3. **Server neu starten:**

   ```bash
   npm run dev:worker:dev
   ```

**Verifizierung:**

```bash
# Terminal-Log sollte zeigen:
[auth][oauth][start] redirecting to provider {
  provider: 'github',
  base: 'https://test.stytch.com',
  publicToken: 'public…'
}
```

---

### 2. OAuth erfolgreich, aber Redirect zu `/login`

**Symptom:**

- OAuth-Flow scheinbar erfolgreich
- Terminal-Log zeigt: `[auth][oauth][callback] provider accepted`
- User wird trotzdem zu `/login` zurückgeleitet statt zum Dashboard
- Session-Cookie fehlt im Browser

**Ursache:**
Session-Cookies werden nicht korrekt gesetzt. `context.cookies.set()` in Astro/Wrangler setzt Cookies nicht sofort für Follow-up-Requests.

**Root Cause (technisch):**

1. OAuth-Callback setzt Cookies mit `context.cookies.set()`
2. Redirect zu `/dashboard` erfolgt
3. Dashboard-Request hat **keine Cookies** (weil Response noch nicht abgeschlossen)
4. Middleware erkennt keine Session → Redirect zu `/login`

**Lösung:** (implementiert in v1.7.1)

Cookies explizit im `Set-Cookie` Response-Header setzen:

```typescript
// In src/pages/api/auth/oauth/[provider]/callback.ts
const cookieValue = `session_id=${session.id}; Path=/; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}; Max-Age=${maxAge}`;
const response = createSecureRedirect(redirectTarget);
response.headers.append('Set-Cookie', cookieValue);
return response;
```

**Verifizierung:**

1. **Terminal-Logs prüfen:**

   ```bash
   [auth][oauth][callback] session_id cookie set
   [auth][oauth][callback] response headers Set-Cookie { cookie: 'session_id=...' }
   GET /api/auth/oauth/github/callback -> 302
   GET /en/dashboard -> 200  # ✅ Sollte 200 sein, nicht 302!
   ```

2. **Browser Dev-Tools:**
   - Network Tab → OAuth-Callback-Request
   - Response Headers → `Set-Cookie: session_id=...` vorhanden?
   - Application Tab → Cookies → `session_id` vorhanden?

3. **Middleware-Logs prüfen:**

   ```bash
   [Middleware] Session ID from cookie { requestId: '...', present: true }
   [Middleware] Session validation result { sessionValid: true, userValid: true }
   ```

---

### 3. `__Host-session` Cookie-Fehler (lokale Entwicklung)

**Symptom:**

- Cookie-Setting schlägt still fehl
- Browser zeigt kein `__Host-session` Cookie
- Nur `session_id` Cookie ist vorhanden

**Ursache:**
`__Host-` Cookie-Präfix erfordert:

- `Secure: true` (nur HTTPS)
- `Path: /`
- Keine `Domain`-Attribut

Lokale Entwicklung läuft auf HTTP (`http://127.0.0.1:8787`), daher schlägt `__Host-session` fehl.

**Lösung:** (implementiert in v1.7.1)

`__Host-session` nur auf HTTPS setzen:

```typescript
if (isHttps) {
  context.cookies.set('__Host-session', session.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge,
  });
}
```

Für lokale Entwicklung reicht `session_id` Cookie aus. Die Middleware unterstützt beide:

```typescript
// src/middleware.ts
const sessionId =
  context.cookies.get('__Host-session')?.value ??  // Fallback für HTTPS
  context.cookies.get('session_id')?.value ??      // Für HTTP (lokal)
  null;
```

---

### 4. OAuth-Callback wird nie erreicht

**Symptom:**

- User klickt auf "Continue with GitHub"
- GitHub-Authorization-Seite erscheint
- User authorisiert die App
- **Keine Logs** im Terminal nach GitHub-Redirect
- Browser versucht, `https://login-test.hub-evolution.com/...` zu erreichen

**Ursache:**
`STYTCH_CUSTOM_DOMAIN` ist in lokaler Entwicklung aktiv, aber:

1. Stytch redirected zu Custom Domain
2. GitHub redirected zurück zu Custom Domain
3. Custom Domain redirected zu deiner App
4. Aber lokaler Server (`127.0.0.1:8787`) ist nicht erreichbar von außen

**Lösung:**

1. **`wrangler.toml` anpassen:**

   ```toml
   [env.development.vars]
   # STYTCH_CUSTOM_DOMAIN = "login-test.hub-evolution.com"  # Auskommentiert!
   ```

2. **Redirect-URLs im Stytch Dashboard whitelisten:**
   - Stytch Dashboard → Configuration → Redirect URLs
   - Füge hinzu:
     - `http://127.0.0.1:8787/api/auth/callback` (Magic Link)
     - `http://127.0.0.1:8787/api/auth/oauth/github/callback` (OAuth GitHub)
     - `http://localhost:8787/api/auth/callback` (Alternative)
     - `http://localhost:8787/api/auth/oauth/github/callback` (Alternative)

3. **Server neu starten:**

   ```bash
   npm run dev:worker:dev
   ```

**Verifizierung:**

```bash
# Terminal-Log sollte zeigen:
[auth][oauth][start] redirecting to provider {
  base: 'https://test.stytch.com',  # ✅ Nicht login-test.hub-evolution.com!
  callbackUrl: 'http://127.0.0.1:8787/api/auth/oauth/github/callback'
}
```

---

### 5. 404 auf `/welcome-profile` nach OAuth-Login

**Symptom:**

- OAuth erfolgreich
- Terminal-Log: `[auth][oauth][callback] redirect first-time to welcome-profile`
- Browser zeigt 404: `/welcome-profile` nicht gefunden

**Ursache:**
Lokalisierte Welcome-Profile-Seiten fehlen. OAuth-Callback redirected zu `/welcome-profile`, aber nur `/en/welcome-profile` und `/de/welcome-profile` existieren.

**Lösung:** (implementiert in v1.7.1)

1. **Seiten erstellt:**
   - `src/pages/en/welcome-profile.astro`
   - `src/pages/de/welcome-profile.astro`

2. **Callback lokalisiert Redirect:**

   ```typescript
   let welcomePath = '/welcome-profile';
   if (target.startsWith('/en/')) {
     welcomePath = '/en/welcome-profile';
   } else if (target.startsWith('/de/')) {
     welcomePath = '/de/welcome-profile';
   }
   ```

**Verifizierung:**

```bash
[auth][oauth][callback] redirect first-time to welcome-profile {
  target: '/en/dashboard',
  welcomePath: '/en/welcome-profile'  # ✅ Lokalisiert!
}
```

---

## 🛠 Debugging-Tools

### 1. Terminal-Logs aktivieren

Alle Auth-relevanten Logs sind in Development-Mode aktiv:

```bash
npm run dev:worker:dev

# Wichtige Log-Marker:
[auth][oauth][start]           # OAuth-Start
[auth][oauth][callback]        # OAuth-Callback
[Middleware]                   # Session-Validierung
```

### 2. Browser Dev-Tools

**Network Tab:**

- Filter: `oauth` oder `callback`
- Check Status Codes: `302` (Redirect) → `200` (Success)
- Check Response Headers: `Set-Cookie` vorhanden?

**Application Tab:**

- Cookies → `http://127.0.0.1:8787`
- Erwartete Cookies:
  - `session_id` (immer)
  - `pref_locale` (de/en)
  - `__Host-session` (nur auf HTTPS)

**Console Tab:**

- Fehler bei Redirects?
- CORS-Fehler?

### 3. Stytch Dashboard

- **Redirect URLs:** Configuration → Redirect URLs
- **OAuth Providers:** Configuration → OAuth → GitHub/Google/etc.
- **Custom Domains:** Configuration → Custom Domains
- **Logs:** Dashboard zeigt Auth-Events in Echtzeit

### 4. cURL-Testing

```bash
# Test OAuth-Start
curl -v "http://127.0.0.1:8787/api/auth/oauth/github/start" 2>&1 | grep -i "location"

# Erwartete Response:
# Location: https://test.stytch.com/v1/public/oauth/github/start?...
```

---

## 📋 Checkliste: OAuth-Login funktioniert nicht

- [ ] `STYTCH_PUBLIC_TOKEN` in `.env` gesetzt
- [ ] `STYTCH_PROJECT_ID` und `STYTCH_SECRET` korrekt
- [ ] Redirect-URLs im Stytch Dashboard whitelisted
  - [ ] `http://127.0.0.1:8787/api/auth/oauth/github/callback`
  - [ ] `http://127.0.0.1:8787/api/auth/callback`
- [ ] `STYTCH_CUSTOM_DOMAIN` in `wrangler.toml` für `[env.development]` auskommentiert
- [ ] Server neu gestartet (`npm run dev:worker:dev`)
- [ ] Browser-Cookies gelöscht (F12 → Application → Cookies → Delete all)
- [ ] Terminal-Logs zeigen OAuth-Callback
- [ ] Response-Header enthält `Set-Cookie: session_id=...`
- [ ] Browser-Cookies enthalten `session_id`
- [ ] Dashboard-Zugriff erfolgreich (200, nicht 302)

---

## 🔗 Weitere Ressourcen

- **Stytch Setup:** [docs/ops/stytch-custom-domains.md](../ops/stytch-custom-domains.md)
- **CLAUDE.md Troubleshooting:** [CLAUDE.md](../../CLAUDE.md#-bekannte-probleme--lösungen)
- **Auth-Flow:** [docs/architecture/auth-flow.md](../architecture/auth-flow.md)

---

**Letzte Aktualisierung:** 2025-10-04
**Version:** 1.7.1
**Status:** Aktiv
