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
    const listeners: Array<{ element: HTMLElement; handler: (event: Event) => void }> = [];

    const wireElement = (element: HTMLElement) => {
      const kind = element.getAttribute('data-pricing-detail-kind');
      const id = element.getAttribute('data-pricing-detail-id');
      if (!kind || !id) return;

      if (kind === 'plan' && !PLAN_IDS.has(id as PricingPlanId)) return;
      if (kind === 'credit' && !CREDIT_IDS.has(id as CreditPackId)) return;

      const handler = (event: Event) => {
        event.preventDefault();
        if (kind === 'plan') {
          openPlan(id as PricingPlanId);
        } else if (kind === 'credit') {
          openCredit(id as CreditPackId);
        }
      };

      element.addEventListener('click', handler);
      listeners.push({ element, handler });
    };

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-pricing-detail-trigger]'),
    );
    elements.forEach(wireElement);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches('[data-pricing-detail-trigger]')) {
            wireElement(node);
          }
          node
            .querySelectorAll?.('[data-pricing-detail-trigger]')
            .forEach((child) => wireElement(child as HTMLElement));
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      listeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
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
