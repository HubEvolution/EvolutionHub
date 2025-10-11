import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_MODELS,
  FREE_LIMIT_GUEST,
  FREE_LIMIT_USER,
} from '@/config/ai-image';
import { useDownload } from './imag-enhancer/hooks/useDownload';
import { useValidation } from './imag-enhancer/hooks/useValidation';
import { useImageBoxSize } from './imag-enhancer/hooks/useImageBoxSize';
import { CompareSlider } from './imag-enhancer/CompareSlider';
import { Dropzone } from './imag-enhancer/Dropzone';
import { UsagePill } from './imag-enhancer/UsagePill';
import { EnhancerActions } from './imag-enhancer/EnhancerActions';
import { HelpModal } from './imag-enhancer/HelpModal';
import { computeAllowedScales, computeCanUseFaceEnhance } from './imag-enhancer/gating';
import type { ApiSuccess, ApiErrorBody, GenerateResponseData } from './imag-enhancer/types';
import { postCredits } from './imag-enhancer/api';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { useUsage } from './imag-enhancer/hooks/useUsage';
import { useRateLimit } from './imag-enhancer/hooks/useRateLimit';
import { useEnhance } from './imag-enhancer/hooks/useEnhance';
import { ModelControls } from './imag-enhancer/ModelControls';
import { useCompareInteractions } from './imag-enhancer/hooks/useCompareInteractions';
import { clientLogger } from '@/lib/client-logger';

// Types now come from imag-enhancer/types.ts

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
    loupeLabel?: string;
  };
  ui?: {
    fullscreen: string;
    exitFullscreen: string;
    changeModel?: string;
    done?: string;
    startOver?: string;
    faceEnhance?: string;
    upgrade?: string;
    help?: {
      button?: string;
      title?: string;
      close?: string;
      sections?: {
        upload?: string;
        models?: string;
        compare?: string;
        quota?: string;
      };
    };
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
  const { usage, ownerType, plan, entitlements, refresh: refreshUsage } = useUsage();
  const [lastOriginalUrl, setLastOriginalUrl] = useState<string | null>(null);
  // Abort & retry handling
  const generateAbortRef = useRef<AbortController | null>(null);
  // Enhancement parameters
  const [scale, setScale] = useState<2 | 4>(4);
  const [faceEnhance, setFaceEnhance] = useState<boolean>(false);
  const [showModelControls, setShowModelControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // File/result metadata and processing time
  const [fileMeta, setFileMeta] = useState<{ type: string; sizeMB: number } | null>(null);
  const [resultDims, setResultDims] = useState<{ w: number; h: number } | null>(null);
  const [lastProcessMs, setLastProcessMs] = useState<number | null>(null);
  // Help & loading skeleton states
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [isResultLoading, setIsResultLoading] = useState<boolean>(false);
  // Baseline settings captured on last successful enhance to compute dirty state
  const [baselineSettings, setBaselineSettings] = useState<{
    model: string;
    scale: 2 | 4;
    faceEnhance: boolean;
  } | null>(null);

  // Resolve selected model to access capability flags
  const selectedModel = useMemo(() => ALLOWED_MODELS.find((m) => m.slug === model), [model]);
  // Feature flag to guard plan-aware UI gating
  const gatingEnabled = import.meta.env.PUBLIC_ENHANCER_PLAN_GATING_V1 === '1';
  // Feature flag for Credits CTA: enabled in development by default, opt-in in production via PUBLIC_ENABLE_CREDITS_CTA=1
  const creditsCtaEnabled =
    import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_CREDITS_CTA === '1';
  // Lightweight telemetry
  const trackEvent = useCallback((evt: string, payload: Record<string, unknown> = {}) => {
    try {
      if (import.meta.env.DEV) {
        console.log('[ImagEnhancer]', evt, payload);
      }
    } catch {
      /* noop */
    }
  }, []);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50); // 0..100
  // Mobile no-scroll support: detect viewport and reserve space for sticky actions
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [actionsHeight, setActionsHeight] = useState<number>(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState<number>(0);
  const topReserveRef = useRef<HTMLDivElement | null>(null);
  const [topReserveHeight, setTopReserveHeight] = useState<number>(0);
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const hasMM = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
      if (!hasMM) {
        setIsMobile(false);
        return;
      }
      const mq = window.matchMedia('(max-width: 768px)');
      const onChange = () => setIsMobile(!!mq && !!mq.matches);
      onChange();
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      setIsMobile(false);
    }
  }, []);

  useEffect(() => {
    // Measure sticky actions height dynamically
    if (!actionsRef.current) {
      setActionsHeight(0);
      return;
    }
    const el = actionsRef.current;
    const ro = new ResizeObserver(() => {
      setActionsHeight(el.getBoundingClientRect().height | 0);
    });
    ro.observe(el);
    // Initial measure
    setActionsHeight(el.getBoundingClientRect().height | 0);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Measure the height of the content just above the image container (e.g. settings summary)
    const el = topReserveRef.current;
    if (!el) {
      setTopReserveHeight(0);
      return;
    }
    const ro = new ResizeObserver(() => {
      // small margin fudge to include spacing below the summary
      setTopReserveHeight((el.getBoundingClientRect().height | 0) + 4);
    });
    ro.observe(el);
    setTopReserveHeight((el.getBoundingClientRect().height | 0) + 4);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Try to read iOS safe-area inset bottom via computed style trick
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

  const sizingOptions = (() => {
    if (isFullscreen) {
      return {
        mode: 'fitViewport' as const,
        minHeightPx: 200,
        maxViewportHeightFraction: 1,
        reservedTopPx: topReserveHeight,
        reservedBottomPx: actionsHeight,
        safeAreaBottomPx: safeAreaBottom,
      };
    }
    if (isMobile) {
      return {
        mode: 'fitViewport' as const,
        minHeightPx: 220,
        maxViewportHeightFraction: 0.8,
        reservedTopPx: topReserveHeight,
        reservedBottomPx: actionsHeight,
        safeAreaBottomPx: safeAreaBottom,
      };
    }
    return {
      // Desktop: keep consistent target height with fraction cap
      fixedHeightPx: 512,
      minHeightPx: 240,
      maxViewportHeightFraction: 0.7,
      mode: 'auto' as const,
    };
  })();

  const { containerRef, boxSize, onResultImageLoad, onPreviewImageLoad } = useImageBoxSize(
    [
      resultUrl,
      previewUrl,
      isMobile,
      isFullscreen,
      actionsHeight,
      safeAreaBottom,
      topReserveHeight,
    ],
    sizingOptions
  );
  const [isHeld, setIsHeld] = useState(false); // Press-and-Hold A/B state
  // Zoom state
  const [zoom, setZoom] = useState<number>(1);
  // Pan state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Loupe (magnifier)
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [loupeSize, setLoupeSize] = useState<number>(160);
  const [loupeFactor, setLoupeFactor] = useState<number>(2);
  const [loupeUiHint, setLoupeUiHint] = useState<string | null>(null);

  // Image metadata (dimensions)
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const onPreviewImageLoadCombined = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      onPreviewImageLoad(e);
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
      }
      setIsPreviewLoading(false);
    },
    [onPreviewImageLoad]
  );

  const onResultImageLoadCombined = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      onResultImageLoad(e);
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setResultDims({ w: img.naturalWidth, h: img.naturalHeight });
      }
      setIsResultLoading(false);
    },
    [onResultImageLoad]
  );

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
      loupeLabel: 'Loupe',
    }),
    [strings]
  );

  // Programmatic download helper
  const download = useDownload();

  // CSRF helper moved to '@/lib/security/csrf'

  useEffect(() => {
    if (!strings?.toasts) {
      // Helps diagnose locale/runtime mismatches without breaking the UI
      console.warn(
        'ImagEnhancerIsland: strings.toasts is missing. Falling back to defaults.',
        strings
      );
    }
  }, [strings]);

  // Interaktion: Pointer/Touch/Keyboard/Zoom/Loupe zentral über Hook
  const {
    onMouseDown,
    onTouchStart,
    onHandleKeyDown,
    onWheelZoom,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onMouseMoveLoupe,
    onMouseLeaveLoupe,
    onToggleLoupe,
  } = useCompareInteractions({
    containerRef,
    boxSize,
    // Slider
    setSliderPos,
    // Hold
    isHeld,
    setIsHeld,
    // Zoom
    zoom,
    setZoom,
    // Pan
    pan,
    setPan,
    // Loupe
    loupeEnabled,
    setLoupeEnabled,
    loupeSize,
    setLoupeSize,
    loupeFactor,
    setLoupeFactor,
    setLoupePos,
    setLoupeUiHint,
    // Only enable global interactions when compare is visible
    compareVisible: !!resultUrl,
  });

  // Clear loupe hint shortly after change
  useEffect(() => {
    if (!loupeUiHint) return;
    const t = window.setTimeout(() => setLoupeUiHint(null), 1200);
    return () => window.clearTimeout(t);
  }, [loupeUiHint]);

  // useUsage() already handles initial load and refresh triggers (focus/visibility/auth/storage/pageshow)

  // Safety timeout: ensure preview overlay doesn't block UI indefinitely if onLoad doesn't fire
  useEffect(() => {
    if (!previewUrl) return;
    setIsPreviewLoading(true);
    const t = window.setTimeout(() => setIsPreviewLoading(false), 2000);
    return () => window.clearTimeout(t);
  }, [previewUrl]);

  // Extra keyboard shortcuts: R to reset slider; Cmd/Ctrl+S to download; L to toggle loupe
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
        setZoom(1);
        setPan({ x: 0, y: 0 });
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
        return;
      }
      // L to toggle loupe
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setLoupeEnabled((v) => !v);
        return;
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
        setIsPreviewLoading(false);
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
        setSelectError(err);
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      setSelectError(null);
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
      setIsPreviewLoading(true);
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

  // Paste handler: allow Cmd/Ctrl+V to paste an image from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;
      const items = dt.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file') {
          const file = it.getAsFile();
          if (file && file.type.startsWith('image/')) {
            e.preventDefault();
            onSelectFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste as unknown as EventListener);
    return () => window.removeEventListener('paste', onPaste as unknown as EventListener);
  }, [onSelectFile]);

  const { enhance } = useEnhance();
  const { retryActive, retryRemainingSec, handle429Response } = useRateLimit();

  const onEnhance = useCallback(async () => {
    if (!file || !model) return;

    clientLogger.info('Image enhancer started', {
      component: 'ImagEnhancerIsland',
      action: 'enhance_requested',
      model,
      scale,
      faceEnhance,
      fileType: file.type,
      fileSize: file.size,
    });

    // Abort previous enhance
    if (generateAbortRef.current) {
      try {
        generateAbortRef.current.abort();
      } catch {
        /* noop */
      }
    }
    const ac = new AbortController();
    generateAbortRef.current = ac;
    setLoading(true);
    try {
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const resp = await enhance({
        file,
        model,
        scale,
        faceEnhance,
        supportsScale: Boolean(selectedModel?.supportsScale),
        supportsFaceEnhance: Boolean(selectedModel?.supportsFaceEnhance),
        signal: ac.signal,
      });
      if (resp instanceof Response) {
        if (resp.status === 429) {
          clientLogger.warn('Image enhancer rate-limited', {
            component: 'ImagEnhancerIsland',
            error: 'rate_limit_429',
            status: 429,
          });
          await handle429Response(resp);
          toast.error('Rate limit reached. Please retry shortly.');
          setIsResultLoading(false);
          return;
        }
        // Non-429 Response should not happen here (api returns JSON for non-429).
      }

      const json = resp as ApiSuccess<GenerateResponseData> | ApiErrorBody;
      if ('success' in json && json.success) {
        const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const latency = Math.max(0, Math.round((t1 as number) - (t0 as number)));

        clientLogger.info('Image enhanced successfully', {
          component: 'ImagEnhancerIsland',
          action: 'enhance_success',
          model,
          scale,
          faceEnhance,
          latency,
        });

        setIsResultLoading(true);
        setResultUrl(json.data.imageUrl);
        setLastOriginalUrl(json.data.originalUrl);
        setSliderPos(50);
        setBaselineSettings({ model, scale, faceEnhance });
        setLastProcessMs(latency);
        toast.success(toasts.successEnhanced);
        // Update usage info asynchronously after success
        try {
          await refreshUsage();
        } catch {
          /* noop */
        }
        requestAnimationFrame(() => {
          // jsdom: scrollIntoView may be undefined in tests
          containerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        });
      } else {
        const msg = json.error?.message || toasts.processingFailed;
        clientLogger.error('Image enhancer returned error', {
          component: 'ImagEnhancerIsland',
          error: json.error?.type || 'api_error',
          message: msg,
        });
        toast.error(msg);
        setIsResultLoading(false);
      }
    } catch (err: unknown) {
      const isAbort =
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        typeof (err as { name?: unknown }).name === 'string' &&
        (err as { name?: string }).name === 'AbortError';
      if (isAbort) {
        clientLogger.info('Image enhancement aborted', {
          component: 'ImagEnhancerIsland',
          action: 'enhance_aborted',
        });
        return;
      }
      clientLogger.error('Image enhancer error', {
        component: 'ImagEnhancerIsland',
        error: 'network',
        message: err instanceof Error ? err.message : String(err),
      });
      toast.error(toasts.processingFailed);
      setIsResultLoading(false);
    } finally {
      setLoading(false);
    }
  }, [
    enhance,
    file,
    model,
    scale,
    faceEnhance,
    selectedModel,
    toasts.processingFailed,
    toasts.successEnhanced,
    refreshUsage,
    handle429Response,
    containerRef,
  ]);

  // Retry-After via useRateLimit()
  // Already destructured above: retryUntil, retryActive, retryRemainingSec
  const canSubmit = !!file && !!model && !loading && !retryActive;
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
  const sanitizeUiLabel = (s?: string, fallback?: string) => {
    if (!s) return fallback ?? '';
    const trimmed = s.trim();
    // Treat i18n fallback tokens like "[de:...fallback_not_found]" as invalid
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return fallback ?? '';
    if (/fallback_not_found/i.test(trimmed)) return fallback ?? '';
    return trimmed;
  };
  const fullscreenLabel = sanitizeUiLabel(strings?.ui?.fullscreen, 'Fullscreen');
  const exitFullscreenLabel = sanitizeUiLabel(strings?.ui?.exitFullscreen, 'Exit');
  const changeModelLabel = sanitizeUiLabel(strings?.ui?.changeModel, 'Change model');
  const doneLabel = sanitizeUiLabel(strings?.ui?.done, 'Done');
  const startOverLabel = sanitizeUiLabel(strings?.ui?.startOver, 'Start over');
  const faceEnhanceLabel = sanitizeUiLabel(strings?.ui?.faceEnhance, 'Face enhance');
  const upgradeLabel = useMemo(() => {
    return strings?.ui?.upgrade ? strings.ui.upgrade : 'Upgrade';
  }, [strings]);

  const planLabel = useMemo(() => {
    if (ownerType === 'guest' || ownerType === null) return 'Guest';
    if (ownerType === 'user') {
      if (plan === 'free' || !plan) return 'Starter';
      return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
    return '';
  }, [ownerType, plan]);

  const helpLabel = sanitizeUiLabel(strings?.ui?.help?.button as string | undefined, 'Help');

  const effectiveUsageForDisplay = useMemo(() => {
    if (usage) return usage;
    // Before API returns or on error, show numeric fallback
    if (ownerType === 'user') return { used: 0, limit: FREE_LIMIT_USER, resetAt: null };
    // default to guest when owner not yet known
    return { used: 0, limit: FREE_LIMIT_GUEST, resetAt: null };
  }, [ownerType, usage]);

  // Plan-aware UI gating derived flags
  const modelSupportsScale = Boolean(selectedModel?.supportsScale);
  const modelSupportsFace = Boolean(selectedModel?.supportsFaceEnhance);
  const allowedScales = useMemo(
    () => computeAllowedScales(modelSupportsScale, entitlements, gatingEnabled),
    [modelSupportsScale, entitlements, gatingEnabled]
  );
  const canUseFaceEnhance = useMemo(
    () => computeCanUseFaceEnhance(modelSupportsFace, entitlements, gatingEnabled),
    [modelSupportsFace, entitlements, gatingEnabled]
  );

  const usagePercent = useMemo(() => {
    const u = effectiveUsageForDisplay;
    if (!u || !u.limit) return 0;
    return Math.min(100, Math.round((u.used / u.limit) * 100));
  }, [effectiveUsageForDisplay]);
  const isUsageCritical = useMemo(() => {
    const u = effectiveUsageForDisplay;
    if (!u) return false;
    return u.used >= u.limit;
  }, [effectiveUsageForDisplay]);

  // CTA refinement based on plan gating
  const featureBlockedByPlan = useMemo(() => {
    if (!gatingEnabled || !entitlements) return false;
    if (
      modelSupportsScale &&
      typeof scale === 'number' &&
      entitlements.maxUpscale &&
      scale > entitlements.maxUpscale
    )
      return true;
    if (modelSupportsFace && faceEnhance && !entitlements.faceEnhance) return true;
    return false;
  }, [gatingEnabled, entitlements, modelSupportsScale, modelSupportsFace, scale, faceEnhance]);
  const ctaReason = useMemo(() => {
    if (ownerType === 'guest') return 'guest';
    if (plan === 'free') return 'plan_free';
    if (isUsageCritical || (!!usage && usage.used >= usage.limit)) return 'quota';
    if (featureBlockedByPlan) return 'feature';
    if (usagePercent >= 90) return 'high_usage';
    return null as null | string;
  }, [ownerType, plan, isUsageCritical, usage, featureBlockedByPlan, usagePercent]);
  const showUpgradeCta = useMemo(() => ctaReason !== null, [ctaReason]);

  useEffect(() => {
    if (!showUpgradeCta) return;
    trackEvent('enhancer_cta_impression', {
      reason: ctaReason || '',
      plan: plan || '',
      ownerType: ownerType || '',
      model,
    });
  }, [showUpgradeCta, ctaReason, plan, ownerType, model, trackEvent]);

  // Safety clamp: if gating is enabled and current selections exceed entitlements, adjust UI state
  useEffect(() => {
    if (!gatingEnabled || !entitlements) return;
    try {
      if (selectedModel?.supportsScale) {
        const max = entitlements.maxUpscale;
        if (scale === 4 && max < 4) setScale(2);
      }
      if (selectedModel?.supportsFaceEnhance) {
        if (faceEnhance && !entitlements.faceEnhance) setFaceEnhance(false);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatingEnabled, entitlements, selectedModel]);

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
      parts.push(faceEnhanceLabel);
    }
    return parts.join(' · ');
  }, [currentModelLabel, selectedModel, scale, faceEnhance, faceEnhanceLabel]);

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

  // Buy Credits (in-app) — simple CTA when quota exceeded
  const getWorkspaceId = useCallback(() => {
    try {
      const url = new URL(window.location.href);
      const ws = url.searchParams.get('ws');
      if (ws && ws.trim()) {
        localStorage.setItem('ws_id', ws);
        return ws;
      }
      const ls = localStorage.getItem('ws_id');
      if (ls && ls.trim()) return ls;
    } catch {
      /* noop */
    }
    return 'default';
  }, []);

  const [buying, setBuying] = useState<false | 200 | 1000>(false);
  const createCreditsCheckout = useCallback(
    async (pack: 200 | 1000) => {
      try {
        setBuying(pack);
        const csrf = ensureCsrfToken();
        const res = await postCredits(pack, getWorkspaceId(), csrf);
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          toast.error('Checkout failed: ' + (text || res.status));
          return;
        }
        const dataUnknown: unknown = await res.json().catch(() => null);
        let url: string | undefined;
        if (
          dataUnknown &&
          typeof dataUnknown === 'object' &&
          'url' in dataUnknown &&
          typeof (dataUnknown as { url?: unknown }).url === 'string'
        ) {
          url = (dataUnknown as { url: string }).url;
        } else {
          url = undefined;
        }
        if (url) {
          window.location.href = url;
        } else {
          toast.error('Checkout failed: Invalid response');
        }
      } catch {
        toast.error('Checkout failed');
      } finally {
        setBuying(false);
      }
    },
    [getWorkspaceId]
  );

  const helpLabels = useMemo(
    () => ({
      title: sanitizeUiLabel(strings?.ui?.help?.title as string | undefined, 'How to use'),
      close: sanitizeUiLabel(strings?.ui?.help?.close as string | undefined, 'Close'),
      sections: {
        upload: sanitizeUiLabel(
          strings?.ui?.help?.sections?.upload as string | undefined,
          'Upload'
        ),
        models: sanitizeUiLabel(
          strings?.ui?.help?.sections?.models as string | undefined,
          'Models'
        ),
        compare: sanitizeUiLabel(
          strings?.ui?.help?.sections?.compare as string | undefined,
          'Compare & Inspect'
        ),
        quota: sanitizeUiLabel(strings?.ui?.help?.sections?.quota as string | undefined, 'Quota'),
      },
    }),
    [strings]
  );

  // Exit fullscreen on ESC
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const rootClasses = [
    'p-0 bg-transparent',
    isFullscreen ? 'fixed inset-0 z-[999] bg-white dark:bg-slate-900 overflow-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses}>
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div
            className="block max-w-[min(100vw,1200px)] mx-auto"
            style={{ paddingBottom: isMobile ? Math.max(0, actionsHeight + safeAreaBottom) : 0 }}
          >
            {resultUrl ? (
              <>
                <div
                  ref={topReserveRef}
                  className="mb-1 text-[11px] text-gray-600 dark:text-gray-300 text-center"
                >
                  {settingsSummary}
                </div>
                <div className="relative">
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
                      console.warn(
                        'ImagEnhancerIsland: failed to load result image URL',
                        resultUrl
                      );
                      toast.error(toasts.loadError);
                    }}
                    onPreviewError={() => {
                      console.warn(
                        'ImagEnhancerIsland: failed to load preview image URL',
                        previewUrl
                      );
                      toast.error('Failed to load original preview');
                    }}
                    zoom={zoom}
                    onWheelZoom={onWheelZoom}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onZoomReset={onZoomReset}
                    panX={pan.x}
                    panY={pan.y}
                    loupeEnabled={loupeEnabled}
                    loupeSize={loupeSize}
                    loupeFactor={loupeFactor}
                    loupePos={loupePos}
                    onToggleLoupe={onToggleLoupe}
                    onMouseMove={onMouseMoveLoupe}
                    onMouseLeave={onMouseLeaveLoupe}
                  />
                  {loupeUiHint && (
                    <div className="pointer-events-none absolute bottom-2 left-2 z-50 text-[11px] px-2 py-1 rounded bg-black/40 text-white/90">
                      {loupeUiHint}
                    </div>
                  )}
                  {(loading || isResultLoading) && (
                    <div className="absolute inset-0 z-50 grid place-items-center bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <svg
                          className="h-5 w-5 animate-spin text-cyan-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          ></path>
                        </svg>
                        <span>{strings.processing}</span>
                      </div>
                    </div>
                  )}
                  <div className="sr-only" aria-live="polite">
                    {loading
                      ? 'Processing image…'
                      : retryActive
                        ? `Please wait ${retryRemainingSec} seconds before retrying.`
                        : ''}
                  </div>
                </div>
                {(resultDims || lastProcessMs) && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {strings.result}: {resultDims ? `${resultDims.w}×${resultDims.h}px` : ''}
                    {lastProcessMs != null ? ` · ${lastProcessMs}ms` : ''}
                  </div>
                )}
              </>
            ) : (
              <div className="relative">
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
                    console.warn(
                      'ImagEnhancerIsland: failed to load preview image URL',
                      previewUrl
                    );
                    toast.error('Failed to load original preview');
                  }}
                />
                {isPreviewLoading && (
                  <div className="absolute inset-0 z-30 grid place-items-center bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div
                      className="h-8 w-8 rounded-full border-2 border-cyan-400/60 border-t-transparent animate-spin"
                      aria-hidden
                    />
                  </div>
                )}
              </div>
            )}

            {imageDims && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {originalLabel}: {imageDims.w}×{imageDims.h}px
                {fileMeta ? ` · ${fileMeta.type || 'unknown'} · ${fileMeta.sizeMB}MB` : ''}
              </div>
            )}
            {selectError && (
              <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                {selectError}
              </div>
            )}
          </div>

          <div
            ref={actionsRef}
            className={[
              isFullscreen
                ? 'fixed inset-x-0 bottom-0 z-40 bg-white/70 dark:bg-slate-900/60 backdrop-blur px-3 py-2'
                : 'mt-3 md:mt-4 md:static sticky bottom-0 z-40 bg-white/70 dark:bg-slate-900/60 backdrop-blur px-3 py-2 rounded-t-md ring-1 ring-white/10 md:bg-transparent md:dark:bg-transparent md:backdrop-blur-0 md:ring-0',
            ].join(' ')}
            aria-label="Enhancer actions toolbar"
          >
            <EnhancerActions
              modelLabel={modelLabel}
              model={model}
              models={ALLOWED_MODELS}
              onChangeModel={(v) => setModel(v)}
              modelControlsSlot={
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  {resultUrl && !showModelControls ? (
                    <button
                      type="button"
                      onClick={() => setShowModelControls(true)}
                      className="text-xs px-3 py-1 rounded-full bg-white/10 dark:bg-slate-900/40 ring-1 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
                    >
                      {changeModelLabel}
                    </button>
                  ) : (
                    <>
                      <label
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        htmlFor="model"
                      >
                        {modelLabel}
                      </label>
                      <select
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full sm:w-auto sm:min-w-[200px] rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        {ALLOWED_MODELS.map((opt) => (
                          <option key={opt.slug} value={opt.slug}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {(selectedModel?.supportsScale || selectedModel?.supportsFaceEnhance) && (
                        <ModelControls
                          supportsScale={Boolean(selectedModel?.supportsScale)}
                          allowedScales={allowedScales}
                          selectedScale={scale}
                          onScale={(s) => setScale(s)}
                          supportsFaceEnhance={Boolean(selectedModel?.supportsFaceEnhance)}
                          canUseFaceEnhance={canUseFaceEnhance}
                          faceEnhance={faceEnhance}
                          onToggleFace={(next) => setFaceEnhance(next)}
                          faceEnhanceLabel={faceEnhanceLabel}
                          upgradeLabel={strings?.ui?.upgrade || 'Upgrade'}
                          gatingEnabled={gatingEnabled}
                          onBlocked={(payload) =>
                            trackEvent('enhancer_control_blocked_plan', {
                              ...payload,
                              max: entitlements?.maxUpscale || null,
                              plan,
                              ownerType,
                              model,
                            })
                          }
                        />
                      )}
                      {resultUrl && (
                        <button
                          type="button"
                          onClick={() => setShowModelControls(false)}
                          className="text-xs px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 rounded-md bg-white/5 dark:bg-slate-900/30 ring-1 ring-gray-400/20 text-gray-600 dark:text-gray-300"
                        >
                          {doneLabel}
                        </button>
                      )}
                    </>
                  )}
                </div>
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
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              canReset={sliderPos !== 50 || zoom !== 1 || pan.x !== 0 || pan.y !== 0}
              startOverLabel={startOverLabel}
              onStartOver={() => {
                if (generateAbortRef.current) {
                  try {
                    generateAbortRef.current.abort();
                  } catch {
                    /* noop */
                  }
                  generateAbortRef.current = null;
                }
                setIsHeld(false);
                setSliderPos(50);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setFile(null);
                setPreviewUrl(null);
                setResultUrl(null);
                setImageDims(null);
                setResultDims(null);
                setBaselineSettings(null);
                setLastProcessMs(null);
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setLoupeEnabled(false);
                setLoupePos(null);
              }}
              onDownload={(e) => download(e as unknown as React.MouseEvent, resultUrl || undefined)}
              showEnhance={showEnhanceButton}
              rightSlot={
                <div className="flex items-center gap-2">
                  {retryActive && (
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] ring-1 ring-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200">
                      Retry in {retryRemainingSec}s
                    </span>
                  )}
                  <button
                    type="button"
                    ref={helpBtnRef}
                    className="px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 text-xs rounded-md ring-1 bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    onClick={() => setIsHelpOpen(true)}
                  >
                    {helpLabel}
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 text-xs rounded-md ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${loupeEnabled ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200' : 'bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'}`}
                    onClick={() => setLoupeEnabled((v) => !v)}
                    aria-pressed={loupeEnabled}
                  >
                    {compareStrings.loupeLabel ?? 'Loupe'}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 text-xs rounded-md ring-1 bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    onClick={() => setIsFullscreen((v) => !v)}
                  >
                    {isFullscreen ? exitFullscreenLabel : fullscreenLabel}
                  </button>
                  {/* Plan badge (compact) */}
                  {planLabel && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/40 dark:bg-slate-800/40 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200"
                      title={ownerType === 'guest' ? 'Guest user' : `Plan: ${planLabel}`}
                    >
                      {planLabel}
                    </span>
                  )}
                  <UsagePill
                    label={strings.usage}
                    loadingLabel={strings.loading}
                    usage={effectiveUsageForDisplay}
                    ownerType={ownerType}
                    percent={usagePercent}
                    critical={isUsageCritical}
                  />
                  {showUpgradeCta && (
                    <a
                      href={pricingHref}
                      className="inline-flex items-center rounded-md px-2 py-1 text-[11px] ring-1 ring-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200 hover:ring-amber-400/60"
                      onClick={() =>
                        trackEvent('enhancer_cta_click', {
                          reason: ctaReason || '',
                          plan: plan || '',
                          ownerType: ownerType || '',
                          model,
                        })
                      }
                    >
                      {upgradeLabel}
                    </a>
                  )}
                </div>
              }
            />
          </div>

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {strings.allowedTypes}: {ALLOWED_CONTENT_TYPES.join(', ')} · {strings.max} {maxMb}MB
          </div>
          {quotaExceeded && (
            <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {strings.quotaBanner}
            </div>
          )}
          {ownerType === 'user' && quotaExceeded && creditsCtaEnabled && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => createCreditsCheckout(200)}
                disabled={buying === 200}
                className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 hover:ring-emerald-400/60 disabled:opacity-60"
              >
                {buying === 200 ? 'Loading…' : 'Buy 200 credits (€7.99)'}
              </button>
              <button
                type="button"
                onClick={() => createCreditsCheckout(1000)}
                disabled={buying === 1000}
                className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 hover:ring-indigo-400/60 disabled:opacity-60"
              >
                {buying === 1000 ? 'Loading…' : 'Buy 1000 credits (€34.99)'}
              </button>
            </div>
          )}
        </div>

        {/* Right usage panel removed in favor of compact pill */}
      </div>

      {/* Bottom compare section removed; in-place compare is rendered above */}
      <HelpModal
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        labels={helpLabels}
        allowedTypesText={`${strings.allowedTypes}: ${ALLOWED_CONTENT_TYPES.join(', ')}`}
        maxMb={maxMb}
        modelLabels={ALLOWED_MODELS.map((m) => m.label)}
        keyboardHint={compareStrings.keyboardHint}
        usage={usage}
        returnFocusRef={helpBtnRef}
      />
    </div>
  );
}
