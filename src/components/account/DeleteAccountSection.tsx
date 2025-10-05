import { useCallback, useMemo, useState } from 'react';
import notify from '@/lib/notify';

type PlanId = 'free' | 'pro' | 'premium' | 'enterprise';

type SubscriptionDetail = {
  id: string;
  plan: PlanId;
  status?: string;
  currentPeriodEnd?: number | null;
};

interface ConfirmStrings {
  title: string;
  description: string;
  confirmCta: string;
  cancelCta: string;
}

interface SubscriptionStrings {
  title: string;
  description: string;
  periodEnd: string;
  indefinite: string;
  goToBilling: string;
  deleteAnyway: string;
  back: string;
}

interface ToastStrings {
  processing: string;
  success: string;
  error: string;
}

interface DeleteAccountStrings {
  title: string;
  description: string;
  button: string;
  close: string;
  confirm: ConfirmStrings;
  subscription: SubscriptionStrings;
  messages: ToastStrings;
  redirectUrl?: string;
}

interface Props {
  strings: DeleteAccountStrings;
  planLabels: Record<PlanId, string>;
  billingUrl: string;
  redirectUrl?: string;
  className?: string;
}

type ModalStep = 'confirm' | 'subscription';

function formatPeriodLabel(template: string, timestamp: number | null | undefined) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const formatted = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
  return template.replace('{date}', formatted);
}

const DeleteAccountSection = ({
  strings,
  planLabels,
  billingUrl,
  redirectUrl,
  className,
}: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('confirm');
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDetail[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exitTarget = useMemo(() => redirectUrl ?? strings.redirectUrl ?? '/logout', [redirectUrl, strings.redirectUrl]);

  const resetState = useCallback(() => {
    setModalStep('confirm');
    setSubscriptions([]);
    setErrorMessage(null);
  }, []);

  const openModal = useCallback(() => {
    resetState();
    setIsModalOpen(true);
  }, [resetState]);

  const closeModal = useCallback(() => {
    if (isProcessing) {
      return;
    }
    setIsModalOpen(false);
    resetState();
  }, [isProcessing, resetState]);

  const handleSuccess = useCallback(() => {
    notify.success(strings.messages.success);
    setIsModalOpen(false);
    resetState();
    window.setTimeout(() => {
      window.location.assign(exitTarget);
    }, 300);
  }, [exitTarget, resetState, strings.messages.success]);

  const handleError = useCallback(
    (message?: string) => {
      const fallback = strings.messages.error;
      const resolved = message || fallback;
      setErrorMessage(resolved);
      notify.error(resolved);
    },
    [strings.messages.error]
  );

  const requestDeletion = useCallback(
    async (opts?: { cancelSubscription?: boolean }) => {
      setIsProcessing(true);
      setErrorMessage(null);
      try {
        const response = await fetch('/api/user/account', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirm: true, ...(opts?.cancelSubscription ? { cancelSubscription: true } : {}) }),
        });

        if (response.status === 204) {
          handleSuccess();
          return;
        }

        let payload: any = null;
        try {
          payload = await response.json();
        } catch (error) {
          payload = null;
        }

        if (payload?.error?.type === 'subscription_active') {
          const details = Array.isArray(payload.error?.details?.subscriptions)
            ? (payload.error.details.subscriptions as SubscriptionDetail[])
            : [];
          setSubscriptions(details);
          setModalStep('subscription');
          return;
        }

        handleError(payload?.error?.message);
      } catch (error) {
        handleError(error instanceof Error ? error.message : undefined);
      } finally {
        setIsProcessing(false);
      }
    },
    [handleError, handleSuccess]
  );

  const onPrimaryConfirm = useCallback(() => {
    requestDeletion();
  }, [requestDeletion]);

  const onDeleteAnyway = useCallback(() => {
    requestDeletion({ cancelSubscription: true });
  }, [requestDeletion]);

  const onGoToBilling = useCallback(() => {
    window.location.assign(billingUrl);
  }, [billingUrl]);

  const hasSubscriptions = subscriptions.length > 0;

  return (
    <div
      id="danger-zone"
      className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-pink-950/30 p-5 shadow-xl backdrop-blur-sm transition-all hover:border-red-400/40 hover:shadow-red-500/20 ${className ?? ''}`.trim()}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-red-500/10 to-pink-500/10 opacity-60"></div>
      <div>
        <h3 className="text-base font-bold text-red-300">{strings.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-red-200/90">{strings.description}</p>
      </div>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center justify-center rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 backdrop-blur-sm transition hover:border-red-300/50 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/60"
      >
        {isProcessing ? strings.messages.processing : strings.button}
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div>
                <h4 id="delete-account-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                  {modalStep === 'confirm' ? strings.confirm.title : strings.subscription.title}
                </h4>
              </div>
              <button
                type="button"
                className="ml-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                onClick={closeModal}
                aria-label={strings.close}
              >
                X
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                  {errorMessage}
                </div>
              )}

              {modalStep === 'confirm' ? (
                <p>{strings.confirm.description}</p>
              ) : (
                <div className="space-y-3">
                  <p>{strings.subscription.description}</p>
                  {hasSubscriptions && (
                    <ul className="space-y-2">
                      {subscriptions.map((subscription) => {
                        const label = planLabels[subscription.plan] ?? subscription.plan;
                        const periodLabel = subscription.currentPeriodEnd
                          ? formatPeriodLabel(strings.subscription.periodEnd, subscription.currentPeriodEnd)
                          : strings.subscription.indefinite;
                        return (
                          <li
                            key={subscription.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3"
                          >
                            <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                            {subscription.status && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{subscription.status}</p>
                            )}
                            {periodLabel && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{periodLabel}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 px-6 py-4 sm:flex-row sm:justify-end">
              {modalStep === 'confirm' ? (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={closeModal}
                    disabled={isProcessing}
                  >
                    {strings.confirm.cancelCta}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-4 py-2 text-sm font-semibold text-white"
                    onClick={onPrimaryConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? strings.messages.processing : strings.confirm.confirmCta}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => {
                      setModalStep('confirm');
                      setSubscriptions([]);
                    }}
                    disabled={isProcessing}
                  >
                    {strings.subscription.back}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={onGoToBilling}
                    disabled={isProcessing}
                  >
                    {strings.subscription.goToBilling}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-4 py-2 text-sm font-semibold text-white"
                    onClick={onDeleteAnyway}
                    disabled={isProcessing}
                  >
                    {isProcessing ? strings.messages.processing : strings.subscription.deleteAnyway}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountSection;
