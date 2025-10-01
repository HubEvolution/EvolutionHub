# Stytch-Integration: Aktueller Stand (2025-10-01)

**Letzte Analyse:** 2025-10-01T03:16:24+02:00

## Executive Summary

- ✅ **Magic Link:** Vollständig implementiert und produktiv
- ⚠️ **OAuth:** Code vorhanden, aber `STYTCH_PUBLIC_TOKEN` fehlt
- ❌ **Custom Domain:** Vorbereitet, aber nicht konfiguriert
- 🔴 **Kritisch:** Public Token und Redirect-URL-Whitelist vor Production-Launch prüfen

---

## 1. Implementierungsstatus

### Core-Komponenten

| Komponente | Status | Datei |
|-----------|--------|-------|
| Stytch Client | ✅ Aktiv | `src/lib/stytch.ts` |
| Magic Link Request | ✅ Aktiv | `src/pages/api/auth/magic/request.ts` |
| Magic Link Callback | ✅ Aktiv | `src/pages/api/auth/callback.ts` |
| OAuth Start | ⚠️ Vorbereitet | `src/pages/api/auth/oauth/[provider]/start.ts` |
| OAuth Callback | ⚠️ Vorbereitet | `src/pages/api/auth/oauth/[provider]/callback.ts` |

### Environment-Konfiguration

| Environment | AUTH_PROVIDER | Base URL | E2E_FAKE_STYTCH |
|------------|---------------|----------|-----------------|
| Development | `stytch` | `http://127.0.0.1:8787` | `1` (Fake-Modus) |
| Testing | `stytch` | `https://ci.hub-evolution.com` | `0` (Live) |
| Staging | `stytch` | `https://staging.hub-evolution.com` | `0` (Live) |
| Production | `stytch` | `https://hub-evolution.com` | `0` (Live) |

---

## 2. Domain-Konfiguration

### Aktuelle Situation: Standard-Stytch-Domains

**Alle Environments nutzen Standard-Domains:**

- TEST-Projekt → `https://test.stytch.com`
- LIVE-Projekt → `https://api.stytch.com`

**Callback-URLs:**

- Development: `http://127.0.0.1:8787/api/auth/callback`
- Testing: `https://ci.hub-evolution.com/api/auth/callback`
- Staging: `https://staging.hub-evolution.com/api/auth/callback`
- Production: `https://hub-evolution.com/api/auth/callback`

### Custom Domain: Vorbereitet, aber NICHT aktiv

**Vorbereitete Infrastruktur:**

- ✅ Code in `src/pages/api/auth/oauth/[provider]/start.ts` (Zeile 30-32)
- ✅ Setup-Skript: `scripts/cloudflare/setup-stytch-custom-domain.sh`
- ✅ Dokumentation: `docs/ops/stytch-custom-domains.md`

**Was fehlt:**

- ❌ Keine `STYTCH_CUSTOM_DOMAIN` Environment-Variable gesetzt
- ❌ Keine DNS-Records für `login.hub-evolution.com` oder `login-test.hub-evolution.com`
- ❌ Keine Custom Domain im Stytch Dashboard konfiguriert

**Empfohlene Subdomains (falls gewünscht):**

- TEST: `login-test.hub-evolution.com`
- LIVE: `login.hub-evolution.com`

---

## 3. Secrets & Credentials

### Lokale Konfiguration (.env)

```bash
STYTCH_PROJECT_ID=project-test-9ae8446a-d90b-4159-9ee8-441304458865
STYTCH_SECRET=secret-test-zolDGVVKCJV36qEpoXIxHSGUiPkqzf6jt1A=
```

### Fehlende Secrets

| Secret | Erforderlich für | Status |
|--------|-----------------|--------|
| `STYTCH_PUBLIC_TOKEN` | OAuth-Flow | ❌ **FEHLT** |
| `STYTCH_CUSTOM_DOMAIN` | Custom Branding | ❌ Optional |

### Wrangler Secrets (zu verifizieren)

```bash
# Prüfen, welche Secrets gesetzt sind
wrangler secret list --env development
wrangler secret list --env testing
wrangler secret list --env staging
wrangler secret list --env production
```

**Erwartete Secrets pro Environment:**

- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`
- `STYTCH_PUBLIC_TOKEN` (für OAuth)
- `STYTCH_CUSTOM_DOMAIN` (optional)

---

## 4. Kritische Findings

### 🔴 Blocker für OAuth-Launch

#### 1. STYTCH_PUBLIC_TOKEN fehlt

**Problem:** OAuth Start-Endpoint benötigt Public Token (Zeile 29 in `start.ts`)

```typescript
const publicToken = env.STYTCH_PUBLIC_TOKEN as string | undefined;
if (!publicToken) {
  // Fehler: ServerConfig
}
```

**Lösung:**

1. Stytch Dashboard öffnen → Project Overview → API Keys
2. Public Token kopieren
3. In allen Environments setzen:

   ```bash
   printf "<public_token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env development
   printf "<public_token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env testing
   printf "<public_token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env staging
   printf "<public_token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env production
   ```

#### 2. Redirect-URL-Whitelist unklar

**Problem:** Stytch validiert Callback-URLs strikt gegen Whitelist

**Zu prüfen im Dashboard:**

- Configuration → Redirect URLs
- Sind alle Callback-URLs whitelisted?
  - `http://127.0.0.1:8787/api/auth/callback` (Dev)
  - `https://ci.hub-evolution.com/api/auth/callback` (Testing)
  - `https://staging.hub-evolution.com/api/auth/callback` (Staging)
  - `https://hub-evolution.com/api/auth/callback` (Production)

**Fehler bei fehlender Whitelist:**

- `400 no_login_redirect_urls_set`
- `400 no_signup_redirect_urls_set`

---

## 5. Nächste Schritte (Priorisiert)

### Phase 1: Verifizierung (JETZT)

1. **Stytch Dashboard öffnen** (TEST-Projekt)
   - URL: <https://stytch.com/dashboard>
   - Project: `project-test-9ae8446a-d90b-4159-9ee8-441304458865`

2. **Public Token holen**
   - Navigation: Project Overview → API Keys
   - Public Token kopieren

3. **Redirect URLs prüfen**
   - Navigation: Configuration → Redirect URLs
   - Verifizieren: Alle 4 Callback-URLs whitelisted?

4. **Custom Domain-Status prüfen**
   - Navigation: Configuration → Custom Domains
   - Sind `login-test.hub-evolution.com` oder `login.hub-evolution.com` konfiguriert?

### Phase 2: OAuth aktivieren (nach Verifizierung)

5. **Public Token setzen**

   ```bash
   # Alle Environments
   printf "<token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env development
   printf "<token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env testing
   printf "<token>" | wrangler secret put STYTCH_PUBLIC_TOKEN --env production
   ```

6. **OAuth-Flow testen**
   - Development: `http://127.0.0.1:8787/en/login` → "Continue with GitHub"
   - Erwartung: Redirect zu `https://test.stytch.com/v1/public/oauth/github/start?...`

### Phase 3: Custom Domain (optional, empfohlen für Production)

7. **DNS-Records erstellen**

   ```bash
   export CF_API_TOKEN="<your_cloudflare_token>"
   export CF_ZONE_ID="<zone_id>"
   export CF_ROOT_DOMAIN="hub-evolution.com"
   
   # TEST
   ENSURE_CAA=true CF_SUBDOMAIN=login-test \
     STYTCH_TARGET="<from_stytch_dashboard>" \
     ./scripts/cloudflare/setup-stytch-custom-domain.sh
   
   # LIVE
   ENSURE_CAA=false CF_SUBDOMAIN=login \
     STYTCH_TARGET="<from_stytch_dashboard>" \
     ./scripts/cloudflare/setup-stytch-custom-domain.sh
   ```

8. **Stytch Custom Domain verifizieren**
   - Configuration → Custom Domains → Add new
   - Domain eingeben, Verifizierung abwarten (2-10 Min)

9. **Environment-Variable setzen**

   ```bash
   printf "login-test.hub-evolution.com" | \
     wrangler secret put STYTCH_CUSTOM_DOMAIN --env development
   printf "login.hub-evolution.com" | \
     wrangler secret put STYTCH_CUSTOM_DOMAIN --env production
   ```

---

## 6. Technische Details

### Stytch Client (src/lib/stytch.ts)

**Edge-kompatibler Fetch-Client:**

- Keine Node-Dependencies
- Basic Auth: `projectId:secret` als Base64
- Base-URL-Auswahl basierend auf Project-ID-Präfix:
  - `project-live-*` → `https://api.stytch.com`
  - `project-test-*` → `https://test.stytch.com`

**E2E-Fake-Modus:**

- Flag: `E2E_FAKE_STYTCH=1`
- Stub-Responses ohne externe Calls
- Nur in Development aktiv

### Magic Link Flow

1. **Request:** POST `/api/auth/magic/request`
   - Validiert E-Mail, optionale Profilfelder
   - Speichert Redirect in Cookie `post_auth_redirect` (10 Min)
   - Ruft Stytch auf (OHNE Query-Params in Callback-URL)

2. **Callback:** GET `/api/auth/callback`
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

**Status:** Dokumentation erstellt am 2025-10-01T03:16:24+02:00
