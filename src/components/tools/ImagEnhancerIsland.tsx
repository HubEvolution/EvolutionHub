import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type React from 'react';
import { lazy, Suspense } from 'react';
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
import { CompareView } from './imag-enhancer/CompareView';
import { UploadSection } from './imag-enhancer/UploadSection';
import { EnhancerActions } from './imag-enhancer/EnhancerActions';
import { sanitizeUiLabel } from './imag-enhancer/utils/ui';
// Lazy-load HelpModal (keep a11y/behavior unchanged)
const HelpModalLazy = lazy(() =>
  import('./imag-enhancer/HelpModal').then((m) => ({ default: m.HelpModal }))
);
import type { ApiSuccess, ApiErrorBody, GenerateResponseData } from './imag-enhancer/types';
import { useUsage } from './imag-enhancer/hooks/useUsage';
import { useRateLimit } from './imag-enhancer/hooks/useRateLimit';
import { useEnhance } from './imag-enhancer/hooks/useEnhance';
import { ModelControls } from './imag-enhancer/ModelControls';
import { useCompareInteractions } from './imag-enhancer/hooks/useCompareInteractions';
import { useClipboardImagePaste } from './imag-enhancer/hooks/useClipboardImagePaste';
import { useGlobalShortcuts } from './imag-enhancer/hooks/useGlobalShortcuts';
import { useCreditsCheckout } from './imag-enhancer/hooks/useCreditsCheckout';
import { usePlanGating } from './imag-enhancer/hooks/usePlanGating';
import { useViewportUiMetrics } from './imag-enhancer/hooks/useViewportUiMetrics';
import { clientLogger } from '@/lib/client-logger';
import { CreditsPanel } from './imag-enhancer/CreditsPanel';
import { HeaderBar } from './imag-enhancer/HeaderBar';

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
    zoomOutLabel?: string;
    zoomInLabel?: string;
    zoomResetLabel?: string;
    touchHintShort?: string;
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
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
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const topReserveRef = useRef<HTMLDivElement | null>(null);
  const { isMobile, actionsHeight, topReserveHeight, safeAreaBottom } = useViewportUiMetrics({
    actionsRef,
    topReserveRef,
  });
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);

  // viewport/ui metrics are now provided by useViewportUiMetrics

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
      loupeLabel: strings?.compare?.loupeLabel ?? 'Loupe',
      zoomOutLabel: strings?.compare?.zoomOutLabel ?? 'Zoom out',
      zoomInLabel: strings?.compare?.zoomInLabel ?? 'Zoom in',
      zoomResetLabel: strings?.compare?.zoomResetLabel ?? 'Reset zoom',
      touchHintShort: strings?.compare?.touchHintShort ?? 'Pinch to zoom, drag to pan',
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

  // Extra keyboard shortcuts:
  useGlobalShortcuts({
    enabled: !!resultUrl,
    onReset: () => {
      setIsHeld(false);
      setSliderPos(50);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    onDownload: () => {
      try {
        download(undefined as unknown as React.MouseEvent, resultUrl || undefined);
      } catch {
        if (resultUrl) window.open(resultUrl, '_blank', 'noopener');
      }
    },
    onToggleLoupe: () => setLoupeEnabled((v) => !v),
  });

  // validateFile provided by useValidation

  const onSelectFile = useCallback(
    (f: File | null) => {
      setResultUrl(null);
      setLastOriginalUrl(null);
      setResultDims(null);
      setLastProcessMs(null);
      // cleanup previous preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (!f) {
        setFile(null);
        setPreviewUrl(null);
        setImageDims(null);
        setFileMeta(null);
        setIsPreviewLoading(false);
        return;
      }

      if (usage && usage.used >= usage.limit) {
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
      setIsPreviewLoading(true);
      setPreviewUrl(url);
      setImageDims(null);
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
  useClipboardImagePaste((file) => onSelectFile(file));

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
  const { allowedScales, canUseFaceEnhance, featureBlockedByPlan } = usePlanGating({
    modelSupportsScale,
    modelSupportsFace,
    entitlements,
    gatingEnabled,
    scale,
    setScale,
    faceEnhance,
    setFaceEnhance,
  });

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

  // CTA refinement based on plan gating (uses featureBlockedByPlan from hook)
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
  const { buying, createCreditsCheckout } = useCreditsCheckout();

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

  // Focus trap and restore for fullscreen dialog
  useEffect(() => {
    if (!isFullscreen) {
      // restore focus when leaving
      if (prevFocusRef.current) {
        try {
          prevFocusRef.current.focus();
        } catch {}
        prevFocusRef.current = null;
      }
      return;
    }
    try {
      prevFocusRef.current = (document.activeElement as HTMLElement) || null;
      const root = rootRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
      const focusFirst = () => {
        if (focusables.length > 0) {
          try {
            focusables[0].focus();
          } catch {}
        } else {
          root.setAttribute('tabindex', '-1');
          root.focus();
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      // Defer initial focus
      setTimeout(focusFirst, 0);
      root.addEventListener('keydown', onKeyDown);
      return () => root.removeEventListener('keydown', onKeyDown);
    } catch {
      /* noop */
    }
  }, [isFullscreen]);

  const rootClasses = [
    'p-0 bg-transparent overflow-x-hidden',
    isFullscreen ? 'fixed inset-0 z-[999] bg-white dark:bg-slate-900 overflow-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClasses}
      {...(isFullscreen ? { role: 'dialog', 'aria-modal': true } : {})}
    >
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div className="block max-w-[min(100vw,1200px)] mx-auto">
            {resultUrl ? (
              <>
                <CompareView
                  topReserveRef={topReserveRef}
                  containerRef={containerRef}
                  boxSize={boxSize}
                  settingsSummary={settingsSummary}
                  compareStrings={compareStrings}
                  isMobile={isMobile}
                  actionsHeight={actionsHeight}
                  safeAreaBottom={safeAreaBottom}
                  sliderPos={sliderPos}
                  isHeld={isHeld}
                  previewUrl={previewUrl || ''}
                  resultUrl={resultUrl}
                  isDemoResult={isDemoResult}
                  loupeUiHint={loupeUiHint}
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
                    console.warn(
                      'ImagEnhancerIsland: failed to load preview image URL',
                      previewUrl
                    );
                    toast.error('Failed to load original preview');
                  }}
                  zoom={zoom}
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
                  onMouseMoveLoupe={onMouseMoveLoupe}
                  onMouseLeaveLoupe={onMouseLeaveLoupe}
                  loading={loading}
                  isResultLoading={isResultLoading}
                  stringsProcessing={strings.processing}
                  retryActive={retryActive}
                  retryRemainingSec={retryRemainingSec}
                />
                {(resultDims || lastProcessMs) && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                    {strings.result}: {resultDims ? `${resultDims.w}×${resultDims.h}px` : ''}
                    {lastProcessMs != null ? ` · ${lastProcessMs}ms` : ''}
                  </div>
                )}
              </>
            ) : (
              <UploadSection
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
                isPreviewLoading={isPreviewLoading}
              />
            )}

            {imageDims && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 hidden md:block">
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
                  <HeaderBar
                    helpLabel={helpLabel}
                    onOpenHelp={() => setIsHelpOpen(true)}
                    helpBtnRef={helpBtnRef}
                    loupeLabel={compareStrings.loupeLabel ?? 'Loupe'}
                    loupeEnabled={loupeEnabled}
                    onToggleLoupe={() => setLoupeEnabled((v) => !v)}
                    isFullscreen={isFullscreen}
                    fullscreenLabel={fullscreenLabel}
                    exitFullscreenLabel={exitFullscreenLabel}
                    onToggleFullscreen={() => setIsFullscreen((v) => !v)}
                    planLabel={planLabel}
                    usageLabel={strings.usage}
                    loadingLabel={strings.loading}
                    usage={effectiveUsageForDisplay}
                    ownerType={ownerType as 'user' | 'guest' | null}
                    percent={usagePercent}
                    critical={isUsageCritical}
                    showUpgradeCta={showUpgradeCta}
                    pricingHref={pricingHref}
                    onUpgradeClick={() =>
                      trackEvent('enhancer_cta_click', {
                        reason: ctaReason || '',
                        plan: plan || '',
                        ownerType: ownerType || '',
                        model,
                      })
                    }
                    upgradeLabel={upgradeLabel}
                  />
                </div>
              }
            />
          </div>

          {!resultUrl && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="md:hidden">
                {imageDims ? `${originalLabel}: ${imageDims.w}×${imageDims.h}px` : ''}
                {fileMeta ? ` · ${fileMeta.type || 'unknown'} · ${fileMeta.sizeMB}MB` : ''}
                {` · ${strings.allowedTypes}: ${ALLOWED_CONTENT_TYPES.join(', ')} · ${strings.max} ${maxMb}MB`}
              </span>
              <span className="hidden md:inline">
                {strings.allowedTypes}: {ALLOWED_CONTENT_TYPES.join(', ')} · {strings.max} {maxMb}MB
              </span>
            </div>
          )}
          {quotaExceeded && (
            <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {strings.quotaBanner}
            </div>
          )}
          {ownerType === 'user' && quotaExceeded && creditsCtaEnabled && (
            <CreditsPanel buying={buying} createCreditsCheckout={createCreditsCheckout} />
          )}
        </div>

        {/* Right usage panel removed in favor of compact pill */}
      </div>

      {/* Bottom compare section removed; in-place compare is rendered above */}
      <Suspense fallback={null}>
        <HelpModalLazy
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
      </Suspense>
    </div>
  );
}
