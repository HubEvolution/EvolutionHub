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
import type { ReportReason } from '../lib/types/comments';

// Standardized API response shapes
type ApiError = { success: false; error: { type: string; message: string } };
type ApiSuccess<T> = { success: true; data: T };
type ApiResult<T> = ApiSuccess<T> | ApiError;

interface CommentStore {
  // State
  comments: Comment[];
  stats: CommentStats | null;
  currentUser: { id: string; name: string; email: string; image?: string } | null;
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  pageSize: number;

  // Actions
  fetchComments: (filters?: CommentFilters, append?: boolean) => Promise<void>;
  createComment: (data: CreateCommentRequest, csrfToken?: string | null) => Promise<Comment>;
  updateComment: (
    commentId: string,
    data: UpdateCommentRequest,
    csrfToken: string
  ) => Promise<Comment>;
  deleteComment: (commentId: string, csrfToken: string) => Promise<void>;
  reportComment: (
    commentId: string,
    reason: ReportReason,
    description?: string,
    csrfToken?: string | null
  ) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  setCurrentUser: (
    user: { id: string; name: string; email: string; image?: string } | null
  ) => void;
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

          const data = (await response.json()) as ApiResult<CommentListResponse>;

          if (data.success) {
            const isAdmin = get().currentUser?.email === 'admin@hub-evolution.com';
            const nextComments = append
              ? [...get().comments, ...data.data.comments]
              : data.data.comments;

            let stats: CommentStats | null = null;

            if (
              isAdmin &&
              typeof window !== 'undefined' &&
              filters.entityType &&
              filters.entityId
            ) {
              try {
                const adminUrl = new URL('/api/admin/comments', window.location.origin);
                adminUrl.searchParams.set('entityType', filters.entityType);
                adminUrl.searchParams.set('entityId', filters.entityId);
                adminUrl.searchParams.set('limit', '1');
                adminUrl.searchParams.set('offset', '0');

                const adminRes = await fetch(adminUrl.toString(), {
                  credentials: 'same-origin',
                });

                if (adminRes.ok) {
                  const adminJson = (await adminRes.json()) as {
                    success?: boolean;
                    data?: {
                      stats?: {
                        total: number;
                        pending: number;
                        approved: number;
                        rejected: number;
                        flagged: number;
                      };
                    };
                  };

                  if (adminJson.success && adminJson.data?.stats) {
                    const s = adminJson.data.stats as {
                      total: number;
                      pending: number;
                      approved: number;
                      rejected: number;
                      flagged: number;
                      hidden?: number;
                    };
                    stats = {
                      total: s.total,
                      pending: s.pending,
                      approved: s.approved,
                      rejected: s.rejected,
                      flagged: s.flagged,
                      hidden: s.hidden ?? 0,
                    };
                  }
                }
              } catch {
                // Admin-Stats sind optional; bei Fehlern einfach keine detaillierten Stats setzen
                stats = null;
              }
            }

            set({
              comments: nextComments,
              stats,
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
          authorId: currentUser?.id ?? null,
          authorName: currentUser?.name || 'Du',
          authorEmail: currentUser?.email || '',
          authorImage: currentUser?.image || null,
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

        // Immutable helpers for nested comment trees
        const hasCommentById = (nodes: Comment[], id: string): boolean => {
          for (const n of nodes) {
            if (n.id === id) return true;
            if (n.replies && n.replies.length && hasCommentById(n.replies, id)) return true;
          }
          return false;
        };

        const insertReply = (nodes: Comment[], parentId: string, reply: Comment): Comment[] => {
          return nodes.map((n) => {
            if (n.id === parentId) {
              const nextReplies = n.replies ? [...n.replies, reply] : [reply];
              return { ...n, replies: nextReplies };
            }
            if (n.replies && n.replies.length) {
              const next = insertReply(n.replies, parentId, reply);
              // Only spread if children actually changed; safe to always spread for simplicity
              return { ...n, replies: next };
            }
            return n;
          });
        };

        const replaceById = (nodes: Comment[], id: string, replacement: Comment): Comment[] => {
          return nodes.map((n) => {
            if (n.id === id) return replacement;
            if (n.replies && n.replies.length) {
              const next = replaceById(n.replies, id, replacement);
              return next !== n.replies ? { ...n, replies: next } : n;
            }
            return n;
          });
        };

        const removeById = (nodes: Comment[], id: string): Comment[] => {
          let changed = false;
          const filtered = nodes
            .map((n) => {
              if (n.replies && n.replies.length) {
                const nextReplies = removeById(n.replies, id);
                if (nextReplies !== n.replies) {
                  changed = true;
                  return { ...n, replies: nextReplies };
                }
              }
              return n;
            })
            .filter((n) => {
              const keep = n.id !== id;
              if (!keep) changed = true;
              return keep;
            });
          return changed ? filtered : nodes;
        };

        // Insert optimistically: reply under parent, otherwise top-level
        set((state) => {
          if (data.parentId && hasCommentById(state.comments, data.parentId)) {
            return { comments: insertReply(state.comments, data.parentId, optimisticComment) };
          }
          return { comments: [optimisticComment, ...state.comments] };
        });

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
            const err = (await response.json().catch(() => null)) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const result = (await response.json()) as ApiResult<Comment>;

          if (result.success) {
            // 3. Replace temporary comment with real one from server (nested-safe)
            set((state) => ({
              comments: replaceById(state.comments, tempId, result.data),
              isLoading: false,
            }));
            return result.data;
          } else {
            throw new Error(result.error?.message || 'Failed to create comment');
          }
        } catch (error) {
          // 4. Rollback on error: Remove optimistic comment (nested-safe)
          set((state) => ({
            comments: removeById(state.comments, tempId),
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
            const err = (await response.json().catch(() => null)) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const result = (await response.json()) as ApiResult<Comment>;

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
            const err = (await response.json().catch(() => null)) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const result = (await response.json()) as ApiResult<{ message: string }>;

          if (result.success) {
            // Remove comment from local state
            const currentComments = get().comments;
            const updatedComments = currentComments.filter((c) => c.id !== commentId);
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
            const err = (await response.json().catch(() => null)) as ApiError | null;
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }

          const data = (await response.json()) as ApiResult<CommentStats>;

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
        await get().fetchComments(
          {
            ...baseFilters,
            entityType: baseFilters.entityType,
            entityId: baseFilters.entityId,
            limit: state.pageSize,
            offset: state.comments.length,
          },
          true
        );
      },

      setPageSize: (size: number) => set({ pageSize: Math.max(1, size) }),
    }),
    {
      name: 'comment-store',
    }
  )
);
