import type React from 'react';
import { CompareSlider } from './CompareSlider';

interface Props {
  // Refs and sizing
  topReserveRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  boxSize: { w: number; h: number } | null;

  // Labels and strings
  settingsSummary: string;
  compareStrings: {
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

  // Layout helpers
  isMobile: boolean;
  actionsHeight: number;
  safeAreaBottom: number;

  // Compare state
  sliderPos: number;
  isHeld: boolean;
  previewUrl: string;
  resultUrl: string;
  isDemoResult: boolean;

  // Loupe and interactions
  loupeUiHint: string | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onHandleKeyDown: (e: React.KeyboardEvent) => void;
  onResultImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onPreviewImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onResultError: () => void;
  onPreviewError: () => void;

  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  panX: number;
  panY: number;
  loupeEnabled: boolean;
  loupeSize: number;
  loupeFactor: number;
  loupePos: { x: number; y: number } | null;
  onToggleLoupe: () => void;
  onMouseMoveLoupe: (e: React.MouseEvent) => void;
  onMouseLeaveLoupe: () => void;

  // Loaders
  loading: boolean;
  isResultLoading: boolean;
  stringsProcessing: string;
  retryActive: boolean;
  retryRemainingSec: number;
}

export function CompareView(props: Props) {
  return (
    <>
      <div
        ref={(el) => {
          (props.topReserveRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="mb-1 text-[11px] text-gray-600 dark:text-gray-300 text-center"
      >
        {props.settingsSummary}
      </div>
      <div
        className="relative"
        style={{
          paddingBottom: props.isMobile
            ? Math.max(0, props.actionsHeight + props.safeAreaBottom)
            : 0,
        }}
      >
        <CompareSlider
          containerRef={props.containerRef}
          boxSize={props.boxSize}
          sliderPos={props.sliderPos}
          isHeld={props.isHeld}
          previewUrl={props.previewUrl}
          resultUrl={props.resultUrl}
          compareStrings={props.compareStrings}
          isDemoResult={props.isDemoResult}
          onMouseDown={props.onMouseDown}
          onTouchStart={props.onTouchStart}
          onHandleKeyDown={props.onHandleKeyDown}
          onResultImageLoad={props.onResultImageLoad}
          onPreviewImageLoad={props.onPreviewImageLoad}
          onResultError={props.onResultError}
          onPreviewError={props.onPreviewError}
          zoom={props.zoom}
          onZoomIn={props.onZoomIn}
          onZoomOut={props.onZoomOut}
          onZoomReset={props.onZoomReset}
          panX={props.panX}
          panY={props.panY}
          loupeEnabled={props.loupeEnabled}
          loupeSize={props.loupeSize}
          loupeFactor={props.loupeFactor}
          loupePos={props.loupePos}
          onToggleLoupe={props.onToggleLoupe}
          onMouseMove={props.onMouseMoveLoupe}
          onMouseLeave={props.onMouseLeaveLoupe}
        />
        {props.loupeUiHint && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-50 text-[11px] px-2 py-1 rounded bg-black/40 text-white/90">
            {props.loupeUiHint}
          </div>
        )}
        {(props.loading || props.isResultLoading) && (
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
              <span>{props.stringsProcessing}</span>
            </div>
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {props.loading
            ? 'Processing image…'
            : props.retryActive
              ? `Please wait ${props.retryRemainingSec} seconds before retrying.`
              : ''}
        </div>
      </div>
    </>
  );
}
