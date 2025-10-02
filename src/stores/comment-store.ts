import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ensureCsrfToken } from '../lib/security/csrf';
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters,
  CommentStats,
  CommentListResponse,
} from '../lib/types/comments';

// Standardized API response shapes
type ApiError = { success: false; error: { type: string; message: string } };
type ApiSuccess<T> = { success: true; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiError;

interface CommentStore {
  // State
  comments: Comment[];
  stats: CommentStats | null;
  currentUser: { id: number; name: string; email: string } | null;
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  pageSize: number;

  // Actions
  fetchComments: (filters?: CommentFilters, append?: boolean) => Promise<void>;
  createComment: (data: CreateCommentRequest, csrfToken?: string | null) => Promise<Comment>;
  updateComment: (commentId: string, data: UpdateCommentRequest, csrfToken: string) => Promise<Comment>;
  deleteComment: (commentId: string, csrfToken: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  setCurrentUser: (user: { id: number; name: string; email: string } | null) => void;
  initializeCsrfToken: () => Promise<void>;
  loadMoreComments: (baseFilters?: CommentFilters) => Promise<void>;
  setPageSize: (size: number) => void;
}

export const useCommentStore = create<CommentStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      comments: [],
      stats: null,
      currentUser: null,
      csrfToken: null,
      isLoading: false,
      error: null,
      hasMore: false,
      pageSize: 20,

      // Actions
      fetchComments: async (filters: CommentFilters = {}, append: boolean = false) => {
        set({ isLoading: true, error: null });

        try {
          const { pageSize } = get();
          const queryParams = new URLSearchParams();

          if (filters.status) queryParams.append('status', filters.status);
          if (filters.entityType) queryParams.append('entityType', filters.entityType);
          if (filters.entityId) queryParams.append('entityId', filters.entityId);
          if (filters.authorId) queryParams.append('authorId', filters.authorId.toString());
          const limit = filters.limit ?? pageSize;
          const offset = filters.offset ?? (append ? get().comments.length : 0);
          queryParams.append('limit', String(limit));
          queryParams.append('offset', String(offset));
          if (filters.includeReplies !== undefined) {
            queryParams.append('includeReplies', filters.includeReplies.toString());
          }

          const response = await fetch(`/api/comments?${queryParams}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
          });

          if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as Partial<ApiError>;
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const data = await response.json() as ApiResult<CommentListResponse>;

          if (data.success) {
            const nextComments = append ? [...get().comments, ...data.data.comments] : data.data.comments;
            set({
              comments: nextComments,
              stats: data.data.total !== undefined ? {
                total: data.data.total,
                approved: data.data.comments.filter((c: Comment) => c.status === 'approved').length,
                pending: data.data.comments.filter((c: Comment) => c.status === 'pending').length,
                rejected: data.data.comments.filter((c: Comment) => c.status === 'rejected').length,
                flagged: data.data.comments.filter((c: Comment) => c.status === 'flagged').length,
                hidden: data.data.comments.filter((c: Comment) => c.status === 'hidden').length,
              } : null,
              hasMore: data.data.hasMore,
              isLoading: false,
            });
          } else {
            throw new Error(data.error?.message || 'Failed to fetch comments');
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch comments',
          });
          throw error;
        }
      },

      createComment: async (data: CreateCommentRequest, csrfToken?: string | null) => {
        set({ isLoading: true, error: null });

        // 1. Optimistic Update: Add comment immediately to UI
        const tempId = `temp-${Date.now()}`;
        const currentUser = get().currentUser;
        const optimisticComment: Comment = {
          id: tempId,
          content: data.content,
          authorId: currentUser?.id || 0,
          authorName: currentUser?.name || 'Du',
          authorEmail: currentUser?.email || '',
          parentId: data.parentId || undefined,
          entityType: data.entityType,
          entityId: data.entityId,
          status: 'pending',
          isEdited: false,
          editedAt: undefined,
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
          replies: [],
          reportCount: 0,
        };

        set(state => ({
          comments: [optimisticComment, ...state.comments],
        }));

        try {
          const token = csrfToken || get().csrfToken;
          if (!token) {
            throw new Error('CSRF token not available');
          }

          // 2. Server Request
          const response = await fetch('/api/comments/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': token,
            },
            credentials: 'same-origin',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => null) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const result = await response.json() as ApiResult<Comment>;

          if (result.success) {
            // 3. Replace temporary comment with real one from server
            set(state => ({
              comments: state.comments.map(c =>
                c.id === tempId ? result.data : c
              ),
              isLoading: false,
            }));
            return result.data;
          } else {
            throw new Error(result.error?.message || 'Failed to create comment');
          }
        } catch (error) {
          // 4. Rollback on error: Remove optimistic comment
          set(state => ({
            comments: state.comments.filter(c => c.id !== tempId),
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create comment',
          }));
          throw error;
        }
      },

      updateComment: async (commentId: string, data: UpdateCommentRequest, csrfToken: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            credentials: 'same-origin',
            body: JSON.stringify({ ...data, csrfToken }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => null) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const result = await response.json() as ApiResult<Comment>;

          if (result.success) {
            set({ isLoading: false });
            return result.data;
          } else {
            throw new Error(result.error?.message || 'Failed to update comment');
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update comment',
          });
          throw error;
        }
      },

      deleteComment: async (commentId: string, csrfToken: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            credentials: 'same-origin',
            body: JSON.stringify({ csrfToken }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => null) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const result = await response.json() as ApiResult<{ message: string }>;

          if (result.success) {
            // Remove comment from local state
            const currentComments = get().comments;
            const updatedComments = currentComments.filter(c => c.id !== commentId);
            set({ comments: updatedComments, isLoading: false });
          } else {
            throw new Error(result.error?.message || 'Failed to delete comment');
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to delete comment',
          });
          throw error;
        }
      },

      fetchStats: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/comments/stats', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
          });

          if (!response.ok) {
            const err = await response.json().catch(() => null) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const data = await response.json() as ApiResult<CommentStats>;

          if (data.success) {
            set({ stats: data.data, isLoading: false });
          } else {
            throw new Error(data.error?.message || 'Failed to fetch stats');
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch stats',
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setCurrentUser: (user) => {
        set({ currentUser: user });
      },

      initializeCsrfToken: async () => {
        try {
          const token = ensureCsrfToken();
          set({ csrfToken: token });
        } catch (error) {
          console.error('Failed to initialize CSRF token:', error);
        }
      },

      loadMoreComments: async (baseFilters: CommentFilters = {}) => {
        const state = get();
        if (!state.hasMore || state.isLoading) return;
        await get().fetchComments({
          ...baseFilters,
          entityType: baseFilters.entityType,
          entityId: baseFilters.entityId,
          limit: state.pageSize,
          offset: state.comments.length,
        }, true);
      },

      setPageSize: (size: number) => set({ pageSize: Math.max(1, size) }),
    }),
    {
      name: 'comment-store',
    }
  )
);