import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getCsrfToken } from '../lib/security/csrf';
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters,
  CommentStats,
} from '../lib/types/comments';

interface CommentStore {
  // State
  comments: Comment[];
  stats: CommentStats | null;
  currentUser: { id: number; name: string; email: string } | null;
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchComments: (filters?: CommentFilters) => Promise<void>;
  createComment: (data: CreateCommentRequest, csrfToken?: string | null) => Promise<Comment>;
  updateComment: (commentId: string, data: UpdateCommentRequest, csrfToken: string) => Promise<Comment>;
  deleteComment: (commentId: string, csrfToken: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  setCurrentUser: (user: { id: number; name: string; email: string } | null) => void;
  initializeCsrfToken: () => Promise<void>;
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

      // Actions
      fetchComments: async (filters: CommentFilters = {}) => {
        set({ isLoading: true, error: null });

        try {
          const queryParams = new URLSearchParams();

          if (filters.status) queryParams.append('status', filters.status);
          if (filters.entityType) queryParams.append('entityType', filters.entityType);
          if (filters.entityId) queryParams.append('entityId', filters.entityId);
          if (filters.authorId) queryParams.append('authorId', filters.authorId.toString());
          if (filters.limit) queryParams.append('limit', filters.limit.toString());
          if (filters.offset) queryParams.append('offset', filters.offset.toString());
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            set({
              comments: data.data.comments,
              stats: data.data.total !== undefined ? {
                total: data.data.total,
                approved: data.data.comments.filter((c: Comment) => c.status === 'approved').length,
                pending: data.data.comments.filter((c: Comment) => c.status === 'pending').length,
                rejected: data.data.comments.filter((c: Comment) => c.status === 'rejected').length,
                flagged: data.data.comments.filter((c: Comment) => c.status === 'flagged').length,
                hidden: data.data.comments.filter((c: Comment) => c.status === 'hidden').length,
              } : null,
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

        try {
          const token = csrfToken || get().csrfToken;
          if (!token) {
            throw new Error('CSRF token not available');
          }

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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            set({ isLoading: false });
            return result.data;
          } else {
            throw new Error(result.error?.message || 'Failed to create comment');
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create comment',
          });
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const result = await response.json();

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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const result = await response.json();

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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const data = await response.json();

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
          const token = await getCsrfToken();
          set({ csrfToken: token });
        } catch (error) {
          console.error('Failed to initialize CSRF token:', error);
        }
      },
    }),
    {
      name: 'comment-store',
    }
  )
);