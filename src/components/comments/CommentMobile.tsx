import React, { useState, useEffect } from 'react';
import { CommentForm } from './CommentForm';
import { Button } from '../ui/Button';
import type { Comment } from '../../lib/types/comments';

/**
 * Hook to detect if user is on mobile device
 * Uses viewport width and touch capability
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(width < breakpoint || hasTouch);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface CommentMobileProps {
  comments: Comment[];
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: number; name: string; email: string } | null;
  maxDepth?: number;
  enableSwipeActions?: boolean;
}

interface MobileCommentItemProps {
  comment: Comment;
  depth: number;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: number; name: string; email: string } | null;
  enableSwipeActions?: boolean;
}

export const CommentMobile: React.FC<CommentMobileProps> = ({
  comments,
  onUpdateComment,
  onDeleteComment,
  onReply,
  currentUser,
  maxDepth = 3,
  enableSwipeActions = true,
}) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Listen for keyboard visibility changes
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.innerHeight;
      const visualViewportHeight = window.visualViewport?.height || viewportHeight;
      setIsKeyboardVisible(visualViewportHeight < viewportHeight * 0.8);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`comment-mobile ${isKeyboardVisible ? 'keyboard-visible' : ''}`}>
      {/* Mobile-optimized comment list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <MobileCommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            onUpdateComment={onUpdateComment}
            onDeleteComment={onDeleteComment}
            onReply={onReply}
            currentUser={currentUser}
            enableSwipeActions={enableSwipeActions}
          />
        ))}
      </div>

      {/* Floating Action Button for new comment */}
      <MobileCommentFAB
        onNewComment={() => {
          /* Handle new comment */
        }}
      />
    </div>
  );
};

const MobileCommentItem: React.FC<MobileCommentItemProps> = ({
  comment,
  depth,
  onUpdateComment,
  onDeleteComment,
  onReply,
  currentUser,
  enableSwipeActions = true,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const isAuthor = currentUser?.id === comment.authorId;
  const canReply = depth < 3;

  // Touch handlers for swipe actions
  const touchStartX = React.useRef<number>(0);
  const touchCurrentX = React.useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipeActions) return;
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipeActions) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;

    // Only allow left swipe for actions
    if (diff < 0 && diff > -100) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!enableSwipeActions) return;

    const diff = touchCurrentX.current - touchStartX.current;

    // If swiped left more than 50px, show actions
    if (diff < -50) {
      setShowActions(true);
    }

    setSwipeOffset(0);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Gerade eben';
    } else if (diffInHours < 24) {
      return `vor ${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) {
      return `vor ${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  const getStatusBadge = (status: Comment['status']) => {
    const badges = {
      pending: { text: 'Warten', className: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'OK', className: 'bg-green-100 text-green-800' },
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

  if (comment.status === 'hidden') {
    return null;
  }

  return (
    <div className="mobile-comment-item">
      {/* Main comment card */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
          depth > 0 ? 'ml-4 border-l-4 border-l-blue-200 dark:border-l-blue-800' : ''
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Comment Header */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {/* Avatar */}
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {comment.authorName.charAt(0).toUpperCase()}
              </div>

              {/* Author and Date */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {comment.authorName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(comment.createdAt)}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">{getStatusBadge(comment.status)}</div>
          </div>

          {/* Comment Content */}
          {isEditing ? (
            <div className="mb-3">
              <CommentForm
                onSubmit={(content) => onUpdateComment(comment.id, content)}
                onCancel={() => setIsEditing(false)}
                initialValue={comment.content}
                isEdit={true}
                submitText="Speichern"
                showCancel={true}
              />
            </div>
          ) : (
            <div className="mb-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
              {comment.isEdited && (
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                  (bearbeitet)
                </span>
              )}
            </div>
          )}

          {/* Comment Stats */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="flex items-center space-x-4 mb-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {comment.replies.length} Antwort{comment.replies.length !== 1 ? 'en' : ''}
              </span>
              {comment.reportCount > 0 && (
                <span className="text-orange-600 dark:text-orange-400">
                  {comment.reportCount} Meldung{comment.reportCount !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {canReply && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    Antworten
                  </button>
                )}

                <button
                  onClick={() => setShowActions(!showActions)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  ⋯
                </button>
              </div>

              {/* Quick action for helpful */}
              <button className="text-xs text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400">
                Hilfreich
              </button>
            </div>
          )}
        </div>

        {/* Expanded Actions Menu */}
        {showActions && !isEditing && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {isAuthor && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bist du sicher, dass du diesen Kommentar löschen möchtest?')) {
                          onDeleteComment(comment.id);
                        }
                        setShowActions(false);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Löschen
                    </button>
                  </>
                )}
                <button className="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300">
                  Melden
                </button>
              </div>
              <button
                onClick={() => setShowActions(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <CommentForm
              onSubmit={(content) => {
                onReply(content, comment.id);
                setIsReplying(false);
              }}
              onCancel={() => setIsReplying(false)}
              parentId={comment.id}
              submitText="Antwort senden"
              showCancel={true}
              placeholder="Schreibe eine Antwort..."
            />
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <MobileCommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              onReply={onReply}
              currentUser={currentUser}
              enableSwipeActions={enableSwipeActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Floating Action Button for new comments
interface MobileCommentFABProps {
  onNewComment: () => void;
}

const MobileCommentFAB: React.FC<MobileCommentFABProps> = ({ onNewComment }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        {/* Expanded Menu */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 mb-2 space-y-2">
            <button className="block w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium">
              Als Gast kommentieren
            </button>
            <button className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg text-sm font-medium">
              Anmelden zum Kommentieren
            </button>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </>
  );
};

// Mobile-optimized Comment Form
interface MobileCommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
  showCancel?: boolean;
  autoFocus?: boolean;
}

export const MobileCommentForm: React.FC<MobileCommentFormProps> = ({
  onSubmit,
  onCancel,
  placeholder = 'Schreibe einen Kommentar...',
  submitText = 'Kommentar posten',
  showCancel = false,
  autoFocus = false,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      // Focus the textarea after component mounts
      const timer = setTimeout(() => {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        textarea?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.innerHeight;
      const visualViewportHeight = window.visualViewport?.height || viewportHeight;
      setIsKeyboardVisible(visualViewportHeight < viewportHeight * 0.8);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mobile-comment-form ${isKeyboardVisible ? 'keyboard-active' : ''}`}>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {content.length}/2000 Zeichen
            </span>
            {content.length > 1800 && (
              <span className="text-xs text-orange-600 dark:text-orange-400">Fast voll</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Sei respektvoll und konstruktiv
          </div>

          <div className="flex items-center space-x-2">
            {showCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Abbrechen
              </button>
            )}
            <Button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              isLoading={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? 'Wird gesendet...' : submitText}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Mobile-specific CSS classes (to be added to global styles)
export const mobileCommentStyles = `
.mobile-comment-item {
  position: relative;
  margin-bottom: 1rem;
}

.mobile-comment-item .comment-card {
  transition: transform 0.2s ease-out;
}

.keyboard-visible {
  padding-bottom: 2rem;
}

.keyboard-active .mobile-comment-form {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.dark .keyboard-active .mobile-comment-form {
  background: rgb(31 41 55);
  border-top-color: #374151;
}

/* Touch-friendly button sizes */
@media (max-width: 767px) {
  .mobile-comment-item button {
    min-height: 44px;
    min-width: 44px;
  }

  .mobile-comment-form textarea {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}

/* Swipe action styles */
.swipe-actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.1) 50%, #ef4444 100%);
  border-radius: 0 8px 8px 0;
  padding-right: 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.dark .swipe-actions {
  background: linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.1) 50%, #dc2626 100%);
}

/* Improved touch targets */
@media (hover: none) and (pointer: coarse) {
  .mobile-comment-item {
    padding: 0.5rem 0;
  }

  .mobile-comment-item button {
    padding: 0.75rem;
    margin: 0.25rem;
  }
}
`;
