---
description: 'Web-Eval Tool – UI, Usage & Assertions'
owner: 'platform'
priority: 'medium'
lastSync: '2025-11-26'
codeRefs: 'src/components/tools/web-eval/WebEvalIsland.tsx, src/pages/en/tools/web-eval/app.astro, src/pages/de/tools/web-eval/app.astro, src/pages/api/testing/evaluate/**'
testRefs: 'tests/integration/api/web-eval-next.test.ts, tests/integration/api/web-eval-run.test.ts, tests/integration/api/web-eval-complete.test.ts'
---

<!-- markdownlint-disable MD051 -->

# Web-Eval Tool – Browsergestützte Seitentests

Dieses Dokument beschreibt das Web‑Eval Tool aus Sicht der UI‑Nutzung. Technische Details zu Executor,
CBR‑Runner und Fehlerformen stehen im Runbook [docs/ops/web-eval-executor-runbook.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/ops/web-eval-executor-runbook.md:0:0-0:0).

---

## Übersicht

Der **Web‑Eval**‑Workflow erlaubt es, Webseiten mit einem Headless‑Browser (Cloudflare Browser Rendering)
aufzurufen, Interaktionen durchzuführen und das Ergebnis über einen strukturierten Report zu analysieren.
Optional können Assertions definiert werden, aus denen ein Gesamt‑**Verdict** abgeleitet wird.

### Hauptfeatures

- **Task‑Erstellung über Web‑UI** (DE/EN)
- **Browser‑gestützte Ausführung** via CBR‑Runner
- **Reports** mit Steps, Console, Network, Errors und Zeitstempeln
- **Assertions** (MVP):
  - `textIncludes` – Textsnippet muss im Seiteninhalt vorkommen
  - `selectorExists` – CSS‑Selector muss mindestens ein Element matchen
- **Verdicts** basierend auf Assertions/Runner‑Status:
  - `pass` | `fail` | `inconclusive`

### Quota & Usage

Web‑Eval nutzt planbasierte Quoten aus `src/config/web-eval/entitlements.ts`. Für jeden Owner‑Typ/Plan werden dort

- `dailyBurstCap` (maximale Anzahl Runs pro rolling 24h Fenster) und
- `monthlyRuns` (maximale Anzahl Runs pro Kalendermonat)

definiert. Die UI‑HUD „Usage: X/Y“ liest die effektiven Limits aus `GET /api/testing/evaluate/usage`:

- `usage`/`dailyUsage` spiegeln das aktuelle 24h‑Fenster wider.
- `monthlyUsage` (sofern `KV_WEB_EVAL` aktiv ist) bildet die Monats‑Quota (`monthlyRuns`) ab.
- `entitlements` enthält die aufgelösten Entitlements je Owner/Plan.
- `creditsBalanceTenths` (falls gesetzt) zeigt nur den globalen Credits‑Kontostand an; Web‑Eval selbst nutzt aktuell **keinen** Credits‑Fallback, sondern erzwingt Limits vollständig über Entitlements + Usage‑Tracking.

---

## UI‑Flow

### Aufruf der Tools

- Deutsch: `/tools/web-eval/app`
- Englisch: `/en/tools/web-eval/app`

Beide Varianten rendern dieselbe React‑Island [WebEvalIsland](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/tools/web-eval/WebEvalIsland.tsx:78:0-684:1), aber mit lokalisierten Strings.

### Formularfelder

- **URL**
  - Vollqualifizierte URL (`https://…`), wird serverseitig per SSRF‑Guard validiert.
- **Task‑Beschreibung**
  - Kurzbeschreibung der Aufgabe (z. B. „Seite öffnen und Content prüfen“).
- **Browser-Profil (intern: `headless`)**
  - Steuert im Cloudflare‑Runner das verwendete Browser‑Profil, nicht die Frage, ob ein lokales Fenster geöffnet wird.
  - `true` (Default): Cloudflare‑Standardprofil für den Headless‑Browser.
  - `false`: explizites Desktop‑Profil (typischer Desktop‑User‑Agent + Viewport); der CBR‑Runner bleibt trotzdem ein Headless‑Browser – es wird **kein** lokales Fenster geöffnet.
  - Ein „echter“ headed‑Browser (lokale/VM‑Session) ist für eine spätere MCP‑basierte Integration vorgesehen und nicht Teil dieses Tools.
- **Timeout (ms)**
  - Zeitlimit für Navigation und Health‑Check.
- **Assertions (optional)**
  - Mehrere Assertions können hinzugefügt, bearbeitet und entfernt werden.
  - Je Assertion:
    - `Kind`: `Text includes` oder `Selector exists`
    - `Value`: Textsnippet bzw. CSS‑Selector
    - `Description`: frei wählbare Beschreibung

Nach dem Absenden wird ein Task angelegt; die UI zeigt ihn unter **My Tasks** und pollt periodisch den
Status + Report nach.

### Tasks abbrechen (Abort)

- In der Liste **My Tasks** steht pro Eintrag:
  - ein Button **Abort** für Tasks im Status `pending` oder `processing`.
  - ein `×`‑Button, der den Task **nur lokal** aus der My‑Tasks‑Liste entfernt (Soft‑Delete in LocalStorage).
- **Abort** führt einen API‑Call auf `POST /api/testing/evaluate/{id}/abort` aus:
  - nur für den jeweiligen Owner (Session‑User oder `guest_id`‑Cookie).
  - CSRF‑geschützt (`X-CSRF-Token` + Cookie `csrf_token`).
  - idempotent für terminale Stati – bei `completed`, `failed` oder `aborted` wird der bestehende Status unverändert zurückgegeben.
- Nach einem erfolgreichen Abort wechselt der Task in den Status `aborted`; der Executor respektiert diesen Status und überschreibt ihn nicht mehr.

### Report‑Ansicht

Für jede Task zeigt die UI bei vorhandenem Report u. a.:

- **Steps** (Aktionen im Browser, inkl. Timestamps und optionalem `selectorUsed`)
- **Console Logs** (Level + Message)
- **Network Requests** (Methode, Status, URL)
- **Errors** (String‑Liste)
- **Assertions‑Sektion**:
  - Verdict‑Badge mit `pass` / `fail` / `inconclusive` (Farbcodierung grün/rot/gelb)
  - Liste der Assertions mit:
    - Badge `PASS` / `FAIL`
    - `kind`, `value`, optionale `description` und `details`

Solange der Task im Status `pending` oder `processing` ist, wird der **Live**‑Block fortlaufend
aktualisiert; nach Erreichen eines terminalen Status (`completed`, `failed` oder `aborted`) bleibt der letzte
Stand als finaler Snapshot sichtbar. Der Report bleibt dabei die maßgebliche Quelle für die
Detailanalyse.

- Die Kopfzeile folgt dem Muster `Live — status` und ergänzt für terminale Stati den Hinweis
  `liveFinalSnapshotLabel` (z. B. `Live — completed (final snapshot)`).

### Polling & Endpunkte

- Die UI pollt periodisch (aktuell alle ~8 Sekunden):
  - den bestehenden Status‑Endpoint `/api/testing/evaluate/{id}` und
  - den neuen Live‑Endpoint `/api/testing/evaluate/{id}/live`.
- Der Live‑Endpoint liefert:

  ```jsonc
  {
    "success": true,
    "data": {
      "task": { "id": "…", "status": "pending|processing|completed|failed|aborted", /* … */ },
      "live": null | {
        "taskId": "…",
        "status": "pending|processing|completed|failed|aborted",
        "steps": [
          { "action": "goto", "timestamp": "…", "selectorUsed": "…" },
          // …
        ],
        "errors": ["…"],
        "updatedAt": "…"
      }
    }
  }
  ```

  - `live` kann `null` sein (z. B. direkt nach Task‑Erstellung, bevor der Runner das erste Mal
    geschrieben hat).
  - Der Endpoint ist wie der Status‑Endpoint **owner‑gegated** (User vs. `guest_id`‑Cookie) und setzt
    `Cache-Control: no-store`.

---

## Auto‑Assertions (MVP)

Wenn Auto‑Assertions aktiviert sind (`WEB_EVAL_AUTO_ASSERTIONS_ENABLE`), erzeugt der Server
einfache `textIncludes`‑Assertions aus der Aufgabenbeschreibung, **wenn der Request keine Assertions
enthält**.

- Phrasen in Anführungszeichen (z. B. `"Kontaktformular"`, `"Datenschutz"`) werden als Checks verwendet.
- Zusätzlich werden einige Schlüsselwörter (de/en, Stopwords gefiltert) als einfache Text‑Checks genutzt.
- Es werden höchstens 3 Auto‑Assertions pro Task erzeugt.

Manuelle Assertions haben immer Vorrang:

- Sobald mindestens eine Assertion im Request steht, werden **keine** Auto‑Assertions ergänzt.
- Eine explizit leere Liste (`assertions: []`) bedeutet:
  - „keine Assertions, auch keine automatischen“.

---

## Live‑View (Phase 1)

Die Live‑View‑Funktion zeigt den Fortschritt eines Web‑Eval‑Tasks **während der Ausführung** an, ohne
auf den finalen Report warten zu müssen. In Phase 1 ist die Live‑Ansicht rein textuell (keine Screenshots
oder DOM‑Replays).

### Verhalten in der UI

- Unter **My Tasks** erscheint für Tasks im Status `pending` oder `processing` ein zusätzlicher
  **Live**‑Block oberhalb des Reports.
- Der Block enthält:
  - eine Liste der bisher aufgezeichneten **Steps** (z. B. `goto`, `browserDisabled`, `quotaCheck`),
    jeweils mit Timestamp und optionalem `selectorUsed`.
  - eine kompakte Liste von **Fehlern** (Strings), falls der Runner bereits Fehler gemeldet hat.
- Solange noch keine Steps vorliegen, zeigt die UI `Waiting for runner…` als Platzhalter.
- Solange der Task im Status `pending` oder `processing` ist, wird der **Live**‑Block fortlaufend
  aktualisiert; nach Erreichen eines terminalen Status (`completed`, `failed` oder `aborted`) bleibt der letzte
  Stand als finaler Snapshot sichtbar. Der Report bleibt dabei die maßgebliche Quelle für die
  Detailanalyse.
  - Die Kopfzeile folgt dem Muster `Live — status` und ergänzt für terminale Stati den Hinweis
    `liveFinalSnapshotLabel` (z. B. `Live — completed (final snapshot)`).

### Polling & Endpunkte

- Die UI pollt periodisch (aktuell alle ~8 Sekunden):
  - den bestehenden Status‑Endpoint `/api/testing/evaluate/{id}` und
  - den neuen Live‑Endpoint `/api/testing/evaluate/{id}/live`.
- Der Live‑Endpoint liefert:

  ```jsonc
  {
    "success": true,
    "data": {
      "task": { "id": "…", "status": "pending|processing|completed|failed|aborted", /* … */ },
      "live": null | {
        "taskId": "…",
        "status": "pending|processing|completed|failed|aborted",
        "steps": [
          { "action": "goto", "timestamp": "…", "selectorUsed": "…" },
          // …
        ],
        "errors": ["…"],
        "updatedAt": "…"
      }
    }
  }
  ```

  - `live` kann `null` sein (z. B. direkt nach Task‑Erstellung, bevor der Runner das erste Mal
    geschrieben hat).
  - Der Endpoint ist wie der Status‑Endpoint **owner‑gegated** (User vs. `guest_id`‑Cookie) und setzt
    `Cache-Control: no-store`.

### Limitierungen Phase 1

- Keine Screenshots, kein DOM‑Replay – nur textuelle Steps und Fehler.
- Live‑Updates werden „best effort“ in KV geschrieben; wenn die Live‑Persistenz fehlschlägt, bleibt der
  finale Report unverändert der Single Source of Truth.
- Die UI zeigt keine expliziten Live‑Verdicts; die Verdict‑Logik bleibt ausschließlich Teil des finalen
  Reports.

### Live‑Phasen (Phase 2)

In **Phase 2** werden die Live‑Steps zusätzlich mit einer groben **Phase** annotiert, um den aktuellen
Abschnitt des Runs besser sichtbar zu machen:

- `nav` – Navigation/Initialisierung (z. B. `goto` und Basis‑Health‑Check)
- `assertions` – Auswertung manueller bzw. auto‑generierter Assertions
- `cleanup` – Aufräumarbeiten und Finalisierung des Runs

Die UI zeigt diese Information als kleinen **Phase‑Badge** im Live‑Block an (rechts in der Kopfzeile). Die
Phasen sind **rein informativ** und ändern nichts an der bestehenden Verdict‑Logik oder dem finalen Report.
Vollwertiges DOM‑Replay, Screenshot‑Streaming und weitergehende Orchestrierung sind explizit **Phase 3**
vorbehalten.

### Live‑Konsole (warn/error) – Phase 2

Zusätzlich zu Steps und Fehlern zeigt die Live‑Ansicht eine kompakte **Live‑Konsole**, sobald der Runner
erste Browser‑Logs gemeldet hat:

- Es werden ausschließlich `warn`‑ und `error`‑Logs angezeigt (kein `log`/`info`/`debug`).
- Pro Task werden höchstens die letzten ~20 Einträge dargestellt.
- Jeder Eintrag enthält:
  - **Level** (uppercase, z. B. `WARN`, `ERROR`)
  - **Timestamp** (lokale Zeit)
  - **Message** (der vom Browser gelieferte Text)

Die Live‑Konsole dient als schnelle Orientierung für typische Probleme wie z. B.:

- blockierte Requests (CORS, 4xx/5xx),
- JavaScript‑Fehler auf der Seite (Unhandled Exceptions),
- starkes Logging von Dritt‑Skripten.

Technische Details (verkürzt, ausführlich im Runbook):

- Während des Runs schreibt der Executor periodische Live‑Snapshots nach `KV_WEB_EVAL`.
- `logs` wird dabei aus den Browser‑Events gefiltert
  (`level === 'warn' || level === 'error'`) und auf einen kleinen Ausschnitt begrenzt.
- Im finalen Snapshot werden die Logs zusätzlich aus dem Report übernommen.
- Die UI blendet die Live‑Konsole nur ein, wenn mindestens ein Log vorhanden ist;
  der **finale Report** bleibt weiterhin die Quelle für die vollständige Console‑Historie.

---

## Kanonische Testfälle (Kurzfassung)

Die vollständige Beschreibung der Testfälle steht im Runbook unter
**„Kanonische Testfälle (Assertions & Verdicts)”** in [docs/ops/web-eval-executor-runbook.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/ops/web-eval-executor-runbook.md:0:0-0:0). Hier eine
komprimierte UI‑orientierte Variante.

### Testfall 1 – Positiv (Verdict: `pass`)

- **URL**: `https://example.com/`
- **Task** (DE): „Öffne die Seite ‚Example Domain‘ und prüfe Überschrift und Beispiel‑Text.“
- **Assertions**:
  1. `textIncludes` → `Example Domain`
  2. `selectorExists` → `h1`
- **Erwartung im UI**:
  - Beide Assertions mit Badge `PASS`
  - Verdict‑Badge `pass` (grün)

### Testfall 2 – Negativ (Verdict: `fail`)

- **URL**: `https://example.com/`
- **Task** (DE): „Öffne die Seite ‚Example Domain‘ und prüfe absichtlich nicht vorhandene Elemente.“
- **Assertions**:
  1. `textIncludes` → `This string does not exist on the page`
  2. `selectorExists` → `.nonexistent-selector-for-testing`
- **Erwartung im UI**:
  - Beide Assertions mit Badge `FAIL`
  - Verdict‑Badge `fail` (rot)

### Testfall 3 – Inconclusive (Verdict: `inconclusive`)

- **URL**: typischerweise ebenfalls `https://example.com/`
- **Task** (DE): „Öffne die Seite ‚Example Domain‘ und warte auf die Initialisierung (Simulationsfall für Runner‑Fehler).“
- **Assertions**: identisch zu Testfall 1
- **Erwartung im UI** (abhängig von Umgebung/Flags):

  - Verdict‑Badge `inconclusive` (gelb), falls der CBR‑Runner den Task nicht regulär abschließen kann
  - Assertions‑Liste ggf. leer oder nur teilweise gefüllt

---

## Weiterführende Dokumentation

- Operatives Runbook (Executor, CBR‑Runner, Fehlerformen):
  - [docs/ops/web-eval-executor-runbook.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/ops/web-eval-executor-runbook.md:0:0-0:0)
- Testing‑Docs (Integrationstests, Status‑Endpunkte):
  - `docs/testing/web-eval-executor.md` (Verweis auf das Runbook).
