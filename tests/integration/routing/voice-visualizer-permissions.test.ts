import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function fetchFollow(path: string, cookie: string) {
  return fetch(`${BASE}${path}`, {
    redirect: 'follow',
    headers: { Cookie: cookie },
  });
}

describe('Permissions-Policy for Voice Visualizer routes', () => {
  it('sets microphone=(self) on neutral route /tools/voice-visualizer/app', async () => {
    const res = await fetchFollow(
      '/tools/voice-visualizer/app',
      'session_welcome_seen=1; pref_locale=de'
    );
    expect(res.status).toBe(200);
    const pp = res.headers.get('Permissions-Policy') || '';
    expect(pp).toMatch(/microphone=\(self\)/);
  });

  it('sets microphone=(self) on EN route /en/tools/voice-visualizer/app', async () => {
    const res = await fetchFollow(
      '/en/tools/voice-visualizer/app',
      'session_welcome_seen=1; pref_locale=en'
    );
    expect(res.status).toBe(200);
    const pp = res.headers.get('Permissions-Policy') || '';
    expect(pp).toMatch(/microphone=\(self\)/);
  });

  it('keeps microphone=() on unrelated routes (e.g., /blog/)', async () => {
    const res = await fetchFollow('/blog/', 'session_welcome_seen=1; pref_locale=de');
    expect(res.status).toBe(200);
    const pp = res.headers.get('Permissions-Policy') || '';
    expect(pp).toMatch(/microphone=\(\)/);
  });
});
