export type PricingPlanId = 'starter' | 'pro' | 'premium' | 'enterprise';

export type CreditPackId = '100' | '500' | '1500';

export interface PricingPlanDetailKeyGroup {
  title: string;
  subtitle: string;
  bullets: string;
  price: string;
  footnote?: string;
  cta?: string;
}

export interface CreditPackDetailKeyGroup {
  title: string;
  subtitle: string;
  bullets: string;
  price: string;
  note?: string;
}

export const PLAN_DETAIL_KEY_MAP: Record<PricingPlanId, PricingPlanDetailKeyGroup> = {
  starter: {
    title: 'pages.pricing.table.details.plans.starter.title',
    subtitle: 'pages.pricing.table.details.plans.starter.subtitle',
    bullets: 'pages.pricing.table.details.plans.starter.bullets',
    price: 'pages.pricing.table.details.plans.starter.price',
    footnote: 'pages.pricing.table.details.plans.starter.footnote',
  },
  pro: {
    title: 'pages.pricing.table.details.plans.pro.title',
    subtitle: 'pages.pricing.table.details.plans.pro.subtitle',
    bullets: 'pages.pricing.table.details.plans.pro.bullets',
    price: 'pages.pricing.table.details.plans.pro.price',
    footnote: 'pages.pricing.table.details.plans.pro.footnote',
  },
  premium: {
    title: 'pages.pricing.table.details.plans.premium.title',
    subtitle: 'pages.pricing.table.details.plans.premium.subtitle',
    bullets: 'pages.pricing.table.details.plans.premium.bullets',
    price: 'pages.pricing.table.details.plans.premium.price',
    footnote: 'pages.pricing.table.details.plans.premium.footnote',
  },
  enterprise: {
    title: 'pages.pricing.table.details.plans.enterprise.title',
    subtitle: 'pages.pricing.table.details.plans.enterprise.subtitle',
    bullets: 'pages.pricing.table.details.plans.enterprise.bullets',
    price: 'pages.pricing.table.details.plans.enterprise.price',
    footnote: 'pages.pricing.table.details.plans.enterprise.footnote',
    cta: 'pages.pricing.table.details.plans.enterprise.cta',
  },
};

export const CREDIT_PACK_DETAIL_KEY_MAP: Record<CreditPackId, CreditPackDetailKeyGroup> = {
  100: {
    title: 'pages.pricing.credits_packs.details.packs.100.title',
    subtitle: 'pages.pricing.credits_packs.details.packs.100.subtitle',
    bullets: 'pages.pricing.credits_packs.details.packs.100.bullets',
    price: 'pages.pricing.credits_packs.details.packs.100.price',
    note: 'pages.pricing.credits_packs.details.packs.100.note',
  },
  500: {
    title: 'pages.pricing.credits_packs.details.packs.500.title',
    subtitle: 'pages.pricing.credits_packs.details.packs.500.subtitle',
    bullets: 'pages.pricing.credits_packs.details.packs.500.bullets',
    price: 'pages.pricing.credits_packs.details.packs.500.price',
    note: 'pages.pricing.credits_packs.details.packs.500.note',
  },
  1500: {
    title: 'pages.pricing.credits_packs.details.packs.1500.title',
    subtitle: 'pages.pricing.credits_packs.details.packs.1500.subtitle',
    bullets: 'pages.pricing.credits_packs.details.packs.1500.bullets',
    price: 'pages.pricing.credits_packs.details.packs.1500.price',
    note: 'pages.pricing.credits_packs.details.packs.1500.note',
  },
};

export const PRICING_DETAILS_COPY_KEYS = {
  planTrigger: 'pages.pricing.table.details.trigger',
  planClose: 'pages.pricing.table.details.close',
  creditTrigger: 'pages.pricing.credits_packs.details.trigger',
  creditClose: 'pages.pricing.credits_packs.details.close',
} as const;
