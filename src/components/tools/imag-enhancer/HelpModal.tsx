import { useEffect, useRef } from 'react';
import type React from 'react';

export interface HelpModalLabels {
  title: string;
  close: string;
  sections: {
    upload: string;
    models: string;
    compare: string;
    quota: string;
  };
}

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  labels: HelpModalLabels;
  allowedTypesText: string;
  maxMb: number;
  modelLabels: string[];
  keyboardHint: string;
  usage?: { used: number; limit: number } | null;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function HelpModal(props: HelpModalProps) {
  const { open, onClose, labels, allowedTypesText, maxMb, modelLabels, keyboardHint, usage, returnFocusRef } = props;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember previously focused element
    prevFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the close button for accessibility
    closeBtnRef.current?.focus();
    // Focus trap within the dialog
    const getFocusable = () => {
      const root = dialogRef.current;
      if (!root) return [] as HTMLElement[];
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      return nodes.filter((el) => el.offsetParent !== null || el === document.activeElement);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!active || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onKey);
      // Restore focus to opener if available, else to previously focused element
      const target = returnFocusRef?.current ?? prevFocusedRef.current;
      try { target?.focus(); } catch {}
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        className="absolute inset-x-4 sm:inset-x-auto sm:right-6 top-10 sm:top-16 max-w-lg mx-auto rounded-lg bg-white dark:bg-slate-900 ring-1 ring-black/10 dark:ring-white/10 shadow-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <h2 id="help-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
            {labels.title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-xs rounded-md bg-white/60 dark:bg-slate-800/70 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            aria-label={labels.close}
          >
            {labels.close}
          </button>
        </div>
        <div className="p-4 space-y-4 text-sm text-gray-700 dark:text-gray-200">
          <section>
            <h3 className="text-sm font-semibold mb-1">{labels.sections.upload}</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                {allowedTypesText}
              </li>
              <li>
                Max. {maxMb} MB
              </li>
              <li>
                Drag & drop, click, or paste (Cmd/Ctrl+V) an image.
              </li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-1">{labels.sections.models}</h3>
            <ul className="list-disc ml-5 space-y-1">
              {modelLabels.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-1">{labels.sections.compare}</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>{keyboardHint}</li>
              <li>Use + / − to zoom, 1 to reset zoom, 0 to center the slider.</li>
              <li>Press L to toggle the loupe; hold Space to show 100% “Before”.</li>
              <li>Pinch to zoom and drag to pan on touch devices.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-1">{labels.sections.quota}</h3>
            <ul className="list-disc ml-5 space-y-1">
              {usage ? (
                <li>
                  {usage.used} / {usage.limit} uses in the current window.
                </li>
              ) : (
                <li>Limits apply per user or guest session.</li>
              )}
              <li>Upgrading increases your quota.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
