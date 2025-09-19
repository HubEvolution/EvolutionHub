import type { MouseEvent } from 'react';

/**
 * Props für die ActionsGroup-Komponente im Image Enhancer Tool.
 * 
 * Diese Komponente rendert Aktions-Buttons für das Erhöhen, Zurücksetzen und Herunterladen
 * von Bildern. Sie unterstützt Ladezustände, Quota-Überprüfungen und optionale Start-Over-Funktion.
 * 
 * @interface ActionsGroupProps
 * @property {string} enhanceLabel - Label für den Enhance-Button (z.B. "Enhance").
 * @property {string} processingLabel - Label während des Ladevorgangs (z.B. "Processing...").
 * @property {string} resetLabel - Label für den Reset-Button (z.B. "Reset").
 * @property {string} downloadLabel - Label für den Download-Link (z.B. "Download").
 * @property {boolean} canSubmit - Gibt an, ob der Submit möglich ist (z.B. gültige Eingabe).
 * @property {boolean} quotaExceeded - True, wenn das Quota überschritten ist (deaktiviert Buttons).
 * @property {boolean} loading - True während des Verarbeitungsvorgangs.
 * @property {boolean} hasResult - True, wenn ein Ergebnis vorhanden ist (zeigt Reset/Download).
 * @property {string | null} resultUrl - URL des Ergebnisbilds für Download (optional).
 * @property {() => void} onEnhance - Callback für Enhance-Action.
 * @property {() => void} onReset - Callback für Reset-Action.
 * @property {(e: MouseEvent<HTMLAnchorElement>) => void} onDownload - Callback für Download-Click.
 * @property {string} [startOverLabel] - Optionaler Label für Start-Over-Button.
 * @property {() => void} [onStartOver] - Optionaler Callback für Start-Over.
 * @property {boolean} [showEnhance=true] - Steuert Sichtbarkeit des Enhance-Buttons.
 */
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
  // Optional: control whether Reset is enabled (e.g., when slider already centered)
  canReset?: boolean;
}

/**
 * ActionsGroup-Komponente für das Image Enhancer Tool.
 * 
 * Rendert eine Gruppe von Aktions-Buttons basierend auf dem aktuellen Zustand (Laden, Ergebnis vorhanden).
 * Unterstützt bedingte Deaktivierung durch Quota oder ungültige Eingabe.
 * 
 * @param props Die Props für die Komponente.
 * @returns Die gerenderte Komponente.
 */
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
  canReset = true,
}: ActionsGroupProps) {
  return (
    <>
      {showEnhance && (
        <button
          type="button"
          onClick={onEnhance}
          disabled={!canSubmit || quotaExceeded}
          className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-sm font-medium text-white transition-colors ${
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
            disabled={!canReset}
            className={`text-xs px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 sm:min-h-0 rounded-md ring-1 transition-colors ${
              canReset
                ? 'bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'
                : 'bg-gray-400/30 dark:bg-gray-700/40 ring-gray-400/20 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {resetLabel}
          </button>
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              className="text-xs px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 sm:min-h-0 rounded-md bg-white/10 dark:bg-slate-900/40 ring-1 ring-rose-400/20 text-rose-700 dark:text-rose-200 hover:ring-rose-400/40"
            >
              {startOverLabel || 'Start over'}
            </button>
          )}
          <a
            href={resultUrl || undefined}
            download
            onClick={onDownload}
            className="text-xs px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 sm:min-h-0 inline-flex items-center rounded-md bg-white/10 dark:bg-slate-900/40 ring-1 ring-cyan-400/10 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/30"
          >
            {downloadLabel}
          </a>
        </>
      )}
    </>
  );
}
