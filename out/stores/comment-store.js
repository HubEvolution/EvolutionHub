'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useCommentStore = void 0;
const zustand_1 = require('zustand');
const middleware_1 = require('zustand/middleware');
const csrf_1 = require('../lib/security/csrf');
exports.useCommentStore = (0, zustand_1.create)()(
  (0, middleware_1.devtools)(
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
      fetchComments: async (filters = {}, append = false) => {
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }
          const data = await response.json();
          if (data.success) {
            const isAdmin = get().currentUser?.email === 'admin@hub-evolution.com';
            const nextComments = append
              ? [...get().comments, ...data.data.comments]
              : data.data.comments;
            set({
              comments: nextComments,
              stats:
                isAdmin && data.data.total !== undefined
                  ? {
                      total: data.data.total,
                      approved: data.data.comments.filter((c) => c.status === 'approved').length,
                      pending: data.data.comments.filter((c) => c.status === 'pending').length,
                      rejected: data.data.comments.filter((c) => c.status === 'rejected').length,
                      flagged: data.data.comments.filter((c) => c.status === 'flagged').length,
                      hidden: data.data.comments.filter((c) => c.status === 'hidden').length,
                    }
                  : null,
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
      createComment: async (data, csrfToken) => {
        set({ isLoading: true, error: null });
        // 1. Optimistic Update: Add comment immediately to UI
        const tempId = `temp-${Date.now()}`;
        const currentUser = get().currentUser;
        const optimisticComment = {
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
        const hasCommentById = (nodes, id) => {
          for (const n of nodes) {
            if (n.id === id) return true;
            if (n.replies && n.replies.length && hasCommentById(n.replies, id)) return true;
          }
          return false;
        };
        const insertReply = (nodes, parentId, reply) => {
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
        const replaceById = (nodes, id, replacement) => {
          return nodes.map((n) => {
            if (n.id === id) return replacement;
            if (n.replies && n.replies.length) {
              const next = replaceById(n.replies, id, replacement);
              return next !== n.replies ? { ...n, replies: next } : n;
            }
            return n;
          });
        };
        const removeById = (nodes, id) => {
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
            const err = await response.json().catch(() => null);
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }
          const result = await response.json();
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
      updateComment: async (commentId, data, csrfToken) => {
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
            const err = await response.json().catch(() => null);
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
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
      deleteComment: async (commentId, csrfToken) => {
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
            const err = await response.json().catch(() => null);
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
          }
          const result = await response.json();
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
            const err = await response.json().catch(() => null);
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
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
          const token = (0, csrf_1.ensureCsrfToken)();
          set({ csrfToken: token });
        } catch (error) {
          console.error('Failed to initialize CSRF token:', error);
        }
      },
      loadMoreComments: async (baseFilters = {}) => {
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
      setPageSize: (size) => set({ pageSize: Math.max(1, size) }),
    }),
    {
      name: 'comment-store',
    }
  )
);
