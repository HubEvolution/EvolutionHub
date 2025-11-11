import React, { useEffect, useCallback, useState } from 'react';
import type { Comment } from '../../lib/types/comments';

interface CommentKeyboardNavProps {
  comments: Comment[];
  onCommentFocus?: (commentId: string) => void;
  onCommentSelect?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  currentUser?: { id: string; name: string; email: string } | null;
  enabled?: boolean;
}

interface KeyboardNavigationState {
  focusedCommentId: string | null;
  selectedCommentId: string | null;
  isInNavigationMode: boolean;
}

export const CommentKeyboardNav: React.FC<CommentKeyboardNavProps> = ({
  comments,
  onCommentFocus,
  onCommentSelect,
  onReply,
  onEdit,
  onDelete,
  currentUser,
  enabled = true,
}) => {
  const [navState, setNavState] = useState<KeyboardNavigationState>({
    focusedCommentId: null,
    selectedCommentId: null,
    isInNavigationMode: false,
  });

  // Flatten comments for keyboard navigation (including replies)
  const flattenedComments = useCallback((): Comment[] => {
    const result: Comment[] = [];

    const flatten = (commentList: Comment[], depth = 0) => {
      commentList.forEach((comment) => {
        result.push(comment);
        if (comment.replies && comment.replies.length > 0) {
          flatten(comment.replies, depth + 1);
        }
      });
    };

    flatten(comments);
    return result;
  }, [comments]);

  const flatComments = flattenedComments();

  // Find comment index in flattened array
  const findCommentIndex = useCallback(
    (commentId: string): number => {
      return flatComments.findIndex((comment) => comment.id === commentId);
    },
    [flatComments]
  );

  // Navigate to next/previous comment
  const navigateComments = useCallback(
    (direction: 'up' | 'down') => {
      if (!navState.focusedCommentId || !navState.isInNavigationMode) return;

      const currentIndex = findCommentIndex(navState.focusedCommentId);
      if (currentIndex === -1) return;

      let nextIndex;
      if (direction === 'up') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : flatComments.length - 1;
      } else {
        nextIndex = currentIndex < flatComments.length - 1 ? currentIndex + 1 : 0;
      }

      const nextComment = flatComments[nextIndex];
      if (nextComment) {
        setNavState((prev) => ({
          ...prev,
          focusedCommentId: nextComment.id,
          selectedCommentId: nextComment.id,
        }));

        onCommentFocus?.(nextComment.id);

        // Scroll to comment
        const commentElement = document.querySelector(`[data-comment-id="${nextComment.id}"]`);
        commentElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
    [
      navState.focusedCommentId,
      navState.isInNavigationMode,
      findCommentIndex,
      flatComments,
      onCommentFocus,
    ]
  );

  // Handle keyboard actions
  const handleKeyboardAction = useCallback(
    (action: string, commentId: string) => {
      const comment = flatComments.find((c) => c.id === commentId);
      if (!comment) return;

      switch (action) {
        case 'reply':
          if (comment && currentUser) {
            onReply?.(commentId);
          }
          break;
        case 'edit':
          if (comment && comment.authorId && currentUser?.id === comment.authorId) {
            onEdit?.(commentId);
          }
          break;
        case 'delete':
          if (comment && comment.authorId && currentUser?.id === comment.authorId) {
            onDelete?.(commentId);
          }
          break;
        case 'select':
          setNavState((prev) => ({
            ...prev,
            selectedCommentId: commentId,
          }));
          onCommentSelect?.(commentId);
          break;
      }
    },
    [flatComments, currentUser, onReply, onEdit, onDelete, onCommentSelect]
  );

  // Main keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't interfere with form inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = event;

      switch (key) {
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          if (navState.isInNavigationMode) {
            navigateComments('down');
          } else {
            // Start navigation mode and focus first comment
            const firstComment = flatComments[0];
            if (firstComment) {
              setNavState({
                focusedCommentId: firstComment.id,
                selectedCommentId: firstComment.id,
                isInNavigationMode: true,
              });
              onCommentFocus?.(firstComment.id);
            }
          }
          break;

        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          if (navState.isInNavigationMode) {
            navigateComments('up');
          }
          break;

        case 'Escape':
          event.preventDefault();
          setNavState({
            focusedCommentId: null,
            selectedCommentId: null,
            isInNavigationMode: false,
          });
          break;

        case 'Enter':
          event.preventDefault();
          if (navState.isInNavigationMode && navState.focusedCommentId) {
            handleKeyboardAction('select', navState.focusedCommentId);
          }
          break;

        case 'r':
          if (ctrlKey || metaKey) {
            event.preventDefault();
            if (navState.isInNavigationMode && navState.focusedCommentId) {
              handleKeyboardAction('reply', navState.focusedCommentId);
            }
          }
          break;

        case 'e':
          if (ctrlKey || metaKey) {
            event.preventDefault();
            if (navState.isInNavigationMode && navState.focusedCommentId) {
              handleKeyboardAction('edit', navState.focusedCommentId);
            }
          }
          break;

        case 'Delete':
        case 'd':
          if (ctrlKey || metaKey) {
            event.preventDefault();
            if (navState.isInNavigationMode && navState.focusedCommentId) {
              handleKeyboardAction('delete', navState.focusedCommentId);
            }
          }
          break;

        case '?':
          if (shiftKey) {
            event.preventDefault();
            // Show keyboard shortcuts help
            showKeyboardHelp();
          }
          break;
      }
    },
    [enabled, navState, navigateComments, flatComments, onCommentFocus, handleKeyboardAction]
  );

  // Show keyboard shortcuts help
  const showKeyboardHelp = () => {
    // Implementation for showing help modal/tooltip
    console.log('Keyboard shortcuts help would be shown here');
  };

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  // Visual indicators for keyboard navigation
  const renderKeyboardIndicators = () => {
    if (!navState.isInNavigationMode) return null;

    return (
      <>
        {/* Navigation mode indicator */}
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>Kommentar-Navigation aktiv</span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            ↑↓ Navigieren • Enter Auswählen • R Antworten • E Bearbeiten • Esc Beenden
          </div>
        </div>

        {/* Focused comment indicator */}
        {navState.focusedCommentId && (
          <style>{`
            [data-comment-id='${navState.focusedCommentId}'] {
              position: relative;
            }
            [data-comment-id='${navState.focusedCommentId}']::before {
              content: '';
              position: absolute;
              top: -2px;
              left: -2px;
              right: -2px;
              bottom: -2px;
              background: rgba(59, 130, 246, 0.2);
              border: 2px solid #3b82f6;
              border-radius: 8px;
              z-index: 10;
              pointer-events: none;
            }
          `}</style>
        )}
      </>
    );
  };

  return (
    <>
      {renderKeyboardIndicators()}

      {/* Hidden elements for screen readers */}
      <div className="sr-only">
        <div id="comment-keyboard-help">
          <h3>Kommentar-Tastatur-Navigation</h3>
          <dl>
            <dt>j oder Pfeil runter:</dt>
            <dd>Nächster Kommentar</dd>
            <dt>k oder Pfeil hoch:</dt>
            <dd>Vorheriger Kommentar</dd>
            <dt>Enter:</dt>
            <dd>Kommentar auswählen/fokussieren</dd>
            <dt>Strg+R:</dt>
            <dd>Auf fokussierten Kommentar antworten</dd>
            <dt>Strg+E:</dt>
            <dd>Fokussierten Kommentar bearbeiten (nur eigene Kommentare)</dd>
            <dt>Strg+D oder Entf:</dt>
            <dd>Fokussierten Kommentar löschen (nur eigene Kommentare)</dd>
            <dt>Esc:</dt>
            <dd>Navigation beenden</dd>
            <dt>Shift+?:</dt>
            <dd>Diese Hilfe anzeigen</dd>
          </dl>
        </div>
      </div>
    </>
  );
};

// Hook for individual comment keyboard interaction
export const useCommentKeyboardInteraction = (
  commentId: string,
  options: {
    onReply?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    isAuthor?: boolean;
  } = {}
) => {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFocused) return;

      const { key, ctrlKey, metaKey } = event;

      switch (key) {
        case 'Enter':
          event.preventDefault();
          options.onSelect?.();
          break;
        case 'r':
          if (ctrlKey || metaKey) {
            event.preventDefault();
            options.onReply?.();
          }
          break;
        case 'e':
          if (ctrlKey || metaKey) {
            event.preventDefault();
            options.onEdit?.();
          }
          break;
        case 'Delete':
        case 'd':
          if (ctrlKey || metaKey) {
            event.preventDefault();
            options.onDelete?.();
          }
          break;
        case 'Escape':
          event.preventDefault();
          (event.target as HTMLElement)?.blur?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, options]);

  return {
    isFocused,
    focusProps: {
      tabIndex: 0,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      'data-comment-id': commentId,
      role: 'article',
      'aria-label': `Kommentar ${commentId}`,
    },
  };
};

// Enhanced comment component with keyboard support
interface KeyboardCommentItemProps {
  comment: Comment;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onSelect?: (commentId: string) => void;
  currentUser?: { id: string; name: string; email: string } | null;
  depth?: number;
}

export const KeyboardCommentItem: React.FC<KeyboardCommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onSelect,
  currentUser,
  depth = 0,
}) => {
  const { isFocused, focusProps } = useCommentKeyboardInteraction(comment.id, {
    onReply: onReply ? () => onReply(comment.id) : undefined,
    onEdit: onEdit && currentUser?.id === comment.authorId ? () => onEdit(comment.id) : undefined,
    onDelete:
      onDelete && currentUser?.id === comment.authorId ? () => onDelete(comment.id) : undefined,
    onSelect: onSelect ? () => onSelect(comment.id) : undefined,
    isAuthor: currentUser?.id === comment.authorId,
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      {...focusProps}
      className={`comment-keyboard-item p-4 border rounded-lg transition-all ${
        isFocused
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${depth > 0 ? 'ml-6' : ''}`}
    >
      {/* Comment Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">{comment.authorName}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              {formatDate(comment.createdAt)}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            comment.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : comment.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : comment.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
          }`}
        >
          {comment.status}
        </span>
      </div>

      {/* Comment Content */}
      <div className="mb-3">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
        {comment.isEdited && (
          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">(bearbeitet)</span>
        )}
      </div>

      {/* Keyboard Actions Help */}
      {isFocused && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <div className="grid grid-cols-2 gap-2">
            <span>Enter: Auswählen</span>
            <span>Strg+R: Antworten</span>
            {currentUser?.id === comment.authorId && (
              <>
                <span>Strg+E: Bearbeiten</span>
                <span>Strg+D: Löschen</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onReply?.(comment.id)}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Antworten
        </button>

        {currentUser?.id === comment.authorId && (
          <>
            <button
              onClick={() => onEdit?.(comment.id)}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Bearbeiten
            </button>
            <button
              onClick={() => onDelete?.(comment.id)}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Löschen
            </button>
          </>
        )}

        {/* Report count */}
        {(comment.reportCount ?? 0) > 0 && (
          <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
            {comment.reportCount ?? 0} Meldung{(comment.reportCount ?? 0) !== 1 ? 'en' : ''}
          </span>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <KeyboardCommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelect={onSelect}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Keyboard shortcuts help component
export const KeyboardShortcutsHelp: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['j', '↓'], description: 'Nächster Kommentar' },
    { keys: ['k', '↑'], description: 'Vorheriger Kommentar' },
    { keys: ['Enter'], description: 'Kommentar auswählen/fokussieren' },
    { keys: ['Strg', 'R'], description: 'Auf fokussierten Kommentar antworten' },
    { keys: ['Strg', 'E'], description: 'Fokussierten Kommentar bearbeiten (nur eigene)' },
    { keys: ['Strg', 'D'], description: 'Fokussierten Kommentar löschen (nur eigene)' },
    { keys: ['Esc'], description: 'Navigation beenden' },
    { keys: ['Shift', '?'], description: 'Diese Hilfe anzeigen' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tastaturkurzbefehle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <div className="flex items-center space-x-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded border">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-xs text-gray-500">+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Drücke{' '}
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> um
            zu schließen
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook for managing keyboard navigation state
export const useKeyboardNavigation = () => {
  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const startNavigation = useCallback(() => {
    setIsNavigationActive(true);
  }, []);

  const stopNavigation = useCallback(() => {
    setIsNavigationActive(false);
    setFocusedCommentId(null);
  }, []);

  const focusComment = useCallback((commentId: string) => {
    setFocusedCommentId(commentId);
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  return {
    isNavigationActive,
    focusedCommentId,
    showHelp,
    startNavigation,
    stopNavigation,
    focusComment,
    toggleHelp,
  };
};
