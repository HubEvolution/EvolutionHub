import { renderHook, act } from '@testing-library/react';
import { beforeEach, afterEach, vi, test, expect, describe } from 'vitest';
import React, { useState } from 'react';
import { useCompareInteractions } from '@/components/tools/imag-enhancer/hooks/useCompareInteractions';

declare global {
  var requestAnimationFrame: (cb: FrameRequestCallback) => number;

  var cancelAnimationFrame: (id: number) => void;
}

function createContainer(w = 200, h = 200) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h }),
  });
  return el as HTMLDivElement;
}

describe('useCompareInteractions', () => {
  let el: HTMLDivElement;
  const rafOrig = window.requestAnimationFrame;
  const cafOrig = window.cancelAnimationFrame;

  beforeEach(() => {
    el = createContainer();
    // Run rAF immediately
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0 as any);
      return 1;
    };
    (window as any).cancelAnimationFrame = () => {};
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.requestAnimationFrame = rafOrig;
    window.cancelAnimationFrame = cafOrig;
  });

  function setup() {
    return renderHook(() => {
      const containerRef = { current: el } as React.RefObject<HTMLDivElement>;
      const boxSize = { w: 200, h: 200 };
      const [sliderPos, setSliderPos] = useState<number>(50);
      const [isHeld, setIsHeld] = useState<boolean>(false);
      const [zoom, setZoom] = useState<number>(1);
      const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
      const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);
      const [loupeSize, setLoupeSize] = useState<number>(160);
      const [loupeFactor, setLoupeFactor] = useState<number>(2);
      const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
      const [loupeUiHint, setLoupeUiHint] = useState<string | null>(null);

      const handlers = useCompareInteractions({
        containerRef,
        boxSize,
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

      return {
        handlers,
        state: {
          sliderPos,
          isHeld,
          zoom,
          pan,
          loupeEnabled,
          loupeSize,
          loupeFactor,
          loupePos,
          loupeUiHint,
        },
        setLoupeEnabled,
      };
    });
  }

  test('Arrow keys adjust slider; Home/End/0 set bounds/center', () => {
    const { result } = setup();
    act(() => {
      result.current.handlers.onHandleKeyDown({
        key: 'ArrowRight',
        preventDefault: () => {},
      } as any);
    });
    expect(result.current.state.sliderPos).toBe(55);

    act(() => {
      result.current.handlers.onHandleKeyDown({
        key: 'ArrowLeft',
        shiftKey: true,
        preventDefault: () => {},
      } as any);
    });
    expect(result.current.state.sliderPos).toBe(45);

    act(() => {
      result.current.handlers.onHandleKeyDown({ key: 'Home', preventDefault: () => {} } as any);
    });
    expect(result.current.state.sliderPos).toBe(0);

    act(() => {
      result.current.handlers.onHandleKeyDown({ key: 'End', preventDefault: () => {} } as any);
    });
    expect(result.current.state.sliderPos).toBe(100);

    act(() => {
      result.current.handlers.onHandleKeyDown({ key: '0', preventDefault: () => {} } as any);
    });
    expect(result.current.state.sliderPos).toBe(50);
  });

  test('Zoom keys and reset', () => {
    const { result } = setup();
    act(() => {
      result.current.handlers.onHandleKeyDown({ key: '+', preventDefault: () => {} } as any);
    });
    expect(result.current.state.zoom).toBeCloseTo(1.25, 2);

    act(() => {
      result.current.handlers.onHandleKeyDown({ key: '-', preventDefault: () => {} } as any);
    });
    expect(result.current.state.zoom).toBe(1); // back to min

    act(() => {
      result.current.handlers.onHandleKeyDown({ key: '1', preventDefault: () => {} } as any);
    });
    expect(result.current.state.zoom).toBe(1);
  });

  test('Space press-and-hold toggles isHeld via global listeners', () => {
    const { result } = setup();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
    });
    expect(result.current.state.isHeld).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space' }));
    });
    expect(result.current.state.isHeld).toBe(false);
  });

  test('Wheel zoom and loupe adjustments (shift/alt)', () => {
    const { result } = setup();
    // normal wheel zoom in
    act(() => {
      const evt = new WheelEvent('wheel', {
        deltaY: -1,
        clientX: 100,
        clientY: 100,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
    });
    expect(result.current.state.zoom).toBeGreaterThan(1);

    // shift+wheel adjusts loupe size
    act(() => {
      const evt = new WheelEvent('wheel', {
        deltaY: -10,
        clientX: 50,
        clientY: 50,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
    });
    expect(result.current.state.loupeUiHint).toMatch(/Size: /);

    // alt+wheel adjusts loupe factor
    act(() => {
      const evt = new WheelEvent('wheel', {
        deltaY: -10,
        clientX: 50,
        clientY: 50,
        altKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
    });
    expect(result.current.state.loupeUiHint).toMatch(/×/);
  });

  test('Mouse move loupe sets loupePos when enabled', () => {
    const { result } = setup();
    act(() => {
      result.current.setLoupeEnabled(true);
    });
    act(() => {
      result.current.handlers.onMouseMoveLoupe({ clientX: 100, clientY: 100 } as any);
    });
    expect(result.current.state.loupePos).not.toBeNull();
    act(() => {
      result.current.handlers.onMouseLeaveLoupe();
    });
    expect(result.current.state.loupePos).toBeNull();
  });
});
