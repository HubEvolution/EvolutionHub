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

type PricingInterval = 'monthly' | 'annual';

type PlanDetailContent = {
  kind: 'plan';
  id: PricingPlanId;
  title: string;
  subtitle?: string;
  bullets: string[];
  price: string;
  pricePeriod?: string;
  priceQualifier?: string;
  billingInterval: PricingInterval;
  savingsHighlight?: string;
  footnote?: string;
  cta?: string;
};

type CreditDetailContent = {
  kind: 'credit';
  id: CreditPackId;
  title: string;
  subtitle?: string;
  bullets: string[];
  price: string;
  priceQualifier?: string;
  note?: string;
};

type DetailContent = PlanDetailContent | CreditDetailContent;

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

const TOOL_SUMMARY_BULLETS = [
  'Imag Enhancer – upscale and denoise photos with AI clarity',
  'Video Enhancer – sharpen clips and boost resolution up to 4K',
  'Prompt Enhancer – craft production-ready prompts in seconds',
  'Voice Visualizer – capture audio and get instant transcripts',
  'Webscraper – extract clean text with SSRF guardrails',
];

const FALLBACK_PLAN_LABELS: Record<
  PricingPlanId,
  {
    title: string;
    subtitle: string;
    bullets: string[];
    price: string;
    pricePeriod: string;
    monthlyBadge?: string;
    annualBadge?: string;
  }
> = {
  starter: {
    title: 'Starter',
    subtitle: 'Perfect to get started',
    bullets: [
      'Credits: 30/month (burst: 3/day)',
      ...TOOL_SUMMARY_BULLETS,
      'Commercial use: No',
    ],
    price: 'Free',
    pricePeriod: 'per month',
    monthlyBadge: 'Monthly billing',
    annualBadge: 'Annual billing: save 2 months',
  },
  pro: {
    title: 'Pro',
    subtitle: 'For creators and indie teams',
    bullets: [
      'Credits: 300/month (burst: 30/day)',
      ...TOOL_SUMMARY_BULLETS,
      'Commercial use: Yes',
    ],
    price: '€12.00',
    pricePeriod: 'per month',
    monthlyBadge: 'Monthly billing',
    annualBadge: 'Annual billing: save 2 months',
  },
  premium: {
    title: 'Business',
    subtitle: 'For power users',
    bullets: [
      'Credits: 1,000/month (burst: 100/day)',
      ...TOOL_SUMMARY_BULLETS,
      'Commercial use: Yes',
    ],
    price: '€28.00',
    pricePeriod: 'per month',
    monthlyBadge: 'Monthly billing',
    annualBadge: 'Annual billing: save 2 months',
  },
  enterprise: {
    title: 'Enterprise',
    subtitle: 'For organizations',
    bullets: [
      'Credits: 4,000+/month (burst: 400/day)',
      ...TOOL_SUMMARY_BULLETS,
      'Custom limits & billing',
      'Dedicated success contact',
    ],
    price: '€99.00',
    pricePeriod: 'per month',
    monthlyBadge: 'Monthly billing',
    annualBadge: 'Annual billing: save 2 months',
  },
};

const FALLBACK_CREDIT_LABELS: Record<
  CreditPackId,
  { title: string; subtitle: string; bullets: string[]; price: string; priceQualifier?: string }
> = {
  100: {
    title: 'Starter pack',
    subtitle: 'Perfect when you just need a few more runs.',
    bullets: ['100 additional credits added instantly', 'Use across all tools without plan changes'],
    price: '€6.00',
    priceQualifier: 'One-time purchase',
  },
  500: {
    title: 'Creator pack',
    subtitle: 'Ideal for weekly projects and team workloads.',
    bullets: ['500 credits for fast-paced weeks', 'Mix and match across every tool'],
    price: '€22.00',
    priceQualifier: 'One-time purchase',
  },
  1500: {
    title: 'Pro pack',
    subtitle: 'Best value for agencies and production pipelines.',
    bullets: ['1,500 credits available immediately', 'Great for peak production cycles'],
    price: '€55.00',
    priceQualifier: 'One-time purchase',
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

const PLAN_DATASET_MAP: Record<PricingPlanId, string | null> = {
  starter: null,
  pro: 'pro',
  premium: 'premium',
  enterprise: 'enterprise',
};

function readPlanSnapshot(id: PricingPlanId) {
  if (typeof document === 'undefined') return {};
  const datasetKey = PLAN_DATASET_MAP[id];
  if (!datasetKey) return {};

  const amountEl = document.querySelector<HTMLElement>(
    `span[data-plan="${datasetKey}"][data-role="amount"]`,
  );
  const periodEl = document.querySelector<HTMLElement>(
    `span[data-plan="${datasetKey}"][data-role="period"]`,
  );
  const badgeEl = document.querySelector<HTMLElement>(
    `span[data-plan="${datasetKey}"][data-role="badge"]`,
  );

  const getAttr = (el: HTMLElement | null, attr: string) =>
    el?.getAttribute(attr)?.trim() || undefined;

  return {
    monthlyAmount: getAttr(amountEl, 'data-monthly'),
    annualAmount: getAttr(amountEl, 'data-annual'),
    monthlyPeriod: getAttr(periodEl, 'data-monthly'),
    annualPeriod: getAttr(periodEl, 'data-annual'),
    annualBadge: badgeEl?.textContent?.trim(),
  };
}

export function PricingDetailsProvider({ locale, children }: PricingDetailsProviderProps) {
  const t = useMemo(() => getI18n(locale), [locale]);
  const ta = useMemo(() => getI18nArray(locale), [locale]);

  const [activeDetail, setActiveDetail] = useState<DetailContent | null>(null);
  const [pricingInterval, setPricingInterval] = useState<PricingInterval>(() => {
    if (typeof window === 'undefined') return 'monthly';
    try {
      return localStorage.getItem('pricing_interval') === 'annual' ? 'annual' : 'monthly';
    } catch {
      return 'monthly';
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ interval?: PricingInterval }>;
      const nextInterval = custom.detail?.interval === 'annual' ? 'annual' : 'monthly';
      setPricingInterval(nextInterval);
    };
    window.addEventListener('pricing:interval-change', handler as EventListener);
    return () => {
      window.removeEventListener('pricing:interval-change', handler as EventListener);
    };
  }, []);

  const getPlanContent = useCallback(
    (id: PricingPlanId, interval: PricingInterval): PlanDetailContent => {
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

      const domSnapshot = readPlanSnapshot(id);
      const priceMonthly = domSnapshot.monthlyAmount ?? sanitize(t(map.price), fallback.price) ?? fallback.price;
      const priceAnnual = domSnapshot.annualAmount ?? priceMonthly;
      const periodMonthly =
        domSnapshot.monthlyPeriod ?? sanitize(t('pages.pricing.table.per_month'), fallback.pricePeriod) ?? fallback.pricePeriod;
      const periodAnnual =
        domSnapshot.annualPeriod ?? sanitize(t('pages.pricing.table.per_year'), 'per year') ?? 'per year';
      const annualBadge = sanitize(
        t('pages.pricing.table.annual_savings'),
        domSnapshot.annualBadge ?? fallback.annualBadge,
      ) ?? fallback.annualBadge;
      const monthlyBadge = fallback.monthlyBadge;

      const footnote = map.footnote ? sanitize(t(map.footnote)) : undefined;
      const cta = map.cta ? sanitize(t(map.cta)) : undefined;

      return {
        kind: 'plan',
        id,
        title,
        subtitle,
        bullets: contentBullets,
        price: interval === 'annual' ? priceAnnual : priceMonthly,
        pricePeriod: interval === 'annual' ? periodAnnual : periodMonthly,
        priceQualifier: interval === 'annual' ? annualBadge : monthlyBadge,
        billingInterval: interval,
        savingsHighlight: interval === 'annual' ? annualBadge : undefined,
        footnote,
        cta,
      };
    },
    [t, ta],
  );

  const getCreditContent = useCallback(
    (id: CreditPackId): CreditDetailContent => {
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
      const priceBase = sanitize(t(map.price), fallback.price) ?? fallback.price;
      const priceQualifier =
        sanitize(t('pages.pricing.credits_packs.details.priceQualifier'), fallback.priceQualifier) ??
        fallback.priceQualifier;
      const note = map.note ? sanitize(t(map.note)) : undefined;

      return {
        kind: 'credit',
        id,
        title,
        subtitle,
        bullets: contentBullets,
        price: priceBase,
        priceQualifier,
        note,
      };
    },
    [t, ta],
  );

  const openPlan = useCallback(
    (id: PricingPlanId) => {
      setActiveDetail(getPlanContent(id, pricingInterval));
    },
    [getPlanContent, pricingInterval],
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

  useEffect(() => {
    setActiveDetail((current) => {
      if (!current || current.kind !== 'plan') return current;
      return getPlanContent(current.id, pricingInterval);
    });
  }, [pricingInterval, getPlanContent]);

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

  const chipEntries: string[] = useMemo(() => {
    if (!activeDetail) {
      return [];
    }
    const entries =
      activeDetail.kind === 'plan'
        ? [
            activeDetail.billingInterval === 'annual' ? 'Annual billing' : 'Monthly billing',
            activeDetail.savingsHighlight,
            activeDetail.priceQualifier,
          ]
        : [activeDetail.priceQualifier];

    return entries
      .filter((entry): entry is string => Boolean(entry && entry.trim()))
      .filter((entry, index, arr) => arr.indexOf(entry) === index);
  }, [activeDetail]);

  if (!activeDetail) {
    return null;
  }

  const priceCard = (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-7 text-slate-100 shadow-[0_32px_90px_-65px_rgba(16,185,129,0.6)]">
      <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary-100/80">
        {activeDetail.kind === 'plan' ? 'Plan pricing' : 'Credit pack pricing'}
      </div>
      <div className="mt-5 flex flex-wrap items-baseline gap-3 text-primary-50">
        <span className="text-[2.5rem] font-semibold text-white sm:text-[2.85rem]">
          {activeDetail.price}
        </span>
        {activeDetail.kind === 'plan' && activeDetail.pricePeriod && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary-200/70">
            {activeDetail.pricePeriod}
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {chipEntries.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary-200/80">
            {chipEntries.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] text-primary-100/90"
              >
                {chip}
              </li>
            ))}
          </ul>
        )}
        {activeDetail.kind === 'credit' && activeDetail.priceQualifier && (
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/90">
            {activeDetail.priceQualifier}
          </span>
        )}
      </div>
      {activeDetail.kind === 'credit' && activeDetail.note && (
        <p className="mt-4 text-[0.95rem] text-slate-200/85">{activeDetail.note}</p>
      )}
    </div>
  );

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-md"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-detail-title"
        data-kind={activeDetail.kind}
        className="relative w-full max-w-[44rem] overflow-hidden rounded-[2rem] border border-white/8 bg-[#06080d]/92 text-left shadow-[0_36px_120px_-70px_rgba(16,185,129,0.55)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(13,20,32,0.9),transparent_65%),radial-gradient(circle_at_bottom,rgba(7,16,26,0.85),transparent_72%)]"
        />
        <div className="relative z-10 flex flex-col gap-8 p-6 pt-10 sm:p-9 sm:pt-[3rem]">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#08090b]/75 text-slate-200 ring-1 ring-white/10 transition duration-200 hover:bg-[#07080c]/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/70"
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

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 text-slate-200/90">
              <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#08090b]/80 ring-1 ring-white/12 shadow-[0_0_0_1px_rgba(148,163,184,0.05),0_18px_45px_-36px_rgba(16,185,129,0.55)]">
                <img
                  src="/assets/svg/evolutionhub-mark.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary-200/80">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary-300 via-secondary-300 to-primary-500 shadow-[0_0_12px_rgba(20,184,166,0.55)]"
                    aria-hidden="true"
                  />
                  {activeDetail.kind === 'plan' ? 'Plan' : 'Credit pack'}
                </p>
                <h3
                  id="pricing-detail-title"
                  className="text-[1.95rem] font-semibold leading-snug text-white sm:text-[2.1rem]"
                >
                  {activeDetail.title}
                </h3>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary-200/70">
                  Evolution Hub
                </p>
                {activeDetail.subtitle && (
                  <p className="max-w-xl text-[0.95rem] text-slate-300/90 sm:text-base">
                    {activeDetail.subtitle}
                  </p>
                )}
            </div>

            <div className="flex flex-col gap-4 sm:max-w-[18rem] sm:flex-shrink-0">
              {priceCard}
              {activeDetail.kind === 'plan' && activeDetail.cta && (
                <p className="text-sm font-semibold text-primary-100/90">{activeDetail.cta}</p>
              )}
              {activeDetail.kind === 'plan' && activeDetail.footnote && (
                <p className="text-xs text-slate-400/75">{activeDetail.footnote}</p>
              )}
              {activeDetail.kind === 'credit' && activeDetail.note && (
                <p className="text-xs text-slate-400/75">{activeDetail.note}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-7 sm:gap-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary-200 via-secondary-200 to-primary-500" />
            Key highlights
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {activeDetail.bullets.map((bullet, index) => (
              <div
                key={`${bullet}-${index}`}
                className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-slate-100"
              >
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-200 via-secondary-200 to-primary-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
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
