import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_MODELS,
} from '@/config/ai-image';
import { useDownload } from './imag-enhancer/hooks/useDownload';
import { useValidation } from './imag-enhancer/hooks/useValidation';
import { useImageBoxSize } from './imag-enhancer/hooks/useImageBoxSize';
import { CompareSlider } from './imag-enhancer/CompareSlider';
import { Dropzone } from './imag-enhancer/Dropzone';
import { UsagePill } from './imag-enhancer/UsagePill';
import { EnhancerActions } from './imag-enhancer/EnhancerActions';

interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error: {
    type: string;
    message: string;
    details?: unknown;
  };
}

interface UsageResponseData {
  ownerType: 'user' | 'guest';
  usage: UsageInfo;
  limits: { user: number; guest: number };
}

interface GenerateResponseData {
  model: string;
  originalUrl: string;
  imageUrl: string;
  usage: UsageInfo;
  limits: { user: number; guest: number };
}

interface ImagEnhancerStrings {
  dropText: string;
  enhance: string;
  processing: string;
  model: string;
  usage: string;
  result: string;
  original: string;
  allowedTypes: string;
  max: string;
  download: string;
  loading: string;
  quotaBanner: string;
  toasts: {
    loadQuotaError: string;
    loadError: string;
    quotaReached: string;
    unsupportedType: string;
    fileTooLargePrefix: string;
    processingFailed: string;
    successEnhanced: string;
  };
  compare?: {
    sliderLabel: string;
    before: string;
    after: string;
    handleAriaLabel: string;
    keyboardHint: string;
    reset: string;
  };
}

interface ImagEnhancerIslandProps {
  strings: ImagEnhancerStrings;
}

export default function ImagEnhancerIsland({ strings }: ImagEnhancerIslandProps) {

  const [model, setModel] = useState<string>(ALLOWED_MODELS[0]?.slug || '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [ownerType, setOwnerType] = useState<'user' | 'guest' | null>(null);
  const [lastOriginalUrl, setLastOriginalUrl] = useState<string | null>(null);
  // Enhancement parameters
  const [scale, setScale] = useState<2 | 4>(4);
  const [faceEnhance, setFaceEnhance] = useState<boolean>(false);
  const [showModelControls, setShowModelControls] = useState(false);
  // File/result metadata and processing time
  const [fileMeta, setFileMeta] = useState<{ type: string; sizeMB: number } | null>(null);
  const [resultDims, setResultDims] = useState<{ w: number; h: number } | null>(null);
  const [lastProcessMs, setLastProcessMs] = useState<number | null>(null);
  // Baseline settings captured on last successful enhance to compute dirty state
  const [baselineSettings, setBaselineSettings] = useState<
    { model: string; scale: 2 | 4; faceEnhance: boolean } | null
  >(null);

  // Resolve selected model to access capability flags
  const selectedModel = useMemo(() => ALLOWED_MODELS.find((m) => m.slug === model), [model]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const draggingRef = useRef(false);
  const [sliderPos, setSliderPos] = useState<number>(50); // 0..100
  const { containerRef, boxSize, onResultImageLoad, onPreviewImageLoad } = useImageBoxSize(
    [/* recompute when result or preview toggles */ resultUrl, previewUrl]
  );
  const [isHeld, setIsHeld] = useState(false); // Press-and-Hold A/B state
  const holdTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  // Zoom state (phase 1: center-zoom only; pan follows in next PR)
  const [zoom, setZoom] = useState<number>(1);
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 5;
  const ZOOM_STEP = 0.25;

  // Image metadata (dimensions)
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const onPreviewImageLoadCombined = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    onPreviewImageLoad(e);
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [onPreviewImageLoad]);

  const onResultImageLoadCombined = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    onResultImageLoad(e);
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setResultDims({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [onResultImageLoad]);

  // Defensive fallback to avoid runtime errors if `strings.toasts` is missing
  const toasts = useMemo(
    () => ({
      loadQuotaError: strings?.toasts?.loadQuotaError ?? 'Failed to load quota information.',
      loadError: strings?.toasts?.loadError ?? 'Failed to load. Please try again.',
      quotaReached: strings?.toasts?.quotaReached ?? 'You have reached your usage limit.',
      unsupportedType: strings?.toasts?.unsupportedType ?? 'Unsupported file type.',
      fileTooLargePrefix: strings?.toasts?.fileTooLargePrefix ?? 'File is too large. Max.:',
      processingFailed: strings?.toasts?.processingFailed ?? 'Processing failed. Please try again.',
      successEnhanced: strings?.toasts?.successEnhanced ?? 'Image enhanced successfully!',
    }),
    [strings]
  );

  // File validation (type/size) + helpers via hook
  const { acceptAttr, maxMb, validateFile } = useValidation({
    unsupportedType: toasts.unsupportedType,
    fileTooLargePrefix: toasts.fileTooLargePrefix,
  });

  // Fallbacks for compare strings
  const compareStrings = useMemo(
    () => ({
      sliderLabel: strings?.compare?.sliderLabel ?? 'Compare',
      before: strings?.compare?.before ?? 'Before',
      after: strings?.compare?.after ?? 'After',
      handleAriaLabel: strings?.compare?.handleAriaLabel ?? 'Drag to compare',
      keyboardHint: strings?.compare?.keyboardHint ?? 'Use Left/Right to adjust; Home/End to reset',
      reset: strings?.compare?.reset ?? 'Reset',
    }),
    [strings]
  );

  // Programmatic download helper
  const download = useDownload();

  // CSRF helper: ensure a csrf_token cookie exists and return a matching header token
  const ensureCsrfToken = useCallback(() => {
    try {
      const cookie = document.cookie || '';
      const m = cookie.match(/(?:^|; )csrf_token=([^;]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      // generate random token
      const buf = new Uint8Array(16);
      (globalThis.crypto || window.crypto).getRandomValues(buf);
      const token = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
      const attrs = [
        'Path=/',
        'SameSite=Lax',
        (typeof location !== 'undefined' && location.protocol === 'https:') ? 'Secure' : ''
      ].filter(Boolean).join('; ');
      document.cookie = `csrf_token=${encodeURIComponent(token)}; ${attrs}`;
      return token;
    } catch {
      // fallback empty -> request will likely be rejected, but avoid runtime errors
      return '';
    }
  }, []);

  useEffect(() => {
    if (!strings?.toasts) {
      // Helps diagnose locale/runtime mismatches without breaking the UI
      console.warn('ImagEnhancerIsland: strings.toasts is missing. Falling back to defaults.', strings);
    }
  }, [strings]);

  // Helper to clamp and update slider position based on pointer X
  const clamp = useCallback((val: number, min: number, max: number) => Math.min(max, Math.max(min, val)), []);
  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setSliderPos((prev) => {
      const next = clamp(Math.round(ratio * 100), 0, 100);
      return next === prev ? prev : next;
    });
  }, [clamp]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    updateFromClientX(e.clientX);
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      updateFromClientX(ev.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updateFromClientX]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    draggingRef.current = true;
    const t0 = e.touches[0];
    if (t0) {
      updateFromClientX(t0.clientX);
      touchStartPosRef.current = { x: t0.clientX, y: t0.clientY };
      // Start long-press timer to show 100% Before while holding
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = window.setTimeout(() => setIsHeld(true), 350);
    }
    const onMove = (ev: TouchEvent) => {
      if (!draggingRef.current) return;
      const t = ev.touches[0];
      if (t) {
        updateFromClientX(t.clientX);
        // Cancel hold if user is moving finger significantly
        const start = touchStartPosRef.current;
        if (start) {
          const dx = Math.abs(t.clientX - start.x);
          const dy = Math.abs(t.clientY - start.y);
          if (dx > 8 || dy > 8) {
            if (holdTimerRef.current) {
              window.clearTimeout(holdTimerRef.current);
              holdTimerRef.current = null;
            }
            if (isHeld) setIsHeld(false);
          }
        }
      }
    };
    const onEnd = () => {
      draggingRef.current = false;
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (isHeld) setIsHeld(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }, [updateFromClientX, isHeld]);

  const onHandleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 2;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPos((v) => clamp(v - step, 0, 100));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPos((v) => clamp(v + step, 0, 100));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setSliderPos(50); // reset to center
      setZoom(1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setSliderPos((v) => clamp(v - 10, 0, 100));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setSliderPos((v) => clamp(v + 10, 0, 100));
    }
  }, [clamp]);

  // Zoom handlers
  const setClampedZoom = useCallback((next: number) => {
    setZoom((prev) => {
      const z = Number.isFinite(next) ? next : prev;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
    });
  }, []);
  const onZoomIn = useCallback(() => setClampedZoom(zoom + ZOOM_STEP), [zoom, setClampedZoom]);
  const onZoomOut = useCallback(() => setClampedZoom(zoom - ZOOM_STEP), [zoom, setClampedZoom]);
  const onZoomReset = useCallback(() => setClampedZoom(1), [setClampedZoom]);
  const onWheelZoom = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // Prevent page scroll while zooming
    e.preventDefault();
    const delta = e.deltaY;
    if (delta < 0) setClampedZoom(zoom + ZOOM_STEP);
    else if (delta > 0) setClampedZoom(zoom - ZOOM_STEP);
  }, [zoom, setClampedZoom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai-image/usage', { credentials: 'same-origin' });
        const data = (await res.json()) as ApiSuccess<UsageResponseData> | ApiErrorBody;
        if ('success' in data && data.success) {
          if (!cancelled) {
            setUsage(data.data.usage);
            setOwnerType(data.data.ownerType);
          }
        } else if ('success' in data && !data.success) {
          toast.error(data.error.message || toasts.loadQuotaError);
        }
      } catch {
        toast.error(toasts.loadError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toasts.loadError, toasts.loadQuotaError]);

  // Global Space key Press-and-Hold to show 100% Before
  useEffect(() => {
    const isEditable = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (el.isContentEditable) return true;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!resultUrl) return; // only when compare is visible
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target as Element | null;
        if (isEditable(target)) return; // don't interfere with inputs/buttons
        e.preventDefault();
        setIsHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!resultUrl) return;
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target as Element | null;
        if (isEditable(target)) return;
        e.preventDefault();
        setIsHeld(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [resultUrl]);

  // Extra keyboard shortcuts: R to reset slider; Cmd/Ctrl+S to download
  useEffect(() => {
    const isEditable = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (el.isContentEditable) return true;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!resultUrl) return;
      const target = e.target as Element | null;
      if (isEditable(target)) return;
      // R to reset compare position
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsHeld(false);
        setSliderPos(50);
        return;
      }
      // Cmd/Ctrl+S to download result
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        try {
          // Reuse hook programmatically
          download(undefined as unknown as React.MouseEvent, resultUrl || undefined);
        } catch {
          if (resultUrl) window.open(resultUrl, '_blank', 'noopener');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resultUrl, download]);

  // validateFile provided by useValidation

  const onSelectFile = useCallback(
    (f: File | null) => {
      // Temporary debug logs to trace selection/preview issues in testing
      console.log('ImagEnhancerIsland:onSelectFile() - invoked', {
        hasFile: Boolean(f),
      });

      setResultUrl(null);
      setLastOriginalUrl(null);
      setResultDims(null);
      setLastProcessMs(null);
      // cleanup previous preview
      if (previewUrl) {
        console.log('ImagEnhancerIsland:onSelectFile() - revoking previous previewUrl', {
          previewUrl,
        });
        URL.revokeObjectURL(previewUrl);
      }

      if (!f) {
        console.log('ImagEnhancerIsland:onSelectFile() - no file provided');
        setFile(null);
        setPreviewUrl(null);
        setImageDims(null);
        setFileMeta(null);
        return;
      }

      console.log('ImagEnhancerIsland:onSelectFile() - selected file meta', {
        name: f.name,
        type: f.type,
        sizeB: f.size,
        sizeMB: Number((f.size / (1024 * 1024)).toFixed(2)),
        acceptAttr,
      });

      if (usage && usage.used >= usage.limit) {
        console.log('ImagEnhancerIsland:onSelectFile() - usage quota reached', { usage });
        toast.error(toasts.quotaReached);
      }
      const err = validateFile(f);
      if (err) {
        console.warn('ImagEnhancerIsland:onSelectFile() - validateFile error', err);
        toast.error(err);
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      setFile(f);
      setFileMeta({
        type: f.type || 'unknown',
        sizeMB: Number((f.size / (1024 * 1024)).toFixed(2)),
      });
      const url = URL.createObjectURL(f);
      console.log('ImagEnhancerIsland:onSelectFile() - created preview object URL', {
        url,
        startsWithBlob: url.startsWith('blob:'),
      });
      setPreviewUrl(url);
      setImageDims(null);
      // Confirm state propagation in next tick
      setTimeout(() => {
        console.log('ImagEnhancerIsland:onSelectFile() - post-setPreviewUrl tick', {
          currentPreviewUrl: url,
        });
      }, 0);
    },
    [previewUrl, validateFile, usage, toasts.quotaReached, acceptAttr]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onSelectFile(f);
    },
    [onSelectFile]
  );

  const onEnhance = useCallback(async () => {
    if (!file || !model) return;
    setLoading(true);
    try {
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const fd = new FormData();
      fd.set('image', file);
      fd.set('model', model);
      // Add optional params based on model capabilities
      if (typeof scale === 'number' && selectedModel?.supportsScale) {
        fd.set('scale', String(scale));
      }
      if (typeof faceEnhance === 'boolean' && selectedModel?.supportsFaceEnhance) {
        fd.set('face_enhance', String(faceEnhance));
      }

      const csrf = ensureCsrfToken();
      const res = await fetch('/api/ai-image/generate', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        headers: {
          'X-CSRF-Token': csrf,
        },
      });

      const json = (await res.json()) as ApiSuccess<GenerateResponseData> | ApiErrorBody;
      if ('success' in json && json.success) {
        setResultUrl(json.data.imageUrl);
        setLastOriginalUrl(json.data.originalUrl);
        setUsage(json.data.usage);
        setSliderPos(50);
        // capture baseline settings for dirty-state comparison
        setBaselineSettings({ model, scale, faceEnhance });
        // measure processing time
        const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        setLastProcessMs(Math.max(0, Math.round((t1 as number) - (t0 as number))));
        toast.success(toasts.successEnhanced);
        // Auto-scroll to slider container
        requestAnimationFrame(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        const msg = json.error?.message || toasts.processingFailed;
        toast.error(msg);
      }
    } catch {
      toast.error(toasts.processingFailed);
    } finally {
      setLoading(false);
    }
  }, [file, model, scale, faceEnhance, toasts.processingFailed, toasts.successEnhanced]);

  const canSubmit = !!file && !!model && !loading;
  const quotaExceeded = !!usage && usage.used >= usage.limit;

  // If backend dev fallback echoed the original image (imageUrl === originalUrl),
  // mark this as a demo result so we can apply a local visual filter to simulate enhancement.
  const isDemoResult = useMemo(
    () => Boolean(resultUrl && lastOriginalUrl && resultUrl === lastOriginalUrl),
    [resultUrl, lastOriginalUrl]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Box size computation moved to useImageBoxSize hook

  const dropText = strings.dropText;
  const enhanceLabel = strings.enhance;
  const modelLabel = strings.model;
  const originalLabel = strings.original;

  const usagePercent = useMemo(() => {
    if (!usage || !usage.limit) return 0;
    return Math.min(100, Math.round((usage.used / usage.limit) * 100));
  }, [usage]);
  const isUsageCritical = useMemo(() => {
    if (!usage) return false;
    return usage.used >= usage.limit - 1;
  }, [usage]);

  const currentModelLabel = useMemo(
    () => ALLOWED_MODELS.find((m) => m.slug === model)?.label ?? model,
    [model]
  );
  const settingsSummary = useMemo(() => {
    const parts = [currentModelLabel];
    if (selectedModel?.supportsScale) {
      parts.push(`x${scale}`);
    }
    if (selectedModel?.supportsFaceEnhance && faceEnhance) {
      parts.push('Face enhance');
    }
    return parts.join(' · ');
  }, [currentModelLabel, selectedModel, scale, faceEnhance]);

  const settingsDirty = useMemo(() => {
    if (!resultUrl) return false;
    if (!baselineSettings) return true;
    return (
      baselineSettings.model !== model ||
      baselineSettings.scale !== scale ||
      baselineSettings.faceEnhance !== faceEnhance
    );
  }, [resultUrl, baselineSettings, model, scale, faceEnhance]);

  const showEnhanceButton = useMemo(() => {
    if (!resultUrl) return true; // phase 1
    return showModelControls && settingsDirty; // phase 2 only when changed
  }, [resultUrl, showModelControls, settingsDirty]);

  const pricingHref = useMemo(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    return path.startsWith('/en/') ? '/en/pricing' : '/pricing';
  }, []);

  return (
    <div className="rounded-md border border-white/10 dark:border-white/10 p-4 bg-white/5 dark:bg-slate-900/30 backdrop-blur">
      <div className="flex items-start gap-6">
        <div className="flex-1">
          {resultUrl ? (
            <>
              <div className="mb-2 text-[11px] text-gray-600 dark:text-gray-300">
                {settingsSummary}
              </div>
            <CompareSlider
              containerRef={containerRef}
              boxSize={boxSize}
              sliderPos={sliderPos}
              isHeld={isHeld}
              previewUrl={previewUrl || ''}
              resultUrl={resultUrl}
              compareStrings={compareStrings}
              isDemoResult={isDemoResult}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onHandleKeyDown={onHandleKeyDown}
              onResultImageLoad={onResultImageLoadCombined}
              onPreviewImageLoad={onPreviewImageLoadCombined}
              onResultError={() => {
                console.warn('ImagEnhancerIsland: failed to load result image URL', resultUrl);
                toast.error(toasts.loadError);
              }}
              onPreviewError={() => {
                console.warn('ImagEnhancerIsland: failed to load preview image URL', previewUrl);
                toast.error('Failed to load original preview');
              }}
              zoom={zoom}
              onWheelZoom={onWheelZoom}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onZoomReset={onZoomReset}
            />
              {(resultDims || lastProcessMs) && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {strings.result}: {resultDims ? `${resultDims.w}×${resultDims.h}px` : ''}
                  {lastProcessMs != null ? ` · ${lastProcessMs}ms` : ''}
                </div>
              )}
            </>
          ) : (
            <Dropzone
              containerRef={containerRef}
              boxSize={boxSize}
              previewUrl={previewUrl}
              originalLabel={originalLabel}
              dropText={dropText}
              acceptAttr={acceptAttr}
              inputRef={inputRef}
              onDrop={onDrop}
              onSelectFile={onSelectFile}
              onPreviewImageLoad={onPreviewImageLoadCombined}
              onPreviewError={() => {
                console.warn('ImagEnhancerIsland: failed to load preview image URL', previewUrl);
                toast.error('Failed to load original preview');
              }}
            />
          )}

          {imageDims && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {originalLabel}: {imageDims.w}×{imageDims.h}px
              {fileMeta ? ` · ${fileMeta.type || 'unknown'} · ${fileMeta.sizeMB}MB` : ''}
            </div>
          )}

          <EnhancerActions
            modelLabel={modelLabel}
            model={model}
            models={ALLOWED_MODELS}
            onChangeModel={(v) => setModel(v)}
            modelControlsSlot={
              // Two-phase model controls: in compare phase show a small pill to toggle, otherwise show full controls
              (
                <div className="flex items-center gap-3">
                  {resultUrl && !showModelControls ? (
                    <button
                      type="button"
                      onClick={() => setShowModelControls(true)}
                      className="text-xs px-3 py-1 rounded-full bg-white/10 dark:bg-slate-900/40 ring-1 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
                    >
                      Change model
                    </button>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="model">
                        {modelLabel}
                      </label>
                      <select
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="min-w-[200px] rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        {ALLOWED_MODELS.map((opt) => (
                          <option key={opt.slug} value={opt.slug}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {(selectedModel?.supportsScale || selectedModel?.supportsFaceEnhance) && (
                        <div className="flex items-center gap-3">
                          {selectedModel?.supportsScale && (
                            <div className="flex items-center gap-1" role="group" aria-label="Enhancement scale">
                              <button
                                type="button"
                                onClick={() => setScale(2)}
                                className={`px-2 py-1 text-xs rounded-md ring-1 ${
                                  scale === 2
                                    ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200'
                                    : 'bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'
                                }`}
                              >
                                x2
                              </button>
                              <button
                                type="button"
                                onClick={() => setScale(4)}
                                className={`px-2 py-1 text-xs rounded-md ring-1 ${
                                  scale === 4
                                    ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200'
                                    : 'bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'
                                }`}
                              >
                                x4
                              </button>
                            </div>
                          )}
                          {selectedModel?.supportsFaceEnhance && (
                            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={faceEnhance}
                                onChange={(e) => setFaceEnhance(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500"
                                aria-label="Face enhance"
                              />
                              <span>Face enhance</span>
                            </label>
                          )}
                        </div>
                      )}
                      {resultUrl && (
                        <button
                          type="button"
                          onClick={() => setShowModelControls(false)}
                          className="text-xs px-2 py-1 rounded-md bg-white/5 dark:bg-slate-900/30 ring-1 ring-gray-400/20 text-gray-600 dark:text-gray-300"
                        >
                          Done
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            }
            enhanceLabel={enhanceLabel}
            processingLabel={strings.processing}
            resetLabel={compareStrings.reset}
            downloadLabel={strings.download}
            canSubmit={canSubmit}
            quotaExceeded={quotaExceeded}
            loading={loading}
            hasResult={!!resultUrl}
            resultUrl={resultUrl}
            onEnhance={onEnhance}
            onReset={() => {
              setIsHeld(false);
              setSliderPos(50);
            }}
            // Start Over: clear upload and result to return to setup phase
            startOverLabel="Start over"
            onStartOver={() => {
              setIsHeld(false);
              setSliderPos(50);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setFile(null);
              setPreviewUrl(null);
              setResultUrl(null);
              setLastOriginalUrl(null);
              setShowModelControls(false);
              setBaselineSettings(null);
              setResultDims(null);
              setLastProcessMs(null);
            }}
            onDownload={(e) => download(e, resultUrl || undefined)}
            showEnhance={showEnhanceButton}
            rightSlot={
              <div className="flex items-center gap-2">
                <UsagePill
                  label={strings.usage}
                  loadingLabel={strings.loading}
                  usage={usage}
                  ownerType={ownerType}
                  percent={usagePercent}
                  critical={isUsageCritical}
                />
                {(quotaExceeded || isUsageCritical) && (
                  <a
                    href={pricingHref}
                    className="inline-flex items-center rounded-md px-2 py-1 text-[11px] ring-1 ring-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200 hover:ring-amber-400/60"
                  >
                    Upgrade
                  </a>
                )}
              </div>
            }
          />

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {strings.allowedTypes}: {ALLOWED_CONTENT_TYPES.join(', ')} · {strings.max} {maxMb}MB
          </div>
          {quotaExceeded && (
            <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {strings.quotaBanner}
            </div>
          )}
        </div>

        {/* Right usage panel removed in favor of compact pill */}
      </div>

      {/* Bottom compare section removed; in-place compare is rendered above */}
    </div>
  );
}
