import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminUsersList,
  adminBanUser,
  adminUnbanUser,
  adminDeleteUser,
  type AdminUserListItem,
  type AdminUserActionResult,
} from '@/lib/admin/api-client';
import { AdminApiError } from '@/lib/admin/api-client';
import { getAdminStrings } from '@/lib/i18n-admin';

export type AdminUserListFilters = {
  search?: string;
  status?: 'active' | 'banned' | 'deleted';
  plan?: 'free' | 'pro' | 'premium' | 'enterprise';
  limit?: number;
  cursor?: string;
};

interface UserListState {
  items: AdminUserListItem[];
  loading: boolean;
  loadingMore: boolean;
  error?: string;
  nextCursor?: string;
  actionStates: Record<string, boolean>;
  actionError?: string;
}

const initialState: UserListState = {
  items: [],
  loading: false,
  loadingMore: false,
  actionStates: {},
};

function cleanFilters(filters: AdminUserListFilters): AdminUserListFilters {
  const cleaned: AdminUserListFilters = {
    limit: filters.limit ?? 20,
    cursor: filters.cursor,
  };
  if (filters.search) cleaned.search = filters.search.trim();
  if (filters.status) cleaned.status = filters.status;
  if (filters.plan) cleaned.plan = filters.plan;
  return cleaned;
}

function mergeActionResult(
  items: AdminUserListItem[],
  userId: string,
  result: AdminUserActionResult
): AdminUserListItem[] {
  return items.map((item) => {
    if (item.user.id !== userId) return item;
    return {
      ...item,
      user: {
        ...item.user,
        status: result.status,
      },
      bannedAt: result.bannedAt ?? null,
      deletedAt: result.deletedAt ?? null,
      deletedBy: result.deletedBy ?? null,
    };
  });
}

export function useAdminUserList(initialFilters: AdminUserListFilters = {}) {
  const [state, setState] = useState<UserListState>(initialState);
  const filtersRef = useRef<AdminUserListFilters>(cleanFilters(initialFilters));
  const controllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const strings = getAdminStrings();

  const refresh = useCallback(async (filters?: AdminUserListFilters) => {
    const appliedFilters = cleanFilters(filters ?? filtersRef.current ?? {});
    const applied = {
      search: appliedFilters.search ?? undefined,
      status: appliedFilters.status ?? undefined,
      plan: appliedFilters.plan ?? undefined,
      limit: 20,
      cursor: undefined,
    } satisfies Parameters<typeof fetchAdminUsersList>[0];
    filtersRef.current = applied;
    setState((prev) => ({
      ...prev,
      loading: true,
      error: undefined,
      actionError: undefined,
    }));
    try {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const data = await fetchAdminUsersList(applied, controller.signal);
      setState((prev) => ({
        ...prev,
        items: data.items ?? [],
        nextCursor: data.nextCursor,
        loading: false,
        loadingMore: false,
      }));
      return data;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return undefined;
      if (error instanceof AdminApiError && error.status === 429 && error.retryAfterSec) {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        const ms = Math.max(0, Math.floor(error.retryAfterSec * 1000));
        const timeoutId = window.setTimeout(() => {
          const next = new AbortController();
          controllerRef.current = next;
          fetchAdminUsersList(applied, next.signal)
            .then((data) => {
              setState((prev) => ({
                ...prev,
                items: data.items ?? [],
                nextCursor: data.nextCursor,
                loading: false,
                loadingMore: false,
              }));
            })
            .catch((e) => {
              if ((e as DOMException)?.name === 'AbortError') return;
              const msg =
                e instanceof Error ? e.message : 'Benutzerliste konnte nicht geladen werden.';
              setState((prev) => ({ ...prev, loading: false, loadingMore: false, error: msg }));
            });
        }, ms);
        retryTimeoutRef.current = timeoutId as unknown as number;
        return undefined;
      }
      const message = error instanceof Error ? error.message : strings.errors.userListLoad;
      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMore: false,
        error: message,
      }));
      throw error;
    }
  }, [strings.errors.userListLoad]);

  const loadMore = useCallback(async () => {
    if (!state.nextCursor) return null;
    setState((prev) => ({
      ...prev,
      loadingMore: true,
      error: undefined,
    }));
    try {
      const current = filtersRef.current ?? cleanFilters({});
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const data = await fetchAdminUsersList(
        {
          search: current.search ?? undefined,
          status: current.status ?? undefined,
          plan: current.plan ?? undefined,
          cursor: state.nextCursor,
          limit: 20,
        },
        controller.signal
      );
      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...(data.items ?? [])],
        nextCursor: data.nextCursor,
        loadingMore: false,
      }));
      return data;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return null;
      if (error instanceof AdminApiError && error.status === 429 && error.retryAfterSec) {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        const snapshotCursor = state.nextCursor;
        const ms = Math.max(0, Math.floor(error.retryAfterSec * 1000));
        const timeoutId = window.setTimeout(() => {
          const current2 = filtersRef.current ?? cleanFilters({});
          const next = new AbortController();
          controllerRef.current = next;
          fetchAdminUsersList(
            {
              search: current2.search ?? undefined,
              status: current2.status ?? undefined,
              plan: current2.plan ?? undefined,
              cursor: snapshotCursor,
              limit: 20,
            },
            next.signal
          )
            .then((data) => {
              setState((prev) => ({
                ...prev,
                items: [...prev.items, ...(data.items ?? [])],
                nextCursor: data.nextCursor,
                loadingMore: false,
              }));
            })
            .catch((e) => {
              if ((e as DOMException)?.name === 'AbortError') return;
              const msg =
                e instanceof Error ? e.message : 'Weitere Benutzer konnten nicht geladen werden.';
              setState((prev) => ({ ...prev, loadingMore: false, error: msg }));
            });
        }, ms);
        retryTimeoutRef.current = timeoutId as unknown as number;
        return null;
      }
      const message = error instanceof Error ? error.message : strings.errors.userListLoadMore;
      setState((prev) => ({
        ...prev,
        loadingMore: false,
        error: message,
      }));
      throw error;
    }
  }, [state.nextCursor, strings.errors.userListLoadMore]);

  const runLifecycleAction = useCallback(
    async (
      userId: string,
      action: (userId: string) => Promise<AdminUserActionResult>,
      errorMessage: string
    ) => {
      setState((prev) => ({
        ...prev,
        actionStates: { ...prev.actionStates, [userId]: true },
        actionError: undefined,
      }));
      try {
        const result = await action(userId);
        setState((prev) => ({
          ...prev,
          items: mergeActionResult(prev.items, userId, result),
          actionStates: { ...prev.actionStates, [userId]: false },
        }));
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : errorMessage;
        setState((prev) => ({
          ...prev,
          actionStates: { ...prev.actionStates, [userId]: false },
          actionError: message,
        }));
        throw error;
      }
    },
    []
  );

  const banUser = useCallback(
    async (userId: string, payload: { reason?: string; sendEmail?: boolean } = {}) => {
      return runLifecycleAction(userId, (id) => adminBanUser(id, payload), strings.errors.userBan);
    },
    [runLifecycleAction, strings.errors.userBan]
  );

  const unbanUser = useCallback(
    async (userId: string, payload: { reason?: string; sendEmail?: boolean } = {}) => {
      return runLifecycleAction(
        userId,
        (id) => adminUnbanUser(id, payload),
        strings.errors.userUnban
      );
    },
    [runLifecycleAction, strings.errors.userUnban]
  );

  const deleteUser = useCallback(
    async (userId: string, payload: { reason?: string; sendEmail?: boolean } = {}) => {
      return runLifecycleAction(
        userId,
        (id) => adminDeleteUser(id, payload),
        strings.errors.userDelete
      );
    },
    [runLifecycleAction, strings.errors.userDelete]
  );

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    items: state.items,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    actionError: state.actionError,
    actionStates: state.actionStates,
    hasMore: Boolean(state.nextCursor),
    refresh,
    loadMore,
    banUser,
    unbanUser,
    deleteUser,
  };
}
