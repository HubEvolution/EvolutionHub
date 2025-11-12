import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { toast } from 'sonner';
import type { WebEvalReport } from '@/lib/testing/web-eval';
import {
  containerCls,
  usageBarBgCls,
  usageBarFillCls,
  sectionTitleCls,
  smallMutedTextCls,
} from '@/components/tools/shared/islandStyles';

type ApiError = { success: false; error: { type: string; message: string; details?: unknown } };
type ApiSuccess<T> = { success: true; data: T };

type UsageInfo = { used: number; limit: number; resetAt: number | null };

type CreateTaskResp = ApiSuccess<{
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}>;

type TaskDetail = {
  id: string;
  url: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  lastError: string | null;
};

type GetTaskResp = ApiSuccess<{
  task: TaskDetail;
  report: WebEvalReport | null;
}>;

interface Strings {
  urlPlaceholder: string;
  taskPlaceholder: string;
  submitButton: string;
  usage: string;
  myTasks: string;
  reportTitle: string;
  toasts: {
    invalidUrl: string;
    invalidTask: string;
    quotaReached: string;
    created: string;
    error: string;
  };
}

interface Props {
  strings: Strings;
}

const LS_KEY = 'web-eval:taskIds';

export default function WebEvalIsland({ strings }: Props) {
  const [url, setUrl] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [headless, setHeadless] = useState(true);
  const [timeoutMs, setTimeoutMs] = useState<number>(30000);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskDetail>>({});
  const [reports, setReports] = useState<Record<string, WebEvalReport | null>>({});
  const pollTimerRef = useRef<number | null>(null);

  const canCreate = useMemo(() => {
    if (busy) return false;
    if (!url || !/^https?:\/\//i.test(url)) return false;
    if (!taskDesc || taskDesc.trim().length < 5) return false;
    return true;
  }, [url, taskDesc, busy]);

  const saveTaskIds = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(ids.slice(0, 20)));
    } catch {}
  }, []);

  const loadTaskIds = useCallback((): string[] => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch {
      return [];
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const resp = await fetch('/api/testing/evaluate/usage', {
        credentials: 'same-origin',
      });
      const data = (await resp.json()) as
        | ApiSuccess<{
            usage: UsageInfo;
          }>
        | ApiError;
      if (resp.ok && 'success' in data && data.success) {
        setUsage((data as ApiSuccess<{ usage: UsageInfo }>).data.usage);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setTaskIds(loadTaskIds());
    void refreshUsage();
  }, [loadTaskIds, refreshUsage]);

  const addTaskId = useCallback(
    (id: string) => {
      setTaskIds((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)].slice(0, 20);
        saveTaskIds(next);
        return next;
      });
    },
    [saveTaskIds]
  );

  const fetchTask = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/testing/evaluate/${id}`, { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as GetTaskResp | ApiError;
      if ('success' in data && data.success) {
        setTasks((prev) => ({ ...prev, [id]: data.data.task }));
        setReports((prev) => ({ ...prev, [id]: data.data.report }));
      }
    } catch {}
  }, []);

  // Poll all non-final tasks periodically
  useEffect(() => {
    const run = async () => {
      const ids = taskIds;
      for (const id of ids) {
        const t = tasks[id];
        if (!t || t.status === 'pending' || t.status === 'processing') {
          await fetchTask(id);
        }
      }
    };
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollTimerRef.current = window.setInterval(run, 8000) as unknown as number;
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [taskIds, tasks, fetchTask]);

  // Initial load for known IDs
  useEffect(() => {
    (async () => {
      for (const id of taskIds) {
        if (!tasks[id]) await fetchTask(id);
      }
    })();
  }, [taskIds]);

  const createTask = useCallback(async () => {
    if (!canCreate) return;
    if (usage && usage.used >= usage.limit) {
      toast.error(strings.toasts.quotaReached);
      return;
    }
    setBusy(true);
    try {
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/testing/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ url: url.trim(), task: taskDesc.trim(), headless, timeoutMs }),
      });
      let data: CreateTaskResp | ApiError | null = null;
      try {
        data = (await res.json()) as CreateTaskResp | ApiError;
      } catch {}
      if (!res.ok || !data || !('success' in data) || !data.success) {
        const msg = (data as ApiError | null)?.error?.message || strings.toasts.error;
        toast.error(msg);
        return;
      }
      addTaskId(data.data.taskId);
      setUrl('');
      setTaskDesc('');
      toast.success(strings.toasts.created);
      void refreshUsage();
      // Fetch immediately
      await fetchTask(data.data.taskId);
    } catch (e) {
      toast.error(strings.toasts.error);
    } finally {
      setBusy(false);
    }
  }, [
    canCreate,
    usage,
    url,
    taskDesc,
    headless,
    timeoutMs,
    strings,
    addTaskId,
    refreshUsage,
    fetchTask,
  ]);

  const percent = useMemo(() => {
    if (!usage) return 0;
    return Math.min(100, Math.floor((usage.used / Math.max(1, usage.limit)) * 100));
  }, [usage]);

  return (
    <div className={containerCls}>
      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="sr-only" htmlFor="we-url">
            URL
          </label>
          <input
            id="we-url"
            type="url"
            inputMode="url"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={strings.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="we-task">
            Task
          </label>
          <textarea
            id="we-task"
            className="w-full min-h-[90px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={strings.taskPlaceholder}
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="rounded border-gray-300 dark:border-gray-600"
              checked={headless}
              onChange={(e) => setHeadless(e.target.checked)}
            />
            headless
          </label>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span>timeout</span>
            <input
              type="number"
              min={1000}
              max={300000}
              step={500}
              className="w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value || 30000))}
            />
            <span className={smallMutedTextCls}>ms</span>
          </div>
          <div className="ml-auto">
            <Button onClick={createTask} disabled={!canCreate} variant="primary">
              {busy ? '…' : strings.submitButton}
            </Button>
          </div>
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {strings.usage}:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {usage.used}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ {usage.limit}</span>
              </div>
            </div>
            {usage.resetAt && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Reset: {new Date(usage.resetAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className={`mt-3 ${usageBarBgCls}`}>
            <div className={usageBarFillCls(percent)} style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {/* My Tasks */}
      <div className="mt-8">
        <h2 className={sectionTitleCls}>{strings.myTasks}</h2>
        {taskIds.length === 0 ? (
          <p className={smallMutedTextCls}>—</p>
        ) : (
          <ul className="space-y-3">
            {taskIds.map((id) => {
              const t = tasks[id];
              return (
                <li key={id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {id}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                            t?.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : t?.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {t?.status || 'pending'}
                        </span>
                      </div>
                      {t?.lastError && (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400 truncate">
                          {t.lastError}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t?.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => fetchTask(id)}>
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Report */}
                  {reports[id] && (
                    <div className="mt-3 text-sm">
                      <div className="font-semibold mb-2">{strings.reportTitle}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="font-medium mb-1">Steps</div>
                          <ul className="space-y-1">
                            {reports[id]!.steps.map((s, idx) => (
                              <li key={idx} className="text-gray-700 dark:text-gray-300">
                                <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">
                                  {new Date(s.timestamp).toLocaleTimeString()}
                                </span>
                                {s.action}
                                {s.selectorUsed ? (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {' '}
                                    — {s.selectorUsed}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Console</div>
                          <ul className="space-y-1 max-h-48 overflow-auto pr-2">
                            {reports[id]!.consoleLogs.map((c, idx) => (
                              <li key={idx} className="text-gray-700 dark:text-gray-300">
                                <span className="inline-block min-w-[56px] text-xs uppercase mr-2 opacity-70">
                                  {c.level}
                                </span>
                                {c.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Network</div>
                          <ul className="space-y-1 max-h-48 overflow-auto pr-2">
                            {reports[id]!.networkRequests.map((n, idx) => (
                              <li key={idx} className="text-gray-700 dark:text-gray-300">
                                <span className="inline-block min-w-[52px] text-xs uppercase mr-2 opacity-70">
                                  {n.method}
                                </span>
                                <span className="mr-2">{n.status}</span>
                                <span className="break-all">{n.url}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Errors</div>
                          {reports[id]!.errors.length === 0 ? (
                            <div className="text-gray-500 dark:text-gray-400">—</div>
                          ) : (
                            <ul className="list-disc ml-5 space-y-1">
                              {reports[id]!.errors.map((e, idx) => (
                                <li key={idx} className="text-red-700 dark:text-red-400">
                                  {e}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(reports[id]!.startedAt).toLocaleString()} →{' '}
                            {new Date(reports[id]!.finishedAt).toLocaleString()} (
                            {reports[id]!.durationMs}
                            ms)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
