# Testing Guidelines

Diese Richtlinien definieren verbindliche Praktiken für Unit-, Integrations- und E2E-Tests in EvolutionHub. Ziel ist robuste, wartbare Tests mit realistischen Szenarien und automatischen Quality-Gates.

---

## Ziele und Grundsätze

- **Stabilität**: deterministische Tests, keine Flakes
- **Lesbarkeit**: AAA-Muster (Arrange, Act, Assert)
- **Realismus**: so wenig Mocks wie möglich, echte Kantenfälle
- **Automatisierte Qualität**: Coverage-Gates in `vitest.config.ts`

---

## Test-Layer

- **Unit**: reine Funktions-/Modultests (schnell, isoliert)
- **Integration**: Zusammenspiel mehrerer Module/Schichten
- **E2E (Playwright)**: Nutzerfluss gegen Staging (`TEST_BASE_URL`) oder lokal mit Wrangler-Fallback

---

## Konventionen

- **Dateinamen**: `*.test.ts` oder `*.spec.ts`
- **Struktur**: `describe`-Blöcke mit sprechenden Namen; `it/test` für Fälle
- **AAA**: Setup (Arrange), Ausführung (Act), Erwartungen (Assert)
- **Erwartungen**: präzise, aber nicht über-spezifisch (z.B. Timestamps nicht exakt matchen)
- **Cleanup**: `afterEach(() => vi.restoreAllMocks())` und ggf. `vi.clearAllMocks()`

```ts
// Beispiel-Template
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Modul XYZ', () => {
  it('sollte erwartetes Ergebnis liefern', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## Spies & Mocks (Vitest)

- **Console-Spies**: `vi.spyOn(console, 'info')` etc. und nach jedem Test zurücksetzen
- **Modul-Mocks**: sparsam einsetzen; nur externe Effekte (Netzwerk, Zeit, Zufall)
- **Timer**: `vi.useFakeTimers()` nur, wenn nötig – sonst reale Timer lassen
- **Process/Exit**: via Spy/Mock kapseln, nie real beenden

```ts
const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
// ... Test
expect(infoSpy).toHaveBeenCalled();
```

---

## Logger-Tests (Test-Suite v2)

Quellmodul: `test-suite-v2/utils/logger.ts`

### Signaturen und Erwartungen

- `log(level, message, data?)` ruft `console[level](header, message, data|undefined)`
- `logWithExtra(level, message, extra?, data?)` ruft `console[level](header, message, [extra], data|undefined)`
- `header` enthält ISO-Timestamp und Level plus Emojis
  - Nicht exakt auf Timestamp asserten
  - Prüfe z.B. Level-Emoji (`ℹ️`, `⚠️`, `❌`, `🔍`) und ggf. Message-Emoji (`📨`, `📡`, `🗄️`, `🐌`, `🧠`, `⏭️`, `✅`, `🚀`)

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTestLogger, initializeTestLogger } from '../../test-suite-v2/utils/logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TestLogger', () => {
  it('api.response mit Dauer nutzt logWithExtra-Semantik (INFO)', () => {
    initializeTestLogger('INFO');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = getTestLogger();
    logger.api.response('POST', '/api/x', 200, 42);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('ℹ️'), // header inkl. Level-Emoji
      '📨 API Response: POST /api/x - 200 (42ms)',
      undefined, // data immer als letztes Argument (undefined wenn nicht gesetzt)
    );
  });

  it('test.pass ohne Dauer ruft info(header, message, undefined)', () => {
    initializeTestLogger('INFO');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = getTestLogger();
    logger.test.pass('Case');

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('ℹ️'),
      '✅ Test bestanden: Case',
      undefined,
    );
  });

  it('warn mit Daten übergibt data als drittes Argument', () => {
    initializeTestLogger('INFO');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const logger = getTestLogger();
    logger.warn('⏭️ Test übersprungen: Case', { reason: 'flaky' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠️'),
      '⏭️ Test übersprungen: Case',
      { reason: 'flaky' },
    );
  });
});
```

Tipps:

- Verwende `expect.any(String)`/`expect.stringContaining('ℹ️')` für Header
- Prüfe Argumentanzahl/Position: `data` ist immer das letzte Argument (auch wenn `undefined`)
- Für `logWithExtra(...)` wird `extra` an Position 3 eingeschoben (falls gesetzt)

---

## Coverage & Quality Gates

- Thresholds in `vitest.config.ts` (global):
  - Branches ≥ 90%, Lines/Statements/Functions ≥ 95%, `perFile: false`
- Ausführung lokal:

```bash
npm run test:coverage
```

- Bei Unterschreitung schlagen Tests fehl (CI & lokal)

---

## E2E-Tests (Kurz)

- CI: `TEST_BASE_URL` muss gesetzt sein (Staging)
- Lokal: Ohne `TEST_BASE_URL` über Global-Setup Wrangler-Dev starten (`npm run dev`)
- Ziel: echte Cloudflare-Bindings für realistische Flows

---

## Best Practices

- Keine starren Zeit-Assertions (Timestamps, zufällige IDs)
- Keine globalen Seiteneffekte zwischen Tests; Cleanup erzwingen
- Aussagekräftige Testnamen, klare Fehlermeldungen
- Bevorzuge kleine, fokussierte Tests über monolithische Fälle
