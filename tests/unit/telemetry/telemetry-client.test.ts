import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const MOD_PATH = '../../../src/lib/client/telemetry';

describe('telemetry client (prompt-enhancer)', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    (global as any).fetch = realFetch as any;
  });

  it('does nothing when PUBLIC_PROMPT_TELEMETRY_V1 is false', async () => {
    vi.stubEnv('PUBLIC_PROMPT_TELEMETRY_V1', 'false');
    const fetchSpy = vi.fn();
    (global as any).fetch = fetchSpy;

    const mod = await import(MOD_PATH);
    await mod.emitPromptEnhancerStarted({ mode: 'concise', hasFiles: false, fileTypes: [] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends POST with CSRF header when flag is true (started event)', async () => {
    vi.stubEnv('PUBLIC_PROMPT_TELEMETRY_V1', 'true');

    // Provide CSRF cookie so client picks it up
    document.cookie = 'csrf_token=csrfXYZ; Path=/; SameSite=Lax';

    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    (global as any).fetch = fetchSpy;

    const mod = await import(MOD_PATH);
    await mod.emitPromptEnhancerStarted({ mode: 'creative', hasFiles: true, fileTypes: ['application/pdf'] });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as any;
    expect(url).toBe('/api/telemetry');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrfXYZ');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(typeof init.body).toBe('string');
    const parsed = JSON.parse(init.body as string);
    expect(parsed.eventName).toBe('prompt_enhance_started');
    expect(parsed.context?.tool).toBe('prompt-enhancer');
  });
});
