import React, { useEffect, useRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCompareInteractions } from '../hooks/useCompareInteractions';

// Small harness to mount the hook in a component and expose handlers/state via DOM + window
function Harness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isHeld, setIsHeld] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);
  const [loupeSize, setLoupeSize] = useState<number>(160);
  const [loupeFactor, setLoupeFactor] = useState<number>(2);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [loupeUiHint, setLoupeUiHint] = useState<string | null>(null);

  // Create a real DOM element with a mocked bounding rect to support pointer math
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current as HTMLDivElement & { getBoundingClientRect: () => DOMRect };
    el.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        toJSON: () => ({}),
      }) as unknown as DOMRect;
  }, []);

  const hook = useCompareInteractions({
    containerRef,
    boxSize: { w: 500, h: 400 },
    setSliderPos,
    isHeld,
    setIsHeld,
    zoom,
    setZoom,
    pan,
    setPan,
    loupeEnabled,
    setLoupeEnabled,
    loupeSize,
    setLoupeSize,
    loupeFactor,
    setLoupeFactor,
    setLoupePos,
    setLoupeUiHint,
    compareVisible: true,
  });

  // Expose handlers to tests via window (imperative access)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__compareApi = hook;

  return (
    <div>
      <div ref={containerRef} data-testid="container" />
      <div
        data-testid="state"
        data-slider={sliderPos}
        data-zoom={zoom}
        data-pan-x={pan.x}
        data-pan-y={pan.y}
        data-loupe-enabled={loupeEnabled ? '1' : '0'}
        data-loupe-pos={loupePos ? `${loupePos.x},${loupePos.y}` : ''}
        data-loupe-hint={loupeUiHint || ''}
      />
    </div>
  );
}

beforeEach(() => {
  // Make rAF synchronous so loupe updates apply immediately
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 1 as unknown as number;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

describe('useCompareInteractions', () => {
  it('adjusts slider with ArrowRight and ArrowLeft keys', async () => {
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).__compareApi as ReturnType<typeof useCompareInteractions>;
    const preventDefault = vi.fn();

    // Move right by default step (5)
    api.onHandleKeyDown({
      key: 'ArrowRight',
      shiftKey: false,
      preventDefault,
    } as unknown as React.KeyboardEvent);
    const state = await screen.findByTestId('state');
    await waitFor(() => expect(Number(state.getAttribute('data-slider'))).toBe(55));

    // Move left by default step (5)
    api.onHandleKeyDown({
      key: 'ArrowLeft',
      shiftKey: false,
      preventDefault,
    } as unknown as React.KeyboardEvent);
    await waitFor(() => expect(Number(state.getAttribute('data-slider'))).toBe(50));
  });

  it('zooms in/out via API controls', async () => {
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).__compareApi as ReturnType<typeof useCompareInteractions>;
    const state = await screen.findByTestId('state');

    api.onZoomIn();
    await waitFor(() => expect(Number(state.getAttribute('data-zoom'))).toBeCloseTo(1.25, 2));

    api.onZoomOut();
    await waitFor(() => expect(Number(state.getAttribute('data-zoom'))).toBeCloseTo(1.0, 2));

    api.onZoomReset();
    await waitFor(() => expect(Number(state.getAttribute('data-zoom'))).toBe(1));
  });

  it('toggles loupe and updates loupe position on move', async () => {
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).__compareApi as ReturnType<typeof useCompareInteractions>;

    // Toggle loupe on
    api.onToggleLoupe();
    const state = await screen.findByTestId('state');
    await waitFor(() => expect(state.getAttribute('data-loupe-enabled')).toBe('1'));

    // After state change, the hook instance is re-created; read latest handlers to avoid stale closure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api2 = (window as any).__compareApi as ReturnType<typeof useCompareInteractions>;

    // Move mouse to center (250, 200) -> rAF should update loupePos within bounds
    api2.onMouseMoveLoupe({ clientX: 250, clientY: 200 } as unknown as React.MouseEvent);
    await waitFor(() => expect(state.getAttribute('data-loupe-pos')).not.toBe(''));
  });
});
