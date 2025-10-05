import { fireEvent, render, screen, act, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeleteAccountSection from '@/components/account/DeleteAccountSection';

const baseStrings = {
  title: 'Danger zone',
  description: 'Deleting your account permanently removes your data.',
  button: 'Delete account',
  close: 'Close',
  confirm: {
    title: 'Delete account?',
    description: 'Are you sure?',
    confirmCta: 'Delete account',
    cancelCta: 'Cancel',
  },
  subscription: {
    title: 'Active subscription detected',
    description: 'We found active subscriptions.',
    periodEnd: 'Renews on {date}',
    indefinite: 'Renews automatically until cancelled',
    goToBilling: 'Cancel subscription first',
    deleteAnyway: 'Delete anyway',
    back: 'Back',
  },
  messages: {
    processing: 'Deleting account…',
    success: 'Account deleted',
    error: 'Unable to delete account',
  },
  redirectUrl: '/logout',
};

const planLabels = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

describe('DeleteAccountSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows subscription warning and retries with cancellation override', async () => {
    const firstResponse = {
      success: false,
      error: {
        type: 'subscription_active',
        message: 'Active subscription',
        details: {
          subscriptions: [
            {
              id: 'sub_1',
              plan: 'pro',
              status: 'active',
              currentPeriodEnd: null,
            },
          ],
        },
      },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(firstResponse), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    vi.stubGlobal('fetch', fetchMock);
    const originalLocation = window.location;
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignMock,
      },
    });

    render(
      <DeleteAccountSection
        strings={baseStrings}
        planLabels={planLabels}
        billingUrl="/dashboard#billing"
      />
    );

    fireEvent.click(screen.getByText('Delete account'));

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('Delete account?')).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Delete account' }));

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const subscriptionModal = await screen.findByRole('dialog');
    expect(within(subscriptionModal).getByText('Active subscription detected')).toBeInTheDocument();
    expect(within(subscriptionModal).getByText('Pro')).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(within(subscriptionModal).getByRole('button', { name: 'Delete anyway' }));

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(firstCallBody).toEqual({ confirm: true });

    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(secondCallBody).toEqual({ confirm: true, cancelSubscription: true });

    await act(async () => {
      vi.runAllTimers();
    });

    expect(assignMock).toHaveBeenCalledWith('/logout');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
