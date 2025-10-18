import type React from 'react';

export interface Size {
  w: number;
  h: number;
}

export interface CompareStrings {
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
}

export interface CompareSliderProps {
  containerRef: React.RefObject<HTMLDivElement>;
  boxSize: Size | null;
  sliderPos: number;
  isHeld: boolean;
  previewUrl: string;
  resultUrl: string;
  compareStrings: CompareStrings;
  isDemoResult?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onHandleKeyDown: (e: React.KeyboardEvent) => void;
  onResultImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onPreviewImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onResultError?: () => void;
  onPreviewError?: () => void;
  // Zoom support
  zoom: number; // 1.0 = 100%
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  // Pan support (in pixels, relative to center)
  panX?: number;
  panY?: number;
  // Loupe (magnifier) support
  loupeEnabled?: boolean;
  loupeSize?: number; // px
  loupeFactor?: number; // extra factor over current zoom
  loupePos?: { x: number; y: number } | null; // relative to container
  onToggleLoupe?: () => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

export function CompareSlider(props: CompareSliderProps) {
  const {
    containerRef,
    boxSize,
    sliderPos,
    isHeld,
    previewUrl,
    resultUrl,
    compareStrings,
    isDemoResult,
    onMouseDown,
    onTouchStart,
    onHandleKeyDown,
    onResultImageLoad,
    onPreviewImageLoad,
    onResultError,
    onPreviewError,
  } = props;

  // Force a layout reflow after an image finishes loading to avoid rare paint glitches
  // seen in some browsers where absolutely positioned layers don't repaint until a resize.
  const forceReflow = () => {
    try {
      const el = containerRef?.current as HTMLDivElement | null;
      if (!el) return;
      // Read + write cycle to trigger paint
      void el.offsetHeight;
      const prevWillChange = el.style.willChange;
      const prevTransform = el.style.transform;
      el.style.willChange = 'transform';
      el.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => {
        el.style.transform = prevTransform;
        el.style.willChange = prevWillChange;
      });
    } catch {
      /* noop */
    }
  };

  const handleResultLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    try {
      onResultImageLoad?.(e);
    } finally {
      forceReflow();
    }
  };
  const handlePreviewLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    try {
      onPreviewImageLoad?.(e);
    } finally {
      forceReflow();
    }
  };

  return (
    <figure className="m-0 p-0 bg-transparent">
      <div
        ref={containerRef}
        className="relative w-full max-w-full overflow-hidden rounded-sm bg-transparent mx-auto"
        style={
          boxSize
            ? {
                width: `${boxSize.w}px`,
                height: `${boxSize.h}px`,
                overscrollBehavior: 'contain',
                touchAction: props.zoom <= 1 ? 'pan-y' : 'none',
                backfaceVisibility: 'hidden',
              }
            : {
                overscrollBehavior: 'contain',
                touchAction: props.zoom <= 1 ? 'pan-y' : 'none',
                backfaceVisibility: 'hidden',
              }
        }
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onMouseMove={props.onMouseMove}
        onMouseLeave={props.onMouseLeave}
        aria-label={compareStrings.sliderLabel}
        data-testid="compare-container"
      >
        {/* Scaled image layer (result + before overlay) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            transform: `translate(${props.panX ?? 0}px, ${props.panY ?? 0}px) scale(${props.zoom})`,
            transformOrigin: 'top left',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* After image (result) as base layer */}
          <img
            src={resultUrl}
            alt={compareStrings.after}
            className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain"
            onLoad={handleResultLoad}
            onError={onResultError}
            style={
              isDemoResult ? { filter: 'contrast(1.2) saturate(1.15) brightness(1.05)' } : undefined
            }
          />

          {/* Before image (original) overlay clipped to slider position (no resize) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: `polygon(0 0, ${isHeld ? 100 : sliderPos}% 0, ${isHeld ? 100 : sliderPos}% 100%, 0 100%)`,
            }}
            aria-hidden
          >
            <img
              src={previewUrl}
              alt={compareStrings.before}
              className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain"
              onLoad={handlePreviewLoad}
              onError={onPreviewError}
            />
          </div>
        </div>

        {/* Loupe (magnifier) overlay */}
        {props.loupeEnabled && props.loupePos && boxSize && (
          <div
            className="absolute z-40 rounded-full ring-2 ring-cyan-400/60 shadow-lg overflow-hidden pointer-events-none"
            style={{
              width: `${props.loupeSize ?? 160}px`,
              height: `${props.loupeSize ?? 160}px`,
              left: `${(props.loupePos.x - (props.loupeSize ?? 160) / 2) | 0}px`,
              top: `${(props.loupePos.y - (props.loupeSize ?? 160) / 2) | 0}px`,
            }}
            role="img"
            aria-label={compareStrings.loupeLabel ?? 'Loupe'}
          >
            <div
              className="absolute top-0 left-0"
              style={{
                width: `${boxSize.w}px`,
                height: `${boxSize.h}px`,
                transformOrigin: 'top left',
                transform: `translate(${-(props.loupePos.x - (props.loupeSize ?? 160) / 2)}px, ${-(props.loupePos.y - (props.loupeSize ?? 160) / 2)}px) translate(${props.panX ?? 0}px, ${props.panY ?? 0}px) scale(${props.zoom * (props.loupeFactor ?? 2)})`,
                willChange: 'transform',
              }}
            >
              {/* Reuse same composite rendering inside loupe */}
              <img
                src={resultUrl}
                alt=""
                className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  clipPath: `polygon(0 0, ${isHeld ? 100 : sliderPos}% 0, ${isHeld ? 100 : sliderPos}% 100%, 0 100%)`,
                }}
                aria-hidden
              >
                <img
                  src={previewUrl}
                  alt=""
                  className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Aligned overlay layer (divider/handle) that follows pan/zoom */}
        <div
          className="absolute inset-0 z-30"
          style={{
            transform: `translate(${props.panX ?? 0}px, ${props.panY ?? 0}px) scale(${props.zoom})`,
            transformOrigin: 'top left',
            willChange: 'transform',
          }}
        >
          {/* Edge gradient aligned with slider line */}
          <div
            className="absolute top-0 h-full w-6 pointer-events-none"
            style={{
              left: `calc(${sliderPos}% - 6px)`,
              background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 100%)',
            }}
          />

          {/* Vertical divider line */}
          <div
            className={`absolute top-0 bottom-0 w-[2px] bg-cyan-300/80 shadow-[0_0_14px_rgba(34,211,238,0.75)] ring-2 ring-cyan-200/30 ${isHeld ? 'opacity-0' : ''}`}
            style={{ left: `calc(${sliderPos}% - 0.5px)` }}
          />

          {/* Draggable handle (counter-scaled to keep visual size constant) */}
          <div
            role="slider"
            aria-label={compareStrings.handleAriaLabel}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sliderPos}
            aria-valuetext={`${sliderPos}%`}
            aria-describedby="compare-kbd-hint"
            tabIndex={0}
            onKeyDown={onHandleKeyDown}
            className="absolute top-1/2"
            style={{ left: `${sliderPos}%` }}
          >
            <div
              className={`slider-handle -translate-y-1/2 -translate-x-1/2 grid place-items-center h-11 w-11 md:h-8 md:w-8 rounded-full bg-white/70 dark:bg-slate-800/80 ring-2 ring-cyan-400/60 shadow-lg cursor-ew-resize ${isHeld ? 'opacity-0' : ''}`}
              style={{
                transform: `translate(-50%, -50%) scale(${1 / (props.zoom || 1)})`,
                transformOrigin: 'center center',
              }}
            >
              <span className="sr-only">{compareStrings.handleAriaLabel}</span>
              <div className="h-4 w-0.5 bg-cyan-400/80" />
            </div>
          </div>
        </div>

        {/* Corner labels */}
        <div
          className="pointer-events-none absolute left-2 top-2 text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-white/90 z-50"
          data-testid="compare-before-label"
        >
          {compareStrings.before}
        </div>
        <div
          className="pointer-events-none absolute right-2 top-2 text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-white/90 z-50"
          data-testid="compare-after-label"
        >
          {compareStrings.after}
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="opacity-80 md:hidden whitespace-normal break-words max-w-full flex-1 min-w-0">
          {compareStrings.touchHintShort ?? 'Pinch to zoom, drag to pan'}
        </span>
        <span
          className="opacity-80 hidden md:inline whitespace-normal break-words max-w-full flex-1 min-w-0"
          id="compare-kbd-hint"
        >
          {compareStrings.keyboardHint}
        </span>
        <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
          <button
            type="button"
            aria-label={compareStrings.zoomOutLabel ?? 'Zoom out'}
            title={compareStrings.zoomOutLabel ?? 'Zoom out'}
            className="px-3 py-2 min-w-[44px] min-h-[44px] rounded bg-white/40 dark:bg-slate-800/60 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            onClick={props.onZoomOut}
          >
            −
          </button>
          <span className="tabular-nums min-w-[3.5ch] text-center">
            {Math.round(props.zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label={compareStrings.zoomInLabel ?? 'Zoom in'}
            title={compareStrings.zoomInLabel ?? 'Zoom in'}
            className="px-3 py-2 min-w-[44px] min-h-[44px] rounded bg-white/40 dark:bg-slate-800/60 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            onClick={props.onZoomIn}
          >
            +
          </button>
          <button
            type="button"
            aria-label={compareStrings.zoomResetLabel ?? 'Reset zoom'}
            title={compareStrings.zoomResetLabel ?? compareStrings.reset}
            className="px-3 py-2 min-w-[44px] min-h-[44px] rounded bg-white/40 dark:bg-slate-800/60 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            onClick={props.onZoomReset}
          >
            1:1
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
