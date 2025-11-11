import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import { useAdminAuditLogs } from '@/components/admin/dashboard/hooks/useAdminAuditLogs';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';

const eventTypeLabels: Record<string, string> = {
  API_ACCESS: 'API Access',
  ADMIN_ACTION: 'Admin Action',
  SECURITY_EVENT: 'Security Event',
};

const AuditMonitoringSection: React.FC = () => {
  const [eventType, setEventType] = useState<string | undefined>(undefined);
  const { items, loading, error, reload } = useAdminAuditLogs({ eventType });
  const { sendEvent } = useAdminTelemetry('audit-monitoring');

  const handleReload = () => {
    reload({ eventType });
    sendEvent('action_performed', { action: 'reload_audit_logs', metadata: { eventType } });
  };

  return (
    <section aria-labelledby="admin-audit-monitoring" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="admin-audit-monitoring"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          Audit & Monitoring
        </h2>
        <div className="flex items-center gap-3 text-sm">
          {loading && <span className="text-white/50">Lade Audit-Logs …</span>}
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Audit-Logs
            </h3>
            <select
              value={eventType ?? ''}
              onChange={(event) => {
                const next = event.target.value || undefined;
                setEventType(next);
                reload({ eventType: next });
                sendEvent('widget_interaction', {
                  action: 'filter_audit_logs',
                  metadata: { eventType: next },
                });
              }}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Alle Events</option>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <div className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60">
                Keine Audit-Einträge vorhanden.
              </div>
            ) : (
              items.map((entry) => (
                <div key={entry.id} className="rounded border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between text-xs uppercase text-white/50">
                    <span>{eventTypeLabels[entry.eventType] ?? entry.eventType}</span>
                    <span>{new Date(entry.createdAt).toLocaleString('de-DE')}</span>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    {entry.resource ? `${entry.resource} • ` : ''}
                    {entry.action ?? '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4" variant="default">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Systemstatus & Telemetrie
          </h3>
          <p className="mt-3 text-sm text-white/70">
            Telemetrie-Events werden erfasst und können zur Analyse exportiert werden. Weitere
            Live-Checks (Worker Health, Rate Limits) folgen in Phase 1.
          </p>
          <div className="mt-4 text-sm text-white/60">
            <p>
              Letzte Aktion:{' '}
              <span className="text-white/80">
                {eventType ? (eventTypeLabels[eventType] ?? eventType) : 'Alle'}
              </span>
            </p>
            <p className="mt-2 text-xs text-white/40">
              Hinweis: Telemetrie-Events sind serverseitig abgesichert und erscheinen zusätzlich im
              Audit-Log unter
              <strong>dashboard • telemetry_event</strong>.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default AuditMonitoringSection;
