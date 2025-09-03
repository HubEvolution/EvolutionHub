import type { MouseEvent } from 'react';

interface ActionsGroupProps {
  enhanceLabel: string;
  processingLabel: string;
  resetLabel: string;
  downloadLabel: string;

  canSubmit: boolean;
  quotaExceeded: boolean;
  loading: boolean;

  hasResult: boolean;
  resultUrl?: string | null;

  onEnhance: () => void;
  onReset: () => void;
  onDownload: (e: MouseEvent<HTMLAnchorElement>) => void;
  // Optional: show a Start Over action in compare phase
  startOverLabel?: string;
  onStartOver?: () => void;
  // Optional: control visibility of Enhance button (e.g., only show when settings changed)
  showEnhance?: boolean;
}

export function ActionsGroup({
  enhanceLabel,
  processingLabel,
  resetLabel,
  downloadLabel,
  canSubmit,
  quotaExceeded,
  loading,
  hasResult,
  resultUrl,
  onEnhance,
  onReset,
  onDownload,
  startOverLabel,
  onStartOver,
  showEnhance = true,
}: ActionsGroupProps) {
  return (
    <>
      {showEnhance && (
        <button
          type="button"
          onClick={onEnhance}
          disabled={!canSubmit || quotaExceeded}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
            !quotaExceeded && canSubmit
              ? 'bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500'
              : 'bg-gray-400 cursor-not-allowed opacity-60'
          }`}
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-white/90"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          )}
          <span>{loading ? processingLabel : enhanceLabel}</span>
        </button>
      )}

      {hasResult && (
        <>
          <button
            type="button"
            onClick={onReset}
            className="text-xs px-2 py-1 rounded-md bg-white/10 dark:bg-slate-900/40 ring-1 ring-cyan-400/10 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/30"
          >
            {resetLabel}
          </button>
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              className="text-xs px-2 py-1 rounded-md bg-white/10 dark:bg-slate-900/40 ring-1 ring-rose-400/20 text-rose-700 dark:text-rose-200 hover:ring-rose-400/40"
            >
              {startOverLabel || 'Start over'}
            </button>
          )}
          <a
            href={resultUrl || undefined}
            download
            onClick={onDownload}
            className="text-xs px-2 py-1 rounded-md bg-white/10 dark:bg-slate-900/40 ring-1 ring-cyan-400/10 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/30"
          >
            {downloadLabel}
          </a>
        </>
      )}
    </>
  );
}
