import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { useAdminUserInsights } from '@/components/admin/dashboard/hooks/useAdminUserInsights';
import { useAdminCredits } from '@/components/admin/dashboard/hooks/useAdminCredits';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';
import {
  useAdminUserList,
  type AdminUserListFilters,
} from '@/components/admin/dashboard/hooks/useAdminUserList';

const numberFormatter = new Intl.NumberFormat('de-DE');

const UserInsightsSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'banned' | 'deleted'>('');
  const [planFilter, setPlanFilter] = useState<'' | 'free' | 'pro' | 'premium' | 'enterprise'>('');
  const { sendEvent } = useAdminTelemetry('user-insights');
  const {
    summary,
    sessions,
    loading,
    sessionsLoading,
    actionLoading,
    error,
    sessionsError,
    search,
    loadSessions,
    revokeSessions,
  } = useAdminUserInsights();
  const {
    usage,
    history,
    loading: creditsLoading,
    historyLoading,
    error: creditsError,
    historyError,
    loadUsage,
    loadHistory,
  } = useAdminCredits();

  const userId = summary?.user.id;
  const {
    items: userList,
    loading: listLoading,
    loadingMore: listLoadingMore,
    error: listError,
    actionError: listActionError,
    actionStates,
    hasMore,
    refresh: refreshUserList,
    loadMore,
    banUser,
    unbanUser,
    deleteUser,
  } = useAdminUserList();

  const appliedFilters = useMemo<AdminUserListFilters>(() => {
    return {
      search: query.trim() || undefined,
      status: statusFilter || undefined,
      plan: planFilter || undefined,
    };
  }, [planFilter, query, statusFilter]);

  useEffect(() => {
    if (userId) {
      loadSessions(userId);
      loadUsage(userId);
      loadHistory(userId);
    }
  }, [userId, loadSessions, loadUsage, loadHistory]);

  useEffect(() => {
    refreshUserList(appliedFilters).catch(() => {
      /* handled via state */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await refreshUserList(appliedFilters);
      sendEvent('action_performed', {
        action: 'user_list_filter',
        metadata: appliedFilters,
      });
      if (appliedFilters.search) {
        const result = await search(appliedFilters.search);
        if (result?.user.id) {
          loadSessions(result.user.id);
          loadUsage(result.user.id);
          loadHistory(result.user.id);
          sendEvent('action_performed', {
            action: 'user_lookup',
            metadata: { userId: result.user.id, email: result.user.email },
          });
        }
      }
    } catch (err) {
      sendEvent('api_error', {
        severity: 'warning',
        action: 'user_lookup_failed',
        metadata: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  };

  return (
    <section aria-labelledby="admin-user-insights" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="admin-user-insights"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          User Insights
        </h2>
        {loading && <span className="text-sm text-white/60">Lade …</span>}
      </div>

      <Card className="p-4" variant="default">
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleSearch}>
          <label className="flex-1 min-w-[200px] text-sm text-white/70">
            Suche (E-Mail, Name oder ID)
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="user@example.com oder user_id"
            />
          </label>
          <label className="min-w-[140px] text-sm text-white/70">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Alle</option>
              <option value="active">Aktiv</option>
              <option value="banned">Gesperrt</option>
              <option value="deleted">Gelöscht</option>
            </select>
          </label>
          <label className="min-w-[140px] text-sm text-white/70">
            Plan
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value as typeof planFilter)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Alle</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            disabled={listLoading}
          >
            Suchen
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatusFilter('');
              setPlanFilter('');
              refreshUserList({}).catch(() => undefined);
            }}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Zurücksetzen
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {listError && <p className="mt-3 text-sm text-red-300">{listError}</p>}
        {listActionError && <p className="mt-3 text-sm text-red-300">{listActionError}</p>}
      </Card>

      <Card className="p-4" variant="default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Benutzerliste
          </h3>
          <div className="flex items-center gap-2">
            {(listLoading || listLoadingMore) && (
              <span className="text-xs text-white/50">Lade …</span>
            )}
            <button
              type="button"
              onClick={() => refreshUserList(appliedFilters).catch(() => undefined)}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              disabled={listLoading}
            >
              Liste aktualisieren
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto max-h-[480px] overflow-y-auto rounded-md border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Credits</th>
                <th className="px-3 py-2 text-left">Sessions</th>
                <th className="px-3 py-2 text-left">Letzte Aktivität</th>
                <th className="px-3 py-2 text-left">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-white/5">
              {userList.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-white/50" colSpan={7}>
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              ) : (
                userList.map((item) => {
                  const rowUserId = item.user.id;
                  const busy = Boolean(actionStates[rowUserId]);
                  return (
                    <tr key={rowUserId}>
                      <td className="px-3 py-2 text-xs">
                        <div className="font-semibold text-white/80">{item.user.name || '—'}</div>
                        <div className="text-white/50">{item.user.email}</div>
                        <button
                          type="button"
                          className="mt-1 text-xs text-emerald-400 hover:text-emerald-300"
                          onClick={() => {
                            setQuery(item.user.email ?? rowUserId);
                            search(item.user.email ?? rowUserId)
                              .then((result) => {
                                if (result?.user.id) {
                                  loadSessions(result.user.id);
                                  loadUsage(result.user.id);
                                  loadHistory(result.user.id);
                                }
                              })
                              .catch(() => undefined);
                          }}
                        >
                          Details anzeigen
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs text-white/60">{item.user.plan}</td>
                      <td className="px-3 py-2 text-xs capitalize text-white/60">
                        {item.user.status}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/60">{item.stats.credits}</td>
                      <td className="px-3 py-2 text-xs text-white/60">
                        {item.stats.activeSessions}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/60">
                        {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString('de-DE') : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/70">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                            disabled={busy || item.user.status === 'banned'}
                            onClick={() =>
                              banUser(rowUserId)
                                .then((result) =>
                                  sendEvent('action_performed', {
                                    action: 'ban_user',
                                    metadata: { userId: rowUserId, status: result.status },
                                  })
                                )
                                .catch((err) =>
                                  sendEvent('api_error', {
                                    severity: 'warning',
                                    action: 'ban_user_failed',
                                    metadata: {
                                      userId: rowUserId,
                                      message: err instanceof Error ? err.message : String(err),
                                    },
                                  })
                                )
                            }
                          >
                            Sperren
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                            disabled={busy || item.user.status !== 'banned'}
                            onClick={() =>
                              unbanUser(rowUserId)
                                .then((result) =>
                                  sendEvent('action_performed', {
                                    action: 'unban_user',
                                    metadata: { userId: rowUserId, status: result.status },
                                  })
                                )
                                .catch((err) =>
                                  sendEvent('api_error', {
                                    severity: 'warning',
                                    action: 'unban_user_failed',
                                    metadata: {
                                      userId: rowUserId,
                                      message: err instanceof Error ? err.message : String(err),
                                    },
                                  })
                                )
                            }
                          >
                            Entsperren
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                            disabled={busy || item.user.status === 'deleted'}
                            onClick={() =>
                              deleteUser(rowUserId)
                                .then((result) =>
                                  sendEvent('action_performed', {
                                    action: 'delete_user',
                                    metadata: { userId: rowUserId, status: result.status },
                                  })
                                )
                                .catch((err) =>
                                  sendEvent('api_error', {
                                    severity: 'warning',
                                    action: 'delete_user_failed',
                                    metadata: {
                                      userId: rowUserId,
                                      message: err instanceof Error ? err.message : String(err),
                                    },
                                  })
                                )
                            }
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => loadMore().catch(() => undefined)}
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              disabled={listLoadingMore}
            >
              Weitere laden
            </button>
          </div>
        )}
      </Card>

      {summary && (
        <Card className="p-4" variant="default">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-white/50">Benutzer</p>
              <p className="text-sm text-white/80">{summary.user.name || '—'}</p>
              <p className="text-sm text-white/40">{summary.user.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Plan</p>
              <p className="text-sm font-semibold text-white">{summary.user.plan}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Credits</p>
              <p className="text-sm font-semibold text-white">
                {numberFormatter.format(summary.credits)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Subscription</p>
              <p className="text-sm text-white/80">
                {summary.subscription
                  ? `${summary.subscription.status} (Ende: ${summary.subscription.currentPeriodEnd ? new Date(summary.subscription.currentPeriodEnd * 1000).toLocaleString('de-DE') : '—'})`
                  : 'Keine aktive Subscription'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Letzte Aktivität</p>
              <p className="text-sm text-white/80">
                {summary.lastSeenAt ? new Date(summary.lastSeenAt).toLocaleString('de-DE') : '—'}
              </p>
              <p className="text-xs text-white/50">IP: {summary.lastIp || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4" variant="default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Sitzungen</h3>
          <div className="flex items-center gap-2">
            {sessionsLoading && <span className="text-xs text-white/50">Aktualisiere …</span>}
            <button
              type="button"
              onClick={() => userId && loadSessions(userId)}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              disabled={!userId || sessionsLoading}
            >
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={() => {
                if (!userId) return;
                revokeSessions(userId);
                sendEvent('action_performed', {
                  action: 'revoke_sessions',
                  metadata: { userId },
                });
              }}
              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
              disabled={!userId || actionLoading}
            >
              Alle Sitzungen widerrufen
            </button>
          </div>
        </div>
        {sessionsError && <p className="mt-2 text-sm text-red-300">{sessionsError}</p>}
        <div className="mt-3 overflow-hidden rounded-md border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Session ID</th>
                <th className="px-3 py-2 text-left">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-white/5">
              {sessions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-white/50" colSpan={2}>
                    Keine aktiven Sitzungen vorhanden.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-3 py-2 font-mono text-xs text-white/70">{session.id}</td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {session.expiresAt
                        ? new Date(session.expiresAt).toLocaleString('de-DE')
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4" variant="default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Credits</h3>
          <div className="flex gap-2">
            {(creditsLoading || historyLoading) && (
              <span className="text-xs text-white/50">Aktualisiere …</span>
            )}
            <button
              type="button"
              onClick={() => userId && loadUsage(userId)}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              disabled={!userId || creditsLoading}
            >
              Balance aktualisieren
            </button>
            <button
              type="button"
              onClick={() => userId && loadHistory(userId)}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              disabled={!userId || historyLoading}
            >
              Historie aktualisieren
            </button>
          </div>
        </div>
        {creditsError && <p className="mt-2 text-sm text-red-300">{creditsError}</p>}
        {usage && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-white/50">Credits</p>
              <p className="text-lg font-semibold text-white">
                {numberFormatter.format(usage.credits)}
              </p>
              <p className="text-xs text-white/50">
                (Tenths: {numberFormatter.format(usage.tenths)})
              </p>
            </div>
          </div>
        )}
        {historyError && <p className="mt-2 text-sm text-red-300">{historyError}</p>}
        <div className="mt-3 max-h-52 overflow-y-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Pack</th>
                <th className="px-3 py-2 text-left">Units (tenths)</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-white/5">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm text-white/50">
                    Keine Credit-Historie vorhanden.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-xs text-white/60">{item.id}</td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {numberFormatter.format(item.unitsTenths)}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('de-DE') : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {item.expiresAt ? new Date(item.expiresAt).toLocaleString('de-DE') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};

export default UserInsightsSection;
