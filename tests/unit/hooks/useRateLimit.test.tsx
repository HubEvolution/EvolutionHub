import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useRateLimit } from '../../../src/components/tools/prompt-enhancer/hooks/useRateLimit';

function Harness() {
  const hook = useRateLimit();
  // Expose state via DOM
  return (
    <div data-testid="state"
      data-retry-active={hook.retryActive ? '1' : '0'}
      data-retry-rem={hook.retryRemainingSec}
      data-retry-until={hook.retryUntil ?? ''}
      // attach methods to window for imperative access in tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={() => { (window as any).__rl = hook; }}
    />
  );
}

describe('useRateLimit (prompt)', () => {

  it('sets retry window from setFromRetryAfter and activates retry', async () => {
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).__rl as ReturnType<typeof useRateLimit>;
    await act(async () => {
      api.setFromRetryAfter(2);
    });

    const el = await screen.findByTestId('state');
    expect(el.getAttribute('data-retry-until')).not.toBe('');
  });

  it('parses Retry-After header and JSON details fallback', async () => {
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).__rl as ReturnType<typeof useRateLimit>;

    const res1 = new Response('{}', { status: 429, headers: { 'Retry-After': '5' } });
    const s1 = await act(async () => api.handle429Response(res1));
    expect(s1).toBe(5);

    const body = JSON.stringify({ success: false, error: { type: 'rate_limited', details: { retryAfter: 3 } } });
    const res2 = new Response(body, { status: 429 });
    const s2 = await act(async () => api.handle429Response(res2));
    expect(s2).toBe(3);

    const res3 = new Response('{}', { status: 429 });
    const s3 = await act(async () => api.handle429Response(res3));
    expect(s3).toBe(1); // fallback
  });
});
