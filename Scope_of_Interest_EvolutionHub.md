# Scope of Interest – Evolution Hub

Projektabsicht

Evolution Hub ist eine plattformübergreifende Anwendung mit vier Kern-Tools, die über eine gemeinsame Nutzer-, Authentifizierungs- und Zahlungsinfrastruktur verbunden sind.
Ziel ist ein konsistentes, intuitives Nutzererlebnis bei gleichzeitiger technischer und ökonomischer Fairness: einmal einloggen, überall Zugriff, klare Plan-Badges, transparente Kosten und nachvollziehbarer Verbrauch.

## 1 Identität & Zugang

- Login über Stytch (Magic Link + OAuth).
- Einmal eingeloggt → Session ist plattformweit gültig (Single Sign-On).
- Passender Account wird automatisch erkannt und dem richtigen Plan zugeordnet.
- Rollenmodell: User und Admin (erweiterbar).
  Die Session wird vorzugsweise über `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/) gehalten, mit `session_id` (SameSite=Lax) als Dev/Testing‑Fallback; Persistenz und Validierung erfolgen in D1, nicht in KV `SESSION`, während Stytch auf einer eigenen Custom‑Domain erreichbar sein kann (Cookie‑Domain bleibt die App‑Domain). <!-- refined -->

## 2 Abos, Credits & Badges

- Stripe verwaltet Abonnements und Zahlungen.
- Zwei Bezahlpfade:

1.  Abos (Plans) – wiederkehrende Zahlungen mit Plan-Limits.
2.  Credits – einmaliger Kauf, nutzbar für einzelne Tools.

- Verbrauchsreihenfolge: zuerst Abo, dann Credits.
- Credits sind tool-agnostisch und verfallen 6 Monate nach Kauf (pro Charge).
- Abo-Einheiten verfallen mit Abo-Ende.
- Plan-Badges sind in allen Tools einheitlich in Design und Wording.
- Ziel: Einheitliche Benutzeroberfläche, aber ökonomisch ehrliche Verrechnung.
  Bei unzureichender Abo‑Quota wird ein Job anteilig aus dem Plan und im Rest aus Credits beglichen (Split‑Charging) und transaktionssicher pro Job‑ID idempotent verbucht; der Credit‑Verfall erfolgt pro Charge nach 6 Monaten mit 14‑tägigem Kulanzfenster und ohne automatische Reaktivierung. <!-- refined -->

## 3 Credit- und Verbrauchssystem

Leitprinzip: Credits repräsentieren reale Rechen- und API-Kosten.
Sie dienen der Kostenwahrheit und Nachhaltigkeit.

Technische Kosten- und Preiskalkulation (Referenz 2025)

Zweck:
Dieser Abschnitt dokumentiert die realistische Kostengrundlage für Preisgestaltung, Ressourcenverbrauch und Margenplanung des Evolution Hub-Ökosystems.
Er dient als internes Referenzmodell für Wirtschaftlichkeit und Skalierbarkeit.

Basiskomponenten (geschätzte monatliche Fixkosten)

Quelle Beschreibung Ø Kosten / Monat (€)
Cloudflare Workers AI GPU-Inference Credits + Traffic (inkl. Free-Tier) 25 – 40
R2 Storage + Bandwidth Bilder + Audio Assets, ~100 GB 5 – 15
D1 + KV Operations Persistenz + Usage Counters 5 – 10
Replicate API (Enhancer) GPU Model Calls (ESRGAN, GFPGAN etc.) 0.04 – 0.08 €/Call
OpenAI API (LLM + Whisper) Prompt + Transkription 0.002 – 0.01 €/Request / min
Stripe Fees 2.9 % + 0.30 €/Transaktion variabel
Cloudflare Pages / Domain / Mail Hosting + DNS + SSL 5 – 10

Gesamtschätzung (Basislast): ~ 60 – 90 €/Monat Fixkosten
→ Break-Even bei ca. 8 – 10 Pro-Abos oder 4 Business-Abos.

Variable Kosten pro Tool (Average per Call)

Tool Provider Ø Kosten / Aufruf (€) Kostentreiber
Image Enhancer Replicate / Workers AI 0.06 – 0.12 GPU Inference, Storage
Voice Transcriptor OpenAI Whisper API 0.005 – 0.01 / min Audio-Länge
Prompt Enhancer OpenAI GPT-4o mini 0.002 – 0.008 Tokens + LLM-Calls
Webscraper Cloudflare Fetch + KV ≈ 0.0002 Bandwidth + Parsing

Zielmargen und Preisstrategie
• Ziel-Bruttomarge: ≥ 65 %
• Marge nach Stripe: ~ 60 %
• Preisanker: Pro Plan > 2,5× Gesamtkosten pro User.
• Kalkulationslogik: Preis = (API-Kosten × Aufschlag × Nutzungsquote) + Fixkostenanteil.

Beispiel Break-Even (Beta 2025)

Plan Preis €/Monat Ø User-Kosten € / Monat Marge
Pro 12 € 4,3 € 64 %
Business 28 € 9,8 € 65 %
Enterprise 99 € 32 € 68 %

Optimierungsschrauben

1.  Replicate-Usage Caching: 20 – 25 % Kostensenkung durch Batch-Jobs.
2.  Prompt Enhancer Model-Rotation: Switch zu GPT-4o mini → –30 % Tokenkosten.
3.  Voice Compression & Chunking: kleinere Uploads → –15 % Traffickosten.
4.  R2 Lifecycle-Rules: Auto-Deletion nach 90 Tagen → –10 € Speicher monatlich.

Finanzielle Zielwerte (erste 12 Monate)
• Break-Even: ≈ 60 aktive Zahl-User
• Zielumsatz: 500 – 700 €/Monat
• Wachstumsrate: + 10 % User monatlich
• Gesamtkosten stabil ≤ 35 % vom Umsatz

⸻

Zusammengefasst:
Dieses Modell verbindet reale Provider-Kosten mit skalierbaren Preispunkten, um die Wirtschaftlichkeit des Hubs sicherzustellen. Es bildet den technischen Unterbau für künftige Finanz- und Pricing-Automatisierung (z. B. Stripe Billing + KV Analytics).

### 3.1 Multiplikatoren innerhalb der Tools

- Jedes Tool definiert eigene Credit-Multiplikatoren entsprechend seiner Kostenstruktur.
- Mehrere aktive Faktoren addieren sich (z. B. Modell + Upscale + FaceEnhance).
- Tools können mehrere Kosten-Tiers haben (z. B. ×4, ×3, ×2, ×1).
- Nutzer:innen sehen den erwarteten Verbrauch vor Ausführung (z. B. „×3 Credits“ im UI).
- Teil-Credits (z. B. 0,5) sind zulässig.

### 3.2 Fehler- und Abbruchlogik

- Kein Abzug, wenn der Job komplett fehlschlägt (kein Output).
- Teilabzug (~50 %), wenn Ressourcen bereits verbraucht wurden, aber kein Ergebnis geliefert wurde.
- Einmaliger kostenloser Retry pro Job möglich.
- Alle Abzüge und Fehler werden pro Tool geloggt.
  Der Teilabzug greift nur, wenn Provider‑Ressourcen nachweislich konsumiert wurden (z. B. Inferenz gestartet/bytes written), und beträgt 50 % ±10 % je nach Fortschritt; kostenlose Retries werden pro Job‑ID gewährt und sind über Idempotency‑Schlüssel gegen Doppelbelastung abgesichert. <!-- refined -->
  Abrechnung erfolgt in 0,1‑Credit‑Schritten (mind.) mit kaufmännischem Runden auf zwei Dezimalstellen; bei kombinierten Faktoren gilt die Summe als Bemessungsgrundlage. <!-- refined -->

### 3.3 Konfiguration & Governance

- Multiplikatoren liegen tool-lokal (z. B. src/config/ai-image/entitlements.ts).
- Änderungen müssen dokumentiert und versionsgeführt werden.
- Ein späterer globaler Katalog (config/credits.ts oder KV) kann Standardwerte bereitstellen, ist aber nicht verpflichtend.
- Ziel: Flexibilität innerhalb klarer Transparenzregeln.

Leitsatz: „Ein Credit entspricht realem Energie- und Ressourcenverbrauch.“

## 4 Tool-Ökonomie und Kostenrelation

Tool Rechenintensität Relative Kostenordnung
Image Enhancer sehr hoch (GPU Inference + R2 I/O) 1
Voice Visualizer + Transcriptor mittel hoch (Whisper Chunks) 2
Prompt Enhancer mittel (LLM Tokens) 3
Webscraper niedrig (Netzwerk I/O) 4

## 5 Blog & Kommentare

- Kommentarfunktion nur für eingeloggte Nutzer:innen.
- Admin-Rolle prüft und gibt Kommentare frei, bevor sie veröffentlicht werden.
- Zustände: pending, approved, rejected, spam.
- Langfristiges Ziel: Monetarisierung über Werbung im Blog.
- z. B. Partnerlinks, gesponserte Artikel, Affiliate-Banner.
- Werbung bleibt thematisch passend, klar gekennzeichnet und datenschutzkonform.
- Kein Tracking ohne Einwilligung (DSGVO-konform).
  Moderation erlaubt Übergänge pending→approved/rejected/spam mit Audit‑Trail; nach Freigabe wird die Caching‑Schicht für betroffene Inhalte invalidiert, sodass öffentliche Listen nur freigegebene Kommentare zeigen. <!-- refined -->
  Analytics erfolgen nur nach Consent (Cookie‑Banner); zulässige Anbieter sind u. a. GTM/Plausible, während Cloudflare Insights in Produktion deaktiviert bleibt; Einwilligungen und Widerrufe werden nachvollziehbar protokolliert. <!-- refined -->

## 6 Governance & Transparenz

- Alle Änderungen an Credits, Entitlements und Multiplikatoren werden pro Tool protokolliert.
- Nutzer:innen sehen im Dashboard ihre aktuellen Plan- und Credit-Statuswerte.
- Ziel: ökonomische Nachvollziehbarkeit bei technischer Einfachheit.

## 7 Langfristige Vision

Ein Hub, vier Tools, eine Wahrheit:
Echte Kosten werden sichtbar, ohne dass die Nutzer:innen komplexe Rechenmodelle verstehen müssen.
Die Plattform bleibt transparent, skalierbar und fair – für Nutzer:innen und Entwickler:innen gleichermaßen.

## 8 Tools im Hub

### 8.1 Image Enhancer

Verbessert und vergrößert Bilder (Upscaling, Restoration, Img2Img).
Hybridbetrieb über Cloudflare Workers AI (SD 1.5 / SDXL) und Replicate (ESRGAN, GFPGAN, CodeFormer).

- Einheit: image_enhance
- Compute: sehr hoch (GPU-basiert)
- Speicher: mittlerer R2-Footprint (~ 10 MB / Bild)
- Credit-Multiplikatoren: nach Modell (× 1 – × 4)
  Erzeugte Assets werden privat in R2 gespeichert und über Worker‑Proxys (`/r2-ai/**`) mit kontrollierten Cache‑Headern ausgeliefert; direkte öffentliche Buckets werden vermieden, und Lösch‑/Retention‑Regeln sind serverseitig erzwungen. <!-- refined -->

### 8.2 Prompt Enhancer

Formuliert Texte zu strukturierten, hochwertigen Prompts – optional mit Datei- oder Bildkontext.

- Einheit: prompt_request
- Compute: mittel (LLM Tokens)
- Credit-Multiplikatoren: nach Modellgröße oder Kontexttiefe

### 8.3 Voice Visualizer + Transcriptor

Erfasst Audio im Browser, sendet Chunk-Uploads und transkribiert mit Whisper.

- Einheit: audio_chunk
- Compute: mittel bis hoch (~ 3–5 Credits/Minute)
- Credit-Multiplikatoren: abhängig von Audioqualität und Transkriptionsmodus
  Abrechnung erfolgt pro verarbeiteten Chunk (Größen‑/Codec‑Allowlist) und wird für die Sitzung aggregiert; der Minutenwert ist ein Richtwert, die tatsächliche Belastung folgt dem Chunk‑Durchsatz. <!-- refined -->

### 8.4 Webscraper

Extrahiert strukturiert Inhalte aus Webseiten (Titel, Text, Links, Meta).

- Einheit: page_fetch
- Compute: niedrig (Netzwerk / CPU)
- Credit-Multiplikatoren: typischerweise × 1
  Crawler respektiert robots.txt und implementiert Host‑basierte Rate‑Limits sowie Allow/Deny‑Listen; rechtliche Grenzen (Nutzungsbedingungen) sind einzuhalten, Verstöße werden unterbunden. <!-- refined -->

## 9 Quellen und Technische Basis

- Tool-Configs unter src/config/<tool>/…
- Laufzeitbindungen über Cloudflare D1, R2, KV, Workers AI
- Authentifizierung über Stytch
- Billing über Stripe
- Rate Limits & Entitlements über zentrale Middleware
  Die zentrale Middleware ([src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0)) setzt Sicherheits‑Header und CSP für HTML‑Antworten, während API‑Routen über [withApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:337:0-462:1) ([src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0)) konsistente JSON‑Antworten, Rate‑Limits, CSRF/Origin‑Prüfungen und Security‑Header erhalten. <!-- refined -->

## 10 Blog – Community & Monetarisierung

Der Blog dient als Kommunikationsplattform, Wissensarchiv und Marketingkanal.

- Authentifizierte Kommentare (Moderation durch Admin)
- Spätere Monetarisierung durch Werbung und Partnerschaften
- Ziel: relevante Inhalte statt Massenanzeigen
- Datenschutz bleibt Vorrang

## 11 User Dashboard – Zentrale Benutzeroberfläche

Das Dashboard ist die persönliche Schaltzentrale für alle Nutzer:innen des Hubs.
Es bündelt Authentifizierung, Plan-Verwaltung, Credits, Profilpflege und Aktivitäten.

### 11.1 Kernfunktionen

- Account-Details: Name, E-Mail, Profilbild ändern
- Abo-Status: Plan, Ablaufdatum, Verlängerung/Kündigung
- Credit-Wallet:
- Aktueller Kontostand
- Verlauf (Käufe, Verbräuche, Verfall)
- Direktkauf über Stripe
- Sicherheit: Magic Links, OAuth-Konten, Passwort-Reset
- Blog-Interaktionen: letzte Kommentare & Beiträge
- Tool-Nutzung: Verbrauchsstatistik (Tag/Woche/Monat), pro Tool
- Benachrichtigungen: Status, neue Features, Antworten
- Support: Kontaktformular, Fehlerberichte
  Direktkäufe nutzen Preis‑IDs/Payment‑Links aus [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) je Umgebung; Planwechsel/Abbrüche propagiert der Stripe‑Webhook serverseitig nach D1, Rückerstattungen erfolgen gemäß Stripe‑Richtlinien über das Dashboard, optional mit Customer‑Portal. <!-- refined -->

### 11.2 Erweiterbare Bereiche (Zukunft)

- Referral-System (Freunde werben = Credits)
- Activity Feed (chronologische Aktionen)
- Dritt-Integrationen (Notion, Zapier, Cloudflare Logs)
- Gamification-Elemente (Badges, Nutzungslevel)

Leitsatz: Das Dashboard ist der persönliche Mittelpunkt des Evolution-Ökosystems – klar, transparent und selbstverwaltbar.

## 12 Session & Cookie Policy

Sessions verwenden `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/) als Produktionsstandard; `session_id` (SameSite=Lax) bleibt ein kompatibler Fallback für Dev/Testing. Die Sessionvalidierung und Nutzerauflösung erfolgt in D1; KV `SESSION` dient nicht der Token‑Ablage. Stytch‑Flows können auf einer Custom‑Domain laufen, ohne die Cookie‑Domain der App zu verändern; Cross‑Site‑Kontexte werden mit SameSite‑Regeln entschärft. Siehe [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0), [src/lib/auth-v2.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/auth-v2.ts:0:0-0:0), [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0).

## 13 CSRF & Same-Origin Policy

Unsichere Methoden (POST/PUT/PATCH/DELETE) erfordern eine Origin/Referer‑Prüfung und optional Double‑Submit‑Validierung (`csrf_token`‑Cookie + `X-CSRF-Token`). Erlaubte Origins werden aus Request‑Origin, Env‑Variablen (`ALLOWED_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`) und Handler‑Optionen zusammengeführt. Durchsetzung erfolgt über [withApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:337:0-462:1) ([src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0)), HTML‑Seiten erhalten die Schutz‑Header zentral in [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0). Verstöße werden als `forbidden` gemeldet und sicher geloggt.

## 14 API-Response & Fehlerkonventionen

Alle API‑Antworten folgen vereinheitlichten JSON‑Formen via [createApiSuccess](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:320:0-335:1)/[createApiError](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:292:0-318:1), inkl. typisierter Fehler (`validation_error`, `forbidden`, `server_error`, …) und konsistenter Statuscodes. 405 wird über [createMethodNotAllowed](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:63:0-85:1) mit gesetztem `Allow`‑Header geliefert. Fehlerpfade werden strukturiert geloggt (endpoint, method, requestId) mit PII‑Redaction. Siehe [src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0).

## 15 Rate Limiting

Standard‑Limits: allgemeine APIs 30/min, AI‑Generate 15/min, AI‑Jobs 10/min, Voice‑Transcribe 15/min; 429‑Antworten enthalten `Retry-After`. Limits sind zentral in `src/lib/rate-limiter.ts` definiert und über Middleware pro Route anwendbar. Sensible Endpunkte können strengere Presets nutzen, die Konfiguration ist pro Umgebung dokumentiert.

## 16 Environment-Matrix & Feature-Flags

[wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) definiert dev/testing/staging/production samt Bindings und Flags (z. B. `WORKERS_AI_ENABLED`, `TESTING_ALLOWED_CF_MODELS`, `VOICE_STREAM_SSE/POLL`, `PROMPT_*`). Testing erlaubt ausschließlich freigegebene Workers‑AI‑Modelle (keine Replicate‑Tokens), während Staging/Prod die Hybrid‑Provider nutzen. Flags beeinflussen UI‑Optionen und Serverpfade deterministisch; Defaults und Overrides sind pro Umfeld festgelegt.

## 17 Datenlebenszyklus & Aufbewahrung

D1 speichert Benutzer, Sessions und Abrechnungszuordnungen; R2 speichert generierte Assets (Bilder/Audio) mit definierten Lifecycle‑Regeln; KV hält volatile Zähler/Queues (Usage, Voice‑Aggregator). Aufbewahrungsfristen, Löschroutinen und Re‑Hydration werden dokumentiert; personenbezogene Inhalte erhalten ein minimiertes Logging. Regelmäßige Backups und Restore‑Proben sichern Betriebsfähigkeit.

## 18 Image-Enhancer: Provider-Gating & Parameterkappen

In Dev/Testing sind Replicate‑Modelle serverseitig verboten, Workers‑AI ist für freigegebene Modelle aktiv; Staging/Prod erlauben alle Provider. Testumgebungen erzwingen Parameterkappen (z. B. `strength`/`guidance`/`steps`) und validieren Content‑Types. Implementierung: [src/config/ai-image.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/config/ai-image.ts:0:0-0:0), [src/lib/services/ai-image-service.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/services/ai-image-service.ts:0:0-0:0), [src/pages/api/ai-image/generate.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/ai-image/generate.ts:0:0-0:0).

## 19 R2-Proxy & Zugriffsrichtlinie

Zugriff auf generierte Assets erfolgt über Worker‑Proxys (`/r2-ai/**`), nicht über öffentliche Buckets; Cache‑Header unterscheiden kurzlebige Originale und längerlebige Derivate. Signierte Links können pro Anwendungsfall eingesetzt werden, Standard ist kontrollierte, öffentliche Auslieferung über den Worker. Siehe `src/pages/r2-ai/**`.

## 20 Observability & Logging

Jede Anfrage erhält eine `requestId`; Logs werden strukturiert mit PII‑Redaction erfasst (Kopfzeilen, IP‑Anonymisierung). Client‑ und Server‑Ereignisse (z. B. AI‑Jobs, Voice‑Stream) werden korreliert; Fehler‑/Sicherheitslogger sind getrennt. Retention und Zugriff sind rollenbasiert geregelt. Siehe [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0), `src/server/utils/logger*`.

## 21 Cloudflare Caching & Rulesets

Statische Assets erhalten lange TTLs (Adapter‑Headers), HTML wird `no-store` bedient; Worker‑Assets werden via `.assetsignore` korrekt von `dist` getrennt. Edge‑Rulesets (Cache‑Bypässe) sind versioniert und über CI validiert; Änderungen folgen einem Genehmigungsprozess. Siehe `astro.config.mjs`, [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0), Ruleset‑JSONs.

## 22 Content Security Policy (CSP)

Development nutzt eine entspannte CSP für HMR; Produktion setzt Nonce‑basierte Richtlinien mit `strict-dynamic` und wohldefinierten Quellen. Route‑spezifische Ausnahmen (z. B. Mikrofon auf Voice‑Seiten) sind gezielt hinterlegt. Cloudflare Insights bleibt in Produktion deaktiviert; Änderungen an der CSP folgen einem kontrollierten Change‑Prozess. Siehe [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0).

## 23 OpenAPI-Governance

Die HTTP‑API ist in [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0) beschrieben; `npm run openapi:validate` fungiert als Read‑Only‑Gate in der CI. Drifts zwischen Implementation und Spezifikation werden zeitnah korrigiert; Breaking‑Changes erfordern Versionierung und Kommunikationsfenster. Generierte Referenzen werden im Docs‑Build aktualisiert.

## 24 Billing-Pipeline & Stripe-Integration

Stripe‑Webhooks werden signaturgeprüft entgegengenommen und propagieren Plans/Entitlements in D1; Idempotency verhindert doppelte Verarbeitung. Preis‑IDs/Payment‑Links sind per Umgebung hinterlegt ([wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0)). Refunds/Disputes folgen Stripe‑Prozessen; Audit‑Logs dokumentieren kritische Zustände. Siehe [src/pages/api/billing/stripe-webhook.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/billing/stripe-webhook.ts:0:0-0:0).

### 25 Voice Streaming Architektur

Streaming via SSE (`/api/voice/stream`) und Fallback‑Polling (`/api/voice/poll`) wird flag‑gesteuert aktiviert; ein KV‑Aggregator hält Job‑Zustände und Teilresultate. Chunk‑Uploads (`/api/voice/transcribe`) validieren MIME, Größe und Quoten; optionales R2‑Archiv ist konfigurierbar. Observability‑Events machen Verbindungsstatus und Fehler sichtbar.

### 26 Prompt-Enhancer Provider & Limits

Provider‑Modelle, Token‑Limits und erlaubte Dateitypen sind per Env konfiguriert (z. B. `PROMPT_*` in [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0)). Server validiert Größen/Tokens und begrenzt Ausgaben deterministisch. UI spiegelt Beschränkungen wider, die Server‑Durchsetzung bleibt bindend. Siehe [src/pages/api/prompt-enhance.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/prompt-enhance.ts:0:0-0:0).

### 27 Missbrauchsprävention & Bot-Abwehr

Turnstile oder äquivalente Herausforderungen sichern anfällige POST‑Flows (z. B. Magic Link‑Anfrage). Origin‑Checks, Rate‑Limits und Anomalie‑Muster begrenzen automatisierten Missbrauch. Bots werden auf HTML‑Ebenen erkannt und an Gates vorbeigeführt, ohne Schutzmechanismen abzuschalten.

### 28 Cache-Control-Strategie

HTML‑Routen werden mit `no-store, no-cache, must-revalidate` ausgeliefert, während Assets langfristig cachbar sind; API‑Antworten sind standardmäßig nicht cachebar. R2‑Proxys definieren differenzierte TTLs je Artefaktklasse. Anpassungen erfolgen konsistent in Middleware und Adaptern.

### 29 Support & Incident Response

Vorfallstypen werden nach Schwere (P1–P4) klassifiziert; Erkennung, Eskalation und Kommunikation folgen einem Runbook. Incidents werden lückenlos protokolliert, Post‑Mortems führen zu Code‑/Config‑Maßnahmen. Ein Status‑Kanal informiert Nutzer zeitnah und transparent.

### 30 QA-Gates & Release-Kriterien

Release‑Kandidaten durchlaufen Format/Lint, Unit/Integration/E2E (Chromium/Firefox/WebKit; Enhancer mit `--workers=1`), `astro check` und OpenAPI‑Validierung. Abbruchkriterien sind definiert; ein Rollback‑Pfad steht für fehlerhafte Deployments bereit. Testberichte werden versioniert abgelegt.

### 31 Versionierung & Releases

Feature‑Branches, PR‑Reviews und semantische Tags strukturieren Releases; Environment‑Promotion ist schrittweise und nachvollziehbar. Canary‑Rollouts und Feature‑Flags begrenzen Risiko. Breaking‑Changes werden angekündigt und gelotet.

### 32 Governance der Credit-Multiplikatoren

Multiplikator‑Änderungen unterliegen 4‑Augen‑Prinzip und Dokumentationspflicht; Versionen nennen Datum, Motiv und erwartete Kostenwirkung. UI‑Texte/Badges werden konsistent aktualisiert; Messungen bestätigen Effekte.

### 33 Datenschutz & Compliance

Verarbeitung personenbezogener Daten erfolgt nach DSGVO; Sub‑Prozessoren (Stytch, Stripe, Cloudflare, OpenAI, Replicate) sind dokumentiert. Einwilligungen, Zweckbindung und Löschkonzepte sind implementiert; Betroffenenrechte (Auskunft/Löschung) werden fristgerecht bedient. Datenschutzhinweise sind aktuell.

### 34 Backup & Disaster Recovery

Regelmäßige Backups für D1/KV/R2 sichern Datenintegrität; Zielwerte sind RPO ≤ 24 h, RTO ≤ 4 h. Wiederherstellungsproben erfolgen quartalsweise und werden protokolliert. Notfallkontakte und Eskalationswege sind definiert.

### 35 Zugriffskontrollmodell (RBAC)

Neben User/Admin sind erweiterbare Rollen (z. B. Moderator, Billing‑Support) vorgesehen, die nur notwendige Berechtigungen erhalten. Administrative Aktionen (Freigabe, Credit‑Anpassungen) sind auditierbar. Autorisierung wird serverseitig durchgesetzt.

### 36 Kommerzielle Richtlinien (Credits/Refunds)

Credit‑Verfall (6 Monate) ist klar kommuniziert; Kulanz und manuelle Korrekturen folgen definierten Kriterien. Refunds orientieren sich an Stripe‑Policies; Disputes werden fristgerecht mit Belegen beantwortet. Abrechnungsfehler werden priorisiert behoben.

### 37 Datenresidenz & Regionen

Cloudflare‑Ressourcen und Provideraufrufe berücksichtigen regionale Verarbeitung, soweit verfügbar; Speicherung in R2 erfolgt in der gewählten Region. Gesetzliche Vorgaben zum Transfer werden eingehalten; Transparenz für Nutzer ist gewährleistet.

### 38 Drittanbieter-Runbooks & Secrets-Management

Runbooks für Stytch/Stripe/Cloudflare/LLM‑Provider beschreiben Fehlerbilder und Gegenmaßnahmen. Secrets liegen in Wrangler‑Secrets bzw. Provider‑Stores, Rotation ist geplant und dokumentiert; Leaks werden mit Sofortmaßnahmen (Revoke/Rotate, Audit) adressiert.

### 39 API-Versionierung & Deprecation-Policy

Öffentliche APIs erhalten Versionspfade oder Header‑Versionen; Deprecations werden frühzeitig kommuniziert und mit Sunset‑Daten versehen. Alte Pfade liefern 410/Redirects mit Migrationshinweisen. Breaking‑Änderungen folgen einem festen Zyklus.

### 40 Environment-Flag-Inventar

Eine katalogisierte Liste aller Flags (`WORKERS_AI_ENABLED`, `TESTING_WORKERS_AI_ALLOW`, `VOICE_STREAM_*`, `PROMPT_*`, `PUBLIC_TURNSTILE_SITE_KEY`, …) mit Zweck, Default, Gültigkeit und Risiken ist gepflegt. Änderungen am Inventar sind review‑pflichtig und werden getestet.

### 41 Provider-Error-Mapping & Retry-Matrix

Externe Fehler werden auf interne Typen gemappt (4xx → `validation_error/forbidden`, 5xx → `server_error`) und mit begrenzten Retries versehen. Idempotente Retries nutzen Job‑IDs/Schlüssel, um Doppelverbräuche zu verhindern. Implementierung in Services (AI/Voice) ist einheitlich.

### 42 Datenklassifikation & Redaction

Daten werden nach Sensibilität klassifiziert; Logs enthalten keine PII oder nur redigierte Kopffelder/IP‑Fragmente. Zugriff auf Rohdaten ist rollenbasiert; Export/Teilen folgt Freigabe‑Prozessen. Prüfroutinen sichern die Einhaltung.

### 43 Usage/Entitlements Spezifikation

Plan‑Quoten, Reset‑Takten (Zeitzone) und Gast‑Limits sind pro Tool definiert; `usage.limit` ist führend, `limits.*` verbleibt als Legacy. Server erzwingt Limits, UI spiegelt Status (Badges/CTA). Abweichungen werden geloggt.

### 44 Health-Endpoints & Monitoring

Interne Health‑Checks (z. B. `/api/health/*`) prüfen Auth/Billing/DB; geschützte Tokens verhindern Missbrauch. Dashboards visualisieren Fehlerquoten, Latenzen und Kostenindikatoren; Alarme (Pager) greifen bei Schwellwertverletzung. Tests validieren Header/Sicherheits‑Posture.

### 45 Security-Header Baseline & Change Management

API‑Antworten erhalten `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS und eine restriktive Permissions‑Policy; HTML‑Routen bekommen zusätzlich eine kontextspezifische CSP. Änderungen an der Sicherheitsbaseline sind dokumentations‑ und review‑pflichtig und werden gestaffelt ausgerollt. Regressions‑Tests prüfen Header‑Konsistenz.

### 46 Release & Rollback Playbook

Ein standardisierter Ablauf beschreibt Build, Tests, Preview, Freigabe und Produktionsdeployment samt Stop‑Kriterien. Rollbacks sind skriptgestützt und reversibel; Post‑Rollback‑Checks sichern Datenkonsistenz. Kommunikation an Stakeholder ist Teil des Plans.

### 47 Testmatrix & QA-Checkliste

Die Matrix deckt Browser (Chromium/Firefox/WebKit, inkl. Mobile), Sprachen (DE/EN) und Umgebungen ab; für ratelimiting‑sensitive Flows werden parallele Worker reduziert. Checklisten umfassen Consent/CSP/Headers, API‑Kontrakte, File‑Handling und Abrechnung. Artefakte (Reports/Videos) werden archiviert.

### 48 Customer Support SLA & Eskalation

SLA‑Ziele sind je Plan definiert (Antwort‑/Lösungszeiten); Eskalation führt über Support→Engineering→On‑Call. Kundensichtbare Störungen werden im Status‑Kanal aktualisiert; Ticketing verknüpft mit Incident‑Records. Feedback fließt ins Backlog.

### 49 Compliance-Checkliste

Ein lebendes Dokument erfasst DPIA, Sub‑Prozessor‑Verträge, Cookie‑Richtlinien, Aufbewahrung und Rechte der Betroffenen. Regelmäßige Audits stellen Konformität sicher; Änderungen am Rechtsrahmen werden zeitnah umgesetzt. Nachweise sind revisionssicher.

### 50 Kosten-Governance

Budgets und Alarme begrenzen variable Kosten (LLM/GPU/Storage); pro Feature werden Kosten beobachtet und Optimierungen abgeleitet. Multiplikator‑/Preisänderungen folgen einem ankündigten Prozess mit Nutzerkommunikation. Forecasting unterstützt Planung.
