import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { CommentForm } from './CommentForm';
import { Button } from '../ui/Button';
import type { Comment } from '../../lib/types/comments';

interface CommentListProps {
  comments: Comment[];
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: number; name: string; email: string } | null;
  isLoading?: boolean;
  maxDepth?: number;
}

interface CommentItemProps {
  comment: Comment;
  depth: number;
  maxDepth: number;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: number; name: string; email: string } | null;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  maxDepth,
  onUpdateComment,
  onDeleteComment,
  onReply,
  currentUser,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isAuthor = currentUser?.id === comment.authorId;
  const canReply = depth < maxDepth;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const formatDate = (timestamp: number) => {
    return formatDistanceToNow(timestamp * 1000, {
      addSuffix: true,
      locale: de,
    });
  };

  const getStatusBadge = (status: Comment['status']) => {
    const badges = {
      pending: { text: 'Warten auf Freigabe', className: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'Freigegeben', className: 'bg-green-100 text-green-800' },
      rejected: { text: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      flagged: { text: 'Markiert', className: 'bg-orange-100 text-orange-800' },
      hidden: { text: 'Versteckt', className: 'bg-gray-100 text-gray-800' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
      >
        {badge.text}
      </span>
    );
  };

  const handleReply = async (content: string) => {
    await onReply(content, comment.id);
    setIsReplying(false);
  };

  const handleEdit = async (content: string) => {
    await onUpdateComment(comment.id, content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Bist du sicher, dass du diesen Kommentar löschen möchtest?')) {
      await onDeleteComment(comment.id);
    }
  };

  if (comment.status === 'hidden') {
    return null;
  }

  return (
    <div
      className={`comment-item ${depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {comment.authorName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-gray-500 dark:text-gray-400">(bearbeitet)</span>
            )}
            {getStatusBadge(comment.status)}
          </div>

          {/* Comment Text */}
          {isEditing ? (
            <div className="mb-3">
              <CommentForm
                onSubmit={handleEdit}
                onCancel={() => setIsEditing(false)}
                initialValue={comment.content}
                isEdit={true}
                submitText="Änderungen speichern"
                showCancel={true}
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none mb-3">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          )}

          {/* Comment Actions */}
          {!isEditing && (
            <div className="flex items-center space-x-2 mb-3">
              {canReply && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Antworten
                </button>
              )}

              {isAuthor && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Löschen
                  </button>
                </>
              )}

              {comment.reportCount > 0 && (
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  {comment.reportCount} Meldung{comment.reportCount !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mb-4">
              <CommentForm
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                parentId={comment.id}
                submitText="Antwort senden"
                showCancel={true}
                placeholder="Schreibe eine Antwort..."
              />
            </div>
          )}

          {/* Show/Hide Replies */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 mb-2"
            >
              {showReplies ? '▼' : '▶'} {comment.replies!.length} Antwort
              {comment.replies!.length !== 1 ? 'en' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {hasReplies && showReplies && (
        <div className="mt-4 space-y-4">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              onReply={onReply}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  onUpdateComment,
  onDeleteComment,
  onReply,
  currentUser,
  isLoading = false,
  maxDepth = 3,
}) => {
  if (isLoading && comments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white dark:bg-gray-800">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Kommentare werden geladen...
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Noch keine Kommentare vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="comment-list space-y-6">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={0}
          maxDepth={maxDepth}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
          onReply={onReply}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
};
