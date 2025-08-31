/**
 * Unit-Tests für test-suite-v2/config/test-config.ts
 * Fokus: Branch-Abdeckung der Validierung (Ungültige baseUrl/apiUrl, Timeouts, Thresholds)
 */

import { describe, it, expect, vi } from 'vitest';
import { loadTestConfig, validateTestConfig, type TestConfig } from '../../../config/test-config';

function cloneConfig(src: TestConfig): TestConfig {
  return JSON.parse(JSON.stringify(src));
}

describe('TestConfig - Validierung', () => {
  it('sollte gültige Standardkonfiguration als valid markieren', () => {
    const cfg = loadTestConfig();
    const result = validateTestConfig(cfg);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sollte ungültige baseUrl erkennen', () => {
    const base = loadTestConfig();
    const cfg: TestConfig = cloneConfig(base);
    cfg.environment.baseUrl = 'not-a-url';

    const res = validateTestConfig(cfg);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Ungültige baseUrl in der Test-Konfiguration');
  });

  it('sollte ungültige apiUrl erkennen', () => {
    const base = loadTestConfig();
    const cfg: TestConfig = cloneConfig(base);
    cfg.environment.apiUrl = '::::/broken';

    const res = validateTestConfig(cfg);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Ungültige apiUrl in der Test-Konfiguration');
  });

  it('sollte ungültige Timeouts erkennen (api <= 0, test <= 0)', () => {
    const base = loadTestConfig();
    const cfg: TestConfig = cloneConfig(base);
    cfg.timeouts.api = 0; // ungültig
    cfg.timeouts.test = -1; // ungültig

    const res = validateTestConfig(cfg);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('API-Timeout muss größer als 0 sein');
    expect(res.errors).toContain('Test-Timeout muss größer als 0 sein');
  });

  it('sollte ungültigen Coverage-Threshold erkennen (global > 100)', () => {
    const base = loadTestConfig();
    const cfg: TestConfig = cloneConfig(base);
    cfg.coverage.thresholds.global = 101; // ungültig

    const res = validateTestConfig(cfg);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Globaler Coverage-Threshold muss zwischen 0 und 100 liegen');
  });

  it('sollte bei ungültiger Konfiguration beim Modul-Load process.exit(1) auslösen', async () => {
    const originalEnv = { ...process.env };
    try {
      // Ungültige URL erzwingen
      process.env.TEST_BASE_URL = '::::invalid-url::::';

      // Module-Cache zurücksetzen, damit der Top-Level-Code erneut ausgeführt wird
      vi.resetModules();

      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(((_code?: string | number | null | undefined) => undefined) as unknown as never);
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Dynamischer Import, der die Validierung und den Exit-Branch triggert
      await import('../../../config/test-config');

      expect(errSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env = originalEnv;
      vi.restoreAllMocks();
    }
  });
});
