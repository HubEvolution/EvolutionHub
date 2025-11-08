import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/lib/i18n';
import { getI18n, getI18nArray } from '@/utils/i18n';
import {
  PLAN_DETAIL_KEY_MAP,
  CREDIT_PACK_DETAIL_KEY_MAP,
  PRICING_DETAILS_COPY_KEYS,
  type PricingPlanId,
  type CreditPackId,
} from './details-config';

type DetailKind =
  | { kind: 'plan'; id: PricingPlanId }
  | { kind: 'credit'; id: CreditPackId };

interface DetailContent extends DetailKind {
  title: string;
  subtitle?: string;
  bullets: string[];
  footnote?: string;
  cta?: string;
  note?: string;
}

interface PricingDetailsContextValue {
  openPlan: (id: PricingPlanId) => void;
  openCredit: (id: CreditPackId) => void;
  close: () => void;
  activeDetail: DetailContent | null;
  labels: {
    planTrigger: string;
    creditTrigger: string;
    close: string;
  };
}

const PricingDetailsContext = createContext<PricingDetailsContextValue | null>(null);

interface PricingDetailsProviderProps extends PropsWithChildren {
  locale: Locale;
}

const FALLBACK_PLAN_LABELS: Record<PricingPlanId, { title: string; subtitle: string; bullets: string[] }> = {
  starter: {
    title: 'Starter',
    subtitle: 'Perfect to get started',
    bullets: [
      '30 credits/month (burst: 3/day)',
      'Included: Imag-Enhancer, Prompt Enhancer, Voice Transcriptor, Webscraper',
      'Commercial use: No',
    ],
  },
  pro: {
    title: 'Pro',
    subtitle: 'For creators and indie teams',
    bullets: [
      '300 credits/month (burst: 30/day)',
      'Included: all 4 tools',
      'Commercial use: Yes',
    ],
  },
  premium: {
    title: 'Business',
    subtitle: 'For power users',
    bullets: [
      '1,000 credits/month (burst: 100/day)',
      'Included: all 4 tools',
      'Commercial use: Yes',
    ],
  },
  enterprise: {
    title: 'Enterprise',
    subtitle: 'For organizations',
    bullets: [
      '4,000+ credits/month (burst: 400/day)',
      'Included: all 4 tools',
      'Custom limits & billing',
    ],
  },
};

const FALLBACK_CREDIT_LABELS: Record<CreditPackId, { title: string; subtitle: string; bullets: string[] }> = {
  100: {
    title: 'Starter pack',
    subtitle: 'Perfect when you just need a few more runs.',
    bullets: ['100 additional credits added instantly', 'Use across all tools without plan changes'],
  },
  500: {
    title: 'Creator pack',
    subtitle: 'Ideal for weekly projects and team workloads.',
    bullets: ['500 credits for fast-paced weeks', 'Mix and match across every tool'],
  },
  1500: {
    title: 'Pro pack',
    subtitle: 'Best value for agencies and production pipelines.',
    bullets: ['1,500 credits available immediately', 'Great for peak production cycles'],
  },
};

function sanitize(value: string | undefined | null, fallback?: string): string | undefined {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return fallback;
  if (/fallback_not_found/i.test(trimmed)) return fallback;
  return trimmed;
}

export function PricingDetailsProvider({ locale, children }: PricingDetailsProviderProps) {
  const t = useMemo(() => getI18n(locale), [locale]);
  const ta = useMemo(() => getI18nArray(locale), [locale]);

  const [activeDetail, setActiveDetail] = useState<DetailContent | null>(null);

  const getPlanContent = useCallback(
    (id: PricingPlanId): DetailContent => {
      const map = PLAN_DETAIL_KEY_MAP[id];
      const fallback = FALLBACK_PLAN_LABELS[id];
      const title = sanitize(t(map.title), fallback.title) ?? fallback.title;
      const subtitle = sanitize(t(map.subtitle), fallback.subtitle) ?? fallback.subtitle;
      const bulletsRaw = ta(map.bullets);
      const bullets =
        bulletsRaw
          .map((item) => sanitize(item))
          .filter((item): item is string => Boolean(item && item.trim())) ?? [];

      const contentBullets = bullets.length > 0 ? bullets : fallback.bullets;
      const footnote = map.footnote ? sanitize(t(map.footnote)) : undefined;
      const cta = map.cta ? sanitize(t(map.cta)) : undefined;

      return {
        kind: 'plan',
        id,
        title,
        subtitle,
        bullets: contentBullets,
        footnote,
        cta,
      };
    },
    [t, ta],
  );

  const getCreditContent = useCallback(
    (id: CreditPackId): DetailContent => {
      const map = CREDIT_PACK_DETAIL_KEY_MAP[id];
      const fallback = FALLBACK_CREDIT_LABELS[id];
      const title = sanitize(t(map.title), fallback.title) ?? fallback.title;
      const subtitle = sanitize(t(map.subtitle), fallback.subtitle) ?? fallback.subtitle;
      const bulletsRaw = ta(map.bullets);
      const bullets =
        bulletsRaw
          .map((item) => sanitize(item))
          .filter((item): item is string => Boolean(item && item.trim())) ?? [];
      const contentBullets = bullets.length > 0 ? bullets : fallback.bullets;
      const note = map.note ? sanitize(t(map.note)) : undefined;

      return {
        kind: 'credit',
        id,
        title,
        subtitle,
        bullets: contentBullets,
        note,
      };
    },
    [t, ta],
  );

  const openPlan = useCallback(
    (id: PricingPlanId) => {
      setActiveDetail(getPlanContent(id));
    },
    [getPlanContent],
  );

  const openCredit = useCallback(
    (id: CreditPackId) => {
      setActiveDetail(getCreditContent(id));
    },
    [getCreditContent],
  );

  const close = useCallback(() => {
    setActiveDetail(null);
  }, []);

  const labels = useMemo(
    () => ({
      planTrigger: sanitize(t(PRICING_DETAILS_COPY_KEYS.planTrigger), 'More details') ?? 'More details',
      creditTrigger:
        sanitize(t(PRICING_DETAILS_COPY_KEYS.creditTrigger), 'Details') ?? 'Details',
      close: sanitize(t(PRICING_DETAILS_COPY_KEYS.planClose), 'Close') ?? 'Close',
    }),
    [t],
  );

  const contextValue = useMemo<PricingDetailsContextValue>(
    () => ({ openPlan, openCredit, close, activeDetail, labels }),
    [openPlan, openCredit, close, activeDetail, labels],
  );

  return (
    <PricingDetailsContext.Provider value={contextValue}>
      {children}
      <PricingDetailsModal />
    </PricingDetailsContext.Provider>
  );
}

export function usePricingDetails() {
  const ctx = useContext(PricingDetailsContext);
  if (!ctx) {
    throw new Error('usePricingDetails must be used within a PricingDetailsProvider');
  }
  return ctx;
}

function PricingDetailsModal() {
  const { activeDetail, close, labels } = usePricingDetails();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!activeDetail) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeButton = closeButtonRef.current;
    closeButton?.focus({ preventScroll: true });
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!modalRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled'));

        if (focusable.length === 0) {
          event.preventDefault();
          closeButton?.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const target = event.target as HTMLElement | null;
        if (event.shiftKey) {
          if (target === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (target === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      body.style.overflow = previousOverflow;
      if (previousFocusRef.current) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
      previousFocusRef.current = null;
    };
  }, [activeDetail, close]);

  if (!activeDetail) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-detail-title"
        data-kind={activeDetail.kind}
        className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label={labels.close}
        >
          <span className="sr-only">{labels.close}</span>
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75 17.25 17.25M6.75 17.25 17.25 6.75" />
          </svg>
        </button>

        <div className="pr-8">
          <p className="text-xs uppercase tracking-wide text-primary-300/70">
            {activeDetail.kind === 'plan' ? 'Plan' : 'Credit pack'}
          </p>
          <h3 id="pricing-detail-title" className="mt-2 text-2xl font-semibold text-white">
            {activeDetail.title}
          </h3>
          {activeDetail.subtitle && (
            <p className="mt-2 text-sm text-slate-300">{activeDetail.subtitle}</p>
          )}

          <ul className="mt-5 space-y-3 text-sm text-slate-200">
            {activeDetail.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span
                  className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400"
                  aria-hidden="true"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {activeDetail.note && (
            <p className="mt-4 text-xs text-slate-400">{activeDetail.note}</p>
          )}
          {activeDetail.footnote && (
            <p className="mt-4 text-xs text-slate-400">{activeDetail.footnote}</p>
          )}
          {activeDetail.cta && (
            <p className="mt-5 text-sm font-medium text-primary-200">{activeDetail.cta}</p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

type PricingDetailsTriggerProps =
  | {
      kind: 'plan';
      id: PricingPlanId;
      label?: string;
      className?: string;
    }
  | {
      kind: 'credit';
      id: CreditPackId;
      label?: string;
      className?: string;
    };

export function PricingDetailsTrigger(props: PricingDetailsTriggerProps) {
  const { openPlan, openCredit, labels } = usePricingDetails();

  const handleClick = useCallback(() => {
    if (props.kind === 'plan') {
      openPlan(props.id);
    } else {
      openCredit(props.id);
    }
  }, [openPlan, openCredit, props]);

  const label = props.label ?? (props.kind === 'plan' ? labels.planTrigger : labels.creditTrigger);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 text-sm font-medium text-primary-200 transition hover:text-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
        props.className ?? ''
      }`.trim()}
    >
      <span>{label}</span>
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
      </svg>
    </button>
  );
}
