import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { toast } from 'sonner';
import type { WebEvalReport } from '@/lib/testing/web-eval';
import {
  containerCls,
  sectionTitleCls,
  smallMutedTextCls,
} from '@/components/tools/shared/islandStyles';
import { getI18n } from '@/utils/i18n';
import { getLocale } from '@/lib/i18n';

type ApiError = { success: false; error: { type: string; message: string; details?: unknown } };
type ApiSuccess<T> = { success: true; data: T };

type UsageInfo = { used: number; limit: number; resetAt: number | null };

type UsageOverview = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number | null;
};

type UsageApiResponse = {
  ownerType: 'user' | 'guest';
  usage: UsageOverview;
  dailyUsage?: UsageOverview;
  monthlyUsage?: UsageOverview | null;
  limits: { user: number; guest: number };
  plan?: string;
  entitlements: {
    monthlyRuns: number;
    dailyBurstCap: number;
  };
  creditsBalanceTenths?: number | null;
};

type CreateTaskResp = ApiSuccess<{
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'aborted';
  createdAt: string;
}>;

type TaskDetail = {
  id: string;
  url: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'aborted';
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  lastError: string | null;
};

type GetTaskResp = ApiSuccess<{
  task: TaskDetail;
  report: WebEvalReport | null;
}>;

type LiveEnvelope = {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'aborted';
  steps: {
    action: string;
    timestamp: string;
    selectorUsed?: string;
    screenshotKey?: string;
    phase?: 'nav' | 'assertions' | 'cleanup';
  }[];
  errors: string[];
  logs?: {
    level: 'log' | 'error' | 'warn' | 'info' | 'debug';
    message: string;
    timestamp: string;
  }[];
  updatedAt: string;
  screenshotBase64?: string;
};

type AssertionDraft = {
  id: string;
  kind: 'textIncludes' | 'selectorExists';
  value: string;
  description: string;
};

interface Strings {
  urlPlaceholder: string;
  taskPlaceholder: string;
  submitButton: string;
  usage: string;
  myTasks: string;
  reportTitle: string;
  resetLabel: string;
  assertionsTitle: string;
  addAssertion: string;
  assertionsEmpty: string;
  assertionKindTextIncludes: string;
  assertionKindSelectorExists: string;
  verdictLabel: string;
  assertionsSectionTitle: string;
  assertionsHint: string;
  headlessLabel: string;
  headlessHint: string;
  abortLabel: string;
  liveTitle: string;
  liveFinalSnapshotLabel: string;
  livePhaseLabel: string;
  livePhaseNav: string;
  livePhaseAssertions: string;
  livePhaseCleanup: string;
  liveHintBrowserUnavailable: string;
  liveHintAssertionsFailed: string;
  liveScreenshotTitle: string;
  liveScreenshotOpenLabel: string;
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

function deriveTaskTitle(task: TaskDetail | undefined, fallbackId: string): string {
  if (!task || !task.description) return fallbackId;
  const desc = task.description.trim();
  if (!desc) return fallbackId;
  const firstLine = desc.split('\n')[0]?.trim() ?? '';
  if (!firstLine) return fallbackId;
  if (firstLine.length <= 80) return firstLine;
  return `${firstLine.slice(0, 77)}…`;
}

type LiveHintKind = 'browser_unavailable' | 'assertions_failed';

function deriveLiveHintKind(liveEnvelope: LiveEnvelope | null | undefined): LiveHintKind | null {
  if (!liveEnvelope || !Array.isArray(liveEnvelope.errors) || liveEnvelope.errors.length === 0) {
    return null;
  }
  const errs = liveEnvelope.errors;
  if (errs.some((e) => typeof e === 'string' && e.includes('browser_backend_unavailable')))
    return 'browser_unavailable';
  if (errs.some((e) => typeof e === 'string' && e.startsWith('assertion_error:')))
    return 'assertions_failed';
  return null;
}

export default function WebEvalIsland({ strings }: Props) {
  const [url, setUrl] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [headless, setHeadless] = useState(true);
  const [timeoutMs, setTimeoutMs] = useState<number>(30000);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<UsageInfo | null>(null);
  const [creditsBalanceTenths, setCreditsBalanceTenths] = useState<number | null>(null);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskDetail>>({});
  const [reports, setReports] = useState<Record<string, WebEvalReport | null>>({});
  const [live, setLive] = useState<Record<string, LiveEnvelope | null>>({});
  const [assertions, setAssertions] = useState<AssertionDraft[]>([]);
  const [abortingIds, setAbortingIds] = useState<string[]>([]);
  const pollTimerRef = useRef<number | null>(null);
  const restoreTaskIdRef = useRef<string | null>(null);
  const [ownerTypeState, setOwnerTypeState] = useState<'user' | 'guest' | null>(null);
  const [planState, setPlanState] = useState<string | null>(null);

  const locale = getLocale(typeof window !== 'undefined' ? window.location.pathname : '/');
  const t = getI18n(locale);

  const planLabel = useMemo(() => {
    if (ownerTypeState === 'guest' || ownerTypeState === null) return 'Guest';
    if (ownerTypeState === 'user') {
      if (planState === 'free' || !planState) return 'Starter';
      return planState.charAt(0).toUpperCase() + planState.slice(1);
    }
    return '';
  }, [ownerTypeState, planState]);

  const planId = useMemo(
    () =>
      ownerTypeState === 'user' && planState
        ? planState === 'free'
          ? 'starter'
          : (planState as 'pro' | 'premium' | 'enterprise')
        : null,
    [ownerTypeState, planState]
  );

  const monthlyLabel = useMemo(() => {
    const maybe = t('header.menu.monthly_quota');
    return maybe || strings.usage;
  }, [t, strings.usage]);

  const creditsLabel = useMemo(() => {
    const maybe = t('header.menu.credits');
    return maybe || 'Credits';
  }, [t]);

  const canCreate = useMemo(() => {
    if (busy) return false;
    if (!url || !/^https?:\/\//i.test(url)) return false;
    if (!taskDesc || taskDesc.trim().length < 5) return false;
    return true;
  }, [url, taskDesc, busy]);

  const saveTaskIds = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(ids.slice(0, 20)));
    } catch {
      // ignore
    }
  }, []);

  const addAssertionRow = useCallback(() => {
    setAssertions((prev) => {
      const id =
        (globalThis.crypto?.randomUUID?.() as string | undefined) ??
        `assert-${Date.now().toString(36)}-${prev.length}`;
      return [
        ...prev,
        {
          id,
          kind: 'textIncludes',
          value: '',
          description: '',
        },
      ];
    });
  }, []);

  const updateAssertionRow = useCallback(
    (id: string, patch: Partial<Omit<AssertionDraft, 'id'>>) => {
      setAssertions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    []
  );

  const removeAssertionRow = useCallback((id: string) => {
    setAssertions((prev) => prev.filter((a) => a.id !== id));
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
      const data = (await resp.json()) as ApiSuccess<UsageApiResponse> | ApiError;
      if (resp.ok && 'success' in data && data.success) {
        const payload = (data as ApiSuccess<UsageApiResponse>).data;
        const base = payload.usage;
        setUsage({ used: base.used, limit: base.limit, resetAt: base.resetAt });

        setOwnerTypeState(payload.ownerType ?? null);
        setPlanState(payload.plan ?? null);

        const m = payload.monthlyUsage;
        setMonthlyUsage(
          m
            ? {
                used: m.used,
                limit: m.limit,
                resetAt: m.resetAt,
              }
            : null
        );

        const credits = payload.creditsBalanceTenths;
        setCreditsBalanceTenths(typeof credits === 'number' ? credits : null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setTaskIds(loadTaskIds());
    void refreshUsage();
  }, [loadTaskIds, refreshUsage]);

  // Read restoreTaskId from the URL once on mount and clean up the URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const current = restoreTaskIdRef.current;
      if (current) return;
      const urlObj = new URL(window.location.href);
      const qp = urlObj.searchParams.get('restoreTaskId');
      const trimmed = qp?.trim();
      if (trimmed) {
        restoreTaskIdRef.current = trimmed;
        urlObj.searchParams.delete('restoreTaskId');
        window.history.replaceState(window.history.state, '', urlObj.toString());
      }
    } catch {
      // ignore URL/History errors
    }
  }, []);

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

  const removeTaskId = useCallback(
    (id: string) => {
      setTaskIds((prev) => {
        const next = prev.filter((x) => x !== id);
        saveTaskIds(next);
        return next;
      });
      setTasks((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
      setReports((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
      setLive((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
    },
    [saveTaskIds]
  );

  const fetchTask = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/testing/evaluate/${id}`, { credentials: 'same-origin' });
        if (!res.ok) {
          if (res.status === 403 || res.status === 404) {
            setTaskIds((prev) => {
              const next = prev.filter((x) => x !== id);
              saveTaskIds(next);
              return next;
            });
          }
          return;
        }
        const data = (await res.json()) as GetTaskResp | ApiError;
        if ('success' in data && data.success) {
          setTasks((prev) => ({ ...prev, [id]: data.data.task }));
          setReports((prev) => ({ ...prev, [id]: data.data.report }));
        }
      } catch {
        // ignore
      }
    },
    [saveTaskIds]
  );

  const fetchLive = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/testing/evaluate/${id}/live`, { credentials: 'same-origin' });
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          setLive((prev) => {
            const { [id]: _omit, ...rest } = prev;
            return rest;
          });
        }
        return;
      }
      const data = (await res.json()) as
        | ApiSuccess<{
            task: TaskDetail;
            live: LiveEnvelope | null;
          }>
        | ApiError;
      if ('success' in data && data.success) {
        setTasks((prev) => ({ ...prev, [id]: data.data.task }));
        setLive((prev) => ({ ...prev, [id]: data.data.live ?? null }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore a task from restoreTaskId (if present in the URL)
  useEffect(() => {
    const id = restoreTaskIdRef.current;
    if (!id) return;
    restoreTaskIdRef.current = null;

    if (!taskIds.includes(id)) {
      addTaskId(id);
    }

    (async () => {
      await fetchTask(id);
      await fetchLive(id);
    })();
  }, [taskIds, addTaskId, fetchTask, fetchLive]);

  // Poll all non-final tasks periodically
  useEffect(() => {
    const run = async () => {
      const ids = taskIds;
      for (const id of ids) {
        const t = tasks[id];
        if (!t || t.status === 'pending' || t.status === 'processing') {
          await fetchTask(id);
          await fetchLive(id);
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
  }, [taskIds, tasks, fetchTask, fetchLive]);

  // Initial load for known IDs
  useEffect(() => {
    (async () => {
      for (const id of taskIds) {
        if (!tasks[id]) await fetchTask(id);
      }
    })();
  }, [taskIds, tasks, fetchTask]);

  const abortTask = useCallback(
    async (id: string) => {
      try {
        setAbortingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        const csrf = ensureCsrfToken();
        const res = await fetch(`/api/testing/evaluate/${id}/abort`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
          },
          credentials: 'same-origin',
          body: JSON.stringify({}),
        });

        let data: ApiSuccess<{ taskId: string; status: string }> | ApiError | null = null;
        try {
          data = (await res.json()) as ApiSuccess<{ taskId: string; status: string }> | ApiError;
        } catch {
          // ignore json errors
        }

        if (!res.ok || !data || !('success' in data) || !data.success) {
          const msg = (data as ApiError | null)?.error?.message || strings.toasts.error;
          toast.error(msg);
          return;
        }

        await fetchTask(id);
        await fetchLive(id);
      } catch {
        toast.error(strings.toasts.error);
      } finally {
        setAbortingIds((prev) => prev.filter((x) => x !== id));
      }
    },
    [strings, fetchTask, fetchLive]
  );

  const createTask = useCallback(async () => {
    if (!canCreate) return;
    if (usage && usage.used >= usage.limit) {
      toast.error(strings.toasts.quotaReached);
      return;
    }
    setBusy(true);
    try {
      const csrf = ensureCsrfToken();
      const assertionPayload = assertions
        .map((a) => ({
          kind: a.kind,
          value: a.value.trim(),
          description: a.description.trim() || undefined,
        }))
        .filter((a) => a.value.length > 0);
      const body: {
        url: string;
        task: string;
        headless: boolean;
        timeoutMs: number;
        assertions?: {
          kind: 'textIncludes' | 'selectorExists';
          value: string;
          description?: string;
        }[];
      } = {
        url: url.trim(),
        task: taskDesc.trim(),
        headless,
        timeoutMs,
      };
      if (assertionPayload.length > 0) {
        body.assertions = assertionPayload;
      }
      const res = await fetch('/api/testing/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      let data: CreateTaskResp | ApiError | null = null;
      try {
        data = (await res.json()) as CreateTaskResp | ApiError;
      } catch {
        // ignore json errors
      }
      if (!res.ok || !data || !('success' in data) || !data.success) {
        const msg = (data as ApiError | null)?.error?.message || strings.toasts.error;
        toast.error(msg);
        return;
      }
      addTaskId(data.data.taskId);
      setUrl('');
      setTaskDesc('');
      setAssertions([]);
      toast.success(strings.toasts.created);
      void refreshUsage();
      // Fetch immediately
      await fetchTask(data.data.taskId);
      await fetchLive(data.data.taskId);
    } catch {
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
    assertions,
    strings,
    addTaskId,
    refreshUsage,
    fetchTask,
    fetchLive,
  ]);

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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
              />
              <span>{strings.headlessLabel}</span>
              <span className={smallMutedTextCls}>{strings.headlessHint}</span>
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
          </div>
          <div className="flex items-center gap-3 md:ml-auto">
            {usage && (
              <ToolUsageBadge
                label={strings.usage}
                loadingLabel={strings.usage}
                usage={usage}
                ownerType={ownerTypeState}
                planId={planId}
                planLabel={planLabel}
                layout="card"
                size="sm"
                align="left"
                showIcon
                showResetHint={false}
                showOwnerHint={false}
                showPercent
                detailsTitle={strings.usage}
                headerCredits={
                  creditsBalanceTenths != null ? Math.round(creditsBalanceTenths) / 10 : null
                }
                detailsItems={[
                  {
                    id: 'daily',
                    label: strings.usage,
                    used: usage.used,
                    limit: usage.limit,
                    resetAt: usage.resetAt,
                  },
                  ...(monthlyUsage
                    ? [
                        {
                          id: 'monthly',
                          label: monthlyLabel,
                          used: monthlyUsage.used,
                          limit: monthlyUsage.limit,
                          resetAt: monthlyUsage.resetAt,
                        },
                      ]
                    : []),
                  ...(creditsBalanceTenths != null
                    ? [
                        {
                          id: 'credits',
                          label: creditsLabel,
                          used: Math.round(creditsBalanceTenths) / 10,
                          limit: null,
                          resetAt: null,
                          kind: 'credits' as const,
                        },
                      ]
                    : []),
                ]}
              />
            )}
            <Button onClick={createTask} disabled={!canCreate} variant="primary">
              {busy ? '…' : strings.submitButton}
            </Button>
          </div>
        </div>
        {usage?.resetAt && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {strings.resetLabel} {new Date(usage.resetAt).toLocaleString()}
          </div>
        )}
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {strings.assertionsTitle}
            </div>
            <Button size="sm" variant="secondary" onClick={addAssertionRow}>
              {strings.addAssertion}
            </Button>
          </div>
          <p className={smallMutedTextCls}>{strings.assertionsHint}</p>
          {assertions.length === 0 ? (
            <div className={smallMutedTextCls}>{strings.assertionsEmpty}</div>
          ) : (
            <div className="space-y-2">
              {assertions.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3"
                >
                  <select
                    className="md:w-40 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={a.kind}
                    onChange={(e) =>
                      updateAssertionRow(a.id, {
                        kind: e.target.value as AssertionDraft['kind'],
                      })
                    }
                  >
                    <option value="textIncludes">{strings.assertionKindTextIncludes}</option>
                    <option value="selectorExists">{strings.assertionKindSelectorExists}</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={a.kind === 'textIncludes' ? 'Text snippet' : 'CSS selector'}
                    value={a.value}
                    onChange={(e) => updateAssertionRow(a.id, { value: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Description (optional)"
                    value={a.description}
                    onChange={(e) => updateAssertionRow(a.id, { description: e.target.value })}
                  />
                  <div className="md:self-stretch flex items-center">
                    <Button size="sm" variant="ghost" onClick={() => removeAssertionRow(a.id)}>
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Tasks */}
      <div className="mt-8">
        <h2 className={sectionTitleCls}>{strings.myTasks}</h2>
        {taskIds.length === 0 ? (
          <p className={smallMutedTextCls}>—</p>
        ) : (
          <ul className="space-y-3">
            {taskIds.map((id) => {
              const t = tasks[id];
              const liveEnvelope = live[id] ?? null;
              const title = deriveTaskTitle(t, id);
              return (
                <li key={id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col max-w-[260px]">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                            {title}
                          </span>
                          <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {id}
                          </span>
                        </div>
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
                      {t && (t.status === 'pending' || t.status === 'processing') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={abortingIds.includes(id)}
                          onClick={() => abortTask(id)}
                        >
                          {abortingIds.includes(id) ? '…' : strings.abortLabel}
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => fetchTask(id)}>
                        Refresh
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeTaskId(id)}>
                        ×
                      </Button>
                    </div>
                  </div>
                  {liveEnvelope && (
                    <div className="mt-3 text-sm border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-medium">
                          {strings.liveTitle}
                          {t && t.status && (
                            <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                              — {t.status}
                              {(t.status === 'completed' || t.status === 'failed') &&
                                ` ${strings.liveFinalSnapshotLabel}`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <span className="opacity-80">{strings.livePhaseLabel}:</span>{' '}
                          {(() => {
                            const lastWithPhase = [...liveEnvelope.steps]
                              .reverse()
                              .find((s) => s.phase);
                            const phase = lastWithPhase?.phase;
                            if (!phase) return <span>—</span>;
                            const label =
                              phase === 'nav'
                                ? strings.livePhaseNav
                                : phase === 'assertions'
                                  ? strings.livePhaseAssertions
                                  : strings.livePhaseCleanup;
                            return <span className="font-mono">{label}</span>;
                          })()}
                        </div>
                      </div>
                      {(() => {
                        const kind = deriveLiveHintKind(liveEnvelope);
                        if (!kind) return null;
                        const text =
                          kind === 'browser_unavailable'
                            ? strings.liveHintBrowserUnavailable
                            : strings.liveHintAssertionsFailed;
                        return (
                          <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                            {text}
                          </div>
                        );
                      })()}
                      {liveEnvelope.screenshotBase64 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {strings.liveScreenshotTitle}
                          </div>
                          <div className="mt-1 flex flex-col sm:flex-row gap-2 sm:items-start">
                            <img
                              src={`data:image/png;base64,${liveEnvelope.screenshotBase64}`}
                              alt={strings.liveScreenshotTitle}
                              className="max-h-40 rounded border border-gray-300 dark:border-gray-700 object-contain bg-black"
                            />
                            <a
                              href={`data:image/png;base64,${liveEnvelope.screenshotBase64}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-600 dark:text-emerald-400 underline"
                            >
                              {strings.liveScreenshotOpenLabel}
                            </a>
                          </div>
                        </div>
                      )}
                      {liveEnvelope.steps.length === 0 ? (
                        <div className={smallMutedTextCls}>Waiting for runner…</div>
                      ) : (
                        <ul className="space-y-1 max-h-32 overflow-auto pr-2">
                          {liveEnvelope.steps.map((s, idx) => (
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
                      )}
                      {liveEnvelope.logs && liveEnvelope.logs.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Console (warn/error only)
                          </div>
                          <ul className="mt-1 space-y-1 max-h-24 overflow-auto pr-2">
                            {liveEnvelope.logs.map((log, idx) => (
                              <li key={idx} className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="inline-block min-w-[52px] uppercase mr-2 opacity-70">
                                  {log.level}
                                </span>
                                <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 mr-1">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                {log.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {liveEnvelope.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                          {liveEnvelope.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

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
                        <div>
                          <div className="font-medium mb-1 flex items-center gap-2">
                            {strings.assertionsSectionTitle}
                            {reports[id]!.verdict && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                  {
                                    pass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                                    fail: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
                                    inconclusive:
                                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
                                  }[reports[id]!.verdict!]
                                }`}
                              >
                                {strings.verdictLabel}: {reports[id]!.verdict}
                              </span>
                            )}
                          </div>
                          {reports[id]!.assertions && reports[id]!.assertions!.length > 0 ? (
                            <ul className="space-y-1 max-h-48 overflow-auto pr-2">
                              {reports[id]!.assertions!.map((a, idx) => (
                                <li key={idx} className="text-gray-700 dark:text-gray-300">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs mr-2 ${
                                      {
                                        true: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                                        false:
                                          'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
                                      }[String(a.passed) as 'true' | 'false']
                                    }`}
                                  >
                                    {a.passed ? 'PASS' : 'FAIL'}
                                  </span>
                                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-1">
                                    {a.kind}
                                  </span>
                                  <span className="break-all">{a.value}</span>
                                  {a.description && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                      — {a.description}
                                    </span>
                                  )}
                                  {a.details && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                      {a.details}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400">—</div>
                          )}
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
