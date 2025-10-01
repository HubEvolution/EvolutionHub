import React, { useState, useEffect } from 'react';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { CommentStats } from './CommentStats';
import { CommentMobile, useIsMobile } from './CommentMobile';
import { useCommentStore } from '../../stores/comment-store';
import type { CommentEntityType } from '../../lib/types/comments';

interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: string;
  title?: string;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  entityType,
  entityId,
  title = "Kommentare",
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect if mobile device
  const isMobile = useIsMobile(768);

  const {
    comments,
    stats,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    currentUser,
    csrfToken,
    initializeCsrfToken,
    hasMore,
    loadMoreComments,
  } = useCommentStore();

  // Load comments on mount
  useEffect(() => {
    // Ensure CSRF token exists once on mount
    if (!csrfToken) {
      try { initializeCsrfToken(); } catch {}
    }
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchComments({
        entityType,
        entityId,
        includeReplies: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kommentare');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;

    try {
      await createComment({
        content: content.trim(),
        entityType,
        entityId,
        parentId,
      }, csrfToken);

      // Reload comments to show the new one
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Kommentars');
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;

    try {
      if (!csrfToken) {
        setError('Sicherheits-Token fehlt. Bitte Seite aktualisieren.');
        return;
      }
      await updateComment(commentId, {
        content: content.trim(),
      }, csrfToken);

      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Kommentars');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      if (!csrfToken) {
        setError('Sicherheits-Token fehlt. Bitte Seite aktualisieren.');
        return;
      }
      await deleteComment(commentId, csrfToken);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Kommentars');
    }
  };

  const handleRetry = () => {
    loadComments();
  };

  // If mobile, use mobile-optimized component
  if (isMobile) {
    return (
      <div className={`comment-section comment-section--mobile ${className}`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h2>

          {stats && <CommentStats stats={stats} />}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-sm font-medium text-red-800 hover:text-red-600"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        <CommentMobile
          comments={comments}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onReply={handleCreateComment}
          currentUser={currentUser}
          maxDepth={3}
          enableSwipeActions={true}
        />
      </div>
    );
  }

  // Desktop variant
  return (
    <div className={`comment-section ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>

        {/* Comment Stats */}
        {stats && (
          <CommentStats stats={stats} />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-600"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Form */}
      <div className="mb-8">
        <CommentForm
          onSubmit={handleCreateComment}
          isLoading={isLoading}
          currentUser={currentUser}
          placeholder={`Schreibe einen Kommentar...`}
        />
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {isLoading && comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white dark:bg-gray-800 transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Kommentare werden geladen...
            </div>
          </div>
        ) : comments.length > 0 ? (
          <CommentList
            comments={comments}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            onReply={handleCreateComment}
            currentUser={currentUser}
            isLoading={isLoading}
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Noch keine Kommentare vorhanden.</p>
              <p className="text-sm mt-1">Sei der Erste und schreibe einen Kommentar!</p>
            </div>
          </div>
        )}

        {comments.length > 0 && hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={() => loadMoreComments({ entityType, entityId, includeReplies: true })}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              {isLoading ? 'Laden…' : 'Mehr laden'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};