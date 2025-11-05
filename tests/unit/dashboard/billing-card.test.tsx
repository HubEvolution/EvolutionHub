import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillingCard, { type BillingSummary } from '@/components/dashboard/BillingCard';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseSummary: BillingSummary = {
  plan: 'pro',
  status: 'active',
  subscriptionId: 'sub_123',
  currentPeriodEnd: Math.floor(Date.now() / 1000) + 86400,
  cancelAtPeriodEnd: false,
  lastSyncedAt: new Date().toISOString(),
  creditsRemaining: 120,
};

const strings = {
  title: 'Billing & plan',
  currentPlan: 'Current plan',
  statusLabel: 'Status',
  noSubscription: 'No active subscription',
  renewal: 'Renews on',
  credits: 'AI credits remaining',
  actions: {
    manage: 'Manage billing',
    cancel: 'Cancel subscription',
    cancelled: 'Cancellation scheduled',
  },
  statusMap: {
    active: 'Active',
    unknown: 'Unknown',
  },
  planLabels: {
    free: 'Starter',
    pro: 'Pro',
    premium: 'Premium',
    enterprise: 'Enterprise',
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BillingCard', () => {
  it('renders plan and status information', () => {
    render(<BillingCard summary={baseSummary} strings={strings} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(strings.actions.cancel)).toBeInTheDocument();
  });

  it('schedules cancellation via API and updates UI', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.endsWith('/api/dashboard/billing-summary')) {
          return new Response(JSON.stringify({ success: true, data: baseSummary }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }) as any;
        }
        if (url.endsWith('/api/billing/cancel')) {
          return new Response(JSON.stringify({ success: true, data: { message: 'ok' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }) as any;
        }
        return new Response(JSON.stringify({ success: false }), { status: 404 }) as any;
      });

    render(<BillingCard summary={baseSummary} strings={strings} />);

    await user.click(screen.getByRole('button', { name: strings.actions.cancel }));

    expect(await screen.findByText(strings.actions.cancelled)).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/billing/cancel',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
