import { renderHook, act } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useViewportUiMetrics } from '@/components/tools/imag-enhancer/hooks/useViewportUiMetrics';
import type { MutableRefObject } from 'react';

function createDiv(h: number): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ height: h, width: 100, top: 0, left: 0, bottom: h, right: 100 }),
  });
  document.body.appendChild(el);
  return el;
}

test('useViewportUiMetrics measures initial values', () => {
  const actionsEl = createDiv(48);
  const topEl = createDiv(24);
  const actionsRef = { current: actionsEl } as MutableRefObject<HTMLElement | null>;
  const topReserveRef = { current: topEl } as MutableRefObject<HTMLElement | null>;

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
