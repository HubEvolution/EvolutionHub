'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useImageBoxSize = useImageBoxSize;
const react_1 = require('react');
function useImageBoxSize(deps = [], options = {}) {
  const {
    maxViewportHeightFraction = 0.75,
    minHeightPx = 200,
    fixedHeightPx,
    mode = 'auto',
    reservedTopPx = 0,
    reservedBottomPx = 0,
    safeAreaBottomPx = 0,
  } = options;
  const containerRef = (0, react_1.useRef)(null);
  const [imgNatural, setImgNatural] = (0, react_1.useState)(null);
  const [imgRatio, setImgRatio] = (0, react_1.useState)(null);
  const [boxSize, setBoxSize] = (0, react_1.useState)(null);
  const depsKey = (0, react_1.useMemo)(() => {
    try {
      return JSON.stringify(deps);
    } catch {
      return String(deps.length);
    }
  }, [deps]);
  const compute = (0, react_1.useCallback)(() => {
    if ((!imgRatio && !imgNatural) || !containerRef.current) return;
    const parentEl = containerRef.current.parentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Use the parent's content width (clientWidth minus horizontal padding) to avoid overflow
    let parentWidth = vw;
    if (parentEl) {
      const cw = parentEl.clientWidth; // includes padding, excludes borders/scrollbars
      const cs = window.getComputedStyle(parentEl);
      const paddingLeft = parseFloat(cs.paddingLeft || '0');
      const paddingRight = parseFloat(cs.paddingRight || '0');
      parentWidth = Math.max(0, cw - paddingLeft - paddingRight);
    }
    const maxHeight = Math.max(minHeightPx, Math.floor(vh * maxViewportHeightFraction));
    const ratio = imgRatio ?? (imgNatural ? imgNatural.w / imgNatural.h : 1);
    // If a fixed height is specified explicitly or mode is 'fixed', use that (clamped by viewport fraction)
    const targetH = (mode === 'fixed' ? (fixedHeightPx ?? maxHeight) : fixedHeightPx)
      ? Math.min(maxHeight, Math.max(minHeightPx, Math.floor(fixedHeightPx ?? maxHeight)))
      : undefined;
    if (targetH) {
      const widthByFixed = Math.floor(targetH * ratio);
      const targetW = Math.min(parentWidth, widthByFixed);
      setBoxSize({ w: targetW, h: targetH });
      return;
    }
    // Fit-to-viewport mode: ensure the image box + reserved spaces fit without scrolling
    if (mode === 'fitViewport') {
      const reserves =
        Math.max(0, reservedTopPx) + Math.max(0, reservedBottomPx) + Math.max(0, safeAreaBottomPx);
      const availableByViewport = Math.max(minHeightPx, vh - reserves);
      const capByFraction = Math.max(minHeightPx, Math.floor(vh * maxViewportHeightFraction));
      const fitMax = Math.max(minHeightPx, Math.min(capByFraction, availableByViewport));
      const widthByFit = Math.floor(fitMax * ratio);
      const fitW = Math.min(parentWidth, widthByFit);
      const fitH = Math.floor(fitW / ratio);
      setBoxSize({ w: fitW, h: fitH });
      return;
    }
    // Default: compute height from fraction-based maxHeight and ratio
    const widthByHeight = Math.floor(maxHeight * ratio);
    const targetW = Math.min(parentWidth, widthByHeight);
    const autoH = Math.floor(targetW / ratio);
    setBoxSize({ w: targetW, h: autoH });
  }, [
    imgRatio,
    imgNatural,
    maxViewportHeightFraction,
    minHeightPx,
    fixedHeightPx,
    mode,
    reservedTopPx,
    reservedBottomPx,
    safeAreaBottomPx,
  ]);
  // Recompute on image ratio/natural change and on resize
  (0, react_1.useEffect)(() => {
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [compute]);
  // Recompute when external deps change (e.g., resultUrl/previewUrl causing mount/layout)
  (0, react_1.useEffect)(() => {
    const id = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(id);
  }, [compute, depsKey]);
  const onResultImageLoad = (0, react_1.useCallback)((e) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (!Number.isNaN(ratio) && ratio > 0) setImgRatio(ratio);
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);
  const onPreviewImageLoad = (0, react_1.useCallback)((e) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (!Number.isNaN(ratio) && ratio > 0) setImgRatio(ratio);
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);
  return (0, react_1.useMemo)(
    () => ({ containerRef, boxSize, onResultImageLoad, onPreviewImageLoad }),
    [boxSize, onPreviewImageLoad, onResultImageLoad]
  );
}
