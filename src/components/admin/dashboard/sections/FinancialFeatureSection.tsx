import React from 'react';
import Card from '@/components/ui/Card';
import { useAdminStatus } from '@/components/admin/dashboard/hooks/useAdminStatus';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const FinancialFeatureSection: React.FC = () => {
  const { status, loading, error, reload } = useAdminStatus();
  const { sendEvent } = useAdminTelemetry('financial-feature');

  const handleReload = () => {
    reload();
    sendEvent('action_performed', { action: 'reload_financial_feature' });
  };

  const subscriptions = status?.subscriptions ?? [];

  return (
    <section aria-labelledby="admin-financial-feature" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="admin-financial-feature"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          Billing & Feature Usage
        </h2>
        <div className="flex items-center gap-3 text-sm">
          {loading && <span className="text-white/50">Lade Abonnements …</span>}
          {error && <span className="text-red-300">{error}</span>}
          <button
            type="button"
            onClick={handleReload}
            className="rounded-md border border-white/10 px-3 py-1 text-white/80 hover:bg-white/10"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4" variant="default">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Aktuelle Credits
          </h3>
          <p className="mt-3 text-sm text-white/70">
            Verfügbare Credits für den aktuellen Admin-Account.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-white/50">Plan</p>
              <p className="text-lg font-semibold text-white">{status?.plan ?? '—'}</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-white/50">Credits</p>
              <p className="text-lg font-semibold text-white">{status?.credits ?? '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" variant="default">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Letzte Subscriptions
          </h3>
          <p className="mt-3 text-sm text-white/70">
            Übersicht über die jüngsten Stripe-Subscription-Events für diesen Account.
          </p>
          <div className="mt-4 max-h-48 overflow-y-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-3 py-2 text-left">Plan</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Periode endet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-white/5">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-white/50" colSpan={3}>
                      Keine Subscription-Verläufe gefunden.
                    </td>
                  </tr>
                ) : (
                  subscriptions.slice(0, 5).map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="px-3 py-2 text-xs text-white/70">{subscription.plan}</td>
                      <td className="px-3 py-2 text-xs text-white/60">{subscription.status}</td>
                      <td className="px-3 py-2 text-xs text-white/60">
                        {subscription.current_period_end
                          ? dateFormatter.format(subscription.current_period_end * 1000)
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-4" variant="default">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Feature-Nutzung (Roadmap)
        </h3>
        <p className="mt-3 text-sm text-white/70">
          Aggregierte Nutzungsdaten für AI Image Enhancer, Voice Transcribe und Webscraper folgen in
          Phase 1. Telemetrie erfasst bereits Widget-Interaktionen.
        </p>
      </Card>
    </section>
  );
};

export default FinancialFeatureSection;
