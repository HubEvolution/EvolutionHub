# CodeMap Prompts (Provisorisch)

Dieses Dokument enthält 10 präzise, alias‑aufgelöste und evidenzbasierte Prompts zur Generierung von Codemaps für dieses Repository, inklusive Verbesserungspunkten je Prompt sowie globale Ausführungs‑Constraints. Es ist als temporäre Arbeitsgrundlage gedacht.

---

## 0) Globale Ausführungs‑Constraints (für alle Prompts)

- **Alias‑Merge:** Lies und merge Alias‑Maps aus `tsconfig.json` (compilerOptions.paths), `astro.config.mjs` (vite.resolve.alias) und `test-suite-v2/vitest.config.ts` (resolve.alias). Spezifische Keys müssen vor generischen gematcht werden (z. B. `'@/server/utils/logger-factory'` vor `'@'`/`'@/*'`).
- **Frisch lesen:** Öffne jede Datei unmittelbar vor der Analyse erneut (kein Cache).
- **Belegpflicht:** Jede Kante und jedes abgeleitete Feld muss mindestens eine Quellzeile mit exakter Importzeile enthalten (Datei+Zeile+Originaltext).
- **Keine Interpretation:** Rollen nur aus Pfadmustern ableiten (z. B. `src/pages/api/**` → api). Keine Deutung ohne explizite Codegrundlage.
- **Pfade/Meta:** Output mit absoluten, normalisierten Posix‑Pfaden, `mtimeMs` und Dateigröße für geprüfte Dateien.

## Empfohlene Ausführungsreihenfolge

- **1)** 1) Repository‑weiter Modul‑Importgraph (alias‑aufgelöst, evidenzbasiert)
- **2)** 4) Globales Middleware‑Profil (`src/middleware.ts`)
- **3)** 3) API‑Routen & Middleware‑Verwendung
- **4)** 9) Storage & Data: DB + R2‑Proxies
- **5)** 5) Auth + OAuth Domain (belegte Artefakte)
- **6)** 6) Feature: Prompt Enhancer (Service‑Pipeline)
- **7)** 7) Feature: Voice Visualizer + Transcriptor (SSE/Poll/Transcribe)
- **8)** 8) Feature: AI Image Enhancer (Jobs/Generate/Usage)
- **9)** 11) Blog + Kommentare (Domain‑Codemap)
- **10)** 2) Astro Pages & Islands (UI‑Routing‑Graph)
- **11)** 10) Tests‑Graph & Abdeckungssignale

Hinweise zur Reihenfolge:

- **Fundament:** Zuerst den globalen Importgraph (1) als Basis.
- **Cross‑Cutting:** Dann globale Middleware (2) und API‑Middleware‑Verwendung (3).
- **Daten‑Boundary:** Storage/R2 (4) vor den Feature‑Domänen.
- **Domänen:** Auth (5), Prompt (6), Voice (7), AI‑Image (8), Blog+Kommentare (9).
- **UI & Tests:** UI‑Schnittstellen (10) und abschließend Test‑Abdeckungssignale (11).

---

## Panel‑Optimierte Eingabe‑Vorlagen (1–11, in empfohlener Reihenfolge)

### Prompt 1: Repository‑weiter Modul‑Importgraph

Präambel:
Bitte lies die folgenden Dateien frisch ein, bevor du beginnst: ./tsconfig.json, ./astro.config.mjs, ./test-suite-v2/vitest.config.ts. Verwende ihre Alias‑Maps deterministisch (spezifische Keys vor generischen) und arbeite ohne Caching. Keine Platzhalter verwenden.

Aufgabe:

- Erzeuge den vollständigen Modul‑Importgraphen des Repos mit belegten Kanten und vollständig aufgelösten Pfaden. Jede Kante muss eine Quellzeile (Datei+Zeile+Originaltext) enthalten.

Datenquellen (immer frisch lesen):

- ./tsconfig.json → compilerOptions.paths
- ./astro.config.mjs → vite.resolve.alias
- ./test-suite-v2/vitest.config.ts → resolve.alias (nur für test-suite-v2)
- Quellcode: ./src/**/\*.{ts,tsx,astro}, ./workers/**/_.{ts,js}, ./tests/\*\*/_.{ts,tsx}, ./test/**/\*.{ts,tsx}, ./test-suite-v2/src/**/\*.{ts,tsx}

Alias‑Regeln:

- Alias‑Maps deterministisch zusammenführen; spezifische Keys zuerst (z. B. '@/server/utils/logger-factory' vor '@'/'@/\*').
- Alle definierten Präfixe unterstützen (z. B. '@/_', '@api/_', '@components/\*', '@/lib', '@/components', '@/server', …).
- Jeden Import (statisch, dynamisch import(), Re‑Exports) auf absolute, normalisierte Posix‑Pfade auflösen.

Scan‑Regeln:

- Erfasse: statische Importe, Re‑Exports, dynamische Importe, <script>‑Importe in \*.astro.
- Nur tatsächlich vorhandene Import‑Anweisungen zählen (keine Annahmen).

Output (JSON, keine Platzhalter):
{
"graph": {
"nodes": [{ "path": "<abs file>", "sizeBytes": <int>, "mtimeMs": <int> }],
"edges": [{ "from": "<abs file>", "to": "<abs file>", "importKind": "static|dynamic|reexport", "sourceLine": <int>, "sourceText": "<exact import line>" }]
},
"aliasMap": { "<alias>": "<resolved target or glob>" },
"stats": { "nodeCount": <int>, "edgeCount": <int> },
"ranking": { "mostCentralModules": [{ "path": "<abs file>", "fanIn": <int>, "fanOut": <int>, "degree": <int> }] },
"evidenceVersion": { "readTsconfigAt": "<iso-utc>", "readAstroConfigAt": "<iso-utc>", "readVitestConfigAt": "<iso-utc>" }
}

Nebenbedingungen:

- Rollen nur aus Pfadmustern ableiten (z. B. `src/pages/api/**` → api, `src/components/**` → ui). Keine Inhaltsinterpretation.
- Alle Pfade als absolute, normalisierte Posix‑Pfade ausgeben. Vor Analyse frisch lesen.

### Prompt 2: Globales Middleware‑Profil (src/middleware.ts)

Präambel:
Bitte lies frisch: ./src/middleware.ts. Keine Platzhalter, kein Caching.

Aufgabe:

- Analysiere ausschließlich `src/middleware.ts` faktenbasiert: exportierte Hooks, gesetzte Header, Pfad‑Guards/Ausnahmen (z. B. `/r2-ai/**`), Sicherheitsrichtlinien (CSP/HSTS/Permissions‑Policy/X‑Frame‑Options) mit Fundstellen.

Output (JSON, keine Platzhalter):
{
"file": "<abs>",
"headersSet": [{ "name": "...", "valueSample": "...", "line": <int> }],
"pathGuards": [{ "pattern": "...", "line": <int> }],
"exclusions": [{ "pattern": "...", "line": <int> }],
"notes": [{ "line": <int>, "text": "<exact>" }]
}

Nebenbedingungen:

- Nur direkte Zitate mit Zeilen. Absolute Pfade. Frisch lesen.

### Prompt 3: API‑Routen & Middleware‑Verwendung

Präambel:
Bitte lies frisch: ./tsconfig.json, ./astro.config.mjs. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Liste alle Astro API‑Routen und identifiziere belegbar, ob/wie `withApiMiddleware`/`withAuthApiMiddleware`/`withRedirectMiddleware` verwendet werden. Erfasse Options‑Literals (CSRF/RateLimiter) und 405/Allow‑Header‑Pfade.

Scope:

- Include: ./src/pages/api/\*_/_.ts, ./src/lib/api-middleware.ts, ./src/lib/rate-limiter.ts

Output (JSON, keine Platzhalter):
{
"routes": [{
"handlerFile": "<abs>",
"methods": ["GET","POST",...],
"middlewareUsed": "withApiMiddleware|withAuthApiMiddleware|withRedirectMiddleware|null",
"middlewareOptionsLiteral": { "text": "<exact snippet>", "startLine": <int>, "endLine": <int> },
"servicesImports": [{ "to": "<abs>", "line": <int> }],
"csrfEnforced": true|false,
"rateLimiter": "<name>|null",
"allowHeaderEvidence": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"evidence": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
}],
"inconsistencies": [{ "path": "<abs>", "reason": "<text>" }]
}

Nebenbedingungen:

- Nur belegte Fundstellen. Absolute Pfade. Frisch lesen.

### Prompt 4: Storage & Data — DB + R2‑Proxies

Präambel:
Bitte lies frisch: ./tsconfig.json, ./astro.config.mjs. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Isoliere Storage‑Layer und Proxyrouten mit belegten Importkanten. Markiere, wenn R2‑Proxies außerhalb von Gates liegen.

Scope:

- Include: ./src/lib/db/**/\*, ./src/pages/r2/**/_, ./src/pages/r2-ai/\*\*/_, ./src/env.d.ts

Output (JSON, keine Platzhalter):
{
"dbHelpers": [{ "file": "<abs>", "exported": ["..."] }],
"r2Routes": [{ "file": "<abs>", "methods": ["..."], "evidence": [{ "line": <int>, "text": "<exact>" }] }],
"edges": [{ "from": "<abs>", "to": "<abs>", "line": <int>, "text": "<exact>" }],
"gatesExclusions": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
}

Nebenbedingungen:

- Nur belegte Fundstellen. Absolute Pfade. Frisch lesen.

### Prompt 5: Auth + OAuth Domain (belegte Artefakte)

Präambel:
Bitte lies frisch: ./tsconfig.json, ./astro.config.mjs. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Kartiere Auth/OAuth Endpunkte/Services streng nach Code. Markiere Storage‑Schnittstellen (DB) als Boundary. Belege Redirect/Cookies mit Quellzeilen.

Scope:

- Include: ./src/pages/api/auth/**/\*, ./src/pages/api/user/**/_, ./src/lib/auth-_.ts, ./src/lib/stytch*.ts, ./src/lib/db/\*\*/*, ./src/middleware.ts

Output (JSON, keine Platzhalter):
{
"endpoints": [{ "path": "<abs>", "methods": ["..."], "imports": [{ "to": "<abs>", "line": <int> }], "notes": [{ "line": <int>, "text": "<exact>" }] }],
"services": [{ "path": "<abs>", "importedByCount": <int> }],
"storageBoundaries": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"evidence": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
}

Nebenbedingungen:

- Nur belegte Fakten. Absolute Pfade. Frisch lesen.

### Prompt 6: Feature — Prompt Enhancer (Service‑Pipeline)

Präambel:
Bitte lies frisch: ./tsconfig.json, ./astro.config.mjs. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Mappe Prompt‑Enhancer Endpunkte und Service‑Pipeline. Markiere Provider‑Aufrufe (OpenAI) und Adapter‑Boundary. Dokumentiere KV‑Quoten/Flags als evidenzbasierte Inputs.

Scope:

- Include: ./src/pages/api/prompt-enhance.ts, ./src/pages/api/prompt/usage.ts, ./src/lib/services/prompt-enhancer-service.ts, ./src/config/prompt-enhancer.ts, ./src/components/tools/prompt-enhancer/\*_/_

Output (JSON, keine Platzhalter):
{
"apiToService": [{ "api": "<abs>", "service": "<abs>", "line": <int> }],
"pipeline": [{ "step": "parseInput|structurePrompt|rewriteMode|applySafety|calculateScores|callRewriteLLM|enhance", "file": "<abs>", "line": <int> }],
"providers": [{ "file": "<abs>", "importLine": <int>, "callLine": <int> }],
"adapterBoundary": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"kvFlags": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"uiToApi": [{ "component": "<abs>", "apiPath": "/api/prompt-enhance", "evidence": [{ "file": "<abs>", "line": <int>, "text": "fetch('/api/prompt-enhance'...)" }] }]
}

Nebenbedingungen:

- Nur belegte Fundstellen. Absolute Pfade. Frisch lesen.

### Prompt 7: Feature — Voice Visualizer + Transcriptor (SSE/Poll/Transcribe)

Präambel:
Bitte lies frisch: ./tsconfig.json, ./astro.config.mjs. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Mappe Voice‑APIs (POST /transcribe, GET /usage, GET /stream, GET /poll) und Service‑Abhängigkeiten. Markiere KV optional/required als Environment‑Boundary. Erkenne Flags (SSE/Poll/R2) mit Belegen.

Scope:

- Include: ./src/pages/api/voice/**/\*, ./src/lib/services/voice-transcribe-service.ts, ./src/config/voice/**/_, optional ./src/components/tools/voice-visualizer/\*\*/_

Output (JSON, keine Platzhalter):
{
"endpoints": [{ "file": "<abs>", "methods": ["..."], "evidence": [{ "line": <int>, "text": "<exact>" }] }],
"service": [{ "file": "<abs>", "methods": [{ "name": "...", "line": <int> }] }],
"providers": [{ "file": "<abs>", "import": "<text>", "line": <int> }],
"envBoundaries": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"flags": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
}

Nebenbedingungen:

- Nur belegte Fundstellen. Absolute Pfade. Frisch lesen.

### Prompt 8: Feature — AI Image Enhancer (Jobs/Generate/Usage)

Präambel:
Bitte lies frisch: ./tsconfig.json, ./astro.config.mjs. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Mappe AI‑Image Endpunkte/Services, Jobs/Queue‑Schnittstellen und Provider‑Fehlermappings. Markiere Queue‑Boundary.

Scope:

- Include: ./src/pages/api/ai-image/\*_/_, ./src/lib/services/ai-image-service.ts, ./src/lib/services/ai-jobs-service.ts, ./src/config/ai-image.ts, ./src/lib/services/provider-error.ts, optional UI

Output (JSON, keine Platzhalter):
{
"api": [{ "file": "<abs>", "methods": ["..."], "imports": [{ "to": "<abs>", "line": <int> }] }],
"services": [{ "file": "<abs>", "imports": [{ "to": "<abs>", "line": <int> }] }],
"queueBoundary": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"providerErrors": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
}

Nebenbedingungen:

- Nur belegte Fakten. Absolute Pfade. Frisch lesen.

### Prompt 9: Blog + Kommentare (Domain‑Codemap)

Präambel:
Bitte lies die folgenden Dateien frisch ein, bevor du beginnst: ./tsconfig.json, ./astro.config.mjs, ./test-suite-v2/vitest.config.ts. Verwende ihre Alias‑Maps deterministisch (spezifische Keys vor generischen) und arbeite ohne Caching. Keine Platzhalter verwenden.

Aufgabe:

- Erzeuge eine faktenbasierte Codemap für die Blog‑Domain (Content/Pages/Service) und die Kommentar‑Domain (APIs/Service/DB/Moderation). Jede Kante muss eine Quellzeile (Datei+Zeile+Originaltext) enthalten. Schnittstellen und Boundaries explizit markieren.

Scope (Include):

- Blog Content/Pages/Service:
  - ./src/content/blog/\*_/_
  - ./src/pages/blog/\*_/_, inkl. ./src/pages/blog/[...slug].astro
  - ./src/lib/blog.ts
  - optionale Blog‑UI: ./src/components/**/blog/**/_, ./src/components/blog/\*\*/_ (falls vorhanden)
- Kommentare (APIs/Service/DB/Types/Security):
  - ./src/lib/services/comment-service.ts
  - ./src/lib/db/\*_/_, speziell ./src/lib/db/schema\*
  - ./src/pages/api/**/comments\*.ts, ./src/pages/api/comments/**/\* (falls vorhanden)
  - ./src/lib/rate-limiter.ts, ./src/lib/security/csrf.ts, ./src/lib/spam-detection.ts
  - ./src/lib/services/notification-service.ts, ./src/lib/types/comments.ts, ./src/lib/types/notifications.ts

Exclude:

- docs/**, dist/**, build/**, node_modules/**, reports/**, coverage/**, test artifacts außer sie importieren Produktionscode

Alias‑/Scan‑Regeln:

- Aliasse aus tsconfig/astro/vitest deterministisch mergen; spezifische Keys vor generischen.
- Erfasse: statische Importe, Re‑Exports, dynamische Importe (import()), <script>‑Importe in \*.astro.
- Nur tatsächliche Import‑/Aufrufstellen zählen (keine Annahmen).

Zu erfassende Fakten (mit Evidenz):

- Blog:
  - Content Collection Verwendung: Fundstellen von getCollection('blog') oder äquivalent (Datei+Zeile).
  - Service‑Nutzung: Import/Verwendung von ./src/lib/blog.ts in Pages/Components (Kanten + Zeilen).
  - Zentrale Service‑Methoden im `BlogService` (z. B. calculateReadingTime, processPost, getBlogIndexData, getPaginatedPosts, getRelatedPosts, getPostBySlug) mit Signaturzeilen.
  - UI→Blog‑Service Kanten und Blog‑Page Routen mit Zeilen.
- Kommentare:
  - API‑Routen: Dateien, exportierte Methoden (GET/POST/PUT/PATCH/DELETE), Verwendungen von Middleware (withApiMiddleware/withAuthApiMiddleware/withRedirectMiddleware) inkl. Options‑Literal (CSRF, RateLimiter) mit Zeilen.
  - Service‑Methoden in `CommentService` (z. B. listCommentsLegacy, Moderation/Report/CRUD) mit Signaturzeilen.
  - Sicherheits-/Infra‑Kanten: CSRF‑Validierung, Rate‑Limiting, Spam‑Erkennung, Notification‑Trigger – je mit Import‑ und Aufruf‑Fundstellen.
  - Storage‑Zugriffe: verwendete DB‑Tabellen/Views/Pragmas (z. B. PRAGMA table_info, comments, commentModeration, commentReports) als Zitate mit Zeilen.
  - Caching/KV‑Verwendung: Cache‑Keys/TTL oder KV‑Nutzung im Kommentar‑Service mit Zeilen.
- UI→API:
  - Belegte Fetch‑Aufrufe aus Blog‑Pages/Components zu Kommentar‑APIs (falls vorhanden) mit Datei+Zeile+Originaltext.
- Boundaries:
  - Storage‑Boundary (DB/R2), Security‑Boundary (CSRF/Spam), Rate‑Limit‑Boundary, Notification‑Boundary. Jede Boundary mit mindestens einer belegten Fundstelle.

Output (JSON, keine Platzhalter):
{
"blog": {
"content": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"service": {
"file": "<abs>",
"methods": [
{ "name": "calculateReadingTime|processPost|getBlogIndexData|getPaginatedPosts|getRelatedPosts|getPostBySlug", "line": <int> }
]
},
"uiEdges": [
{ "from": "<abs page/component>", "to": "<abs blog service or content>", "line": <int>, "text": "<exact>" }
]
},
"comments": {
"apiRoutes": [
{
"file": "<abs>",
"methods": ["GET","POST","PUT","PATCH","DELETE"],
"middleware": "withApiMiddleware|withAuthApiMiddleware|withRedirectMiddleware|null",
"middlewareOptions": { "text": "<exact snippet>", "startLine": <int>, "endLine": <int> },
"csrfEnforced": true|false,
"rateLimiter": "<name>|null",
"evidence": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
}
],
"service": {
"file": "<abs>",
"methods": [
{ "name": "listCommentsLegacy|... (weitere)", "line": <int> }
],
"securityCalls": [
{ "kind": "csrf|rateLimit|spamCheck|notify", "file": "<abs>", "line": <int>, "text": "<exact>" }
],
"cacheKv": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
},
"storage": {
"dbSchema": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"tablesUsed": [{ "name": "comments|commentModeration|commentReports|...", "file": "<abs>", "line": <int> }]
},
"uiToApi": [{ "file": "<abs>", "line": <int>, "text": "fetch('/api/...comments...')" }]
},
"boundaries": {
"storage": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"security": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"rateLimit": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }],
"notifications": [{ "file": "<abs>", "line": <int>, "text": "<exact>" }]
},
"stats": { "nodes": <int>, "edges": <int> },
"evidenceVersion": { "readTsconfigAt": "<iso-utc>", "readAstroConfigAt": "<iso-utc>", "readVitestConfigAt": "<iso-utc>" }
}

Nebenbedingungen:

- Rollen nur aus Pfadmustern ableiten (z. B. `src/pages/blog/**` → blog‑ui, `src/lib/services/comment-service.ts` → comments‑service). Keine Inhaltsinterpretation.
- Alle Pfade als absolute, normalisierte Posix‑Pfade ausgeben. Vor Analyse frisch lesen.
- Jede Kante/Schnittstelle/Boundary mit mindestens einer Quellzeile (Datei+Zeile+Originaltext) belegen.

### Prompt 10: Astro Pages & Islands (UI‑Routing‑Graph)

Präambel:
Bitte lies die folgenden Dateien frisch ein: ./tsconfig.json, ./astro.config.mjs. Alias‑Maps deterministisch, ohne Caching. Keine Platzhalter.

Aufgabe:

- Kartiere ausschließlich UI: Seiten/Layouts/Components/Islands mit belegten Importkanten. Markiere UI→API‑Fetch‑Aufrufe als Schnittstellen.

Scope:

- Include: ./src/pages/**/\*.astro, ./src/pages/**/_.ts, ./src/components/\*\*/_.{ts,tsx,astro}, ./src/layouts/\*_/_.{ts,tsx,astro}
- Exclude: ./src/pages/api/\*\*, services, workers, tests

Alias/Scan:

- Wie in Prompt 1; <script>‑Importe in \*.astro berücksichtigen. Rolle nur aus Pfad ableiten (ui).

Output (JSON, keine Platzhalter):
{
"pages": [{ "path": "<abs>", "imports": [{ "to": "<abs>", "line": <int>, "text": "<exact>" }] }],
"uiToApiCalls": [{ "file": "<abs>", "line": <int>, "text": "fetch('/api/...')" }],
"topIslandsByFanOut": [{ "path": "<abs>", "fanOut": <int> }]
}

Nebenbedingungen:

- Nur belegte Importe/Fetches. Absolute Pfade. Frisch lesen.

### Prompt 11: Tests‑Graph & Abdeckungssignale

Präambel:
Bitte lies frisch: ./tsconfig.json, ./test-suite-v2/vitest.config.ts. Deterministische Alias‑Auflösung, kein Caching.

Aufgabe:

- Mappe Testdateien → Zielmodule (Importkanten) und identifiziere zentrale Produktionsmodule ohne direkte Unit‑Imports. Snapshots/Fixtures ausschließen.

Scope:

- Include: ./tests/**/\*, ./test/**/_, ./test-suite-v2/src/\*\*/_
- Exclude: **/**snapshots**/**, **/fixtures/** (außer sie importieren Produktionscode)

Output (JSON, keine Platzhalter):
{
"testToProdEdges": [{ "test": "<abs>", "imports": [{ "to": "<abs>", "line": <int>, "text": "<exact>" }] }],
"criticalProdWithoutDirectUnitImports": [{ "path": "<abs>", "fanIn": <int>, "fanOut": <int> }],
"notes": ["Nur belegte Kanten; keine Qualitätsurteile"]
}

Nebenbedingungen:

- Nur belegte Fundstellen. Absolute Pfade. Frisch lesen.

## 1) Repository‑weiter Modul‑Importgraph (alias‑aufgelöst, evidenzbasiert)

```text
Aufgabe:
- Erzeuge den vollständigen Modul-Importgraphen des Repos mit belegten Kanten und vollständig aufgelösten Pfaden.

Datenquellen (immer frisch lesen, nicht cachen):
- ./tsconfig.json → compilerOptions.paths
- ./astro.config.mjs → vite.resolve.alias
- ./test-suite-v2/vitest.config.ts → resolve.alias (nur für test-suite-v2 Scans)
- Quellcode: ./src/**/*.{ts,tsx,astro}, ./workers/**/*.{ts,js}, ./tests/**/*.{ts,tsx}, ./test/**/*.{ts,tsx}, ./test-suite-v2/src/**/*.{ts,tsx}

Alias-Regeln:
- Führe Alias-Maps aus tsconfig + astro.config.mjs + vitest.config.ts deterministisch zusammen.
- Spezifische Keys zuerst matchen (z. B. '@/server/utils/logger-factory' vor '@' bzw. '@/*').
- Unterstütze alle dort definierten Präfixe (z. B. '@/*', '@api/*', '@components/*', '@/lib', '@/components', etc.).
- Löse jeden Import (statisch, dynamisch import(), Re-Exports) auf absolute, normalisierte Posix-Pfade.

Scan-Regeln:
- Erfasse: statische Importe, Re-Exports, dynamische Importe, Astro <script>-Importe.
- Keine Annahmen: nur reale Import-Anweisungen.

Output (JSON, keine Platzhalter):
{
  "graph": {
    "nodes": [{ "path": "<abs file>", "sizeBytes": <int>, "mtimeMs": <int> }, ...],
    "edges": [
      {
        "from": "<abs file>",
        "to": "<abs file>",
        "importKind": "static|dynamic|reexport",
        "sourceLine": <int>,
        "sourceText": "<exact import line>"
      }
    ]
  },
  "aliasMap": { "<alias>": "<target>" },
  "stats": { "nodeCount": <int>, "edgeCount": <int> },
  "ranking": {
    "mostCentralModules": [
      { "path": "<abs file>", "fanIn": <int>, "fanOut": <int>, "degree": <int> }
    ]
  },
  "evidenceVersion": {
    "readTsconfigAt": "<iso-utc>",
    "readAstroConfigAt": "<iso-utc>",
    "readVitestConfigAt": "<iso-utc>"
  }
}
```

- **Verbesserungspunkte:**
  - **[interfaces]** Zusätzlich “entry nodes” je Subdomäne markieren.
  - **[limits]** Ranking auf Top‑N zentralste Module begrenzen (z. B. 15) für Lesbarkeit.
  - **[astro]** Sicherstellen, dass `<script>`-Blöcke in `*.astro` vollständig geparst werden.

---

## 2) Astro Pages & Islands (UI‑Routing‑Graph)

```text
Aufgabe:
- Kartiere nur UI: Seiten/Layouts/Components/Islands mit belegten Importkanten.

Scope:
- Include: ./src/pages/**/*.astro, ./src/pages/**/*.ts, ./src/components/**/*.{ts,tsx,astro}, ./src/layouts/**/*.{ts,tsx,astro}
- Exclude: ./src/pages/api/**, services, workers, tests

Alias/Scan/Beleg:
- Wie bei (1), inkl. <script>-Importe.
- Rolle nur aus Pfad ableiten (ui=pages/components/layouts).

Output:
{
  "pages": [
    { "path": "<abs>", "imports": [ { "to": "<abs>", "line": <int>, "text": "<exact>" } ] }
  ],
  "topIslandsByFanOut": [ { "path": "<abs>", "fanOut": <int> } ]
}
```

- **Verbesserungspunkte:**
  - **[boundary]** UI→API Calls (z. B. `fetch('/api/...')`) als Schnittstelle gesondert ausweisen.
  - **[evidence]** Importzeilen aus Components/Layouts mitgeben, um Wiederverwendung sichtbar zu machen.

---

## 3) API‑Routen & Middleware‑Verwendung

```text
Aufgabe:
- Liste alle Astro API‑Routen und identifiziere belegbar, ob/wie `withApiMiddleware`/`withAuthApiMiddleware`/`withRedirectMiddleware` verwendet werden.

Scope:
- Include: ./src/pages/api/**/*.ts, ./src/lib/api-middleware.ts, ./src/lib/rate-limiter.ts

Extrahiere je Route:
- handlerFile: "<abs>"
- methods: ["GET","POST",...]
- middlewareUsed: "withApiMiddleware"|"withAuthApiMiddleware"|"withRedirectMiddleware"|null
- middlewareOptionsLiteral: exakter Objektliteral-Ausschnitt inkl. Zeilenbereich
- servicesImports: belegte Importziele (abs Pfad + Zeile)
- csrfEnforced: true|false (nur wenn im Optionsliteral `enforceCsrfToken: true` belegt)
- rateLimiter: Name oder null (nur wenn im Optionsliteral gesetzt)
- evidence: Signatur-Aufruf, Optionsliteral, Import der Middleware (Zeilen)

Output:
{ "routes": [ ... ], "inconsistencies": [ { "path":"...", "reason":"..." } ] }
```

- **Verbesserungspunkte:**
  - **[headers]** Falls `Allow`-Header/405-Handler existieren, diese mit Fundstellen aufnehmen.
  - **[clarity]** Routen pro Domäne (Auth/Prompt/Voice/AI-Image/Debug) gruppieren.

---

## 4) Globales Middleware‑Profil (`src/middleware.ts`)

```text
Aufgabe:
- Analysiere nur `src/middleware.ts` faktenbasiert.

Extrahiere:
- Exportierte Hooks/Funktionen (z. B. onRequest)
- Gesetzte Header (Name, Beispiel/Template; Zeilenangaben)
- Pfad‑Ausnahmen/Weiterleitungen (mit Zeilen)
- Sicherheitsrichtlinien (CSP/HSTS/Permissions-Policy/X-Frame-Options etc.) mit Fundstellen

Output:
{
  "file": "<abs>",
  "headersSet": [ { "name":"...", "valueSample":"...", "line":<int> } ],
  "pathGuards": [ { "pattern":"...", "line":<int> } ],
  "notes": [ "wörtliche Zitate mit Zeilen" ]
}
```

- **Verbesserungspunkte:**
  - **[exclusions]** Explizit festhalten, welche Pfade bewusst nicht betroffen sind (z. B. `/r2-ai/**`).
  - **[coherence]** Headergruppen (Security/Cache/Policies) getrennt auflisten.

---

## 5) Auth + OAuth Domain (belegte Artefakte)

```text
Aufgabe:
- Kartiere den Auth‑Bereich streng über vorhandene Dateien.

Scope:
- Include: ./src/pages/api/auth/**/*, ./src/pages/api/user/**/*, ./src/lib/auth-*.ts, ./src/lib/stytch*.ts, ./src/lib/db/**/*, ./src/middleware.ts

Output:
{
  "endpoints":[
    {
      "path":"<abs>",
      "methods":["..."],
      "imports":[ {"to":"<abs>","line":<int>} ],
      "notes":[ "Redirect/Set-Cookie u. ä. mit Zeilen" ]
    }
  ],
  "services":[ {"path":"<abs>","importedByCount":<int>} ],
  "evidence": [ { "file":"<abs>","line":<int>,"text":"<exact>" } ]
}
```

- **Verbesserungspunkte:**
  - **[boundary]** Storage‑Schnittstellen (DB) als Boundary kennzeichnen.
  - **[clarity]** Callback‑Flows/Redirect‑Ziele explizit mit Quellzeilen belegen.

---

## 6) Feature: Prompt Enhancer (Service‑Pipeline)

```text
Aufgabe:
- Mappe Prompt‑Enhancer Endpunkte und Service‑Pipeline.

Scope:
- Include: ./src/pages/api/prompt-enhance.ts, ./src/pages/api/prompt/usage.ts, ./src/lib/services/prompt-enhancer-service.ts, ./src/config/prompt-enhancer.ts, ./src/components/tools/prompt-enhancer/**/*

Output:
{
  "apiToService":[ { "api":"<abs>","service":"<abs>","line":<int> } ],
  "pipeline":[ { "step":"parseInput","file":"<abs>","line":<int> }, ... ],
  "providers":[ { "file":"<abs>","importLine":<int>,"callLine":<int> } ],
  "uiToApi":[ { "component":"<abs>","apiPathGuess":"/api/prompt-enhance","evidence":[{"file":"<abs>","line":<int>,"text":"fetch('/api/prompt-enhance'...)"}]} ]
}
```

- **Verbesserungspunkte:**
  - **[adapters]** Provider‑Adapter als eigene Boundary ausweisen (Kopplung senken).
  - **[limits]** KV‑abhängige Quoten/Flags als Inputparameter dokumentieren (evidenzbasiert).

---

## 7) Feature: Voice Visualizer + Transcriptor (SSE/Poll/Transcribe)

```text
Aufgabe:
- Mappe Voice‑APIs und Service‑Abhängigkeiten.

Scope:
- Include: ./src/pages/api/voice/**/*, ./src/lib/services/voice-transcribe-service.ts, ./src/config/voice/**/*, (falls vorhanden) ./src/components/tools/voice-visualizer/**

Output:
{
  "endpoints":[ ... ],
  "service":[ { "file":"<abs>","methods":[ {"name":"...","line":<int>} ] } ],
  "providers":[ {"file":"<abs>","import":"...","line":<int>} ]
}
```

- **Verbesserungspunkte:**
  - **[env-boundary]** KV optional/required explizit markieren (Environment‑Boundary).
  - **[flags]** Feature‑Flags (SSE/Poll/R2) als belegte Konfigurationspunkte aufnehmen.

---

## 8) Feature: AI Image Enhancer (Jobs/Generate/Usage)

```text
Aufgabe:
- Mappe AI‑Image Endpunkte, Services, Provider‑Fehlermapping.

Scope:
- Include: ./src/pages/api/ai-image/**/*, ./src/lib/services/ai-image-service.ts, ./src/lib/services/ai-jobs-service.ts, ./src/config/ai-image.ts, ./src/lib/services/provider-error.ts, (falls vorhanden) UI‑Teile

Output:
{ "api":[...], "services":[...], "providerErrors":[ {"file":"<abs>","line":<int>,"text":"<exact>"} ] }
```

- **Verbesserungspunkte:**
  - **[queue-boundary]** Jobs/Queue‑Schnittstellen separat als Boundary markieren.
  - **[evidence]** Fehler‑Mapping mit konkreten Code‑Zeilen (Status‑Codes, Codestrings) belegen.

---

## 9) Storage & Data: DB + R2‑Proxies

```text
Aufgabe:
- Isoliere Storage-Layer und Proxyrouten mit belegten Importkanten.

Scope:
- Include: ./src/lib/db/**/*, ./src/pages/r2/**/*, ./src/pages/r2-ai/**/*, ./src/env.d.ts

Output:
{ "dbHelpers":[...], "r2Routes":[...], "edges":[ {"from":"<abs>","to":"<abs>","line":<int>,"text":"<exact>"} ] }
```

- **Verbesserungspunkte:**
  - **[gates]** Für R2‑Proxies explizit dokumentieren, wenn sie bewusst außerhalb von Gates liegen.
  - **[readability]** DB‑Helper nach Verantwortlichkeit gruppieren (reine Datenoperationen sichtbar halten).

---

## 10) Tests‑Graph & Abdeckungssignale

```text
Aufgabe:
- Mappe Testdateien → Zielmodule (Importkanten) und zeige zentrale Produktionsmodule ohne direkte Unit‑Imports.

Scope:
- Include: ./tests/**/*, ./test/**/*, ./test-suite-v2/src/**/*
- Exclude: **/__snapshots__/**, **/fixtures/** (außer sie importieren Produktionscode)

Alias:
- Für test-suite-v2 zusätzlich Alias‑Map aus ./test-suite-v2/vitest.config.ts nutzen.

Output:
{
  "testToProdEdges":[ { "test":"<abs>", "imports":[ {"to":"<abs>","line":<int>,"text":"<exact>"} ] } ],
  "criticalProdWithoutDirectUnitImports":[ { "path":"<abs>","fanIn":<int>,"fanOut":<int> } ],
  "notes":[ "Nur belegte Kanten; keine Qualitätsurteile" ]
}
```

- **Verbesserungspunkte:**
  - **[focus]** Kritische Module (z. B. `src/lib/api-middleware.ts`, `src/middleware.ts`) explizit hervorheben, falls nur indirekt getestet.
  - **[filters]** Snapshots/Fixtures strikt ausschließen (Rauschen minimieren).

---

## Optional: Follow‑up‑Prompt (Maßnahmen ableiten – separat)

```text
Aufgabe:
- Konsolidiere die 10 Outputs und schlage die 3 wirkungsvollsten, risikoarmen Maßnahmen vor.
- Nutze ausschließlich Fakten aus den Outputs (mit Quellstellen). Keine neuen Annahmen.

Output:
{ "topCentralModules":[...], "proposedActions":[ {"title":"...","files":["<abs>",...],"evidence":[...]} ] }
```

- **Verbesserungspunkte:**
  - **[objectivity]** Maßnahmen ausschließlich aus Codemap‑Evidenz ableiten.
  - **[traceability]** Jede Maßnahme mit Fundstellen (Datei+Zeile) verknüpfen.
