import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { useAdminStrings } from '@/lib/i18n-admin';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';
import {
  fetchAdminWebEvalTasks,
  fetchAdminWebEvalTaskDetail,
  type AdminWebEvalTaskSummary,
  type AdminWebEvalTaskDetailResponse,
  AdminApiError,
} from '@/lib/admin/api-client';

type StatusFilter = AdminWebEvalTaskSummary['status'] | '';

type OwnerTypeFilter = 'user' | 'guest' | 'system' | '';

const STATUS_OPTIONS: StatusFilter[] = [
  '',
  'pending',
  'processing',
  'completed',
  'failed',
  'aborted',
];

const OWNER_TYPE_OPTIONS: OwnerTypeFilter[] = ['', 'user', 'guest', 'system'];

const AdminWebEvalTasksApp: React.FC = () => {
  const strings = useAdminStrings();
  const { sendEvent } = useAdminTelemetry('web-eval-admin');

  const [status, setStatus] = useState<StatusFilter>('');
  const [ownerType, setOwnerType] = useState<OwnerTypeFilter>('');
  const [ownerId, setOwnerId] = useState('');
  const [limit, setLimit] = useState<number>(25);

  const [items, setItems] = useState<AdminWebEvalTaskSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminWebEvalTaskDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | undefined>();

  const appliedFilters = useMemo(
    () => ({
      status: status || undefined,
      ownerType: ownerType || undefined,
      ownerId: ownerId.trim() || undefined,
      limit,
    }),
    [limit, ownerId, ownerType, status]
  );

  const loadPage = useCallback(
    async (mode: 'reset' | 'loadMore') => {
      if (mode === 'reset') {
        setLoading(true);
        setError(undefined);
      } else {
        if (!nextCursor) return;
        setLoadingMore(true);
        setError(undefined);
      }

      try {
        const params = {
          ...appliedFilters,
          cursor: mode === 'loadMore' ? nextCursor : undefined,
        };
        const data = await fetchAdminWebEvalTasks(params);
        if (mode === 'reset') {
          setItems(data.items);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }
        setNextCursor(data.nextCursor ?? null);
        if (mode === 'reset' && data.items.length > 0) {
          setSelectedId(data.items[0]?.id ?? null);
        }
      } catch (err) {
        const message =
          err instanceof AdminApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unbekannter Fehler';
        setError(message);
      } finally {
        if (mode === 'reset') {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [appliedFilters, nextCursor]
  );

  const loadDetail = useCallback(async (id: string | null) => {
    if (!id) {
      setDetail(null);
      setDetailError(undefined);
      return;
    }
    setDetailLoading(true);
    setDetailError(undefined);
    try {
      const data = await fetchAdminWebEvalTaskDetail(id);
      setDetail(data);
    } catch (err) {
      const message =
        err instanceof AdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unbekannter Fehler';
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage('reset');
  }, [loadPage]);

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    }
  }, [loadDetail, selectedId]);

  const handleApplyFilters = async (event: React.FormEvent) => {
    event.preventDefault();
    sendEvent('action_performed', {
      action: 'web_eval_admin_filter',
      metadata: appliedFilters,
    });
    await loadPage('reset');
  };

  const handleResetFilters = async () => {
    setStatus('');
    setOwnerType('');
    setOwnerId('');
    setLimit(25);
    sendEvent('action_performed', {
      action: 'web_eval_admin_filter_reset',
    });
    await loadPage('reset');
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedId(taskId);
    sendEvent('action_performed', {
      action: 'web_eval_admin_select_task',
      metadata: { taskId },
    });
  };

  const selectedTask = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    <section aria-labelledby="admin-web-eval-tasks" className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 id="admin-web-eval-tasks" className="text-2xl font-bold text-gray-900 dark:text-white">
          {strings.webEvalAdmin.heading}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          {loading && <span className="text-white/50">{strings.common.loading}</span>}
          {error && <span className="text-red-300">{error}</span>}
          <button
            type="button"
            onClick={() => loadPage('reset')}
            className="rounded-md border border-white/10 px-3 py-1 text-white/80 hover:bg-white/10"
          >
            {strings.common.refresh}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4" variant="default">
            <form className="grid gap-3 md:grid-cols-4 items-end" onSubmit={handleApplyFilters}>
              <label className="text-sm text-white/70">
                {strings.webEvalAdmin.filters.statusLabel}
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{strings.common.all}</option>
                  {STATUS_OPTIONS.filter((s) => s).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70">
                {strings.webEvalAdmin.filters.ownerTypeLabel}
                <select
                  value={ownerType}
                  onChange={(event) => setOwnerType(event.target.value as OwnerTypeFilter)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{strings.common.all}</option>
                  {OWNER_TYPE_OPTIONS.filter((t) => t).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70">
                {strings.webEvalAdmin.filters.ownerIdLabel}
                <input
                  type="text"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-white/70">
                {strings.webEvalAdmin.filters.limitLabel}
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value || 25))}
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-2 md:col-span-4">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  disabled={loading}
                >
                  {strings.webEvalAdmin.filters.applyButton}
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  disabled={loading}
                >
                  {strings.webEvalAdmin.filters.resetButton}
                </button>
              </div>
            </form>
          </Card>

          <Card className="p-4" variant="default">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                {strings.webEvalAdmin.table.heading}
              </h2>
              {loadingMore && (
                <span className="text-xs text-white/50">{strings.common.loading}</span>
              )}
            </div>
            <div className="mt-3 overflow-x-auto max-h-[420px] overflow-y-auto rounded-md border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.id}</th>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.status}</th>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.ownerType}</th>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.ownerId}</th>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.url}</th>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.createdAt}</th>
                    <th className="px-3 py-2 text-left">{strings.webEvalAdmin.table.lastError}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-white/5">
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-white/50" colSpan={7}>
                        {error ?? strings.insights.list.none}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isSelected = item.id === selectedId;
                      return (
                        <tr
                          key={item.id}
                          className={`cursor-pointer hover:bg-white/10 ${
                            isSelected ? 'bg-white/10' : ''
                          }`}
                          onClick={() => handleSelectTask(item.id)}
                        >
                          <td className="px-3 py-2 text-xs font-mono text-white/70">{item.id}</td>
                          <td className="px-3 py-2 text-xs capitalize text-white/60">
                            {item.status}
                          </td>
                          <td className="px-3 py-2 text-xs text-white/60">{item.ownerType}</td>
                          <td className="px-3 py-2 text-xs text-white/60">{item.ownerId}</td>
                          <td className="px-3 py-2 text-xs text-white/60 max-w-[240px] truncate">
                            {item.url}
                          </td>
                          <td className="px-3 py-2 text-xs text-white/60">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                          </td>
                          <td className="px-3 py-2 text-xs text-red-300 max-w-[200px] truncate">
                            {item.lastError ?? ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {nextCursor && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => loadPage('loadMore')}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  disabled={loadingMore}
                >
                  {strings.webEvalAdmin.table.loadMore}
                </button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4" variant="default">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              {strings.webEvalAdmin.detail.heading}
            </h2>
            {detailLoading && (
              <p className="mt-2 text-sm text-white/60">{strings.common.loading}</p>
            )}
            {detailError && <p className="mt-2 text-sm text-red-300">{detailError}</p>}
            {!detail && !detailLoading && !selectedTask && (
              <p className="mt-3 text-sm text-white/60">{strings.webEvalAdmin.detail.empty}</p>
            )}
            {detail && selectedTask && (
              <div className="mt-3 space-y-3 text-sm text-white/80">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase text-white/50">ID</span>
                  <span className="font-mono text-xs break-all">{detail.task.id}</span>
                </div>
                <div>
                  <span className="text-xs uppercase text-white/50">URL</span>
                  <div className="text-sm break-all">{detail.task.url}</div>
                </div>
                <div>
                  <span className="text-xs uppercase text-white/50">Status</span>
                  <div className="text-sm">{detail.task.status}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
                  <div>
                    <div className="text-white/50">Owner</div>
                    <div>
                      {detail.task.ownerType} • {detail.task.ownerId}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50">Attempts</div>
                    <div>{detail.task.attemptCount}</div>
                  </div>
                  <div>
                    <div className="text-white/50">Created</div>
                    <div>
                      {detail.task.createdAt
                        ? new Date(detail.task.createdAt).toLocaleString()
                        : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50">Updated</div>
                    <div>
                      {detail.task.updatedAt
                        ? new Date(detail.task.updatedAt).toLocaleString()
                        : ''}
                    </div>
                  </div>
                </div>
                {detail.task.lastError && (
                  <div>
                    <div className="text-xs uppercase text-white/50">
                      {strings.webEvalAdmin.table.lastError}
                    </div>
                    <div className="text-xs text-red-300 break-all">{detail.task.lastError}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {detail.report && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                      {strings.webEvalAdmin.detail.reportPresent}
                    </span>
                  )}
                  {detail.live && (
                    <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-200">
                      {strings.webEvalAdmin.detail.livePresent}
                    </span>
                  )}
                </div>
                <div className="pt-2">
                  <a
                    href={`/tools/web-eval/app?restoreTaskId=${encodeURIComponent(detail.task.id)}`}
                    className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {strings.webEvalAdmin.detail.openInTool}
                  </a>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AdminWebEvalTasksApp;
