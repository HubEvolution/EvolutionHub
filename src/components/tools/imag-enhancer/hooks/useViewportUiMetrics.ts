import { useEffect, useState, type RefObject } from 'react';

interface UseViewportUiMetricsParams {
  actionsRef: RefObject<HTMLElement | null>;
  topReserveRef: RefObject<HTMLElement | null>;
}

export function useViewportUiMetrics({ actionsRef, topReserveRef }: UseViewportUiMetricsParams) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [actionsHeight, setActionsHeight] = useState<number>(0);
  const [topReserveHeight, setTopReserveHeight] = useState<number>(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState<number>(0);

  // Detect mobile viewport
  useEffect(() => {
    try {
      const hasMM = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
      if (!hasMM) {
        setIsMobile(false);
        return;
      }
      const mq = window.matchMedia('(max-width: 767px)');
      const onChange = () => setIsMobile(!!mq && !!mq.matches);
      onChange();
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      setIsMobile(false);
    }
  }, []);

  // Measure sticky actions height dynamically
  useEffect(() => {
    const el = actionsRef.current as HTMLElement | null;
    if (!el) {
      setActionsHeight(0);
      return;
    }
    const ro = new ResizeObserver(() => {
      setActionsHeight(el.getBoundingClientRect().height | 0);
    });
    ro.observe(el);
    // Initial measure
    setActionsHeight(el.getBoundingClientRect().height | 0);
    return () => ro.disconnect();
  }, [actionsRef]);

  // Measure the height of the content above the image container
  useEffect(() => {
    const el = topReserveRef.current as HTMLElement | null;
    if (!el) {
      setTopReserveHeight(0);
      return;
    }
    const ro = new ResizeObserver(() => {
      setTopReserveHeight((el.getBoundingClientRect().height | 0) + 4);
    });
    ro.observe(el);
    setTopReserveHeight((el.getBoundingClientRect().height | 0) + 4);
    return () => ro.disconnect();
  }, [topReserveRef]);

  // Try to read iOS safe-area inset bottom
  useEffect(() => {
    try {
      const probe = document.createElement('div');
      probe.style.position = 'fixed';
      probe.style.inset = '0';
      probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      const cs = window.getComputedStyle(probe);
      const pb = parseFloat(cs.paddingBottom || '0');
      setSafeAreaBottom(Number.isFinite(pb) ? pb : 0);
      document.body.removeChild(probe);
    } catch {
      setSafeAreaBottom(0);
    }
  }, []);

  return { isMobile, actionsHeight, topReserveHeight, safeAreaBottom } as const;
}
