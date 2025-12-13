---
description: Runbook für Webscraper Launch (SSRF-Guardrails, Phasen, Cohorts, Limits)
owner: platform/ops
priority: high
lastSync: '2025-11-29'
codeRefs: 'src/pages/api/webscraper/**, src/lib/services/webscraper-service.ts, src/lib/validation/schemas/webscraper.ts, src/config/webscraper.ts, src/types/webscraper.ts'
testRefs: 'tests/integration/api/webscraper.test.ts, tests/unit/services/webscraper-service.test.ts, tests/unit/validation/webscraper-schema.test.ts'
---

# Runbook – Webscraper Launch

## Zweck

Betriebshandbuch für den Launch des Webscrapers mit Fokus auf SSRF-Schutz, Limits, Cohorts und schnellem Rollback. Ergänzt die globale **Tool-Launch-Matrix** (`docs/ops/tool-launch-matrix.md`) und die Webscraper-Regeln (`.windsurf/rules/scraper.md`).

## Environments & Sicherheit

- **Envs (per Wrangler je Env)**
  - `ENVIRONMENT ∈ {development, testing, staging, production}`
  - `BASE_URL`, `PUBLIC_SITE_URL`
- **SSRF-Schutz (verpflichtend; siehe `.windsurf/rules/scraper.md`)**
  - Block private/link-local/loopback IP-Bereiche (RFC1918/4193, 127.0.0.0/8, ::1, fe80::/10, …).
  - Nur Ports 80/443 (oder eng definierte Allowlist) zulassen.
  - DNS-Auflösung + Follow-Redirects, finale Ziel-IP gegen Blocklisten prüfen.
  - Download-Timeout + Max-Size setzen; binäre Inhalte nicht als HTML parsen.
- **Content-Validation**
  - MIME-Allowlist: text/html, text/plain, application/json (projektspezifisch erweitert).
  - Längen-/Encoding-Prüfung im Service; bei Verstoß → `validation_error`.
- **Rate-Limits & Quoten**
  - Rate-Limiter (z. B. `webscraperLimiter`) mit strikter Konfiguration.
  - Tages-/Window-Quoten für User/Gäste serverseitig erzwingen.

### Cohorts (global)

- **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
- **C1** – zahlende Pläne (Pro / Premium / Enterprise)
- **C2** – alle eingeloggten User (inkl. Free)
- **C3** – Gäste / nicht eingeloggte Besucher

## Phasenmatrix (Webscraper)

Auszug aus `docs/ops/tool-launch-matrix.md` für den Webscraper:

| Tool       | Phase | Cohort         | Env/Flags (Prod, exemplarisch) | Limits / Notizen                                         |
|------------|-------|----------------|---------------------------------|----------------------------------------------------------|
| Webscraper | S1    | C1 → C2 (User) | –                               | Nur eingeloggte User; geringe Limits (z. B. 5/min, Tagescap) |
| Webscraper | S2    | optional C3    | –                               | Nur wenn Abuse niedrig; sonst dauerhaft account-only     |

- **S1**: Webscraper nur für eingeloggte User (C1/C2); Gäste ausgeschlossen.
- **S2**: Optionaler Ausbau auf Gäste (C3), falls S1 kosten- und sicherheitsseitig stabil ist.

## Launch-Prozedur

### Phase S1 – Launch für eingeloggte User (C1 → C2)

**Ziel**: Webscraper für eingeloggte User (mind. Pro/Premium, später Free) bereitstellen, ohne Gästezugriff.

#### Prod-Launch-Checkliste S1 (Kurzfassung)

Diese Checkliste gilt für **Production** und fasst die wichtigsten Schritte für S1 zusammen:

- **1. Technische Preflights**
  - `npm run openapi:validate` (falls Webscraper-Endpunkte im OpenAPI dokumentiert sind)
  - `npm run test:integration -- webscraper`
  - `npm run test:unit -- webscraper` (oder entsprechende Vitest-Projekte)
- **2. UI/API-Smokes (Prod)**
  - Als eingeloggter User: `POST /api/webscraper/...` mit gültiger, externer URL → `200`, `success: true`, erwartete JSON-Struktur.
  - Interne/Loopback-Ziel-URL → `forbidden`/`error.type="forbidden"`.
  - Falscher MIME-Type → `validation_error`.
  - Im UI: Formular nur für eingeloggte User sichtbar; Gäste haben keinen funktionalen Request (nur CTA/Redirect).
- **3. Nach Deploy beobachten**
  - Fehler- und 429-Rate, SSRF-Block-Events, Request-Volumen pro User.
  - Kosten (Runtime/KV) im Blick behalten.
- **4. Rollback-Pfad im Kopf behalten**
  - Bei Missbrauch/Kostenproblemen: Gästezugriff hart sperren (nur User), bei Bedarf temporärer Maintenance-Mode (siehe Abschnitt „Rollback“).

1. **Preflight-Checks (Testing/Staging)**
   - `npm run openapi:validate` (sofern Webscraper-Endpunkte im OpenAPI dokumentiert sind).
   - `npm run test:integration -- webscraper`
   - `npm run test:unit -- webscraper` (oder entsprechende Vitest-Projekte; siehe `testRefs`).
   - Manuelle Smokes auf Staging:
     - Gültige URL (öffentlich, http/https) → 200 + validierte Result-JSON-Struktur.
     - Interne/Loopback-Ziel-URL → `403 forbidden` oder definierter `error.type = "forbidden"`.
     - Falsche MIME-Type (z. B. Binärdatei) → `validation_error`.

2. **UI-Exposure (Staging)**
   - Tool-Seiten:
     - `src/pages/en/tools/webscraper/`
     - `src/pages/de/tools/webscraper/`
   - Sicherstellen, dass:
     - Nur eingeloggte User das Formular sehen und Requests auslösen können.
     - Gäste entweder Redirect/CTA auf Login sehen oder gar keinen Zugriff auf den Tool-Screen haben.

3. **Prod-Rollout S1**
   - Bedingungen:
     - Integration-/Unit-Tests grün.
     - Manuelle SSRF-Negativtests bestanden (keine internen Hosts erreichbar).
   - Schritte:
     - Deploy auf Production.
     - UI: Webscraper nur im eingeloggten Zustand anzeigen (vorzugsweise zunächst nur für C1 = Pro/Premium, ggf. via Plan-Gate).
   - Direkt nach Deploy (Prod-Smokes):
     - 1–2 Requests auf harmlose, bekannte Seiten (z. B. eigene Domain) ausführen.
     - Test-Requests auf offensichtliche interne/Loopback-Ziele, um `forbidden` zu validieren.

4. **Ausbau innerhalb S1 (C1 → C2)**
   - Nach einigen Tagen stabiler Nutzung: Free-User in C2 freigeben (UI-Gate anpassen), Limits konservativ belassen.
   - Monitoring auf Missbrauch (viele Requests von wenigen Accounts/IPs, auffällige Host-Ziele).

### Phase S2 – optionaler Gästelaunch (C3)

**Ziel**: Webscraper für Gäste öffnen – nur falls S1 keine nennenswerten Abuse-/Kostensignale zeigt.

1. **Bedingungen für Start von S2**
   - SSRF-Guardrails sind in Logs verifiziert (interne Ziele werden konsequent geblockt).
   - Fehler- und 429-Rate im Rahmen.
   - Kosten (Runtime, externe Calls falls vorhanden) akzeptabel.

2. **UI-Exposure S2**
   - Gäste sehen den Webscraper-Screen, aber mit klarer Limit-Kommunikation und ggf. funktionaler Einschränkung:
     - z. B. nur wenige Requests pro Tag (sehr harte Tagesquote, z. B. 1–2 Scrapes/Tag).
     - Komplexere Optionen nur für eingeloggte User.

3. **Prod-Rollout S2**
   - UI-Änderung deployen (Gäste können Requests auslösen).
   - Kurzfristig enges Monitoring (erste Tage):
     - 4xx-/5xx-Pattern, SSRF-Block-Events, Rate-Limit-Hits.
     - Verteilung Guest vs. User in Logs.

4. **Stop-Kriterien**
   - Auffälliger Anstieg von `forbidden`/`rate_limit`/`server_error` durch Gast-Traffic.
   - Hinweise auf Missbrauch (z. B. systematisches Scannen externer Sites) oder deutlich steigende Kosten.
   - In diesem Fall Rollback auf S1 (siehe „Rollback“).

## Smoke-Tests & Validierung

### API-Smokes (Prod)

- **Eingeloggter User (C1/C2)**
  - `POST /api/webscraper/...` (konkreter Endpoint laut Implementierung) mit:
    - Gültiger URL (öffentliches Ziel, erlaubter Port 80/443).
    - Erwartung: `200`, `success: true`, strukturierte Daten (z. B. Text-/Meta-Infos) gemäß API-Schema.
  - Ungültige URL / verweigerte Hosts:
    - Interne/private IPs oder Loopback → `forbidden` (oder spezifizierter Fehlertyp) mit erklärender Botschaft.
  - Nicht erlaubter Content-Type:
    - Z. B. großes Binärfile oder nicht erlaubtes MIME → `validation_error`.

- **Gast (nur in S2)**
  - Gleiche Smokes wie oben, aber mit strengeren Limits.
  - Bei Überschreiten der Tagesquote → `429` + `Retry-After`.

### UI-Smokes

- Tools-Seiten `…/tools/webscraper` (DE/EN):
  - Als eingeloggter User: Formular sichtbar, Request durchführbar, Ergebnis wird angezeigt.
  - Als Gast **in S1**: kein funktionierender Request (nur CTA oder Redirect auf Login/Pricing).
  - Als Gast **in S2**: Formular nutzbar, aber klare Limit-Kommunikation; nach Erreichen des Limits sinnvolle Fehlermeldung.

## Monitoring

- **Metriken**
  - Request-Rate pro Tag, aufgeteilt nach Guest/User (falls möglich in Logs/Analytics).
  - Fehlerquote nach Typ (`validation_error`, `forbidden`, `rate_limit`, `server_error`).
  - Anzahl der SSRF-Blockereignisse (z. B. interne IP/Port-Blockierung).
- **Rate-Limits & Quoten**
  - Anteil `429`-Responses; Trend beobachten.
  - Spitzenlast (Burst-Verhalten) pro IP/User.
- **Kostensicht**
  - CPU-/Runtime-Kosten (insb. bei vielen oder langen Responses).
  - Storage-/KV-Kosten, falls Scrape-Ergebnisse zwischengespeichert werden.

## Rollback

Rollback bringt den Webscraper immer auf den Zustand S1 („nur eingeloggte User“) oder, falls nötig, in einen temporären Maintenance-Mode.

1. **UI-Rollback auf S1**
   - Gäste:
     - Tool im UI ausblenden oder nur CTA/Info anzeigen.
     - Kein POST an die API durch Gäste mehr ermöglichen.
   - User (C1/C2):
     - Tool bleibt unverändert nutzbar.

2. **API-Rollback (optional)**
   - Bei starkem Missbrauch oder Incident kann temporär:
     - Nur noch eingeloggte User akzeptiert werden (Guest → `403 forbidden`).
     - Oder die API einen `503`-ähnlichen Zustand signalisieren (Maintenance-Mode) – konsistent über `createApiError`.

3. **Nach Rollback prüfen**
   - Rückgang der problematischen Requests (insb. Guest-Traffic oder SSRF-Versuche).
   - Keine neuen 5xx-Spitzen durch falsche Guards.
   - UI: Gäste können das Tool nicht mehr auslösen.

## Referenzen

- **Global**
  - `docs/ops/tool-launch-matrix.md`
  - `.windsurf/rules/scraper.md`
- **Code**
  - `src/pages/api/webscraper/**`
  - `src/lib/services/webscraper-service.ts`
  - `src/lib/validation/schemas/webscraper.ts`
  - `src/config/webscraper.ts`
  - `src/types/webscraper.ts`
- **UI**
  - `src/components/tools/webscraper/WebscraperIsland.tsx`
  - `src/components/tools/webscraper/WebscraperForm.tsx`
  - `src/components/tools/webscraper/WebscraperResults.tsx`
  - `src/pages/en/tools/webscraper/`
  - `src/pages/de/tools/webscraper/`
- **Tests**
  - `tests/integration/api/webscraper.test.ts`
  - `tests/unit/services/webscraper-service.test.ts`
  - `tests/unit/validation/webscraper-schema.test.ts`
