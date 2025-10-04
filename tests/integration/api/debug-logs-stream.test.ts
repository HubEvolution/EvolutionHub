import { describe, it, expect } from 'vitest';

type LogsStreamSuccess = {
  success: true;
  data: {
    logs: unknown[];
    bufferSize: number;
    timestamp: string;
    environment?: unknown;
  };
};
type LogsStreamError = { success: false; error: string };
type LogsStreamPayload = LogsStreamSuccess | LogsStreamError;

function base(url: string) {
  return url.replace(/\/$/, '');
}

async function postJson(u: string) {
  return fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Debug Logs Stream gating', () => {
  const TEST_BASE = base(process.env.TEST_BASE_URL || 'http://127.0.0.1:8787');

  it('POST /api/debug/logs-stream returns 200 JSON when enabled', async () => {
    const res = await postJson(`${TEST_BASE}/api/debug/logs-stream`);
    // In dev mode with PUBLIC_ENABLE_DEBUG_PANEL=true this must be 200
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') || '').toContain('application/json');
    const payload = (await res.json()) as unknown as LogsStreamPayload;
    expect(payload && typeof payload === 'object').toBe(true);
    // Narrow to success shape
    if ('success' in payload && payload.success === true) {
      expect(payload.data).toBeTruthy();
      // Basic shape checks (route returns logs[], environment, timestamp, bufferSize)
      expect(Array.isArray(payload.data.logs)).toBe(true);
      expect(typeof payload.data.bufferSize).toBe('number');
      expect(typeof payload.data.timestamp).toBe('string');
    } else {
      // Should not happen in enabled dev mode
      throw new Error(`Unexpected error payload: ${JSON.stringify(payload)}`);
    }
  });

  it('POST /api/debug/logs-stream returns 404 when disabled (optional)', async () => {
    const disabledBase = (process.env.DEBUG_PANEL_DISABLED_BASE || '').trim();
    if (!disabledBase) {
      // Skip gracefully when no disabled base is provided (e.g., in local/CI dev runs)
      return;
    }
    const res = await postJson(`${base(disabledBase)}/api/debug/logs-stream`);
    expect(res.status).toBe(404);
  });
});
