import { renderHook, act } from '@testing-library/react';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { useViewportUiMetrics } from '@/components/tools/imag-enhancer/hooks/useViewportUiMetrics';
import React from 'react';

class RO {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe(target: Element) {
    // trigger once
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  disconnect() {}
}

declare global {
  var matchMedia: ((query: string) => MediaQueryList) | undefined;
}

beforeEach(() => {
  (global as any).ResizeObserver = RO as any;
  (window as any).matchMedia = (q: string) => ({
    matches: q.includes('max-width'),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  delete (global as any).ResizeObserver;
  delete (window as any).matchMedia;
});

function createDiv(h: number): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ height: h, width: 100, top: 0, left: 0, bottom: h, right: 100 }),
  });
  document.body.appendChild(el);
  return el;
}

test('useViewportUiMetrics measures initial values', () => {
  const actionsRef = React.createRef<HTMLElement | null>();
  const topReserveRef = React.createRef<HTMLElement | null>();
  const actionsEl = createDiv(48);
  const topEl = createDiv(24);
  actionsRef.current = actionsEl;
  topReserveRef.current = topEl;

  const { result } = renderHook((p) => useViewportUiMetrics(p!), {
    initialProps: { actionsRef, topReserveRef },
  });

  expect(result.current.isMobile).toBeTypeOf('boolean');
  expect(result.current.actionsHeight).toBeGreaterThanOrEqual(0);
  expect(result.current.topReserveHeight).toBeGreaterThanOrEqual(0);
  expect(result.current.safeAreaBottom).toBeGreaterThanOrEqual(0);

  // simulate resize observer update by calling observe again
  act(() => {
    (new (ResizeObserver as any)((entries: any) => entries) as any).observe(actionsEl);
    (new (ResizeObserver as any)((entries: any) => entries) as any).observe(topEl);
  });

  expect(result.current.actionsHeight).toBe(48);
  // includes +4 fudge
  expect(result.current.topReserveHeight).toBe(28);
});
