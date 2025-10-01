import React, { useState, useMemo } from 'react';
import { CommentList } from './CommentList';
import { Button } from '../ui/Button';
import type { Comment } from '../../lib/types/comments';

interface CommentThreadingProps {
  comments: Comment[];
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: number; name: string; email: string } | null;
  maxDepth?: number;
  showThreadNavigation?: boolean;
  enableSorting?: boolean;
  sortBy?: 'newest' | 'oldest' | 'most-replies' | 'most-helpful';
}

interface ThreadNavigationProps {
  comments: Comment[];
  currentView: 'flat' | 'threaded';
  onViewChange: (view: 'flat' | 'threaded') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalComments: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: CommentFilters;
  onFiltersChange: (filters: CommentFilters) => void;
}

interface CommentFilters {
  status?: Comment['status'];
  author?: string;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  hasReplies?: boolean;
}

export const CommentThreading: React.FC<CommentThreadingProps> = ({
  comments,
  onUpdateComment,
  onDeleteComment,
  onReply,
  currentUser,
  maxDepth = 5,
  showThreadNavigation = true,
  enableSorting = true,
  sortBy = 'newest',
}) => {
  const [currentView, setCurrentView] = useState<'flat' | 'threaded'>('threaded');
  const [currentSort, setCurrentSort] = useState(sortBy);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<CommentFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort comments
  const processedComments = useMemo(() => {
    let filtered = [...comments];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(comment =>
        comment.content.toLowerCase().includes(query) ||
        comment.authorName.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (activeFilters.status) {
      filtered = filtered.filter(comment => comment.status === activeFilters.status);
    }

    // Apply author filter
    if (activeFilters.author) {
      filtered = filtered.filter(comment =>
        comment.authorName.toLowerCase().includes(activeFilters.author!.toLowerCase())
      );
    }

    // Apply date range filter
    if (activeFilters.dateRange && activeFilters.dateRange !== 'all') {
      const now = Date.now() / 1000;
      const ranges = {
        today: 24 * 60 * 60,
        week: 7 * 24 * 60 * 60,
        month: 30 * 24 * 60 * 60,
      };

      filtered = filtered.filter(comment =>
        (now - comment.createdAt) <= ranges[activeFilters.dateRange!]
      );
    }

    // Apply replies filter
    if (activeFilters.hasReplies !== undefined) {
      filtered = filtered.filter(comment =>
        activeFilters.hasReplies ? (comment.replies?.length || 0) > 0 : (comment.replies?.length || 0) === 0
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (currentSort) {
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'most-replies':
          return (b.replies?.length || 0) - (a.replies?.length || 0);
        case 'most-helpful':
          return (b.helpfulCount || 0) - (a.helpfulCount || 0);
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }, [comments, searchQuery, activeFilters, currentSort]);

  const handleViewChange = (view: 'flat' | 'threaded') => {
    setCurrentView(view);
  };

  const handleSortChange = (sort: string) => {
    setCurrentSort(sort);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersChange = (filters: CommentFilters) => {
    setActiveFilters(filters);
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

  const hasActiveFilters = searchQuery.trim() || Object.keys(activeFilters).length > 0;

  return (
    <div className="comment-threading">
      {/* Thread Navigation Controls */}
      {showThreadNavigation && (
        <ThreadNavigation
          comments={comments}
          currentView={currentView}
          onViewChange={handleViewChange}
          sortBy={currentSort}
          onSortChange={handleSortChange}
          totalComments={processedComments.length}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          activeFilters={activeFilters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Comments List */}
      {currentView === 'threaded' ? (
        <CommentList
          comments={processedComments}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
          onReply={onReply}
          currentUser={currentUser}
          maxDepth={maxDepth}
        />
      ) : (
        <FlatCommentView
          comments={processedComments}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
          onReply={onReply}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// Thread Navigation Component
const ThreadNavigation: React.FC<ThreadNavigationProps> = ({
  currentView,
  onViewChange,
  sortBy,
  onSortChange,
  totalComments,
  searchQuery,
  onSearchChange,
  activeFilters,
  onFiltersChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="comment-navigation mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Top Row: View Toggle and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Ansicht:
          </span>
          <div className="flex bg-white dark:bg-gray-700 rounded-md p-1">
            <button
              onClick={() => onViewChange('threaded')}
              className={`px-3 py-1 text-sm rounded ${
                currentView === 'threaded'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Threaded
            </button>
            <button
              onClick={() => onViewChange('flat')}
              className={`px-3 py-1 text-sm rounded ${
                currentView === 'flat'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Flat
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Kommentare durchsuchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 text-sm rounded-md border ${
            showFilters
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <CommentFiltersPanel
          filters={activeFilters}
          onFiltersChange={onFiltersChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Bottom Row: Sort and Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Sort Options */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sortieren nach:
          </span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
            <option value="most-replies">Meiste Antworten</option>
            <option value="most-helpful">Hilfreichste</option>
          </select>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{totalComments} Kommentar{totalComments !== 1 ? 'e' : ''}</span>
          {searchQuery && (
            <span>• Suche: "{searchQuery}"</span>
          )}
          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={() => onFiltersChange({})}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Comment Filters Panel
interface CommentFiltersPanelProps {
  filters: CommentFilters;
  onFiltersChange: (filters: CommentFilters) => void;
  onClose: () => void;
}

const CommentFiltersPanel: React.FC<CommentFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  onClose,
}) => {
  const updateFilter = (key: keyof CommentFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="mb-4 p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || undefined)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Alle</option>
            <option value="approved">Freigegeben</option>
            <option value="pending">Warten auf Freigabe</option>
            <option value="rejected">Abgelehnt</option>
            <option value="flagged">Markiert</option>
          </select>
        </div>

        {/* Author Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Autor
          </label>
          <input
            type="text"
            value={filters.author || ''}
            onChange={(e) => updateFilter('author', e.target.value || undefined)}
            placeholder="Autor suchen..."
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Zeitraum
          </label>
          <select
            value={filters.dateRange || 'all'}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Alle</option>
            <option value="today">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
          </select>
        </div>

        {/* Replies Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Antworten
          </label>
          <select
            value={filters.hasReplies === undefined ? '' : filters.hasReplies ? 'with' : 'without'}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('hasReplies', value === 'with' ? true : value === 'without' ? false : undefined);
            }}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Alle</option>
            <option value="with">Mit Antworten</option>
            <option value="without">Ohne Antworten</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Flat Comment View Component
interface FlatCommentViewProps {
  comments: Comment[];
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId?: string) => Promise<void>;
  currentUser?: { id: number; name: string; email: string } | null;
}

const FlatCommentView: React.FC<FlatCommentViewProps> = ({
  comments,
  onUpdateComment,
  onDeleteComment,
  onReply,
  currentUser,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <div className="flat-comment-view space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {comment.authorName.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {comment.authorName}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(comment.createdAt * 1000).toLocaleDateString('de-DE')}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-gray-500">(bearbeitet)</span>
                )}
                <span className={`px-2 py-1 text-xs rounded-full ${
                  comment.status === 'approved' ? 'bg-green-100 text-green-800' :
                  comment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  comment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {comment.status}
                </span>
              </div>

              {/* Content */}
              <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                {comment.content}
              </p>

              {/* Actions */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Antworten
                </button>

                {currentUser?.id === comment.authorId && (
                  <>
                    <button
                      onClick={() => {/* Edit logic */}}
                      className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      Löschen
                    </button>
                  </>
                )}
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="mt-4 ml-12">
                  <CommentForm
                    onSubmit={(content) => onReply(content, comment.id)}
                    onCancel={() => setReplyingTo(null)}
                    submitText="Antwort senden"
                    showCancel={true}
                    placeholder="Schreibe eine Antwort..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple Comment Form for inline use
interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  submitText?: string;
  showCancel?: boolean;
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  submitText = "Senden",
  showCancel = false,
  placeholder = "Schreibe einen Kommentar...",
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
      onCancel?.();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
        rows={3}
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {content.length}/2000 Zeichen
        </span>
        <div className="flex space-x-2">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
            >
              Abbrechen
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Wird gesendet...' : submitText}
          </button>
        </div>
      </div>
    </form>
  );
};