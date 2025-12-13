---
description: 'API-Referenz für den AI Video Enhancer (Usage & Quoten)'
owner: 'AI Enhancer Team'
priority: 'high'
lastSync: '2025-11-26'
codeRefs: 'src/pages/api/ai-video/**, src/config/ai-video/entitlements.ts, src/lib/kv/usage.ts'
testRefs: 'tests/integration/api/ai-video-usage.test.ts'
---

<!-- markdownlint-disable MD051 -->

# AI-Video Enhancement API

**Status:** ✅ Implementiert (Production-Ready)
**Dokumentationsstatus:** 🔄 Fokus auf Usage & Quoten

Die AI-Video API stellt Informationen zu planbasierten Video-Quoten und dem aktuellen Verbrauch bereit.
Die eigentlichen Generate-/Job-Endpunkte werden über die zentrale OpenAPI-Spezifikation dokumentiert; dieses
Dokument konzentriert sich auf den Usage-Endpunkt und das Zusammenspiel mit Credits.

## Übersicht

- **Basis-URL:** `/api/ai-video`
- **Authentifizierung:** Erforderlich für Quoten (Owner = User oder Guest mit `guest_id`-Cookie)
- **Quota-Metrik:** Video-Quota in **Credits**, intern als "tenths of a credit" (`monthlyCreditsTenths`) geführt
- **Rate-Limiting:** 15/min (teilt sich den Limiter aktuell mit Voice-Transcribe, `voiceTranscribeLimiter`)

### Plan-Entitlements

Die planbasierten Video-Quoten werden in `src/config/ai-video/entitlements.ts` gepflegt. Das Interface
`VideoPlanEntitlements` definiert eine einzige Metrik pro Plan:

- `monthlyCreditsTenths`: monatliche Video-Quota in Zehnteln eines Credits (1 Credit = 10 "tenths")

**Entitlements (vereinfacht, in Credits):**

| Owner/Plan     | monthlyCreditsTenths | Monatsquota (Credits) |
| -------------- | -------------------- | ---------------------- |
| **Guest**      | 0                    | 0                      |
| **free (User)**| 0                    | 0                      |
| **pro**        | 1000                 | 100                    |
| **premium**    | 1000                 | 100                    |
| **enterprise** | 5000                 | 500                    |

Die Helper-Funktion `getVideoEntitlementsFor(ownerType, plan)` löst für einen gegebenen Owner
(`user` oder `guest`) und optionalen Plan (`free|pro|premium|enterprise`) das passende
`VideoPlanEntitlements`-Objekt auf.

---

## GET `/api/ai-video/usage`

Liefert den aktuellen Stand der planbasierten Video-Quota für den aktiven Owner (User oder Gast mit
`guest_id`-Cookie). Die Quota wird in **Credits** dargestellt, intern aber in Zehntel-Credits über
`monthlyCreditsTenths` erzwungen.

Der Endpunkt:

- bestimmt `ownerType` (`user`|`guest`) und `ownerId` (User-ID oder `guest_id`-Cookie),
- liest den Plan des Users (Fallback `free`),
- resolved die Entitlements über `getVideoEntitlementsFor(ownerType, plan)`,
- berechnet `limit` und `remaining` aus der monatlichen Quota (`monthlyCreditsTenths / 10`),
- liest den aktuellen Verbrauch aus KV (`KV_AI_VIDEO_USAGE` oder `KV_AI_ENHANCER`) per `rollingDailyKey('ai-video', ...)` und
  `kvGetUsage`,
- bildet daraus ein `usage`-Objekt (UsageOverview) in Credits,
- ergänzt optional `creditsBalanceTenths` (globaler AI-Credits-Saldo) für HUD-Anzeigen.

### Sicherheit & Origin

- Der Endpunkt nutzt `withApiMiddleware` und prüft vor der Owner-Ermittlung Same-Origin:
  - Request-Origin (`new URL(context.request.url).origin`) wird gegen den `Origin`-Header normalisiert,
  - bei Abweichungen wird `forbidden` mit `"Origin not allowed"` zurückgegeben.
- CSRF wird hier nicht erzwungen (`enforceCsrfToken: false`), da es sich um einen reinen GET-Endpoint handelt.

### Beispiel-Request

```bash
curl "http://127.0.0.1:8787/api/ai-video/usage" \
  -H "Origin: http://127.0.0.1:8787" \
  -H "Cookie: guest_id=abc123"
```

### Response-Shape (200)

```json
{
  "success": true,
  "data": {
    "ownerType": "user",
    "limit": 100,
    "remaining": 95,
    "resetAt": 1732329599999,
    "usage": {
      "used": 5,
      "limit": 100,
      "remaining": 95,
      "resetAt": 1732329599999
    },
    "plan": "pro",
    "entitlements": {
      "monthlyCreditsTenths": 1000
    },
    "creditsBalanceTenths": 1590
  }
}
```

Wichtige Felder:

- `limit`: monatliche Video-Quota in **Credits** (aus `entitlements.monthlyCreditsTenths / 10`).
- `remaining`: noch verfügbare monatliche Quota in Credits.
- `resetAt`: Zeitstempel (ms seit Unix-Epoch) für das Ende des aktuellen Tages; UI kann dies als
  "Video limit resets at" interpretieren.
- `usage`: normalisierte Sicht auf `limit`/`remaining` für HUDs (`toUsageOverview`).
- `plan`: nur für User gesetzt; Gäste erhalten `plan: undefined`.
- `entitlements`: rohes Entitlements-Objekt aus `getVideoEntitlementsFor` (in Zehntel-Credits).
- `creditsBalanceTenths`: optionaler globaler Credits-Saldo aus `KV_AI_ENHANCER` (Anzeige im HUD),
  unabhängig von der planbasierten Video-Quota.

### Response-Header

Bei Erfolg werden u. a. folgende Header gesetzt (zur Unterstützung von HUDs und Debugging):

- `Cache-Control: no-store, no-cache, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`
- `X-Usage-Limit: <limit in Credits>`
- `X-Usage-Remaining: <remaining in Credits>`
- `X-Usage-Reset: <resetAt Timestamp in ms>`

Im Fehlerfall (z. B. KV-Ausfall) wird `createApiError('server_error', ...)` verwendet und ein
minimaler Satz an No-Store-Headern gesetzt (`Cache-Control`, `Pragma`, `Expires`, `X-Usage-Error: 1`).

---

## Zusammenspiel mit globalen Credits

- Die planbasierte Video-Quota (`monthlyCreditsTenths`) wird ausschließlich über `/api/ai-video/usage`
  exponiert und begrenzt, unabhängig vom globalen AI-Credits-Bucket.
- Pro Video-Job entscheidet `POST /api/ai-video/generate` (siehe OpenAPI), ob die Kosten aus
  der planbasierten Video-Quota oder dem globalen Credits-Bucket (`KV_AI_ENHANCER`) beglichen werden.
- `creditsBalanceTenths` in der Usage-Response dient der UI, um neben der planbasierten Quota auch den
  verbleibenden globalen Credits-Saldo anzuzeigen.

Weitere Details zu Generate-/Job-Endpunkten und Kostenpfaden werden in der zentralen OpenAPI
(`openapi.yaml`) sowie in den Feature-Dokumenten zum AI Video Enhancer beschrieben.
