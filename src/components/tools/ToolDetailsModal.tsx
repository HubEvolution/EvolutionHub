import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ToolModalContent } from '@/lib/tools-data';

interface ToolDetailsModalProps {
  open: boolean;
  tool: {
    id: string;
    name: string;
    description: string;
    localizedUrl: string;
    modal?: ToolModalContent;
  } | null;
  labels: {
    close: string;
    featuresHeading: string;
    direct: string;
  };
  onClose: () => void;
}

export function ToolDetailsModal({ open, tool, labels, onClose }: ToolDetailsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !tool) return;
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
        return;
      }
      dialogRef.current?.focus();
    };

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', trapFocus, true);
    requestAnimationFrame(focusFirst);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', trapFocus, true);
      const fallback = previousFocusRef.current;
      if (fallback) {
        try {
          fallback.focus();
        } catch {
          /* noop */
        }
      }
    };
  }, [open, tool, onClose]);

  if (!open || !tool) return null;

  const modalContent = tool.modal;

  return createPortal(
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-[rgba(var(--surface-scrim,8,9,11),0.78)] px-4 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-details-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        id="tool-details-modal"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-neutral-950 text-neutral-100 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/5"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(var(--surface-panel,22,25,32),0.6)] text-neutral-400 transition hover:bg-[rgba(var(--surface-panel,22,25,32),0.85)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label={labels.close}
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="relative z-10 grid gap-6 p-6 sm:p-8 text-neutral-200">
          <header className="grid gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(var(--surface-panel,18,21,28),0.75)] ring-1 ring-white/10 shadow-[0_12px_30px_-18px_rgba(12,122,109,0.55)]">
                <img
                  src="/assets/svg/evolutionhub-mark.svg"
                  alt="Evolution Hub"
                  className="h-5 w-5"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400/80">
                {tool.name}
              </span>
            </div>
            <h2
              id="tool-details-modal-title"
              className="text-2xl font-semibold text-white sm:text-3xl"
            >
              {modalContent?.headline ?? tool.name}
            </h2>
            <p className="text-sm text-neutral-400">{modalContent?.summary ?? tool.description}</p>
          </header>

          {modalContent?.features?.length ? (
            <section className="rounded-xl border border-white/5 bg-[rgba(var(--surface-panel,20,23,30),0.55)] px-5 py-4">
              <h3 className="text-sm font-semibold text-white">{labels.featuresHeading}</h3>
              <ul className="mt-3 grid gap-2 text-sm text-neutral-300">
                {modalContent.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400"></span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="flex flex-wrap items-center gap-3">
            <a
              href={tool.localizedUrl}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(var(--surface-scrim,8,9,11),0.78)]"
            >
              {labels.direct}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(var(--surface-scrim,8,9,11),0.78)]"
            >
              {labels.close}
            </button>
          </footer>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ToolDetailsModal;
