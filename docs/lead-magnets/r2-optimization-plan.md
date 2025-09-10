# Lead-Magnet Delivery – R2 Optimization Plan (Variante B)

Ziel: Große Dateien (PDF/ZIP) effizient, sicher und kostengünstig ausliefern – ohne Build-Größe zu erhöhen.
Runtime: Cloudflare Workers (Edge). Keine Node-spezifischen APIs. Siehe Cloudflare Patterns.

## Ziele

- Performance: Edge-nahe Auslieferung, Streaming-Response, Cache-Unterstützung.
- Sicherheit: Optionales Download-Gating (Token), Audit-Logs in D1, Rate-Limiting möglich.
- Einfachheit: API bleibt unter `src/pages/api/lead-magnets/`, Frontend-Links bleiben stabil.

## Architektur-Varianten

- Variante B1 – Worker-Proxy (empfohlen zuerst):
  - Dateien privat in R2.
  - Download-Endpoint im Worker liest via `env.R2_LEADMAGNETS.get(key)` und streamt die Datei.
  - Vorteile: volle Kontrolle (Auth/Tokens/Headers/Logging), keine zusätzlichen SDKs.
- Variante B2 – Signierte URLs (optional):
  - Endpoint gibt kurzlebige signierte URL zurück; Browser lädt direkt von R2.
  - Vorteile: weniger Edge-Kosten bei vielen/parallelen Downloads.
  - Aufwand: Implementierung eines robusten Signatur- und Ablauf-Mechanismus.

## Ressourcen & Bindings

- R2 Bucket (privat): `R2_LEADMAGNETS`
- D1 (Audit): Tabelle `download_audit` (id, created_at, ip, user_id nullable, asset_key, status, bytes)
- Optional KV (Token-Revocation / Rate-Limits): `KV_TOKENS`

## API-Design

- GET `/api/lead-magnets/download?key=<asset>`
  - Prüft optionales Token (`t`), Ablauf (`exp`), Herkunft/IP (optional).
  - Liest Objekt aus R2, setzt `Content-Type`, `Content-Length`, `Content-Disposition`.
  - Streamt Response, schreibt Audit-Log (D1).
- Optional: HEAD `/api/lead-magnets/download?key=<asset>`
  - Liefert nur Metadaten (Größe, Typ), dient Preflight/Frontend.
- Optional: GET `/api/lead-magnets/sign?key=<asset>`
  - Erzeugt kurzlebigen Download-Token oder signierte URL (B2).

## Token-Schema (B1/B2)

- HMAC-Signatur mit Secret `LEADMAGNET_TOKEN_SECRET` (env).
- Claims: `key`, `exp` (unix ts), optional `ip`.
- Token-Format: base64url(header).base64url(payload).base64url(signature) oder kompaktes HMAC-{payload}.{sig}.
- Prüfung im Worker: Zeitfenster, HMAC, optional IP-Match. Revocation optional via KV.

## Beispiel-Header

- `Content-Disposition: attachment; filename="<name>"`
- `Cache-Control: private, max-age=0` (für gated Downloads); für public Previews: `public, max-age=3600, immutable`
- `X-Download-Id: <uuid>` (Korrelation mit Audit)

## Caching

- Private/Gated: eher nicht cachen, oder kurzen Edge-Cache (<= 60s) ohne Browser-Cache.
- Public Files (z. B. freie Assets): Edge-Cache via `caches.default` einschalten.

## Migrationsschritte

1) Bucket anlegen: `R2_LEADMAGNETS` (privat). Assets hochladen (`new-work-*.pdf`, `ki-tools-*.pdf`, `produktivitaets-*.pdf`).
2) `wrangler.toml`: R2 Binding ergänzen. Beispiel:

   ```toml
   [[r2_buckets]]
   binding = "R2_LEADMAGNETS"
   bucket_name = "evolution-hub-lead-magnets"
   preview_bucket_name = "evolution-hub-lead-magnets-dev"
   ```

3) API implementieren: `src/pages/api/lead-magnets/download.ts` auf Worker-R2-Proxy umbauen (B1). Token-Check optional.
4) Audit-D1 Migration: Tabelle anlegen und Insert im Download-Flow.
5) Frontend-Links prüfen: CTAs verlinken weiter `/api/lead-magnets/download?key=...`.
6) Rate-Limiting (optional): simple IP/Token basierte Limits (KV Zähler + TTL).
7) Monitoring: Logs (Workers), Fehlerzähler, Durchsatz, 4xx/5xx-Rate; Sampling in D1.

## Rollback

- Endpoint-Flag/Env: `LEADMAGNET_SOURCE=public|r2`. Bei Problemen wieder `public` wählen und aus `public/lead-magnets/` dienen.
- Code: Pfad-Resolver prüft Env und wählt Source.

## Sicherheit

- Keine Secrets im Client.
- Tokens HttpOnly (falls Cookie-basiert) oder Query (kurzlebig, HMAC-geschützt).
- Eingaben validieren (`key` nur Whitelist-Pfade, keine `..`).
- Fehlermeldungen ohne sensitive Infos. Einheitliche Error-Response.

## Testing

- Unit-Tests (Vitest): Token-Verify, Header-Setzung, Error-Cases.
- Integration (wrangler dev): Stream-Download, große Dateien, Abbruch/Resume (so weit unterstützt).
- E2E (Playwright): CTA → Download → Datei vorhanden; negativer Test ohne Token.

## Aufgabenliste (Implementierung)

- [ ] R2 Binding in `wrangler.toml` ergänzen (dev+prod Buckets)
- [ ] D1 Tabelle `download_audit` erstellen + Migrationsskript
- [ ] Download-Endpoint (B1) implementieren
- [ ] Optional Token-Endpoint (B2) implementieren
- [ ] Feature-Flag `LEADMAGNET_SOURCE` integrieren
- [ ] Tests (Unit/Integration/E2E)
- [ ] Docs/README aktualisieren
