# Stytch OAuth & Magic Link – Entwicklungsleitfaden (konsolidiert)

Aktueller Stand: 2025-10-10

Dieser Leitfaden bündelt alle Informationen zu Stytch Magic Link und Social OAuth (GitHub, optional Google/Apple/Microsoft) in einem Dokument. Er ersetzt verstreute Notizen in bisherigen Markdown-Dateien.

---

## 1. Überblick

- Laufzeit: Cloudflare Workers (Astro 5 SSR), D1, R2, KV
- Auth-Provider: Stytch Magic Link + Social OAuth
- Custom Domains (Public OAuth Start):
  - Dev/Testing → `login-test.hub-evolution.com`
  - Staging/Prod → `login.hub-evolution.com`
- Server→Stytch API-Base:
  - TEST: `https://test.stytch.com/v1/...`
  - LIVE: `https://api.stytch.com/v1/...`

---

## 2. Environments, Domains, Redirect-URLs

Whiteliste im Stytch Dashboard (Login + Signup Redirect URLs):

- Development: `http://127.0.0.1:8787/api/auth/callback`
- Testing: `https://ci.hub-evolution.com/api/auth/callback`
- Staging: `https://staging.hub-evolution.com/api/auth/callback`
- Production: `https://hub-evolution.com/api/auth/callback`

Custom Domain Variable (host-only, ohne Schema):

- Dev/Testing: `STYTCH_CUSTOM_DOMAIN=login-test.hub-evolution.com`
- Staging/Prod: `STYTCH_CUSTOM_DOMAIN=login.hub-evolution.com`

Hinweis: Der Code baut die Start-URL selbst zu `https://${STYTCH_CUSTOM_DOMAIN}/v1/public/oauth/...`.

---

## 3. Secrets pro Environment (Wrangler)

Erforderlich:

- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`
- `STYTCH_PUBLIC_TOKEN`
- `STYTCH_CUSTOM_DOMAIN` (host-only)

Empfohlene Zuordnung:

- Dev/Testing → TEST-Projekt + `login-test.hub-evolution.com`
- Staging/Prod → LIVE-Projekt + `login.hub-evolution.com`

Beispiele (setzen ohne Werte im Repo):

```sh
# Development
wrangler secret put STYTCH_PROJECT_ID --env development
wrangler secret put STYTCH_SECRET --env development
wrangler secret put STYTCH_PUBLIC_TOKEN --env development
wrangler secret put STYTCH_CUSTOM_DOMAIN --env development

# Testing
wrangler secret put STYTCH_PROJECT_ID --env testing
wrangler secret put STYTCH_SECRET --env testing
wrangler secret put STYTCH_PUBLIC_TOKEN --env testing
# In Testing kann STYTCH_CUSTOM_DOMAIN als env var in wrangler.toml liegen

# Staging
wrangler secret put STYTCH_PROJECT_ID --env staging
wrangler secret put STYTCH_SECRET --env staging
wrangler secret put STYTCH_PUBLIC_TOKEN --env staging
wrangler secret put STYTCH_CUSTOM_DOMAIN --env staging

# Production
wrangler secret put STYTCH_PROJECT_ID --env production
wrangler secret put STYTCH_SECRET --env production
wrangler secret put STYTCH_PUBLIC_TOKEN --env production
wrangler secret put STYTCH_CUSTOM_DOMAIN --env production
```

---

## 4. Endpunkte & Flows

- Magic Link
  - `POST /api/auth/magic/request` → Stytch antriggern
  - `GET  /api/auth/callback` → Token validieren, Session erzeugen, Redirect
- OAuth Social
  - `GET /api/auth/oauth/:provider/start` → 302 zu Stytch (Custom Domain)
  - `GET /api/auth/oauth/:provider/callback` → Code-Exchange bei Stytch, Session erzeugen, Redirect
- Logout
  - `POST /api/auth/logout` → Session invalidieren, Cookies löschen, Redirect

Start-Redirect (vereinfacht):

```ts
// Start: baut die Public URL aus STYTCH_CUSTOM_DOMAIN + public_token
const startUrl = new URL(`/v1/public/oauth/${provider}/start`, `https://${customDomain}`);
startUrl.searchParams.set('public_token', publicToken);
startUrl.searchParams.set('login_redirect_url', loginCbUrl);
startUrl.searchParams.set('signup_redirect_url', signupCbUrl);
return Response.redirect(startUrl, 302);
```

---

## 5. Cookies

- HTTPS-Umgebungen (Testing/Staging/Prod)
  - `__Host-session`: HttpOnly; Secure; SameSite=Strict; Path=/
  - `session_id`: HttpOnly; Secure; SameSite=Lax; Path=/
- Lokal (HTTP):
  - `session_id` aktiv, `__Host-session` nicht gesetzt (erfordert HTTPS)

---

## 6. Middleware & Sicherheit

- Global (`src/middleware.ts`): Session-Gate, CSP-Nonce, Locale, optional Basic-Auth-Gate, immutable-header Fix (Response wird nach `await next()` geklont und neu verpackt).
- API-Middleware (`src/lib/api-middleware.ts`): Security-Header, Same-Origin-Checks bei unsicheren Methoden, optionale Double-Submit-CSRF, Rate Limits.

---

## 7. Entwicklung & Tests

- Local Dev:
  - `npm run dev:worker:dev` (oder `dev:open`)
  - Optional Dev ohne Custom Domain: `STYTCH_CUSTOM_DOMAIN` entfernen → Start nutzt `https://test.stytch.com`.
- Deploy: `wrangler deploy --env testing|staging|production`
- Preflight-Checks (302 + Location):

```sh
curl -sI "http://127.0.0.1:8787/api/auth/oauth/github/start" | sed -n '1p;/^Location:/Ip'
curl -sI "https://ci.hub-evolution.com/api/auth/oauth/github/start" | sed -n '1p;/^Location:/Ip'
curl -sI "https://staging.hub-evolution.com/api/auth/oauth/github/start" | sed -n '1p;/^Location:/Ip'
curl -sI "https://hub-evolution.com/api/auth/oauth/github/start" | sed -n '1p;/^Location:/Ip'
```

- E2E (Browser): `/login` → GitHub → Stytch → Callback → Ziel; `Set-Cookie` prüfen.

---

## 8. Troubleshooting (kurz)

- 500 „Can't modify immutable headers.” → behoben durch Response-Klon in `src/middleware.ts`.
- 400 `no_login_redirect_urls_set` → Callback-URL in Stytch whitelisten.
- "ServerConfig" Redirect → `STYTCH_PUBLIC_TOKEN` fehlt.
- Dev-Callback wird nicht erreicht → Dev Custom Domain entfernen oder HTTPS nutzen.

---

## 9. Referenzpfade (Code)

- OAuth Start/Callback: `src/pages/api/auth/oauth/[provider]/{start,callback}.ts`
- Magic Link Request/Callback: `src/pages/api/auth/{magic/request,callback}.ts`
- Middleware: `src/middleware.ts`
- API Helpers: `src/lib/api-middleware.ts`, `src/lib/security/csrf.ts`

---

## 10. Wartung & Betrieb

- DNS: CNAME `login(-test).hub-evolution.com` → Stytch Target (DNS only)
- Zertifikate: Stytch managt TLS für Custom Domains
- Monitoring: `wrangler tail --env testing|staging|production --format=pretty`

---

## 11. Änderungshistorie

- 2025-10-10: Konsolidierte Doku erstellt; ältere, verstreute Dokumente ausgemistet.
