---
description: 'Tool-Doku für den AI Video Enhancer (Quota & Usage)'
owner: 'AI Enhancer Team'
priority: 'high'
lastSync: '2025-11-26'
codeRefs: 'src/components/tools/video-enhancer/VideoEnhancerIsland.tsx, src/pages/api/ai-video/**, src/config/ai-video/entitlements.ts'
testRefs: 'tests/integration/api/ai-video-usage.test.ts'
---

# AI Video Enhancer

Der **AI Video Enhancer** skaliert Videos serverseitig mit Hilfe eines externen Providers. Diese Seite
fokussiert sich auf **Quota & Usage** aus Sicht des Tools (UI/HUD) und baut auf den Details der
[AI Video API](../api/ai-video_api.md) auf.

> Für Upload-/Generate-/Job-Endpunkte siehe OpenAPI (`openapi.yaml`) sowie die API-Doku unter
> [`docs/api/ai-video_api.md`](../api/ai-video_api.md).

## Quota-Modell

Video-Jobs verbrauchen **Credits**. Für den AI Video Enhancer gibt es zwei voneinander getrennte
"Buckets":

- **Planbasierte Video-Quota**
  - Pro Plan steht eine monatliche Video-Quota zur Verfügung, gemessen in **Credits**.
  - Intern werden diese Quoten in Zehnteln eines Credits geführt (`monthlyCreditsTenths`).
- **Globaler AI-Credits-Bucket**
  - Planübergreifender Credits-Speicher in Zehnteln (`creditsBalanceTenths`), geteilt mit anderen Tools.
  - Wird z. B. über Billing/Admin-APIs oder Promotions befüllt.

Der Server entscheidet pro Job, ob die Kosten aus der planbasierten Video-Quota, dem globalen
Credits-Bucket oder einer Kombination beider gedeckt werden. Fehlen Credits oder Quota, liefern
Generate-/Job-Endpunkte konsistente Fehler (`insufficient_credits` / `insufficient_quota`).

### Plan-Entitlements (Video)

Die planbasierten Video-Quoten werden in `src/config/ai-video/entitlements.ts` gepflegt. Das Interface
`VideoPlanEntitlements` definiert eine Kennzahl pro Plan:

- `monthlyCreditsTenths`: monatliche Video-Quota in Zehnteln eines Credits

In der Praxis ergibt sich daraus vereinfacht folgende Übersicht (in Credits):

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

**Wichtig aus Tool-Sicht:**

- Gäste und `free`-User haben keine planbasierte Video-Quota (0 Credits), können aber trotzdem
  Video-Jobs ausführen, sofern der globale Credits-Bucket (`creditsBalanceTenths`) > 0 ist.
- Höhere Pläne (pro/premium/enterprise) erhalten zusätzliche planbasierte Video-Quota, sodass
  Video-Jobs auch dann laufen können, wenn der globale Credits-Bucket leer ist.

## Usage-Endpoint & HUD

Die UI liest den aktuellen Stand der Video-Quota und des globalen Credits-Buckets über
`GET /api/ai-video/usage` (siehe [AI Video API](../api/ai-video_api.md)).

Der Endpoint ermittelt:

- `ownerType`: `user` oder `guest`
- `ownerId`: User-ID (String) oder `guest_id`-Cookie
- `plan`: nur für User gesetzt (Fallback `free`)
- `entitlements`: planbasierte Video-Quota (`monthlyCreditsTenths`)

Und liefert u. a. folgende, für das Tool relevante Felder (in Credits):

- `limit`: monatliche Video-Quota in Credits (aus `entitlements.monthlyCreditsTenths / 10`)
- `remaining`: verbleibende planbasierte Video-Quota in Credits
- `resetAt`: Zeitpunkt (ms seit Unix-Epoch), zu dem der aktuelle Tagesbucket ausläuft
- `usage`: normalisierte Sicht auf `limit`/`remaining` für HUDs
- `creditsBalanceTenths`: optionaler globaler Credits-Saldo, in Zehnteln eines Credits

### HUD-Verhalten (Empfehlung)

Für die UI/HUD des AI Video Enhancers empfiehlt sich folgendes Mapping:

- **Plan-Quota anzeigen**
  - Nutze `limit` und `remaining`, um z. B. "Video quota: 95 / 100 credits left" anzuzeigen.
  - Verwende `resetAt`, um einen Hinweis wie "Resets at: &lt;Datum/Uhrzeit&gt;" einzublenden.
- **Globale Credits anzeigen**
  - Wenn `creditsBalanceTenths` vorhanden ist, berechne Credits als `creditsBalanceTenths / 10`.
  - Zeige den globalen AI-Credits-Saldo separat an (z. B. "Global AI credits: 159.0").
- **Guests & Free-User**
  - Für Gäste und `free`-User ist `limit` in der Regel `0`. In diesem Fall:
    - Plan-Quota als 0 Credits darstellen,
    - ausschließlich den globalen Credits-Saldo (falls vorhanden) zur Orientierung nutzen.

## Staging-Checks

Für manuelle Checks der Quoten-/Usage-Logik auf Staging:

- **Staging-URL:** `https://staging.hub-evolution.com`
- **Usage-Endpoint:** `GET /api/ai-video/usage`

Beispiele:

- Als Gast (Browser ohne Login) die Tool-Seite öffnen und den HUD-Wert mit der JSON-Response
  des Usage-Endpoints abgleichen (Owner-Type = `guest`).
- Als eingeloggter User mit verschiedenen Plänen (free/pro/premium/enterprise) die HUD-Anzeige
  von Video-Quota und globalen Credits mit der Usage-Response spiegeln.

Fehlerfälle (z. B. `insufficient_credits`/`insufficient_quota` bei Generate-/Job-Endpunkten) werden
im HUD idealerweise mit klaren Hinweisen verknüpft ("Plan-Limit erreicht", "Global credits aufgebraucht").
