import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { clientLogger } from '@/lib/client-logger';

interface CommentFormProps {
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  onCancel?: () => void;
  parentId?: string;
  isLoading?: boolean;
  currentUser?: { id: number; name: string; email: string } | null;
  placeholder?: string;
  submitText?: string;
  showCancel?: boolean;
  initialValue?: string;
  isEdit?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  parentId,
  isLoading = false,
  currentUser,
  placeholder = 'Schreibe einen Kommentar...',
  submitText = 'Kommentar posten',
  showCancel = false,
  initialValue = '',
  isEdit = false,
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    clientLogger.info('Comment form submitted', {
      component: 'CommentForm',
      action: 'submit',
      isEdit,
      parentId,
      contentLength: content.length,
    });

    if (!content.trim()) {
      clientLogger.warn('Comment validation failed: empty content', {
        component: 'CommentForm',
        error: 'empty_content',
      });
      setError('Bitte gib einen Kommentar ein');
      return;
    }

    if (content.length > 2000) {
      clientLogger.warn('Comment validation failed: content too long', {
        component: 'CommentForm',
        error: 'content_too_long',
        length: content.length,
      });
      setError('Kommentar darf maximal 2000 Zeichen lang sein');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(content, parentId);
      clientLogger.info('Comment posted successfully', {
        component: 'CommentForm',
        action: isEdit ? 'comment_edited' : 'comment_created',
        parentId,
      });
      setContent('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Senden des Kommentars';
      clientLogger.error('Comment submission failed', {
        component: 'CommentForm',
        error: errorMessage,
        parentId,
      });
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setError(null);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isDisabled) {
        handleSubmit(e as any);
      }
    }

    // Escape to cancel
    if (e.key === 'Escape' && showCancel) {
      e.preventDefault();
      handleCancel();
    }
  };

  const isDisabled = isLoading || isSubmitting || !content.trim();

  return (
    <div className="comment-form">
      {/* User Info */}
      {currentUser ? (
        <div className="mb-3 flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Angemeldet als {currentUser.email}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Du kommentierst als Gast.{' '}
            <a href="/login" className="font-medium hover:underline">
              Melde dich an
            </a>{' '}
            für bessere Funktionen.
          </p>
        </div>
      )}

      {/* Reply Context */}
      {parentId && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Du antwortest auf einen Kommentar
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${placeholder} (Strg+Enter zum Absenden)`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
            rows={4}
            maxLength={2000}
            disabled={isLoading || isSubmitting}
            aria-label="Kommentar schreiben"
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

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              type="submit"
              disabled={isDisabled}
              isLoading={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Wird gesendet...' : submitText}
            </Button>

            {showCancel && (
              <Button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abbrechen
              </Button>
            )}
          </div>

          {/* Guidelines */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span>Sei respektvoll und konstruktiv</span>
          </div>
        </div>
      </form>
    </div>
  );
};
