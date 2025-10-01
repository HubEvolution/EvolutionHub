# Stytch-Integration: Aktueller Stand (2025-10-01)

**Letzte Analyse:** 2025-10-01T03:16:24+02:00

## Executive Summary

- ✅ **Magic Link:** Vollständig implementiert und produktiv
- ✅ **OAuth:** Aktiv in Testing und Production (GitHub verifiziert)
- ✅ **Custom Domain:** Aktiv (Testing: `login-test.hub-evolution.com`, Production: `login.hub-evolution.com`)
- ℹ️ **Hinweis:** Server-zu-Stytch API-Calls bleiben über `https://test.stytch.com`/`https://api.stytch.com`; nur der Public OAuth Start nutzt die Custom Domain

---

## 1. Implementierungsstatus

### Core-Komponenten

| Komponente | Status | Datei |
|-----------|--------|-------|
| Stytch Client | ✅ Aktiv | `src/lib/stytch.ts` |
| Magic Link Request | ✅ Aktiv | `src/pages/api/auth/magic/request.ts` |
| Magic Link Callback | ✅ Aktiv | `src/pages/api/auth/callback.ts` |
| OAuth Start | ✅ Aktiv | `src/pages/api/auth/oauth/[provider]/start.ts` |
| OAuth Callback | ✅ Aktiv | `src/pages/api/auth/oauth/[provider]/callback.ts` |

- Development: `http://127.0.0.1:8787/api/auth/callback`
- Testing: `https://ci.hub-evolution.com/api/auth/callback`
- Staging: `https://staging.hub-evolution.com/api/auth/callback`
- Production: `https://hub-evolution.com/api/auth/callback`

### Custom Domain: Aktiv (Testing + Production)

**Aktiver Zustand:**

- ✅ Testing: `login-test.hub-evolution.com` (DNS CNAME → Stytch Target, Proxy: DNS only)
- ✅ Production: `login.hub-evolution.com` (DNS CNAME → Stytch Target, Proxy: DNS only)
- ✅ `STYTCH_CUSTOM_DOMAIN` gesetzt (Host ohne Schema)
- ✅ Stytch Dashboard: Custom Domains „Active“

**CAA-Empfehlung (Root-Domain `hub-evolution.com`):**

- `CAA 0 issue "letsencrypt.org"`
- `CAA 0 issue "ssl.com"`
- `CAA 0 issue "pki.goog"`

**Checks:**

- `dig +short CNAME login-test.hub-evolution.com` → zeigt Stytch Target
- `dig +short CNAME login.hub-evolution.com` → zeigt Stytch Target

  ---

## 3. Secrets & Credentials

### Lokale Konfiguration (.env)

```bash
STYTCH_PROJECT_ID=project-test-9ae8446a-d90b-4159-9ee8-441304458865
STYTCH_SECRET=secret-test-zolDGVVKCJV36qEpoXIxHSGUiPkqzf6jt1A=
```

- `STYTCH_PUBLIC_TOKEN` (für OAuth)
- `STYTCH_CUSTOM_DOMAIN` (optional)

---

## 4. Wichtige Checks & Troubleshooting

### Redirect-URL-Whitelist

**Dashboard prüfen:** Configuration → Redirect URLs → sind Login/Signup-Callbacks whitelisted?

- `http://127.0.0.1:8787/api/auth/callback` (Dev)
- `https://ci.hub-evolution.com/api/auth/callback` (Testing)
- `https://staging.hub-evolution.com/api/auth/callback` (Staging)
- `https://hub-evolution.com/api/auth/callback` (Production)

Fehlerbilder: `400 no_login_redirect_urls_set` / `no_signup_redirect_urls_set`.

### Provider-Enablement

- Stytch → Configuration → OAuth → Provider (GitHub/Google/Apple/Microsoft) „Enabled“ und LIVE/TEST‑Creds hinterlegt.

### Custom Domain Variable

- `STYTCH_CUSTOM_DOMAIN` ohne Schema setzen (z. B. `login.hub-evolution.com`).
- Der Start-Endpoint baut selbst `https://${STYTCH_CUSTOM_DOMAIN}/v1/public/oauth/...`.

  ---

## 5. Nächste Schritte (Priorisiert)

### Abgeschlossen

- Testing: Custom Domain `login-test.hub-evolution.com` aktiv; OAuth (GitHub) erfolgreich; Cookies verifiziert
- Production: Custom Domain `login.hub-evolution.com` aktiv; OAuth (GitHub) erfolgreich; Cookies verifiziert
- Redirect‑URL‑Whitelists in Stytch gesetzt (Dev/Testing/Staging/Prod)
- Secrets gesetzt (`STYTCH_PROJECT_ID`, `STYTCH_SECRET`, `STYTCH_PUBLIC_TOKEN`, `STYTCH_CUSTOM_DOMAIN`)

Weitere Flow-Details:

- Validiert Token mit Stytch
- Upsert User in D1
- Erstellt Session, setzt Cookies (`session_id` + `__Host-session`)
- Redirect zu Ziel (Cookie hat Vorrang vor Query-`r`)

### OAuth Flow

1. **Start:** GET `/api/auth/oauth/:provider/start`
   - Validiert Provider (github, google, apple, microsoft)
   - Ermittelt Base-URL (Custom Domain oder Standard)
   - Redirect zu Stytch OAuth-Endpoint

2. **Callback:** GET `/api/auth/oauth/:provider/callback`
   - Validiert OAuth-Token mit Stytch
   - Identischer User/Session-Flow wie Magic Link

---

## 7. Referenzen

### Dateien

- **Client:** `src/lib/stytch.ts`
- **Magic Link Request:** `src/pages/api/auth/magic/request.ts`
- **Callback:** `src/pages/api/auth/callback.ts`
- **OAuth Start:** `src/pages/api/auth/oauth/[provider]/start.ts`
- **OAuth Callback:** `src/pages/api/auth/oauth/[provider]/callback.ts`

### Dokumentation

- **Migration:** `docs/architecture/auth-migration-stytch.md`
- **Custom Domains:** `docs/ops/stytch-custom-domains.md`

### Skripte

- **DNS Setup:** `scripts/cloudflare/setup-stytch-custom-domain.sh`

### Konfiguration

- **Environments:** `wrangler.toml`
- **Lokale Secrets:** `.env`

---

## 8. Entscheidungsmatrix

### Custom Domain: Ja oder Nein?

| Kriterium | Standard-Domain | Custom Domain |
|-----------|----------------|---------------|
| **Setup-Aufwand** | ✅ Keine Konfiguration | ❌ DNS + Stytch-Verifizierung |
| **Branding** | ❌ `test.stytch.com` sichtbar | ✅ `login.hub-evolution.com` |
| **Nutzervertrauen** | ⚠️ Drittanbieter-Domain | ✅ Eigene Domain |
| **Kosten** | ✅ Kostenlos | ✅ Kostenlos (nur DNS) |
| **Wartung** | ✅ Keine | ⚠️ Zertifikat-Renewal automatisch |

**Empfehlung:**

- **MVP/Testing:** Standard-Domain ausreichend
- **Production-Launch:** Custom Domain empfohlen

---

## 9. Troubleshooting

### OAuth funktioniert nicht

**Symptom:** "ServerConfig"-Fehler beim Klick auf Social-Login-Button

**Ursache:** `STYTCH_PUBLIC_TOKEN` fehlt

**Lösung:** Public Token aus Dashboard holen und setzen (siehe Phase 2)

### 400 no_login_redirect_urls_set

**Ursache:** Callback-URL nicht in Stytch whitelisted

**Lösung:**

1. Stytch Dashboard → Configuration → Redirect URLs
2. Callback-URL hinzufügen (z.B. `https://hub-evolution.com/api/auth/callback`)
3. Speichern und erneut testen

### Custom Domain zeigt nicht

**Symptom:** OAuth leitet zu `test.stytch.com` statt `login.hub-evolution.com`

**Ursache:** `STYTCH_CUSTOM_DOMAIN` nicht gesetzt oder DNS nicht konfiguriert

**Lösung:**

1. DNS-Records prüfen: `dig +short CNAME login.hub-evolution.com`
2. Stytch Dashboard: Custom Domain verifiziert?
3. Environment-Variable gesetzt? `wrangler secret list --env production`

---

**Status:** Aktualisiert am 2025-10-01T08:21:00+02:00
