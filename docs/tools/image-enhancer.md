# AI Image Enhancer – KI-gestützte Bildverbesserung

Dieses Dokument beschreibt das AI Image Enhancer Tool der Evolution Hub Plattform.

---

## 📋 Übersicht

Der **AI Image Enhancer** verbessert Bildqualität mittels State-of-the-Art KI-Modellen (Real-ESRGAN, GFPGAN, CodeFormer) über die Replicate API. Das Tool unterstützt Upscaling (2x/4x), Gesichtsverbesserung und bietet ein planbasiertes Quota-System.

### Hauptfeatures

- 🖼️ **3 KI-Modelle**: Real-ESRGAN (4x Upscale), GFPGAN (Gesichter), CodeFormer (Restaurierung)
- 📈 **Upscaling**: 2x/4x Skalierung (planabhängig bis 8x)
- 😊 **Face Enhancement**: GFPGAN-Integration für Porträts
- 🎯 **Plan-System**: Free/Pro/Premium/Enterprise mit unterschiedlichen Limits
- 🌍 **i18n**: Mehrsprachig (DE/EN)
- 📊 **Quota-Tracking**: Guest (3/Tag) vs. User (15-500/Tag je nach Plan)
- ⚡ **Rate-Limiting**: Dedizierter `aiGenerateLimiter`
- 💾 **R2-Storage**: Cloudflare R2 für Original- und Enhanced-Bilder
- 🔄 **Job-Tracking**: Asynchrone Verarbeitung mit Status-Polling

---

## 🛠 Technische Architektur

### API-Endpunkte

| Endpunkt                         | Methode | Beschreibung                       | Referenz                                     |
| -------------------------------- | ------- | ---------------------------------- | -------------------------------------------- |
| `/api/ai-image/generate`         | POST    | Bild hochladen & enhancen          | `src/pages/api/ai-image/generate.ts:30`      |
| `/api/ai-image/usage`            | GET     | Usage/Limits/Entitlements abfragen | `src/pages/api/ai-image/usage.ts:28`         |
| `/api/ai-image/jobs`             | GET     | Alle Jobs des Users abrufen        | `src/pages/api/ai-image/jobs/index.ts`       |
| `/api/ai-image/jobs/[id]`        | GET     | Job-Status abfragen                | `src/pages/api/ai-image/jobs/[id].ts`        |
| `/api/ai-image/jobs/[id]/cancel` | POST    | Job abbrechen                      | `src/pages/api/ai-image/jobs/[id]/cancel.ts` |

### Komponenten-Stack

```text
src/components/tools/imag-enhancer/
├── CompareSlider.tsx             # Before/After-Vergleich mit Slider
├── Dropzone.tsx                  # Drag & Drop Upload
├── EnhancerActions.tsx           # Action-Buttons (Download, Reset, etc.)
├── ModelControls.tsx             # Model-Auswahl + Parameter
├── ModelSelect.tsx               # Model-Dropdown
├── ActionsGroup.tsx              # Grouped Actions
├── HelpModal.tsx                 # Hilfe-Dialog
├── UsagePill.tsx                 # Quota-Anzeige
├── types.ts                      # TypeScript-Interfaces
├── api.ts                        # Client-seitige API-Aufrufe
├── gating.ts                     # Plan-basierte Feature-Gates
└── hooks/
    ├── useEnhance.ts            # Enhancement-Logik
    ├── useDownload.ts           # Download-Handling
    ├── useRateLimit.ts          # Rate-Limit-Handling
    ├── useUsage.ts              # Quota-Tracking
    ├── useValidation.ts         # Upload-Validierung
    ├── useImageBoxSize.ts       # Responsive Image-Container
    └── useCompareInteractions.ts # Slider-Interaktionen
```

### Service-Layer

**`AiImageService`** (`src/lib/services/ai-image-service.ts`)

- **R2-Integration**: Upload Original/Enhanced zu `R2_AI_IMAGES`
- **KV-Tracking**: Tägliche + monatliche Quotas via `KV_AI_ENHANCER`
- **Replicate-API**: Asynchrone Job-Submission & Polling
- **Credits-System**: Optionale Credit-basierte Abrechnung
- **MIME-Sniffing**: Sichere Content-Type-Validierung

---

## 📦 Konfiguration

### Environment-Variablen & Config

**`src/config/ai-image.ts`**:

| Variable                | Default                                     | Beschreibung                 | Zeile |
| ----------------------- | ------------------------------------------- | ---------------------------- | ----- |
| `REPLICATE_API_TOKEN`   | -                                           | Replicate API-Key (Secret)   | -     |
| `FREE_LIMIT_GUEST`      | `3`                                         | Guest Daily Limit            | Z. 51 |
| `FREE_LIMIT_USER`       | `20`                                        | User Daily Limit (Free Plan) | Z. 52 |
| `MAX_UPLOAD_BYTES`      | `10 MB`                                     | Max. Upload-Größe            | Z. 74 |
| `ALLOWED_CONTENT_TYPES` | `['image/jpeg', 'image/png', 'image/webp']` | Erlaubte MIME-Types          | Z. 75 |
| `AI_R2_PREFIX`          | `'ai-enhancer'`                             | R2-Key-Präfix                | Z. 78 |

#### Feature-Flag: Credits-CTA

- `PUBLIC_ENABLE_CREDITS_CTA`
  - Steuert die Sichtbarkeit der "Buy Credits"-CTA im UI.
  - In Development standardmäßig aktiviert.
  - In Production standardmäßig deaktiviert – zum Aktivieren `PUBLIC_ENABLE_CREDITS_CTA=1` beim Build setzen.
  - Die CTA erscheint nur für eingeloggte User und wenn das Tageslimit überschritten ist.

### Modelle (`src/config/ai-image.ts:26-48`)

```typescript
export const ALLOWED_MODELS: readonly AllowedModel[] = [
  {
    slug: 'nightmareai/real-esrgan:f099296...', // Pinned Version
    label: 'Real-ESRGAN 4x',
    provider: 'replicate',
    supportsScale: true, // 2x/4x Upscaling
    supportsFaceEnhance: true, // GFPGAN-Integration
  },
  {
    slug: 'tencentarc/gfpgan:0fbacf7...',
    label: 'GFPGAN',
    provider: 'replicate',
    supportsScale: false, // Kein Scale-Parameter
    supportsFaceEnhance: false, // Natives Face-Enhancement
  },
  {
    slug: 'sczhou/codeformer:7de2ea2...',
    label: 'CodeFormer',
    provider: 'replicate',
    supportsScale: false,
    supportsFaceEnhance: false,
  },
];
```

### Plan-Entitlements (`src/config/ai-image/entitlements.ts:22-47`)

| Plan           | Monatliche Bilder | Daily Burst | Max Upscale | Face Enhance |
| -------------- | ----------------- | ----------- | ----------- | ------------ |
| **Guest**      | 90 (3/Tag × 30)   | 3           | 2x          | ❌           |
| **Free**       | 450               | 15          | 2x          | ❌           |
| **Pro**        | 400               | 40          | 4x          | ✅           |
| **Premium**    | 1200              | 120         | 6x          | ✅           |
| **Enterprise** | 5000              | 500         | 8x          | ✅           |

**Gating-Logik** (`src/components/tools/imag-enhancer/gating.ts`):

```typescript
// Berechnet erlaubte Scales basierend auf Plan
export function computeAllowedScales(
  modelSupportsScale: boolean,
  entitlements: PlanEntitlements | null,
  gatingEnabled: boolean
): (2 | 4)[] {
  if (!modelSupportsScale) return [];
  if (!gatingEnabled || !entitlements) return [2, 4];
  const max = entitlements.maxUpscale;
  const arr: (2 | 4)[] = [];
  if (2 <= max) arr.push(2);
  if (4 <= max) arr.push(4);
  return arr;
}
```

### Cloudflare-Bindings (`wrangler.toml`)

**R2 Bucket** (`R2_AI_IMAGES`):

- **Development**: `evolution-hub-ai-images-local`
- **Production**: `evolution-hub-ai-images`
- **Verwendung**: Original + Enhanced Images

**KV Namespace** (`KV_AI_ENHANCER`):

- **Development**: `30356dfa83e342c48103609bce4f3320`
- **Production**: `fd1523f570c84ea8bc42cbd397cfdec3`
- **Keys**: `ai:usage:user:<id>:YYYY-MM-DD`, `ai:credits:user:<id>`

---

## 🎯 Workflow & Features

### 1. Upload & Validierung

**Dropzone** (`Dropzone.tsx`):

- Drag & Drop + Click-to-Upload
- Client-seitige Validierung:
  - Max. 10 MB
  - MIME-Types: `image/jpeg`, `image/png`, `image/webp`
  - Server-seitige MIME-Sniffing (Magic Bytes)

**Validierungs-Hook** (`hooks/useValidation.ts`):

```typescript
const { validateFile } = useValidation();

const result = validateFile(file);
if (!result.valid) {
  toast.error(result.error); // "File too large" | "Invalid type"
  return;
}
```

### 2. Modell- & Parameter-Auswahl

**ModelControls** (`ModelControls.tsx`):

- **Model-Dropdown**: Real-ESRGAN / GFPGAN / CodeFormer
- **Scale-Buttons**: 2x / 4x (planbasiert deaktiviert)
- **Face-Enhance-Toggle**: Nur wenn `entitlements.faceEnhance === true`

**Plan-Gates** (`gating.ts:23-31`):

```typescript
export function computeCanUseFaceEnhance(
  modelSupportsFaceEnhance: boolean,
  entitlements: PlanEntitlements | null,
  gatingEnabled: boolean
): boolean {
  if (!modelSupportsFaceEnhance) return false;
  if (!gatingEnabled || !entitlements) return modelSupportsFaceEnhance;
  return Boolean(entitlements.faceEnhance);
}
```

### 3. Enhancement-Prozess

**Request-Flow** (`hooks/useEnhance.ts` → `api.ts:12-27`):

```typescript
// 1. FormData erstellen
const fd = new FormData();
fd.append('image', file);
fd.append('model', modelSlug);
fd.append('scale', '4');
fd.append('face_enhance', 'true');

// 2. POST /api/ai-image/generate
const result = await postGenerate(fd, csrfToken);

// 3. Response-Handling
if (result instanceof Response && result.status === 429) {
  // Rate-Limit → Retry-After aus Header
  await handle429Response(result);
} else if (result.success) {
  // Success → Enhanced Image URL
  setEnhancedUrl(result.data.imageUrl);
}
```

**Server-seitige Verarbeitung** (`src/pages/api/ai-image/generate.ts:91-100`):

```typescript
const result = await service.generate({
  ownerType,
  ownerId,
  modelSlug,
  file: imageFile,
  requestOrigin: origin,
  scale,
  faceEnhance,
  limitOverride: effectiveLimit, // Plan-basiert
  monthlyLimitOverride: ent.monthlyImages,
  maxUpscaleOverride: ent.maxUpscale,
  allowFaceEnhanceOverride: ent.faceEnhance,
});
```

### 4. Replicate-Integration

**Job-Submission** (`AiImageService.generate()`):

```typescript
// 1. Upload Original zu R2
const originalKey = `${AI_R2_PREFIX}/${ownerId}/${timestamp}-original.jpg`;
await R2_AI_IMAGES.put(originalKey, arrayBuffer, {
  httpMetadata: { contentType: mimeType },
});

// 2. Replicate Prediction erstellen
const prediction = await replicate.predictions.create({
  version: modelSlug,
  input: {
    image: originalPublicUrl,
    scale: scale || 2,
    face_enhance: faceEnhance || false,
  },
});

// 3. Polling bis Status "succeeded"
while (prediction.status !== 'succeeded') {
  await sleep(1000);
  prediction = await replicate.predictions.get(prediction.id);
}

// 4. Enhanced Image von Replicate holen & zu R2 uploaden
const enhancedBlob = await fetch(prediction.output).then((r) => r.blob());
const enhancedKey = `${AI_R2_PREFIX}/${ownerId}/${timestamp}-enhanced.jpg`;
await R2_AI_IMAGES.put(enhancedKey, enhancedBlob);
```

### 5. Compare-Slider

**CompareSlider** (`CompareSlider.tsx`):

- **Before/After-Vergleich**: Horizontaler Slider
- **Touch/Mouse-Support**: `useCompareInteractions` Hook
- **Keyboard-Navigation**: Arrow-Keys (←/→)
- **Responsive**: Mobile-optimiert

**Interaktions-Hook** (`hooks/useCompareInteractions.ts`):

```typescript
const {
  sliderPosition,
  isDragging,
  handleMouseDown,
  handleTouchStart,
} = useCompareInteractions();

// Slider-Position: 0-100%
<div style={{ left: `${sliderPosition}%` }} />
```

### 6. Download & Actions

**Download-Hook** (`hooks/useDownload.ts`):

```typescript
const { downloadImage } = useDownload();

await downloadImage(enhancedUrl, 'enhanced-image.jpg');
// → Fetch Blob → Create Object URL → Trigger Download → Cleanup
```

**EnhancerActions** (`EnhancerActions.tsx`):

- **Download**: Enhanced Image speichern
- **Reset**: Zurück zur Modell-Auswahl
- **Share**: (Zukünftig) Social Media
- **Fullscreen**: (Zukünftig) Vergleich im Vollbild

---

## 📊 Quota & Limits

### Quota-Tracking

**KV-Keys-Schema**:

```text
ai:usage:user:<user-id>:YYYY-MM-DD → { count: number, resetAt: timestamp }
ai:usage:guest:<guest-id>:YYYY-MM-DD → { count: number, resetAt: timestamp }
ai:monthly:user:<user-id>:YYYY-MM → { count: number }
ai:credits:user:<user-id> → { balance: number }
```

**Daily Burst** (`src/config/ai-image/entitlements.ts:17`):

- **24h Rolling Window** (nicht Kalender-Tag)
- KV-TTL: 25 Stunden (automatische Cleanup)

**Monthly Images** (Z. 4):

- **Kalendermonate** (YYYY-MM)
- Monatliches Reset

### Usage-Endpoint

**GET `/api/ai-image/usage`**:

```json
{
  "success": true,
  "data": {
    "ownerType": "user",
    "usage": {
      "used": 12,
      "limit": 40,
      "resetAt": 1705334400000
    },
    "limits": {
      "user": 20,
      "guest": 3
    },
    "plan": "pro",
    "entitlements": {
      "monthlyImages": 400,
      "dailyBurstCap": 40,
      "maxUpscale": 4,
      "faceEnhance": true
    }
  }
}
```

**Debug-Headers** (`src/pages/api/ai-image/usage.ts:88-96`):

```text
X-Usage-OwnerType: user
X-Usage-Plan: pro
X-Usage-Limit: 40
X-Debug-Session: 1
X-Debug-User: 1
```

### Rate-Limiting

**`aiGenerateLimiter`** (`src/lib/rate-limiter.ts`):

```typescript
export const aiGenerateLimiter = createRateLimiter({
  maxRequests: 10, // 10 Enhances
  windowMs: 60 * 1000, // pro Minute
  name: 'aiGenerate',
});
```

**Response bei Limit** (429):

```text
HTTP 429 Too Many Requests
Retry-After: 45

{
  "success": false,
  "error": {
    "type": "rate_limit",
    "message": "Too many requests. Retry in 45 seconds."
  }
}
```

---

## 🎨 UI/UX-Details

### UsagePill (`UsagePill.tsx`)

**Quota-Anzeige**:

```jsx
<div className="usage-pill">
  <span className="used">12</span>
  <span className="limit">/ 40</span>
  <span className="plan-badge">Pro</span>
</div>
```

**Farb-Kodierung**:

- `used < 70%`: Grün/Blau
- `70% ≤ used < 90%`: Gelb/Orange
- `used ≥ 90%`: Rot

### HelpModal (`HelpModal.tsx`)

**Inhalt**:

- Model-Beschreibungen
- Scale/Face-Enhance-Erklärung
- Plan-Comparison-Tabelle
- FAQ

**Trigger**:

- `?`-Button neben Model-Auswahl
- Keyboard-Shortcut: `Shift + ?`

### Responsiveness

**Image-Box-Sizing** (`hooks/useImageBoxSize.ts`):

```typescript
const { containerRef, boxSize } = useImageBoxSize();

// Berechnet optimale Container-Größe basierend auf Viewport
// → Mobile: max-width 100vw
// → Desktop: max-width 1200px
```

**Mobile-Optimierungen**:

- Touch-freundliche Slider (min. 44px Target-Size)
- Stack-Layout für Controls (vertical)
- Reduced Animations für Performance

---

## 🚀 Verwendung

### 1. Einfaches Upscaling (Real-ESRGAN)

```text
Input: low-res-photo.jpg (640×480)
Model: Real-ESRGAN 4x
Scale: 4x
Face Enhance: Off

→ Output: enhanced-photo.jpg (2560×1920)
→ Download: ~4 MB (je nach Kompression)
```

### 2. Porträt-Verbesserung (GFPGAN)

```text
Input: portrait.png (1024×1024)
Model: GFPGAN
Scale: N/A (nicht unterstützt)
Face Enhance: N/A (nativ)

→ Output: enhanced-portrait.png (1024×1024)
→ Face Details: Schärfer, weniger Artefakte
```

### 3. Alte Fotos restaurieren (CodeFormer)

```text
Input: vintage-photo.jpg (800×600, stark verpixelt)
Model: CodeFormer
Scale: N/A
Face Enhance: N/A

→ Output: restored-photo.jpg (800×600)
→ Rauschen reduziert, Details wiederhergestellt
```

### 4. Kombiniert (Real-ESRGAN + Face Enhance)

```text
Input: group-photo.jpg (1200×800)
Model: Real-ESRGAN 4x
Scale: 2x
Face Enhance: On (Pro-Plan erforderlich)

→ Output: enhanced-group-photo.jpg (2400×1600)
→ Gesichter zusätzlich mit GFPGAN nachbearbeitet
```

---

## 🔧 API-Verwendung

### POST `/api/ai-image/generate`

**Request (Multipart/Form-Data)**:

```bash
curl -X POST https://hub-evolution.com/api/ai-image/generate \
  -H "X-CSRF-Token: <token>" \
  -F "image=@photo.jpg" \
  -F "model=nightmareai/real-esrgan:f099296..." \
  -F "scale=4" \
  -F "face_enhance=true"
```

**Response (Success)**:

```json
{
  "success": true,
  "data": {
    "model": "Real-ESRGAN 4x",
    "originalUrl": "https://r2.hub-evolution.com/ai-enhancer/.../original.jpg",
    "imageUrl": "https://r2.hub-evolution.com/ai-enhancer/.../enhanced.jpg",
    "usage": {
      "used": 13,
      "limit": 40,
      "resetAt": 1705334400000
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
    "message": "Daily quota exceeded (40/40). Resets at 2025-01-15T12:00:00Z",
    "details": {
      "used": 40,
      "limit": 40,
      "resetAt": 1705334400000
    }
  }
}
```

**Response (Error - Validation)**:

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Bilddatei (field \"image\") ist erforderlich"
  }
}
```

**Response (Error - Invalid File)**:

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Invalid image format. Detected: application/pdf, Expected: image/*"
  }
}
```

---

## 🧪 Testing

### Unit-Tests

**ModelControls** (`__tests__/ModelControls.test.tsx`):

- Plan-basierte Scale-Disabling
- Face-Enhance-Gating
- Model-Switching
- Entitlements-Integration

**useCompareInteractions** (`__tests__/useCompareInteractions.test.tsx`):

- Slider-Position-Berechnung
- Touch/Mouse-Events
- Keyboard-Navigation
- Boundary-Handling (0-100%)

**Gating-Logik** (`gating.test.ts`):

```typescript
describe('computeAllowedScales', () => {
  it('returns [2, 4] for Pro plan (maxUpscale=4)', () => {
    const result = computeAllowedScales(true, { maxUpscale: 4 }, true);
    expect(result).toEqual([2, 4]);
  });

  it('returns [2] for Free plan (maxUpscale=2)', () => {
    const result = computeAllowedScales(true, { maxUpscale: 2 }, true);
    expect(result).toEqual([2]);
  });
});
```

### E2E-Tests

**Test-Szenarien** (`test-suite-v2/src/e2e/tools/image-enhancer.spec.ts`):

```typescript
test('enhances image with Real-ESRGAN 4x', async ({ page }) => {
  await page.goto('/tools/image-enhancer');

  // Upload
  await page.setInputFiles('input[type=file]', 'fixtures/test-image.jpg');

  // Select model
  await page.selectOption('[data-testid="model-select"]', 'Real-ESRGAN 4x');
  await page.click('[data-testid="scale-4x"]');

  // Enhance
  await page.click('[data-testid="enhance-button"]');

  // Wait for result
  await page.waitForSelector('[data-testid="compare-slider"]', { timeout: 60000 });

  // Verify enhanced URL
  const enhancedUrl = await page.getAttribute('[data-testid="enhanced-image"]', 'src');
  expect(enhancedUrl).toContain('r2.hub-evolution.com');
});
```

**Run E2E**:

```bash
npm run test:e2e -- image-enhancer.spec.ts
```

---

## 🔍 Troubleshooting

### Problem: "Quota exceeded" trotz Free-Plan-Upgrade

**Ursache**: KV-Cache nicht invalidiert nach Plan-Änderung

**Lösung**:

1. **User-DB prüfen** (via Drizzle Studio):

   ```bash
   npm run db:studio
   # → Users-Tabelle → plan-Spalte = "pro"?
   ```

2. **KV-Key löschen** (erzwingt Re-Fetch):

   ```bash
   wrangler kv:key delete --binding=KV_AI_ENHANCER "ai:usage:user:<user-id>:$(date +%Y-%m-%d)"
   ```

3. **Session neu laden**:

   ```javascript
   // Browser Console
   localStorage.clear();
   location.reload();
   ```

### Problem: Replicate-Job hängt bei "processing"

**Timeouts** (`AiImageService`):

- **Default**: 120 Sekunden
- **Large Images**: Bis zu 300 Sekunden (Real-ESRGAN 4x)

**Check-Job-Status**:

```bash
curl https://api.replicate.com/v1/predictions/<prediction-id> \
  -H "Authorization: Token $REPLICATE_API_TOKEN"
```

**Mögliche Stati**:

- `starting`: Modell lädt
- `processing`: Enhancement läuft
- `succeeded`: Fertig → `output` enthält URL
- `failed`: Error → `error` enthält Message
- `canceled`: Abgebrochen

**Abbruch-Endpoint** (POST `/api/ai-image/jobs/[id]/cancel`):

```bash
curl -X POST https://hub-evolution.com/api/ai-image/jobs/<job-id>/cancel \
  -H "X-CSRF-Token: <token>"
```

### Problem: R2-Bilder nicht erreichbar (404)

**Public Access Check**:

```bash
# R2 Bucket muss public sein für /ai-enhancer/* Pfade
wrangler r2 bucket list

# Public Access Policy prüfen (via Cloudflare Dashboard)
# → Buckets → evolution-hub-ai-images → Settings → Public Access
```

**CORS-Headers** (`wrangler.toml`):

```toml
[env.production.r2_buckets]
[[env.production.r2_buckets.cors_rules]]
allowed_origins = ["https://hub-evolution.com"]
allowed_methods = ["GET", "HEAD"]
allowed_headers = ["*"]
expose_headers = ["ETag"]
max_age = 3600
```

**Custom Domain** (optional):

- R2-Domain: `https://r2.hub-evolution.com`
- Via Cloudflare Workers Route

### Problem: Face-Enhance-Toggle fehlt trotz Pro-Plan

**Checks**:

1. **Entitlements-Response prüfen**:

   ```bash
   curl https://hub-evolution.com/api/ai-image/usage \
     -H "Cookie: session_id=<session>" | jq '.data.entitlements'

   # Erwartung: { "faceEnhance": true, ... }
   ```

2. **Gating-Flag** (`.env`):

   ```bash
   # NICHT gesetzt = Gating aktiv
   PUBLIC_AI_IMAGE_GATING=false  # Deaktiviert Plan-Gates (Dev-Only)
   ```

3. **Client-seitige State**:

   ```javascript
   // Browser Console (React DevTools)
   // → EnhancerForm Component → entitlements.faceEnhance
   ```

### Problem: "Invalid image format" trotz korrektem MIME

**MIME-Sniffing** (`AiImageService`):

- **Magic Bytes Check**: Liest erste 12 Bytes
- **Supported Signatures**:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47`
  - WEBP: `52 49 46 46 ... 57 45 42 50`

**Debugging**:

```bash
# Datei-Header prüfen (erste 12 Bytes)
hexdump -C image.jpg | head -n 1

# Erwartung (JPEG): ff d8 ff e0 ... oder ff d8 ff e1 ...
```

**Workaround** (Re-Encode):

```bash
# ImageMagick: Zu valider JPEG konvertieren
convert broken.jpg -quality 95 fixed.jpg

# Oder: WEBP → PNG
cwebp input.webp -o output.png
```

---

## 📐 Best Practices

### Für Entwickler

1. **R2-TTL setzen**: Alte Enhanced Images nach 30 Tagen löschen (Lifecycle-Rule)
2. **KV-TTL nutzen**: Quota-Keys automatisch nach 25h cleanen
3. **Replicate-Webhook**: Statt Polling → Webhook für schnellere Response
4. **Image-Optimierung**: Original-Upload auf max. 4096×4096 clampen (Client-seitig)
5. **Error-Boundary**: React Error Boundary um Enhancer-Komponenten

### Für User

1. **Model-Wahl**:
   - **Real-ESRGAN**: Allgemeine Upscaling (Fotos, Texturen)
   - **GFPGAN**: Porträts, Gesichter
   - **CodeFormer**: Alte/beschädigte Fotos
2. **Scale-Faktor**:
   - 2x: Schneller, moderate Verbesserung
   - 4x: Langsamer, maximale Qualität (Pro-Plan)
3. **Face-Enhance nur bei Porträts**: Overhead bei Landschaften/Objekten
4. **Upload-Größe minimieren**: Unter 5 MB → schnellere Uploads

### Plan-Empfehlungen

| Use-Case                     | Plan           | Begründung               |
| ---------------------------- | -------------- | ------------------------ |
| Casual User (1-2 Bilder/Tag) | **Free**       | 15/Tag ausreichend       |
| Fotograf (Batch-Processing)  | **Pro**        | 40/Tag + 4x Upscale      |
| Content Creator (täglich)    | **Premium**    | 120/Tag + Face-Enhance   |
| Agency/Business              | **Enterprise** | 500/Tag + Priority Queue |

---

## 🔗 Verwandte Dokumentation

- **System-Architektur**: [docs/architecture/ai-image-enhancer.md](../architecture/ai-image-enhancer.md)
- **API-Middleware**: [docs/architecture/api-middleware.md](../architecture/api-middleware.md)
- **Entitlements-System**: [docs/architecture/entitlements.md](../architecture/entitlements.md) _(falls vorhanden)_
- **R2-Storage**: [docs/infrastructure/cloudflare-r2.md](../infrastructure/cloudflare-r2.md) _(falls vorhanden)_
- **Rate-Limiting**: [docs/SECURITY.md](../SECURITY.md#1-rate-limiting)

---

## 📊 Metriken & Monitoring

### KV-Keys-Schema (Detail)

```text
# Daily Usage (24h Rolling Window)
ai:usage:user:<user-id>:YYYY-MM-DD → JSON { count: 13, resetAt: 1705334400000 }
ai:usage:guest:<guest-id>:YYYY-MM-DD → JSON { count: 2, resetAt: 1705334400000 }

# Monthly Usage (Calendar Month)
ai:monthly:user:<user-id>:YYYY-MM → JSON { count: 45 }

# Credits (Optional Add-On)
ai:credits:user:<user-id> → JSON { balance: 500, purchasedAt: 1705248000000 }

# Job Tracking (Replicate Prediction IDs)
ai:job:<job-id> → JSON { userId, status, predictionId, createdAt, modelSlug }
```

### Health-Check

**Endpoint**: `/api/health`

**Relevante Checks**:

```json
{
  "services": {
    "kv": true, // KV_AI_ENHANCER verfügbar
    "r2": true, // R2_AI_IMAGES verfügbar
    "replicate": true // REPLICATE_API_TOKEN gültig
  }
}
```

**Replicate-Status**:

```bash
# Account-Limits prüfen
curl https://api.replicate.com/v1/account \
  -H "Authorization: Token $REPLICATE_API_TOKEN"

# Response: { "type": "...", "limits": { ... } }
```

### Kostenschätzung (Replicate)

**Pricing** (Stand 2025):

- **Real-ESRGAN**: ~$0.003/Image (4x Upscale)
- **GFPGAN**: ~$0.002/Image
- **CodeFormer**: ~$0.0025/Image

**Monatliche Schätzung**:

| Plan       | Enhances/Monat | Kosten (100% Real-ESRGAN) | Kosten (gemischt) |
| ---------- | -------------- | ------------------------- | ----------------- |
| Guest      | 90             | $0.27                     | $0.22             |
| Free       | 450            | $1.35                     | $1.10             |
| Pro        | 400            | $1.20                     | $0.98             |
| Premium    | 1200           | $3.60                     | $2.94             |
| Enterprise | 5000           | $15.00                    | $12.25            |

**R2-Storage**:

- **Storage**: $0.015/GB/Monat
- **Requests**: Class B (PUT): $4.50/Million
- **Egress**: Cloudflare → Free (nur zu Internet kostenpflichtig)

**Schätzung** (1000 Enhances/Monat):

- **Original + Enhanced**: ~2 GB (je 1 MB/Bild)
- **Storage**: $0.03/Monat
- **Requests**: 2000 PUTs = $0.009
- **Gesamt R2**: ~$0.04/Monat

---

## 🔐 Security-Hinweise

### Upload-Validierung

**Multi-Layer-Checks** (`AiImageService.generate()`):

1. **MIME-Type-Header**: `Content-Type` aus Request
2. **Magic Bytes**: Erste 12 Bytes via `detectImageMimeFromBytes()`
3. **File-Size**: Max. 10 MB (Server + Client)
4. **Extension-Check**: Optional (`.jpg`, `.png`, `.webp`)

**SSRF-Schutz**:

- Keine URL-Uploads (nur direkte File-Uploads)
- Replicate-API signiert URLs (Public → Replicate nur, nicht zurück zum User-System)

### R2-Access-Control

**Public Paths** (`ai-enhancer/*`):

- Original: `ai-enhancer/<user-id>/<timestamp>-original.jpg`
- Enhanced: `ai-enhancer/<user-id>/<timestamp>-enhanced.jpg`

**NICHT public**:

- User-Metadata (separate KV-Stores)
- Job-Logs (nur via API mit Auth)

**URL-Expiry** (optional):

```typescript
// R2 Presigned URLs (30min TTL)
const url = await R2_AI_IMAGES.createMultipartUpload(key, {
  httpMetadata: { contentType: 'image/jpeg' },
  customMetadata: { expiresAt: Date.now() + 1800000 },
});
```

---

### Ende der AI Image Enhancer Dokumentation

> Letzte Aktualisierung: 2025-01-15
> Version: 1.7.x
> Status: Production-Ready
