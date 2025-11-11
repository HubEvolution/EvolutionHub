import React, { useMemo } from 'react';
import Card from '@/components/ui/Card';
import { useAdminMetrics } from '@/components/admin/dashboard/hooks/useAdminMetrics';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';

const numberFormatter = new Intl.NumberFormat('de-DE');
const percentFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function Sparkline({ values }: { values: number[] }) {
  if (!values.length || typeof window === 'undefined') {
    return <div className="h-10 rounded bg-white/5" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - ((value - min) / span) * 100;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-16 w-full text-emerald-400/90"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(' ')}
      />
    </svg>
  );
}

function TrendBadge({ value }: { value: number | null | undefined }) {
  if (typeof value !== 'number') {
    return <span className="text-xs text-white/50">n/a</span>;
  }

  const clamped = Math.max(Math.min(value, 10), -10);
  const formatted = percentFormatter.format(clamped);
  const isPositive = clamped >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
      }`}
    >
      <span aria-hidden="true">{isPositive ? '▲' : '▼'}</span>
      {formatted}
    </span>
  );
}

function AlertBadge({
  severity,
  message,
}: {
  severity: 'info' | 'warning' | 'critical';
  message: string;
}) {
  const styles = {
    info: 'bg-sky-500/10 text-sky-200 border-sky-500/30',
    warning: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
    critical: 'bg-rose-500/10 text-rose-200 border-rose-500/30',
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${styles[severity]}`}
    >
      {message}
    </span>
  );
}

const KpiOverviewSection: React.FC = () => {
  const { metrics, loading, error, reload } = useAdminMetrics();
  const { sendEvent } = useAdminTelemetry('kpi-overview');

  const trafficSeries = useMemo(() => {
    if (!metrics?.traffic) return [] as number[];
    return metrics.traffic
      .map((point) => point.requests ?? point.visits ?? 0)
      .filter((value) => Number.isFinite(value));
  }, [metrics]);

  const kpiCards = useMemo(
    () => [
      {
        label: 'Aktive Sessions',
        value: metrics?.activeSessions,
        hint: 'Sessions mit gültigem Token',
      },
      {
        label: 'Aktive Nutzer',
        value: metrics?.activeUsers,
        hint: 'Eindeutige Nutzer mit aktiver Session',
        trend: null,
      },
      {
        label: 'Neu (7 Tage)',
        value: metrics?.usersNew7d,
        hint: 'Registrierungen letzte 7 Tage',
        trend: metrics?.growthRate7d,
      },
      {
        label: 'Neu (30 Tage)',
        value: metrics?.usersNew30d,
        hint: 'Registrierungen letzte 30 Tage',
        trend: metrics?.growthRate30d,
      },
    ],
    [metrics]
  );

  const handleReload = () => {
    reload();
    sendEvent('action_performed', {
      action: 'reload_kpis',
      metadata: { reason: 'manual' },
    });
  };

  return (
    <section aria-labelledby="admin-kpi-overview">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="admin-kpi-overview"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Kennzahlen & Alerts
          </h2>
          <div className="flex items-center gap-3 text-sm">
            {loading && <span className="text-white/50">Lade Kennzahlen …</span>}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map(({ label, value, hint, trend }) => (
            <Card key={label} className="flex flex-col justify-between p-4" variant="default">
              <div>
                <p className="text-sm text-white/60">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {Number.isFinite(value) ? numberFormatter.format(Number(value)) : '–'}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                <span>{hint}</span>
                {typeof trend !== 'undefined' && <TrendBadge value={trend ?? null} />}
              </div>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4" variant="default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Traffic (30 Tage)</p>
                <p className="text-xs text-white/40">Requests gesamt</p>
              </div>
              <span className="text-sm text-white/70">
                {trafficSeries.length > 0
                  ? numberFormatter.format(
                      trafficSeries.reduce((acc, curr) => acc + Number(curr || 0), 0)
                    )
                  : '–'}
              </span>
            </div>
            <div className="mt-3">
              <Sparkline values={trafficSeries} />
            </div>
          </Card>
          <Card className="flex flex-col gap-3 p-4" variant="default">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Stripe Volumen (30 Tage)</p>
              <span className="text-xs text-white/40">Balance Report</span>
            </div>
            <p className="text-2xl font-semibold text-white">
              {Number.isFinite(metrics?.stripe?.total_volume)
                ? currencyFormatter.format(Number(metrics?.stripe?.total_volume))
                : '–'}
            </p>
            <div className="mt-auto text-xs text-white/40">
              {metrics?.cacheHit
                ? `Cache-Treffer (noch ${(metrics.cacheTtlMs ?? 0) / 1000}s gültig)`
                : 'Live-Daten aktualisiert'}
            </div>
          </Card>
        </div>
        {metrics?.alerts && metrics.alerts.length > 0 && (
          <Card className="space-y-2 p-4" variant="default">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Alerts</p>
              <span className="text-xs text-white/50">{metrics.alerts.length} aktiv</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.alerts.map((alert) => (
                <AlertBadge
                  key={`${alert.type}-${alert.sinceTs ?? 0}`}
                  severity={alert.severity}
                  message={alert.message}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};

export default KpiOverviewSection;
