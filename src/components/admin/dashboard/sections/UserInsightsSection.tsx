import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { useAdminUserInsights } from '@/components/admin/dashboard/hooks/useAdminUserInsights';
import { useAdminCredits } from '@/components/admin/dashboard/hooks/useAdminCredits';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';
import {
  useAdminUserList,
  type AdminUserListFilters,
} from '@/components/admin/dashboard/hooks/useAdminUserList';
import { useAdminStrings } from '@/lib/i18n-admin';
import { AdminApiError, adminSetUserPlan } from '@/lib/admin/api-client';

function makeNumberFormatter(locale: string) {
  return new Intl.NumberFormat(locale);
}

const UserInsightsSection: React.FC = () => {
  const strings = useAdminStrings();
  const localeTag =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en-US' : 'de-DE';
  const numberFormatter = useMemo(() => makeNumberFormatter(localeTag), [localeTag]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'banned' | 'deleted'>('');
  const [planFilter, setPlanFilter] = useState<'' | 'free' | 'pro' | 'premium' | 'enterprise'>('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [planValue, setPlanValue] = useState<'free' | 'pro' | 'premium' | 'enterprise'>('free');
  const [planInterval, setPlanInterval] = useState<'monthly' | 'annual'>('monthly');
  const [prorationBehavior, setProrationBehavior] = useState<'create_prorations' | 'none'>(
    'create_prorations'
  );
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [planActionLoading, setPlanActionLoading] = useState(false);
  const [planActionError, setPlanActionError] = useState<string | undefined>();
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
    actionLoading: creditsActionLoading,
    actionError: creditsActionError,
    grantCredits,
    deductCredits,
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
    if (summary?.user.plan) {
      setPlanValue(summary.user.plan);
      setPlanInterval('monthly');
      setProrationBehavior('create_prorations');
      setCancelImmediately(false);
      setPlanActionError(undefined);
    }
  }, [summary?.user.plan]);

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

  const handleCreditsAction = async (
    mode: 'grant' | 'deduct',
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (!summary?.user.email) {
      return;
    }

    const email = summary.user.email;
    const amount = creditsAmount.trim().length > 0 ? creditsAmount : undefined;

    try {
      if (mode === 'grant') {
        await grantCredits(email, amount);
        sendEvent('action_performed', {
          action: 'grant_credits',
          metadata: { email, amount: amount ?? 'default' },
        });
      } else {
        await deductCredits(email, amount);
        sendEvent('action_performed', {
          action: 'deduct_credits',
          metadata: { email, amount: amount ?? 'default' },
        });
      }

      if (summary.user.id) {
        loadUsage(summary.user.id);
        loadHistory(summary.user.id);
      }
    } catch {
      // Fehler werden bereits im Hook behandelt und über creditsActionError angezeigt
    }
  };

  const handleSetPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!summary?.user.id) return;

    const userId = summary.user.id;
    const email = summary.user.email;

    setPlanActionLoading(true);
    setPlanActionError(undefined);
    try {
      await adminSetUserPlan({
        userId,
        plan: planValue,
        interval: planInterval,
        prorationBehavior,
        cancelImmediately,
      });

      sendEvent('action_performed', {
        action: 'set_plan',
        metadata: {
          userId,
          email,
          plan: planValue,
          interval: planInterval,
          prorationBehavior,
          cancelImmediately,
        },
      });

      const identifier = email || userId;
      if (identifier) {
        search(identifier).catch(() => undefined);
      }
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 429) {
        const sec = error.retryAfterSec;
        if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
          const minutes = Math.max(1, Math.ceil(sec / 60));
          setPlanActionError(
            strings.errors.rateLimitWithRetryAfter.replace('{minutes}', String(minutes))
          );
        } else {
          setPlanActionError(strings.errors.rateLimit);
        }
      } else {
        const message = error instanceof Error ? error.message : strings.errors.setPlan;
        setPlanActionError(message);
      }
    } finally {
      setPlanActionLoading(false);
    }
  };

  return (
    <section aria-labelledby="admin-user-insights" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="admin-user-insights"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          {strings.insights.heading}
        </h2>
        {loading && <span className="text-sm text-white/60">{strings.common.loading}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-4" variant="default">
            <form className="flex flex-wrap items-end gap-3" onSubmit={handleSearch}>
              <label className="flex-1 min-w-[200px] text-sm text-white/70">
                {strings.insights.searchLabel}
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={strings.insights.searchPlaceholder}
                />
              </label>
              <label className="min-w-[140px] text-sm text-white/70">
                {strings.insights.status}
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{strings.common.all}</option>
                  <option value="active">{strings.insights.statusOptions.active}</option>
                  <option value="banned">{strings.insights.statusOptions.banned}</option>
                  <option value="deleted">{strings.insights.statusOptions.deleted}</option>
                </select>
              </label>
              <label className="min-w-[140px] text-sm text-white/70">
                {strings.insights.plan}
                <select
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value as typeof planFilter)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{strings.common.all}</option>
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
                {strings.common.search}
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
                {strings.common.reset}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            {listError && <p className="mt-3 text-sm text-red-300">{listError}</p>}
            {listActionError && <p className="mt-3 text-sm text-red-300">{listActionError}</p>}
          </Card>

          <Card className="p-4" variant="default">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                {strings.insights.listHeading}
              </h3>
              <div className="flex items-center gap-2">
                {(listLoading || listLoadingMore) && (
                  <span className="text-xs text-white/50">{strings.common.loading}</span>
                )}
                <button
                  type="button"
                  onClick={() => refreshUserList(appliedFilters).catch(() => undefined)}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                  disabled={listLoading}
                >
                  {strings.insights.listReload}
                </button>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto max-h-[360px] overflow-y-auto rounded-md border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">{strings.insights.table.user}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.table.plan}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.table.status}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.table.credits}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.table.sessions}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.table.lastActivity}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.table.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-white/5">
                  {userList.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-white/50" colSpan={7}>
                        {strings.insights.list.none}
                      </td>
                    </tr>
                  ) : (
                    userList.map((item) => {
                      const rowUserId = item.user.id;
                      const busy = Boolean(actionStates[rowUserId]);
                      return (
                        <tr key={rowUserId}>
                          <td className="px-3 py-2 text-xs">
                            <div className="font-semibold text-white/80">
                              {item.user.name || '—'}
                            </div>
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
                              {strings.insights.details}
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
                            {item.lastSeenAt
                              ? new Date(item.lastSeenAt).toLocaleString(localeTag)
                              : '—'}
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
                                {strings.insights.actions.ban}
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
                                {strings.insights.actions.unban}
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
                                {strings.insights.actions.delete}
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
                  {strings.common.loadMore}
                </button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {summary && (
            <Card className="p-4" variant="default">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-white/50">{strings.insights.summary.user}</p>
                  <p className="text-sm text-white/80">{summary.user.name || '—'}</p>
                  <p className="text-sm text-white/40">{summary.user.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/50">{strings.insights.plan}</p>
                  <p className="text-sm font-semibold text-white">{summary.user.plan}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/50">
                    {strings.insights.table.credits}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {numberFormatter.format(summary.credits)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/50">
                    {strings.insights.summary.subscription}
                  </p>
                  <p className="text-sm text-white/80">
                    {summary.subscription
                      ? `${summary.subscription.status} (${strings.insights.summary.subscriptionEnd}: ${summary.subscription.currentPeriodEnd ? new Date(summary.subscription.currentPeriodEnd * 1000).toLocaleString(localeTag) : '—'})`
                      : strings.insights.summary.subscriptionNone}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/50">
                    {strings.insights.summary.lastActivity}
                  </p>
                  <p className="text-sm text-white/80">
                    {summary.lastSeenAt
                      ? new Date(summary.lastSeenAt).toLocaleString(localeTag)
                      : '—'}
                  </p>
                  <p className="text-xs text-white/50">
                    {strings.insights.summary.ip}: {summary.lastIp || '—'}
                  </p>
                </div>
              </div>
              <form
                className="mt-4 grid gap-3 border-t border-white/10 pt-3 text-xs text-white/80 md:grid-cols-4"
                onSubmit={handleSetPlan}
              >
                <label className="flex flex-col gap-1">
                  <span className="text-white/60">{strings.insights.planForm.planLabel}</span>
                  <select
                    value={planValue}
                    onChange={(event) =>
                      setPlanValue(event.target.value as 'free' | 'pro' | 'premium' | 'enterprise')
                    }
                    className="rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-white/60">{strings.insights.planForm.intervalLabel}</span>
                  <select
                    value={planInterval}
                    onChange={(event) =>
                      setPlanInterval(event.target.value as 'monthly' | 'annual')
                    }
                    className="rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-white/60">{strings.insights.planForm.prorationLabel}</span>
                  <select
                    value={prorationBehavior}
                    onChange={(event) =>
                      setProrationBehavior(event.target.value as 'create_prorations' | 'none')
                    }
                    className="rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="create_prorations">create_prorations</option>
                    <option value="none">none</option>
                  </select>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-white/70">
                    <input
                      type="checkbox"
                      checked={cancelImmediately}
                      onChange={(event) => setCancelImmediately(event.target.checked)}
                      className="h-3 w-3 rounded border-white/20 bg-white/5 text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span>{strings.insights.planForm.cancelImmediatelyLabel}</span>
                  </label>
                  <button
                    type="submit"
                    className="mt-1 inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={planActionLoading}
                  >
                    {strings.insights.planForm.submitLabel}
                  </button>
                  {planActionError && <p className="text-xs text-red-300">{planActionError}</p>}
                </div>
              </form>
              {userId && (
                <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/80">
                  <p className="text-xs uppercase text-white/50">
                    {strings.insights.comments.heading}
                  </p>
                  <a
                    href={`/admin/comments?status=pending&authorId=${encodeURIComponent(userId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-white/5 hover:text-white"
                    onClick={() =>
                      sendEvent('action_performed', {
                        action: 'open_comments_for_user',
                        metadata: { userId },
                      })
                    }
                  >
                    {strings.insights.comments.viewForUser}
                  </a>
                </div>
              )}
            </Card>
          )}

          <Card className="p-4" variant="default">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                {strings.insights.sessions.heading}
              </h3>
              <div className="flex items-center gap-2">
                {sessionsLoading && (
                  <span className="text-xs text-white/50">{strings.common.updating}</span>
                )}
                <button
                  type="button"
                  onClick={() => userId && loadSessions(userId)}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                  disabled={!userId || sessionsLoading}
                >
                  {strings.common.refresh}
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
                  {strings.insights.sessions.revokeAll}
                </button>
              </div>
            </div>
            {sessionsError && <p className="mt-2 text-sm text-red-300">{sessionsError}</p>}
            <div className="mt-3 overflow-hidden rounded-md border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">{strings.insights.sessions.table.id}</th>
                    <th className="px-3 py-2 text-left">
                      {strings.insights.sessions.table.expires}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-white/5">
                  {sessions.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-white/50" colSpan={2}>
                        {strings.insights.sessions.none}
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-3 py-2 font-mono text-xs text-white/70">{session.id}</td>
                        <td className="px-3 py-2 text-xs text-white/60">
                          {session.expiresAt
                            ? new Date(session.expiresAt).toLocaleString(localeTag)
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                {strings.insights.credits.heading}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {(creditsLoading || historyLoading) && (
                  <span className="text-xs text-white/50">{strings.common.updating}</span>
                )}
                <button
                  type="button"
                  onClick={() => userId && loadUsage(userId)}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                  disabled={!userId || creditsLoading}
                >
                  {strings.common.refreshBalance}
                </button>
                <button
                  type="button"
                  onClick={() => userId && loadHistory(userId)}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                  disabled={!userId || historyLoading}
                >
                  {strings.common.refreshHistory}
                </button>
                <label className="ml-2 flex items-center gap-2 text-xs text-white/70">
                  <span>{strings.insights.credits.form.amountLabel}</span>
                  <input
                    type="number"
                    min="1"
                    className="w-24 rounded-md border border-white/10 bg-white/5 p-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={creditsAmount}
                    onChange={(event) => setCreditsAmount(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  disabled={!summary?.user.email || creditsActionLoading}
                  onClick={(event) => handleCreditsAction('grant', event)}
                >
                  {strings.insights.credits.form.grantLabel}
                </button>
                <button
                  type="button"
                  className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                  disabled={!summary?.user.email || creditsActionLoading}
                  onClick={(event) => handleCreditsAction('deduct', event)}
                >
                  {strings.insights.credits.form.deductLabel}
                </button>
              </div>
            </div>
            {creditsError && <p className="mt-2 text-sm text-red-300">{creditsError}</p>}
            {creditsActionError && (
              <p className="mt-1 text-sm text-red-300">{creditsActionError}</p>
            )}
            {usage && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase text-white/50">
                    {strings.insights.table.credits}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {numberFormatter.format(usage.credits)}
                  </p>
                  <p className="text-xs text-white/50">
                    ({strings.insights.credits.tenthsLabel}: {numberFormatter.format(usage.tenths)})
                  </p>
                </div>
              </div>
            )}
            {historyError && <p className="mt-2 text-sm text-red-300">{historyError}</p>}
            <div className="mt-3 max-h-52 overflow-y-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">{strings.insights.history.table.pack}</th>
                    <th className="px-3 py-2 text-left">{strings.insights.history.table.units}</th>
                    <th className="px-3 py-2 text-left">
                      {strings.insights.history.table.created}
                    </th>
                    <th className="px-3 py-2 text-left">
                      {strings.insights.history.table.expires}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-white/5">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm text-white/50">
                        {strings.insights.history.none}
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
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString(localeTag)
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-white/60">
                          {item.expiresAt
                            ? new Date(item.expiresAt).toLocaleString(localeTag)
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
        <div className="lg:col-span-1"></div>
      </div>
    </section>
  );
};

export default UserInsightsSection;
