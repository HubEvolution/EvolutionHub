# Prompt Enhancer – KI-gestützte Prompt-Optimierung

Dieses Dokument beschreibt das Prompt Enhancer Tool der Evolution Hub Plattform.

---

## 📋 Übersicht

Der **Prompt Enhancer** transformiert einfache Text-Eingaben in strukturierte, agent-ready Prompts für LLMs (Large Language Models). Das Tool nutzt OpenAI GPT-4o-mini zur intelligenten Umformulierung und unterstützt multimodale Eingaben (Text, Bilder, PDFs).

### Hauptfeatures

- ✨ **KI-Rewriting**: Strukturierung via OpenAI GPT-4o-mini
- 📎 **Multimodale Unterstützung**: Text, Bilder (JPG/PNG/WEBP), PDFs, Markdown
- 🎯 **Drei Modi**: Creative, Professional, Concise
- 🔒 **PII-Safety**: Automatische Maskierung von sensiblen Daten (E-Mails, Telefonnummern)
- 🌍 **i18n**: Mehrsprachig (DE/EN)
- 📊 **Quota-System**: Guest (5/Tag) vs. User (20/Tag)
- ⚡ **Rate-Limiting**: 15 Requests/Minute

---

## 🛠 Technische Architektur

### API-Endpunkte

| Endpunkt              | Methode | Beschreibung           | Referenz                             |
| --------------------- | ------- | ---------------------- | ------------------------------------ |
| `/api/prompt-enhance` | POST    | Text → Enhanced Prompt | `src/pages/api/prompt-enhance.ts:49` |
| `/api/prompt/usage`   | GET     | Usage/Limits abfragen  | `src/pages/api/prompt/usage.ts:1`    |

### Komponenten-Stack

```text
src/components/tools/prompt-enhancer/
├── EnhancerForm.tsx              # Haupt-UI-Komponente (670 Zeilen)
├── types.ts                      # TypeScript-Interfaces
├── api.ts                        # Client-seitige API-Aufrufe
└── hooks/
    ├── useEnhance.ts            # Enhancement-Logik
    ├── useRateLimit.ts          # Rate-Limit-Handling
    └── useUsage.ts              # Quota-Tracking
```

### Service-Layer

**`PromptEnhancerService`** (`src/lib/services/prompt-enhancer-service.ts`)

- **Pipeline**: Parse → Structure → Rewrite → Safety → Score
- **KV-Tracking**: Tägliche Quotas via `KV_PROMPT_ENHANCER`
- **LLM-Pfade**: Text-only, Vision (Bilder), File Search (PDFs)
- **Safety**: PII-Maskierung (E-Mails, Telefonnummern, Adressen)

---

## 📦 Konfiguration

### Environment-Variablen (`src/config/prompt-enhancer.ts`)

| Variable                    | Default         | Beschreibung              | Zeile  |
| --------------------------- | --------------- | ------------------------- | ------ |
| `PUBLIC_PROMPT_ENHANCER_V1` | `"true"`        | Feature-Flag              | -      |
| `PROMPT_TEXT_MODEL`         | `"gpt-4o-mini"` | Text-only Modell          | Z. 6   |
| `PROMPT_VISION_MODEL`       | `"gpt-4o-mini"` | Vision Modell             | Z. 7-8 |
| `PROMPT_MAX_FILES`          | `3`             | Max. Dateien pro Request  | Z. 10  |
| `PROMPT_MAX_FILE_BYTES`     | `5 MB`          | Max. Dateigröße           | Z. 11  |
| `PROMPT_OUTPUT_TOKENS_MAX`  | `400`           | Max. Output-Tokens        | Z. 13  |
| `PROMPT_TEMPERATURE`        | `0.2`           | LLM-Temperatur            | Z. 14  |
| `PROMPT_TOP_P`              | `0.9`           | LLM-Top-P                 | Z. 15  |
| `PROMPT_REWRITE_V1`         | `"true"`        | LLM-Rewrite aktivieren    | -      |
| `ENABLE_PROMPT_SAFETY`      | `"true"`        | PII-Maskierung aktivieren | -      |

### Quota-Limits

**Default-Limits** (überschreibbar via `PROMPT_USER_LIMIT`/`PROMPT_GUEST_LIMIT`):

- **Guest**: 5 Enhances/Tag
- **User**: 20 Enhances/Tag

**Rate-Limit** (`src/pages/api/prompt-enhance.ts:26-30`):

```typescript
const promptEnhanceLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000, // 15 requests per minute
  name: 'promptEnhance',
});
```

---

## 🎯 Modi & Output-Formate

### Modes

| Mode             | Beschreibung                           | Use-Case                           |
| ---------------- | -------------------------------------- | ---------------------------------- |
| **Creative**     | Ausführliche, explorative Prompts      | Brainstorming, Content-Generierung |
| **Professional** | Strukturiert, business-fokussiert      | Geschäftsdokumente, Reports        |
| **Concise**      | Kompakt, auf das Wesentliche reduziert | Schnelle Anfragen, Prototyping     |

### Output-Struktur (Markdown)

**Strukturierte Prompts** (`src/pages/api/prompt-enhance.ts:144-157`):

```markdown
# Role

[AI-Agent-Rolle, z.B. "You are an expert technical writer"]

## Objective

[Hauptziel der Aufgabe]

## Constraints

[Rahmenbedingungen, Limitierungen]

## Steps

- [Schritt 1]
- [Schritt 2]
- [...]

## Examples

- [Few-Shot-Beispiele, falls relevant]

## Original (sanitized)

[Ursprünglicher Input nach PII-Maskierung]
```

**Plain-Format** (bei LLM-Rewrite):

- Gesamter enhanced Text direkt im `objective`-Feld
- `outputFormat: 'plain'`

---

## 📎 Multimodale Eingaben

### Unterstützte Dateitypen (`src/config/prompt-enhancer.ts:20-30`)

| Typ        | MIME-Types                              | Max. Größe | Verwendung                   |
| ---------- | --------------------------------------- | ---------- | ---------------------------- |
| **Bilder** | `image/jpeg`, `image/png`, `image/webp` | 5 MB       | Vision-Modell (OCR, Kontext) |
| **PDFs**   | `application/pdf`                       | 5 MB       | OpenAI File Search API       |
| **Text**   | `text/plain`, `text/markdown`           | 5 MB       | Direkter Kontext             |

### Verarbeitung

**Bilder** (`EnhancerForm.tsx:104-114`):

- Base64-Encoding für Vision API
- Text-Preview für UI (160 Zeichen)
- Drag & Drop + URL-Import

**PDFs** (`src/lib/services/prompt-attachments.ts`):

- Upload zu OpenAI via `file.create(purpose: 'assistants')`
- Verwendung mit `file_search` Tool
- Automatische Cleanup nach Anfrage

**Texte**:

- Direktes Embedding in Prompt-Kontext
- Clipping auf `TEXT_LENGTH_MAX` (1000 Zeichen)

### UI-Features

**URL-Import** (`EnhancerForm.tsx:191-220`):

```typescript
// Text-Dateien von URLs importieren
const onImportUrl = async () => {
  const res = await fetch(url, { credentials: 'omit' });
  const raw = await res.text();
  const vf = new File([clamped], safeName, { type: 'text/plain' });
  await addFiles([vf]);
};
```

**Datei-Reihenfolge**:

- Verschieben via `↑`/`↓`-Buttons
- Wichtig für Kontext-Priorität bei LLM

---

## 🔒 Safety & PII-Maskierung

### Automatische Maskierung

**Erkannte Pattern** (`PromptEnhancerService`):

- **E-Mails**: `example@domain.com` → `[EMAIL_REDACTED]`
- **Telefonnummern**: `+49 123 456789` → `[PHONE_REDACTED]`
- **Adressen**: Straßen, PLZ → `[ADDRESS_REDACTED]`
- **IDs**: UUIDs, Kennzeichen → `[ID_REDACTED]`

### Safety-Report

**Response-Struktur** (`src/pages/api/prompt-enhance.ts:160-166`):

```json
{
  "enhancedPrompt": "...",
  "safetyReport": {
    "score": 0,
    "warnings": ["E-Mail maskiert", "Telefonnummer entfernt"]
  },
  "usage": { "used": 5, "limit": 20, "resetAt": 1705334400000 },
  "limits": { "user": 20, "guest": 3 }
}
```

**UI-Anzeige** (`EnhancerForm.tsx:649-665`):

- Gelbe Infobox unterhalb des Outputs
- Liste der maskierten Elemente
- Score (0-10, wobei 0 = keine Probleme)

---

## 🎨 UI/UX-Details

### Form-Komponente (`EnhancerForm.tsx`)

**Input-Validierung** (Z. 67-71):

```typescript
const validateInput = (text: string): string | null => {
  if (!text.trim()) return t('...error.required');
  if (text.length > 1000) return t('...error.length');
  return null;
};
```

**Character-Counter**:

```jsx
<div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{inputText.length}/1000</div>
```

**Error-Scopes** (Z. 40, 435-437):

- `'input'`: Validierungs-/Netzwerk-Fehler
- `'files'`: Datei-Upload-Fehler
- `null`: Generische Fehler

**Loading-States**:

- `isLoading`: Button-Text → "Enhancing…"
- `urlLoading`: URL-Import-Button deaktiviert
- `retryActive`: Rate-Limit-Retry-Timer

**Copy-to-Clipboard** (Z. 222-232):

```typescript
const handleCopy = async () => {
  await navigator.clipboard.writeText(outputText);
  setCopied(true);
  copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
};
```

### Responsiveness

- **Max-Width**: `max-w-4xl` (Card-Container)
- **Textarea-Heights**: Input `h-32`, Output `h-32`
- **Dark-Mode**: Vollständige Unterstützung via Tailwind `dark:` Varianten

---

## 📊 Telemetry & Logging

### Client-seitige Events (`EnhancerForm.tsx:298-390`)

**Telemetry-Aufrufe**:

```typescript
import {
  emitPromptEnhancerStarted,
  emitPromptEnhancerSucceeded,
  emitPromptEnhancerFailed,
} from '@/lib/client/telemetry';

// Vor Enhance
await emitPromptEnhancerStarted({
  mode,
  hasFiles: files.length > 0,
  fileTypes: files.map((f) => f.type).slice(0, 5),
});

// Nach Erfolg
await emitPromptEnhancerSucceeded({
  latencyMs,
  maskedCount: result.data.safetyReport?.warnings?.length,
});

// Nach Fehler
await emitPromptEnhancerFailed({
  errorKind: 'rate_limited',
  httpStatus: 429,
});
```

### Server-seitige Logs (`PromptEnhancerService`)

**Log-Events**:

- `enhance_requested`: Input-Details
- `llm_path_selected`: `text` | `vision` | `file_search`
- `openai_api_call`: Model, Tokens, Latenz
- `safety_check`: Maskierte Elemente
- `quota_exceeded`: Limit erreicht

---

## 🚀 Verwendung

### 1. Einfache Text-Eingabe

```text
Input: "Write a blog post about AI"

Enhanced Prompt (Creative Mode):
# Role
You are an expert content writer specializing in AI and technology.

## Objective
Create an engaging, informative blog post about Artificial Intelligence
that is accessible to a general audience while maintaining technical accuracy.

## Constraints
- Length: 800-1200 words
- Tone: Conversational yet authoritative
- Include real-world examples
- Avoid jargon without explanation

## Steps
- Introduction: Hook with recent AI breakthrough
- Explain core AI concepts (ML, DL, NLP)
- Present 3 real-world use cases
- Discuss ethical considerations
- Conclude with future outlook

## Original (sanitized)
Write a blog post about AI
```

### 2. Mit Bildern (Vision)

```text
Input: "Analyze this chart and explain the trends"
Files: [sales-chart.png]

→ Vision-Modell: Bildanalyse + Prompt-Strukturierung
→ Output: Detaillierte Chart-Beschreibung + Trend-Analyse-Prompt
```

### 3. Mit PDFs (File Search)

```text
Input: "Summarize the key findings from this research paper"
Files: [research-paper.pdf]

→ PDF-Upload zu OpenAI
→ File-Search-Tool aktiviert
→ Output: Strukturierter Summarization-Prompt mit PDF-Kontext
```

### 4. URL-Import

```text
URL: https://example.com/docs/api-spec.md
Input: "Create unit tests for this API spec"

→ Fetch Markdown-Datei
→ Datei als Kontext hinzufügen
→ Enhanced Prompt für Test-Generierung
```

---

## 🔧 API-Verwendung

### POST `/api/prompt-enhance`

Hinweis: Unsichere Methoden erfordern Same‑Origin und Double‑Submit CSRF (Header `X-CSRF-Token` muss dem Cookie `csrf_token` entsprechen).

**Request (JSON)**:

```json
{
  "text": "Write a blog post about AI",
  "options": {
    "mode": "creative",
    "safety": true,
    "includeScores": false,
    "outputFormat": "markdown"
  }
}
```

**Request (Multipart/Form-Data)**:

```text
text: "Analyze this document"
mode: professional
files[]: [file1.pdf]
files[]: [image.png]
```

**Response (Success)**:

```json
{
  "success": true,
  "data": {
    "enhancedPrompt": "# Role\nYou are...",
    "safetyReport": {
      "score": 0,
      "warnings": []
    },
    "usage": {
      "used": 5,
      "limit": 20,
      "resetAt": 1705334400000
    },
    "limits": {
      "user": 20,
      "guest": 5
    }
  }
}
```

**Response (Error - Quota)**:

```json
{
  "success": false,
  "error": {
    "type": "forbidden",
    "message": "Daily quota exceeded (20/20). Resets at 2025-01-15T00:00:00Z",
    "details": {
      "used": 20,
      "limit": 20,
      "resetAt": 1705334400000
    }
  }
}
```

**Response (Error - Rate-Limit)**:

```text
HTTP 429 Too Many Requests
Retry-After: 45

{
  "success": false,
  "error": {
    "type": "rate_limit",
    "message": "Too many requests. Please retry after 45 seconds."
  }
}
```

---

## 🧪 Testing

### Unit-Tests

**`EnhancerForm.test.tsx`** (`src/components/tools/prompt-enhancer/EnhancerForm.test.tsx`):

- Input-Validierung
- Modi-Umschaltung
- Datei-Upload
- Error-Handling

**Service-Tests**:

```bash
npm run test:unit -- prompt-enhancer-service
```

### E2E-Tests

**Test-Szenarien**:

```bash
npm run test:e2e -- prompt-enhancer-flow.spec.ts
```

**Abgedeckte Flows**:

1. Text-only Enhancement (alle Modi)
2. Multimodale Eingaben (Bild + Text)
3. Quota-Limit-Handling
4. Rate-Limit-Retry
5. Safety-Maskierung

---

## 🔍 Troubleshooting

### Problem: "Quota exceeded" trotz Reset

**Lösung**:

1. KV-Key prüfen:

   ```bash
   wrangler kv:key get --binding=KV_PROMPT_ENHANCER "prompt:usage:user:<user-id>:YYYY-MM-DD"
   ```

2. Manuelles Reset (Dev):

   ```bash
   wrangler kv:key delete --binding=KV_PROMPT_ENHANCER "prompt:usage:user:<user-id>:YYYY-MM-DD"
   ```

### Problem: Rate-Limit blockiert dauerhaft

**Ursache**: Client-seitiger Timer (`useRateLimit.ts`) nicht resettet

**Lösung**:

- Browser-Reload
- LocalStorage clearen: `localStorage.removeItem('promptEnhancer.retryAfter')`

### Problem: PDF-Upload funktioniert nicht

**Checks**:

1. `PROMPT_PDF_FILE_SEARCH_ENABLED=true` in `.env`
2. `OPENAI_API_KEY` korrekt gesetzt
3. Dateigröße < 5 MB
4. MIME-Type = `application/pdf`

**Logs**:

```bash
# Server-Logs (Wrangler Dev)
npm run dev:worker

# Check für "file_search_enabled: true" im Log-Output
```

### Problem: Bilder werden nicht verarbeitet

**Vision-Modell-Check** (`src/config/prompt-enhancer.ts:7-8`):

```typescript
PROMPT_VISION_MODEL = 'gpt-4o-mini'; // Muss Vision-fähig sein
```

**Unterstützte Formate**:

- ✅ JPG, PNG, WEBP
- ❌ GIF, BMP, SVG (nicht unterstützt)

---

## 📐 Best Practices

### Für Entwickler

1. **Immer Safety aktiviert lassen**: `ENABLE_PROMPT_SAFETY=true`
2. **Output-Tokens konservativ**: `PROMPT_OUTPUT_TOKENS_MAX=400` (Balance: Qualität vs. Kosten)
3. **Temperatur niedrig halten**: `PROMPT_TEMPERATURE=0.2` (konsistente Outputs)
4. **KV-Monitoring**: Quota-Keys regelmäßig cleanen (TTL: 24h)

### Für User

1. **Input-Qualität**: Klar formulierte Anfragen → bessere Prompts
2. **Modi bewusst wählen**:
   - Creative: Explorative Tasks
   - Professional: Business-Dokumente
   - Concise: Schnelle Prototypen
3. **Datei-Reihenfolge**: Wichtigste Dateien zuerst (Kontext-Priorität)
4. **URL-Import für Docs**: Statt manuellem Copy-Paste

---

## 🔗 Verwandte Dokumentation

- **API & Security (CSRF/Origin)**: [docs/api/README.md](../api/README.md)
- **Rate-Limiting**: [docs/SECURITY.md](../SECURITY.md#1-rate-limiting)
- **OpenAI-Integration**: [docs/architecture/system-overview.md](../architecture/system-overview.md#external-services)
- **Telemetry (Prompt‑Enhancer)**: [docs/api/README.md](../api/README.md)

---

## 📊 Metriken & Monitoring

### KV-Keys-Schema

```text
prompt:usage:user:<user-id>:<YYYY-MM-DD> → { count: number }
prompt:usage:guest:<guest-id>:<YYYY-MM-DD> → { count: number }
prompt:metrics:path:<llm_text|llm_vision|llm_file_search>:<YYYY-MM-DD> → { count: number }
```

### Health-Check

**Endpoint**: `/api/health`

**Relevante Checks**:

```json
{
  "services": {
    "kv": true, // KV_PROMPT_ENHANCER verfügbar
    "openai": true // OPENAI_API_KEY gesetzt & gültig
  }
}
```

### Kostenschätzung (OpenAI)

**Modell**: `gpt-4o-mini`

- **Input**: ~$0.00015/1K tokens
- **Output**: ~$0.0006/1K tokens

**Durchschnittliche Kosten/Enhance**:

- Text-only: ~$0.0002 (150 input + 400 output tokens)
- Vision: ~$0.0005 (Bild-Token + Text)
- File Search: ~$0.001 (Vector-Store + Completion)

**Monatliche Schätzung** (1000 Enhances):

- ~$0.50 (nur Text-Rewrite)
- ~$1.00 (gemischter Workload)

---

### Ende der Prompt Enhancer Dokumentation

> Letzte Aktualisierung: 2025-01-15
> Version: 1.7.x
> Status: Production-Ready
