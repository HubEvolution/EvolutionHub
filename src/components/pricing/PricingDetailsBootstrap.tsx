import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';
import type { CreditPackId, PricingPlanId } from './details-config';
import { PricingDetailsProvider, usePricingDetails } from './PricingDetailsProvider';

interface BootstrapProps {
  locale: Locale;
}

const PLAN_IDS = new Set<PricingPlanId>(['starter', 'pro', 'premium', 'enterprise']);
const CREDIT_IDS = new Set<CreditPackId>(['100', '500', '1500']);

function PricingDetailsEventBridge() {
  const { openPlan, openCredit } = usePricingDetails();

  useEffect(() => {
    const handleClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>('[data-pricing-detail-trigger]');
      if (!trigger) return;

      const kind = trigger.getAttribute('data-pricing-detail-kind');
      const id = trigger.getAttribute('data-pricing-detail-id');
      if (!kind || !id) return;

      if (kind === 'plan') {
        if (!PLAN_IDS.has(id as PricingPlanId)) return;
        event.preventDefault();
        openPlan(id as PricingPlanId);
        return;
      }

      if (kind === 'credit') {
        if (!CREDIT_IDS.has(id as CreditPackId)) return;
        event.preventDefault();
        openCredit(id as CreditPackId);
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [openPlan, openCredit]);

  return null;
}

export default function PricingDetailsBootstrap({ locale }: BootstrapProps) {
  return (
    <PricingDetailsProvider locale={locale}>
      <PricingDetailsEventBridge />
    </PricingDetailsProvider>
  );
}
