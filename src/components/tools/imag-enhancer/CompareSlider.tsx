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
  onWheelZoom?: (e: React.WheelEvent<HTMLDivElement>) => void;
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

  return (
    <figure className="rounded-md border border-white/10 dark:border-white/10 p-2 bg-white/5 dark:bg-slate-900/30 backdrop-blur">
      <div
        ref={containerRef}
        className="relative w-full max-w-full overflow-hidden rounded-sm bg-black/40 h-64 sm:h-72 md:h-80"
        style={boxSize ? { width: `${boxSize.w}px`, height: `${boxSize.h}px` } : undefined}
        onMouseDown={onMouseDown}
        onWheel={props.onWheelZoom}
        onTouchStart={onTouchStart}
        onMouseMove={props.onMouseMove}
        onMouseLeave={props.onMouseLeave}
        aria-label={compareStrings.sliderLabel}
      >
        {/* Scaled image layer (result + before overlay) */}
        <div
          className="absolute inset-0 z-0"
          style={{ transform: `translate(${props.panX ?? 0}px, ${props.panY ?? 0}px) scale(${props.zoom})`, transformOrigin: 'center center' }}
        >
          {/* After image (result) as base layer */}
          <img
            src={resultUrl}
            alt={compareStrings.after}
            className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain"
            onLoad={onResultImageLoad}
            onError={onResultError}
            style={isDemoResult ? { filter: 'contrast(1.2) saturate(1.15) brightness(1.05)' } : undefined}
          />

          {/* Before image (original) overlay clipped to slider position (no resize) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ clipPath: `polygon(0 0, ${isHeld ? 100 : sliderPos}% 0, ${isHeld ? 100 : sliderPos}% 100%, 0 100%)` }}
            aria-hidden
          >
            <img
              src={previewUrl}
              alt={compareStrings.before}
              className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain"
              onLoad={onPreviewImageLoad}
              onError={onPreviewError}
            />
          </div>
        </div>

        {/* Loupe (magnifier) overlay */}
        {props.loupeEnabled && props.loupePos && (
          <div
            className="absolute z-40 rounded-full ring-2 ring-cyan-400/60 shadow-lg overflow-hidden pointer-events-none"
            style={{
              width: `${props.loupeSize ?? 160}px`,
              height: `${props.loupeSize ?? 160}px`,
              left: `${(props.loupePos.x - (props.loupeSize ?? 160) / 2) | 0}px`,
              top: `${(props.loupePos.y - (props.loupeSize ?? 160) / 2) | 0}px`,
            }}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                transformOrigin: 'top left',
                transform: `translate(${-(props.loupePos.x - (props.loupeSize ?? 160) / 2)}px, ${-(props.loupePos.y - (props.loupeSize ?? 160) / 2)}px) translate(${props.panX ?? 0}px, ${props.panY ?? 0}px) scale(${props.zoom * (props.loupeFactor ?? 2)})`,
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
                style={{ clipPath: `polygon(0 0, ${isHeld ? 100 : sliderPos}% 0, ${isHeld ? 100 : sliderPos}% 100%, 0 100%)` }}
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

        {/* Edge gradient aligned with slider line */}
        <div
          className="absolute top-0 h-full w-6 pointer-events-none z-20"
          style={{
            left: `calc(${sliderPos}% - 6px)`,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 100%)'
          }}
          aria-hidden
        />

        {/* Vertical divider line */}
        <div
          className={`absolute top-0 bottom-0 w-[2px] bg-cyan-300/80 shadow-[0_0_14px_rgba(34,211,238,0.75)] ring-2 ring-cyan-200/30 z-30 ${isHeld ? 'opacity-0' : ''}`}
          style={{ left: `calc(${sliderPos}% - 0.5px)` }}
          aria-hidden
        />

        {/* Draggable handle */}
        <div
          role="slider"
          aria-label={compareStrings.handleAriaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sliderPos}
          tabIndex={0}
          onKeyDown={onHandleKeyDown}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/80 ring-2 ring-cyan-400/60 shadow-lg cursor-ew-resize z-40 ${isHeld ? 'opacity-0' : ''}`}
          style={{ left: `${sliderPos}%` }}
        >
          <span className="sr-only">{compareStrings.handleAriaLabel}</span>
          <div className="h-4 w-0.5 bg-cyan-400/80" />
        </div>

        {/* Corner labels */}
        <div className="pointer-events-none absolute left-2 top-2 text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-white/90 z-50">
          {compareStrings.before}
        </div>
        <div className="pointer-events-none absolute right-2 top-2 text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-white/90 z-50">
          {compareStrings.after}
        </div>
      </div>
      <figcaption className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="opacity-80">{compareStrings.keyboardHint}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            className="px-2 py-0.5 rounded bg-white/40 dark:bg-slate-800/60 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
            onClick={props.onZoomOut}
          >
            −
          </button>
          <span className="tabular-nums min-w-[3.5ch] text-center">{Math.round(props.zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            className="px-2 py-0.5 rounded bg-white/40 dark:bg-slate-800/60 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
            onClick={props.onZoomIn}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            className="px-2 py-0.5 rounded bg-white/40 dark:bg-slate-800/60 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
            onClick={props.onZoomReset}
          >
            Reset
          </button>
          <button
            type="button"
            aria-label="Toggle loupe"
            className={`px-2 py-0.5 rounded ring-1 ${props.loupeEnabled ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200' : 'bg-white/40 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'}`}
            onClick={props.onToggleLoupe}
          >
            Loupe
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
