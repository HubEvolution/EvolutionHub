import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CommentForm } from './CommentForm';
import { Button } from '../ui/Button';
import type { Comment, ReportReason } from '../../lib/types/comments';
import { useCommentStore } from '../../stores/comment-store';
import { getLocale } from '@/lib/i18n';
import { localizePath } from '@/lib/locale-path';
import { sanitizeCommentContent } from '@/lib/security/sanitize';

/**
 * Hook to detect if user is on mobile device
 * Defaults to viewport width only; touch detection can be enabled via options.
 */
export function useIsMobile(
  breakpoint: number = 768,
  options?: { considerTouch?: boolean; touchOverridesWidth?: boolean }
): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const considerTouch = options?.considerTouch ?? false;
    const touchOverridesWidth = options?.touchOverridesWidth ?? false;

    const checkMobile = () => {
      const width = window.innerWidth;
      const isWidthMobile = width < breakpoint;
      if (considerTouch) {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const touchMobile = touchOverridesWidth ? hasTouch : hasTouch && isWidthMobile;
        setIsMobile(isWidthMobile || touchMobile);
      } else {
        setIsMobile(isWidthMobile);
      }
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint, options?.considerTouch, options?.touchOverridesWidth]);

  return isMobile;
}

interface CommentMobileProps {
  comments: Comment[];
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: string; name: string; email: string; image?: string } | null;
  maxDepth?: number;
  enableSwipeActions?: boolean;
}

interface MobileCommentItemProps {
  comment: Comment;
  depth: number;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: string; name: string; email: string; image?: string } | null;
  maxDepth?: number;
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
            maxDepth={maxDepth}
            enableSwipeActions={enableSwipeActions}
          />
        ))}
      </div>

      {/* Floating Action Button for new comment */}
      <MobileCommentFAB
        currentUser={currentUser ?? null}
        onNewComment={() => {
          try {
            const el = document.getElementById('comments');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              // Fallback to anchor
              if (typeof window !== 'undefined') {
                window.location.hash = '#comments';
              }
            }
            // Optionally emit a custom event to focus a form when available
            document.dispatchEvent(new CustomEvent('eh:comments:new'));
          } catch {
            /* no-op */
          }
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
  maxDepth = 3,
  enableSwipeActions = true,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reported, setReported] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const { reportComment, csrfToken, initializeCsrfToken } = useCommentStore();
  const sanitizedContent = useMemo(
    () => sanitizeCommentContent(comment.content),
    [comment.content]
  );
  const loc = getLocale(typeof window !== 'undefined' ? window.location.pathname : '/');
  const t = (k: string) => {
    const deT: Record<string, string> = {
      melden: 'Melden',
      gemeldet: 'Gemeldet',
      grund: 'Grund',
      beschreibung: 'Beschreibung (optional)',
      abbrechen: 'Abbrechen',
      senden: 'Senden',
      toast: 'Danke für deine Meldung',
    };
    const enT: Record<string, string> = {
      melden: 'Report',
      gemeldet: 'Reported',
      grund: 'Reason',
      beschreibung: 'Description (optional)',
      abbrechen: 'Cancel',
      senden: 'Submit',
      toast: 'Thanks for your report',
    };
    return (loc === 'de' ? deT : enT)[k] || k;
  };

  const isAuthor = currentUser?.id === comment.authorId;
  const isAdmin = currentUser?.email === 'admin@hub-evolution.com';
  const canEditDelete = isAuthor || !!isAdmin;
  const canReply = depth < maxDepth;

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

  const openReport = () => {
    if (!csrfToken) initializeCsrfToken();
    setIsReporting(true);
  };

  const submitReport = async () => {
    await reportComment(comment.id, reportReason, reportDescription, csrfToken || null);
    setIsReporting(false);
    setReportDescription('');
    setReportReason('spam');
    setReported(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
              {comment.authorImage ? (
                <img
                  src={comment.authorImage}
                  alt="User avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : currentUser?.id === comment.authorId && currentUser?.image ? (
                <img
                  src={currentUser.image}
                  alt="User avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {comment.authorName.charAt(0).toUpperCase()}
                </div>
              )}

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
            <div className="mb-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
            </div>
          )}
          {comment.isEdited && (
            <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
              (bearbeitet)
            </span>
          )}

          {/* Comment Stats */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="flex items-center space-x-4 mb-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {comment.replies.length} Antwort{comment.replies.length !== 1 ? 'en' : ''}
              </span>
              {(comment.reportCount ?? 0) > 0 && (
                <span className="text-orange-600 dark:text-orange-400">
                  {comment.reportCount ?? 0} Meldung{(comment.reportCount ?? 0) !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {canReply && currentUser && (
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
                {canEditDelete && (
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
                {currentUser &&
                  (reported ? (
                    <span className="text-xs text-orange-500 opacity-60">{t('gemeldet')}</span>
                  ) : (
                    <button
                      className="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                      onClick={openReport}
                    >
                      {t('melden')}
                    </button>
                  ))}
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
              onSubmit={async (content) => {
                await onReply(content, comment.id);
                setIsReplying(false);
              }}
              onCancel={() => setIsReplying(false)}
              parentId={comment.id}
              currentUser={currentUser}
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
              currentUser={currentUser ?? null}
              maxDepth={maxDepth}
              enableSwipeActions={enableSwipeActions}
            />
          ))}
        </div>
      )}

      {isReporting &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`report-dialog-title-${comment.id}`}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsReporting(false);
            }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsReporting(false)}
              aria-hidden="true"
            ></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-sm p-4">
              <h3
                id={`report-dialog-title-${comment.id}`}
                className="text-sm font-medium mb-3 text-gray-900 dark:text-white"
              >
                {t('melden')}
              </h3>
              <div className="space-y-2 mb-3 text-sm">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">{t('grund')}</label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-2 text-sm"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReportReason)}
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Belästigung</option>
                  <option value="inappropriate">Unangemessen</option>
                  <option value="off_topic">Off-Topic</option>
                  <option value="other">Andere</option>
                </select>
              </div>
              <div className="mb-4 text-sm">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  {t('beschreibung')}
                </label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-2 text-sm"
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  onClick={() => setIsReporting(false)}
                >
                  {t('abbrechen')}
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700"
                  onClick={submitReport}
                >
                  {t('senden')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showToast &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
            {t('toast')}
          </div>,
          document.body
        )}
    </div>
  );
};

// Floating Action Button for new comments
interface MobileCommentFABProps {
  onNewComment: () => void;
  currentUser: { id: string; name: string; email: string; image?: string } | null;
}

const MobileCommentFAB: React.FC<MobileCommentFABProps> = ({ onNewComment, currentUser }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const locale = getLocale(typeof window !== 'undefined' ? window.location.pathname : '/');
  const loginUrl =
    localizePath(locale, '/login') +
    (typeof window !== 'undefined'
      ? `?returnTo=${encodeURIComponent(window.location.href + '#comments')}`
      : '');
  const menuId = 'mobile-fab-menu';

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
      <div
        className="fixed bottom-4 right-4 z-50 md:hidden"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isExpanded) setIsExpanded(false);
        }}
      >
        {/* Expanded Menu */}
        {isExpanded && (
          <div
            className="absolute bottom-16 right-0 mb-2 space-y-2"
            id={menuId}
            role="menu"
            aria-label="Kommentar-Aktionen"
          >
            {currentUser ? (
              <button
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg text-sm font-medium"
                role="menuitem"
                onClick={() => {
                  onNewComment();
                  setIsExpanded(false);
                }}
              >
                Kommentar schreiben
              </button>
            ) : (
              <a
                href={loginUrl}
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg text-sm font-medium"
                role="menuitem"
                onClick={() => setIsExpanded(false)}
              >
                Anmelden zum Kommentieren
              </a>
            )}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
          aria-haspopup="menu"
          aria-expanded={isExpanded}
          aria-controls={menuId}
          aria-label="Kommentar-Aktionen"
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
