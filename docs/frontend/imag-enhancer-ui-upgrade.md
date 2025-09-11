# Imag Enhancer UI Upgrade (Glassmorphism + Pro-Compare)

Kurz-Dokument als Single-Source-of-Truth für das UI-Upgrade. Änderungen erfolgen primär in `src/components/tools/ImagEnhancerIsland.tsx` und Einbettung `src/pages/tools/imag-enhancer/app.astro` sowie `src/pages/en/tools/imag-enhancer/app.astro`.

## Ziele

- Modern/futuristisch: Glassmorphism + dezente Neon-Akzente, Dark/Light-aware.
- Pro-Compare: Split-Slider, Zoom/Pan, Lupe, Tastenkürzel, A11y.
- Minimale neue Dateien, keine neuen Packages, Tailwind-only.

## Scope

- UI/UX im Client-Island. Upload/Quota/Toasts bleiben funktional unverändert.
- i18n-Keys für neue Compare-Controls in EN/DE hinzugefügt und an Island durchgereicht.
- Backend: gezielter Dev-Fallback im Service (Entwicklungs-/Test-Umgebungen) zur Entkopplung von Replicate während des UI-Tests.

## API-Sicherheitsintegration (CSRF, Rate Limits, Allowed Origins)

- **CSRF (Double-Submit-Token)**
  - POST-Routen erfordern Header `X-CSRF-Token`, der mit Cookie `csrf_token` übereinstimmen muss.
  - Betroffene Routen: `/api/ai-image/generate` (synchron), `/api/ai-image/jobs` (create), `/api/ai-image/jobs/{id}/cancel` (cancel). GET `/api/ai-image/jobs/{id}` erfordert kein CSRF.
  - Hinweis Frontend: `ImagEnhancerIsland.tsx` setzt für `/api/ai-image/generate` den Double-Submit-CSRF-Flow automatisch um (Cookie `csrf_token` wird gelesen oder erzeugt und als `X-CSRF-Token` mitgesendet). Kein zusätzliches Setup in App.astro nötig.

- **Rate Limiting (Middleware)**
  - Generate: 15 Anfragen/Minute (`aiGenerateLimiter`).
  - AI-Jobs: 10 Anfragen/Minute (`aiJobsLimiter`).
  - Bei Überschreitung: HTTP 429 mit Header `Retry-After` (Sekunden bis Reset) und standardisiertem Error-Body.

- **Quotas (24h Fenster)**
  - Gäste: `FREE_LIMIT_GUEST = 3` (Produktion-Default; QA/Dev kann temporär abweichen).
  - Nutzer (eingeloggt): `FREE_LIMIT_USER = 20`.

- **Allowed Origins (Origin/CSRF-Validierung)**
  - Gültige Ursprünge aus Umgebungsvariablen: `ALLOWED_ORIGINS` | `ALLOW_ORIGINS` | `APP_ORIGIN` | `PUBLIC_APP_ORIGIN`.
  - Beispiel `.env.example` (kommagetrennt): `ALLOWED_ORIGINS="http://localhost:4321,https://hub-evolution.com"`.

  Hinweis: Die aktuelle Request-Origin wird zusätzlich automatisch erlaubt (Same-Origin wird immer akzeptiert).

- **Client-Beispiel (POST mit CSRF-Header)**

```ts
function getCookie(name: string): string | null {
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='))
    ?.split('=')[1] ?? null;
}

export async function createAiJob(formData: FormData) {
  const csrf = getCookie('csrf_token');
  const res = await fetch('/api/ai-image/jobs', {
    method: 'POST',
    headers: csrf ? { 'X-CSRF-Token': csrf } : undefined,
    body: formData,
  });
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    // UI: Button deaktivieren / Toast mit Hinweis und optional Countdown
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
  }
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error?.message || 'Request failed');
  }
  return json;
}
```

Hinweis Dev-Fallback: In Entwicklung/Test kann der Service das Originalbild zurückgeben (Echo), wenn Upstream/Token fehlt oder generell in lokalen Dev-/Test-Umgebungen. UI kennzeichnet dies als Demo-Modus (siehe unten).

## Modell-Fähigkeiten (Capabilities)

- Serverseitig definieren `ALLOWED_MODELS` die Fähigkeiten eines Modells (z. B. `supportsScale`, `supportsFaceEnhance`).
- Der Server validiert eingehende Parameter strikt anhand dieser Flags und gibt bei nicht unterstützten Parametern `validation_error` zurück.
- Das Frontend blendet Controls dynamisch anhand dieser Fähigkeiten ein (z. B. `x2/x4`-Buttons nur bei `supportsScale`, Checkbox „Face enhance“ nur bei `supportsFaceEnhance`).
- Die FormData enthält nur Parameter, die das aktuelle Modell unterstützt.

Siehe: `src/config/ai-image.ts` (Modelle/Flags) und `src/components/tools/ImagEnhancerIsland.tsx` (UI/Controls + FormData-Aufbau).

## Status Quo (Stand: 2025-09-02)

- Container: `src/components/tools/ImagEnhancerIsland.tsx`
  - Upload/Dropzone: vorhanden, Validierung Typ/Größe; Quota-Hinweis und Toaster beibehalten.
  - Controls: Modell-Auswahl (via `ModelSelect`), Aktionen (via `ActionsGroup`) orchestriert in `EnhancerActions`.
  - Usage: kompakte `UsagePill` im Actions-Row (statt separater Sidebar).
  - Ergebnis: Split-View `CompareSlider` (Vorher/Original über Nachher/Result) mit ARIA/Keyboard-Support.
    - Griff: `role="slider"`, `aria-valuemin/max/now`, Keyboard: Pfeile, Home/End, PageUp/Down.
    - Reset-Button und Download-Link vorhanden (in `ActionsGroup`).
- Hooks: `useValidation`, `useDownload`, `useImageBoxSize` unter `src/components/tools/imag-enhancer/hooks/` und im Container genutzt.
- Route/Einbettung: `src/pages/tools/imag-enhancer/app.astro` (Default) und `src/pages/en/tools/imag-enhancer/app.astro` (EN) reichen `strings.compare` (EN/DE) an `ImagEnhancerIsland` durch.
- Config: `src/config/ai-image.ts` mit `ALLOWED_MODELS` (Slugs verifizieren), Limits/Typen.

## Design-Spezifikation

### A) Glassmorphism + Neon Akzente

- Container/Card: `backdrop-blur`, `bg-white/10 dark:bg-slate-900/40`, `border border-white/10`, `ring-1 ring-cyan-400/20`, dezente Glow-Shadow.
- Buttons/Select: leichtes Gradient-Border via `before:`-Pseudo, Focus-Ring cyan/violet.
- Dark/Light: automatische Anpassung per Tailwind.

Betroffene Blöcke/Komponenten:

- `Dropzone`
- `EnhancerActions` (inkl. `ModelSelect`, `ActionsGroup`)
- `CompareSlider`

### B) Pro-Compare Funktionen

1. Split-Slider

- Implementiert. Bedingung: `previewUrl && resultUrl`.
- Zwei Layer in einem `relative overflow-hidden`-Container:
  - Result: vollflächig (Basis-Layer)
  - Original: darüber geclippt mit Breite `slider%`
- Slider-Griff (absolute) bei `left: calc(slider% - knobHalf)`
- A11y: `role="slider"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow=slider`, Label aus i18n

1. Zoom & Pan

- Zoom-Stufen: 1x, 1.5x, 2x, 4x (Start 1x)
- Pan per Drag (cursor-grab) mit Clamping abhängig von Container/Bildgröße
- Mousewheel/Trackpad: Zoom In/Out (mit Clamp), optional `ctrlKey`-Pfad
- Controls: − / 100% / +, Reset
- Performance: `will-change: transform`

1. Lupe (Magnifier)

- Togglebar, standardmäßig off; auf Touch automatisch off
- Kreis-Overlay (`absolute`, `rounded-full`, `ring-2 ring-cyan-400/70`)
- Hintergrund: `resultUrl`; Position/Beschneidung aus Maus-/Touch-Position

1. Tastenkürzel

- Space: Before/After toggeln (nur wenn beide Bilder vorhanden)
- 1/2/3: 1x/2x/4x Zoom
- R: Reset (slider=50, zoom=1, pan=0,0, loupe=false)
- Cmd/Ctrl+S: Ergebnis herunterladen (Download)

1. Accessibility & Reduced Motion

- Slider und Buttons mit ARIA (inkl. `aria-pressed` beim Lupe-Button)
- `prefers-reduced-motion`: keine unnötigen Transitions/Glows

## Technische Umsetzung (Patch-Plan)

### 1) States/Refs/Typen (in `ImagEnhancerIsland.tsx`)

- Implementiert:
  - `sliderPos: number` (0–100, Start 50), Maus/Touch/Keyboard-Handling mit Clamping.
  - `containerRef`, `draggingRef` für Interaktion und Layout.
  - i18n `strings.compare` optional, sichere Defaults vorhanden.
  - Demo-Erkennung: `lastOriginalUrl`, `isDemoResult` (wenn `imageUrl === originalUrl`).
- Geplant (noch offen):
  - `zoom`, `pan`, `loupeEnabled`, `loupePos`, extra Refs für Natural Sizes.
  - Handler: `onWheelZoom`, `onPanStart/Move/End`, `onToggleLoupe`, `onMouseMoveUpdateLoupe`.

### 2) Markup & Klassen

- Teil-implementiert: Glass/Neon-Styling via `bg-white/10 dark:bg-slate-900/40`, `backdrop-blur`, `ring-*`, `shadow-*` auf Dropzone/Sidebar/Ergebnis-Karte/Buttons.
- Implementiert: Ergebnisbereich Split-Container (Vorher+Nachher) mit Griff; Fallback: Einzelbild.
- Offen: Zoom/Pan/Lupe-Controls und zugehörige Buttons.

- ### 3) i18n

- Implementiert:
  - `strings.compare = { sliderLabel, before, after, handleAriaLabel, keyboardHint, reset }` in `src/pages/tools/imag-enhancer/app.astro` (Default) und `src/pages/en/tools/imag-enhancer/app.astro` (EN) durchgereicht.
  - EN/DE mit symmetrischen Keys gepflegt; im Island existieren sichere Defaults.
- Offen/Nice-to-have:
  - Zusätzliche Keys für Zoom/Lupe (werden mit Feature implementiert).

## Nicht-Ziele (Out of Scope jetzt)

- Wechsel zu asynchronen Jobs/Queue (separater Track laut Backend-Plan)
- Presets/Advanced Controls, Export-Qualitätswahl

## Testplan (kurz)

- Desktop: Slider 0/50/100, Reset, Download; Focus/Keyboard für Slider prüfen.
- Mobile: Drag-Slider; Touch-Events funktionieren, keine Scroll-Blockade.
- A11y: Tastaturbedienung Slider, ARIA-Attribute vorhanden und korrekt.
- Reduced Motion: keine unnötigen Animationen/Glows in kritischen Interaktionen.

### Smoke-Test (Lokal)

1. Dev-Server starten: `npm run dev:worker:dev` → <http://127.0.0.1:8787>
2. Seite öffnen: `/tools/imag-enhancer/app` (DE) oder `/en/tools/imag-enhancer/app` (EN)
3. Bild (PNG/JPG/WEBP) hochladen, Modell wählen, optional Scale/FaceEnhance (je nach Fähigkeit), „Enhance“ auslösen
4. Compare-Slider bedienen (Maus/Touch/Keyboard) und „Download“ prüfen
5. Quota-Anzeige/Toasts beobachten; bei Limit wird Button deaktiviert und Banner angezeigt

### Integration/E2E-Tests

- Integrationstests lokal gegen den Dev-Worker (Wrangler):
  - Terminal A: `npm run dev:worker:dev`
  - Terminal B: `TEST_BASE_URL=http://127.0.0.1:8787 npm run test:integration:run`
- E2E (Playwright v2-Suite):
  - Terminal A: `npm run dev:worker:dev`
  - Terminal B (volle Suite): `TEST_BASE_URL=http://127.0.0.1:8787 npm run test:e2e:v2`
  - Enhancer-only (fokussiert, mit Artefakten):
    - Config: `test-suite-v2/playwright.enhancer.config.ts` (Screenshots/Video on)
    - Spec: `test-suite-v2/src/e2e/imag-enhancer.spec.ts`
    - Lauf: `TEST_BASE_URL=http://127.0.0.1:8787 npx playwright test -c test-suite-v2/playwright.enhancer.config.ts test-suite-v2/src/e2e/imag-enhancer.spec.ts`
    - EN+DE parallel (Projekte `chromium-en` und `chromium-de`)
    - HTML-Report öffnen: `npx playwright show-report test-suite-v2/reports/playwright-html-report`

  Hinweis: `TEST_BASE_URL` muss immer den aktuell laufenden Port des Dev-Servers widerspiegeln (z. B. 8787 für den Standard-Dev-Worker, 8789 für die dedizierte Enhancer-Config, falls dort der Server läuft).

#### Warum `TEST_BASE_URL`=localhost und nicht `ci.hub-evolution.com`?

- Lokale Validierung testet den aktuellen Code-Stand (inkl. unveröffentlichter Änderungen) unmittelbar gegen den lokalen Worker – ideal für schnelle Iterationen.
- CSRF-/Origin-Regeln akzeptieren die aktuelle Request-Origin ohnehin; lokale Läufe vermeiden Abhängigkeiten von entfernten Allowlists und externen Ratenlimits.
- Remote-Umgebungen (z. B. `ci.hub-evolution.com`) sind sinnvoll für CI-Läufe mit stabilen Bindings/Secrets, können aber durch Ratenlimits/Quotas und geteilte Ressourcen beeinflusst werden und testen nicht notwendigerweise den neuesten lokalen Patch.
- Empfehlung: Lokal verifizieren (Smoke/Integration), dann im CI gegen eine dedizierte Dev-/Testing-Domain laufen lassen.

## Akzeptanzkriterien

- Konsistenter futuristischer Look (Light/Dark)
- Split-, Zoom/Pan-, Lupe-Funktion ruckelfrei und zugänglich
- Keine Regressionen bei Upload/Quota/Toasts

## Sequenz & PRs

- PR1: Styling (Glass/Neon) – teilweise umgesetzt, weiter iterieren.
- PR2: Split-Slider – umgesetzt (inkl. A11y/Keyboard/Reset/Labels).
- PR3: Zoom/Pan – offen.
- PR4: Lupe – offen.
- PR5: i18n/A11y-Polish & QA – teilweise (Compare-Strings, Defaults), rest offen.

## Referenzen

- `src/components/tools/ImagEnhancerIsland.tsx`
- `src/components/tools/imag-enhancer/*.tsx` (presentational & hooks)
- `src/pages/tools/imag-enhancer/app.astro`
- `src/pages/en/tools/imag-enhancer/app.astro`
- `src/config/ai-image.ts`

---

## Changelog (2025-09-03)

- QA: Temporär `FREE_LIMIT_GUEST` auf 20 gesetzt in `src/config/ai-image.ts`; vor Deploy auf 3 zurückstellen.
- Hinweis: Modell-Vorauswahl unverändert; im Dev-Fallback wird kein echtes Replicate-Modell aufgerufen.
- UI-Polish (Phase 1 + 2):
  - Datei-Metadaten nach Upload: Format (MIME) und Größe (MB) neben Dimensionen angezeigt.
  - Ergebnis-Metadaten: Result-Dimensionen (WxH) und clientseitige Verarbeitungszeit in ms.
  - Enhance-Button mit Spinner während der Verarbeitung (in `ActionsGroup`).
  - Dirty-State-Tracking (Model/Scale/FaceEnhance) – Re-Enhance sichtbar nur bei geänderten Einstellungen nach „Change model“.
  - Tastenkürzel: „R“ setzt den Slider zurück; „Cmd/Ctrl+S“ lädt das Ergebnis herunter.
  - Upgrade-CTA neben `UsagePill` (Link zu `/pricing` bzw. `/en/pricing`) bei kritischer/überschrittener Nutzung.
  - Info-Badge oberhalb des Compare-Bereichs mit aktuellem Modell/Scale/FaceEnhance.

## Changelog (2025-09-02)

- Implementiert: Split-View Compare-Slider mit zugänglichem Griff und Tastatursteuerung.
- Modularisierung: `useImageBoxSize` Hook extrahiert und in `ImagEnhancerIsland` integriert (Layout-Berechnung/Resize).
- Modularisierung: `CompareSlider` als presentational Komponente extrahiert; Container kümmert sich um State/Interaktion/I18n.
- Modularisierung: `Dropzone` als presentational Komponente extrahiert und in `ImagEnhancerIsland` eingebunden; Verhalten und A11y unverändert.
- Modularisierung: `UsagePill` als presentational Komponente extrahiert (Anzeige von Nutzung + Mini-Progressbar).
- Modularisierung: `EnhancerActions` als presentational Komponente extrahiert (Model-Select, Enhance, Reset, Download) und mit `UsagePill` via `rightSlot` zusammengesetzt.
- Modularisierung: `ModelSelect` als kleine Subkomponente aus `EnhancerActions` extrahiert; kapselt Label + `select`-Element und Optionsrendering.
- Modularisierung: `ActionsGroup` als Subkomponente extrahiert (Enhance/Reset/Download); `EnhancerActions` ist nun ein dünner Orchestrator.
- CSP: Public-URLs werden außerhalb von localhost auf HTTPS umgeschrieben, um `img-src` CSP-Verletzungen zu vermeiden.
- Compare-Slider In-Place: Slider ersetzt die Dropzone-Fläche direkt, wenn `resultUrl` vorhanden ist.
- QoL: Nach Enhance wird automatisch zum Slider gescrollt; Mini-Progressbar unter `UsagePill` zeigt Fortschritt.
- Download: Programmatic Blob-Download als Fallback implementiert (verhindert Navigation).
- Press-and-Hold: Divider/Handle wird während des Haltens versteckt; Fallback „nur Ergebnis“ wenn Preview fehlt.
- Image-Sizing: Container-Fit für Dropzone/Compare mit `overflow-hidden` und `clip-path` Reveal.
- i18n: Compare-Strings (EN/DE) ergänzt und in `app.astro` an Island übergeben.
- Client-Demo-Effekt: Wenn Backend im Dev-Fallback dasselbe Bild zurückgibt (`imageUrl === originalUrl`),
  wird clientseitig ein milder CSS-Filter auf das Result-Bild angewendet, um den Vergleich zu demonstrieren:

  ```css
  filter: contrast(1.2) saturate(1.15) brightness(1.05);
  ```

- Backend Dev-Fallback: In `AiImageService.generate()` wird bei Replicate-404 in Development auf `originalUrl` zurückgefallen; die API antwortet weiterhin mit
  `{ success: true, data: { model, originalUrl, imageUrl, usage, limits } }`, sodass der Client den Demo-Mode erkennen kann.

## Demo-Mode & Dev-Fallback (Details)

- Erkennung im Client (`ImagEnhancerIsland.tsx`):
  - Speichert `lastOriginalUrl` aus der API-Antwort, berechnet `isDemoResult = imageUrl === originalUrl`.
  - Wendet nur in diesem Modus den CSS-Filter auf die „After“-Ebene an (Slider bleibt 1:1 funktionsfähig).
- Service (`src/lib/services/ai-image-service.ts`):
  - `runReplicate()` wirft bei Fehlern eine aussagekräftige Meldung; `generate()` fängt 404 in Dev ODER fehlendes `REPLICATE_API_TOKEN` ab (`ENVIRONMENT=development|dev|''`) und setzt `outputUrl = originalUrl`.
  - Ergebnis wird wie gewohnt nach R2 geschrieben; die Response enthält beide URLs.
  - Dev-Echo-Regel: In Umgebungen `ENVIRONMENT ∈ { development, dev, testing, test, local, '' }` wird **ohne Replicate-Call** direkt `originalUrl` zurückgegeben ("force dev echo"). Auf Staging-/Produktionsdomains erfolgen echte Replicate-Calls (bei vorhandenem Token).

## Changelog (2025-09-11)

- Frontend: CSRF Double-Submit (Cookie `csrf_token` + Header `X-CSRF-Token`) für `/api/ai-image/generate` im Island automatisch umgesetzt.
- Frontend: Fähigkeitsbasierte Controls für Modelle (Scale/Face Enhance) mit striktem Parameterversand nur bei Unterstützung.
- Doku: Abschnitte zu Capabilities, lokalem Smoke-Test, Integration/E2E-Läufen mit `TEST_BASE_URL` und Begründung für localhost ergänzt.
- E2E (Enhancer-only): EN+DE grün; dedizierte Config (`test-suite-v2/playwright.enhancer.config.ts`) und Spec (`test-suite-v2/src/e2e/imag-enhancer.spec.ts`) mit Artefakten (Screenshots/Videos) ergänzt.

## Offene Punkte / Nächste Schritte

- Replicate 404 fixen: Verifizierte Model-Slugs/Tags in `src/config/ai-image.ts` eintragen und `REPLICATE_API_TOKEN` sicher laden.
- Pro-Compare Erweiterungen: Zoom/Pan/Lupe inkl. i18n-Keys und A11y.
- Feinjustierung Styling (Glass/Neon) und Reduced-Motion-Tweaks.

## Modularization Plan (Imag Enhancer)

Status: weitgehend umgesetzt (Basis-Split, Modularisierung abgeschlossen); Erweiterungen (Zoom/Pan/Lupe) offen

Context:

- Aktuelle Container-Datei: `src/components/tools/ImagEnhancerIsland.tsx` (~730 Zeilen).
- Ziel: bessere Wartbarkeit/Testbarkeit, striktere Trennung von Zuständigkeiten, Einhaltung der Projektregeln (strict TS, kurze Funktionen, max. 3 Ebenen Verschachtelung, i18n via Props).

Geplante Struktur unter `src/components/tools/imag-enhancer/`:

- `ImagEnhancerIsland.tsx` (Container/Island): State-Orchestrierung, API-Calls, i18n-Aufbereitung, Props-Wiring.
- `Dropzone.tsx` (presentational) – IMPLEMENTIERT: Upload/Preview-Fläche. Props: `previewUrl`, `accept`, `onSelectFile(file)`, `boxSize`, `originalLabel`.
- `CompareSlider.tsx` (presentational) – IMPLEMENTIERT: Before/After-Overlay, Divider/Handle, Labels. Props: `previewUrl`, `resultUrl`, `boxSize`, `isDemoResult`, `compareStrings`, `sliderPos`, `onSliderPosChange(pos)`, `onReset()`.
- `EnhancerActions.tsx` (presentational) – IMPLEMENTIERT: orchestration von Model/Actions/Usage via Subkomponenten.
- `ModelSelect.tsx` (presentational) – IMPLEMENTIERT: Label + `select`; Props: `label`, `value`, `options`, `onChange(value)`.
- `ActionsGroup.tsx` (presentational) – IMPLEMENTIERT: Enhance/Reset/Download; Props: `enhanceLabel`, `processingLabel`, `resetLabel`, `downloadLabel`, `canSubmit`, `quotaExceeded`, `loading`, `hasResult`, `resultUrl`, `onEnhance()`, `onReset()`, `onDownload()`.
- `UsagePill.tsx` (presentational) – IMPLEMENTIERT: Usage und Mini-Progress. Props: `usage`, `ownerType`, `strings`.

Hooks unter `src/components/tools/imag-enhancer/hooks/`:

- Implementiert: `useDownload.ts` (programmatischer Blob-Download), `useValidation.ts` (Datei-Validierung Typ/Größe), `useImageBoxSize.ts` (natürliche Maße/Resize)
- Geplant: `useCompareInteraction.ts` (Slider-Interaktion)

Utilities:

- `utils/imageSizing.ts`: Ratio/Clamp-Helper (bei Wiederverwendung in `src/lib/` platzieren).
- `types.ts`: Interfaces für Component-Props und DTOs.

i18n:

- `compareStrings.before/after` werden konsistent genutzt (Labels und Legende).
- Alle i18n-Strings werden im Container vorbereitet und als Props übergeben.

Testing:

- Unit-Tests für Hooks (`useCompareInteraction`, `useImageBoxSize`, `useDownload`).
- Interaktions-Tests für `CompareSlider` (Keyboard, Touch, Press-and-Hold).
- Integrationstest für den End-to-End-Fluss im Container (Mocks für API/Usage).

Migrationsstrategie (inkrementell, risikoarm):

1) Hooks extrahieren (DONE: `useDownload`, `useValidation`, `useImageBoxSize`).
2) `CompareSlider` auslagern (DONE).
3) `Dropzone` auslagern (DONE).
4) `UsagePill` und `EnhancerActions` auslagern (DONE).
5) Obsolete States/Effects im Container entfernen (FOLLOW-UP).

Akzeptanzkriterien:

- Keine UI-Regressions (Desktop/Mobil); A11y unverändert oder verbessert.
- Dateigröße/Komplexität reduziert: jede Datei < 200 LOC, Funktionen < 50 LOC.
- Strict TypeScript, ESLint/Prettier sauber.

## Manuelle QA-Checkliste

- Upload & Validierung:
  - Bild (JPEG/PNG/WEBP) bis 10 MB hochladen; falsche Typen/zu groß -> Toast mit sinnvoller Meldung.
- Quota & Anzeige:
  - Usage-Karte zeigt `used/limit` und Owner-Type; bei Limit Toast und Button-Disable.
- Enhance (Dev-Fallback aktiv):
  - Nach Klick auf Enhance erscheint Resultat; Slider-UI sichtbar; „After“-Seite wirkt leicht kontrastreicher (Demo-Filter).
  - Reset-Button zentriert den Slider; Download-Link lädt das Result-Bild.
- A11y/Keyboard:
  - Griff fokussierbar; Pfeiltasten ändern Wert in Schritten, Home/End zentriert, PageUp/Down größere Schritte.
- Touch/Mobile:
  - Griff/Slider per Touch bewegbar; keine JS-Fehler in Konsole; Scroll-Verhalten bleibt erwartbar.
- Nicht-Demo (wenn echtes Modell konfiguriert):
  - Kein CSS-Filter auf „After“; sichtbarer realer Unterschied zwischen Original/Result.
