import { describe, it, expect } from 'vitest';

import { validateTargetUrl } from '@/lib/testing/web-eval/ssrf';

describe('validateTargetUrl', () => {
  it('allows https origin in allowlist', () => {
    const res = validateTargetUrl(
      'https://hub-evolution.com/path',
      'https://hub-evolution.com,https://www.hub-evolution.com'
    );
    expect(res).toEqual({ ok: true });
  });

  it('rejects invalid URL strings', () => {
    const res = validateTargetUrl('not-a-url');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('invalid_url');
    }
  });

  it('rejects unsupported schemes', () => {
    const res = validateTargetUrl('ftp://hub-evolution.com/');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('invalid_scheme');
    }
  });

  it('rejects private and loopback hosts', () => {
    const cases = [
      { url: 'http://localhost/', reason: 'forbidden_host' },
      { url: 'http://10.0.0.1/', reason: 'forbidden_host' },
      { url: 'http://192.168.0.1/', reason: 'forbidden_host' },
      { url: 'http://127.0.0.1/', reason: 'forbidden_host' },
      { url: 'http://169.254.0.1/', reason: 'forbidden_host' },
      { url: 'http://[::1]/', reason: 'forbidden_host' },
    ];

    for (const c of cases) {
      const res = validateTargetUrl(c.url);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe(c.reason);
      }
    }
  });

  it('rejects non-standard ports', () => {
    const res = validateTargetUrl('https://hub-evolution.com:8080/path');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('port_not_allowed');
    }
  });

  it('rejects origins not in allowlist', () => {
    const res = validateTargetUrl(
      'https://example.com/path',
      'https://hub-evolution.com,https://www.hub-evolution.com'
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('origin_not_allowed');
    }
  });
});
