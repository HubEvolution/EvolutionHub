import { useCallback, useRef, useState } from 'react';
import {
  fetchAdminUsersList,
  adminBanUser,
  adminUnbanUser,
  adminDeleteUser,
  type AdminUserListItem,
  type AdminUserActionResult,
} from '@/lib/admin/api-client';

export type AdminUserListFilters = {
  search?: string;
  status?: 'active' | 'banned' | 'deleted';
  plan?: 'free' | 'pro' | 'premium' | 'enterprise';
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
  const cleaned: AdminUserListFilters = {};
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

  const refresh = useCallback(async (filters?: AdminUserListFilters) => {
    const applied = cleanFilters(filters ?? filtersRef.current ?? {});
    filtersRef.current = applied;
    setState((prev) => ({
      ...prev,
      loading: true,
      error: undefined,
      actionError: undefined,
    }));
    try {
      const data = await fetchAdminUsersList(applied);
      setState((prev) => ({
        ...prev,
        items: data.items ?? [],
        nextCursor: data.nextCursor,
        loading: false,
        loadingMore: false,
      }));
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Benutzerliste konnte nicht geladen werden.';
      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMore: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!state.nextCursor) return null;
    setState((prev) => ({
      ...prev,
      loadingMore: true,
      error: undefined,
    }));
    try {
      const data = await fetchAdminUsersList({ ...filtersRef.current, cursor: state.nextCursor });
      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...(data.items ?? [])],
        nextCursor: data.nextCursor,
        loadingMore: false,
      }));
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Weitere Benutzer konnten nicht geladen werden.';
      setState((prev) => ({
        ...prev,
        loadingMore: false,
        error: message,
      }));
      throw error;
    }
  }, [state.nextCursor]);

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
      return runLifecycleAction(
        userId,
        (id) => adminBanUser(id, payload),
        'Benutzer konnte nicht gesperrt werden.'
      );
    },
    [runLifecycleAction]
  );

  const unbanUser = useCallback(
    async (userId: string, payload: { reason?: string; sendEmail?: boolean } = {}) => {
      return runLifecycleAction(
        userId,
        (id) => adminUnbanUser(id, payload),
        'Benutzer konnte nicht entsperrt werden.'
      );
    },
    [runLifecycleAction]
  );

  const deleteUser = useCallback(
    async (userId: string, payload: { reason?: string; sendEmail?: boolean } = {}) => {
      return runLifecycleAction(
        userId,
        (id) => adminDeleteUser(id, payload),
        'Benutzer konnte nicht gelöscht werden.'
      );
    },
    [runLifecycleAction]
  );

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
