import React from 'react';
import type { CommentStats as CommentStatsType } from '../../lib/types/comments';

interface CommentStatsProps {
  stats: CommentStatsType;
  className?: string;
}

export const CommentStats: React.FC<CommentStatsProps> = ({
  stats,
  className = "",
}) => {
  const totalVisible = stats.approved + stats.pending;
  const hasIssues = stats.rejected + stats.flagged + stats.hidden > 0;

  return (
    <div className={`comment-stats ${className}`}>
      <div className="flex items-center space-x-4 text-sm">
        {/* Total Comments */}
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400">
            {totalVisible} Kommentar{totalVisible !== 1 ? 'e' : ''}
          </span>
        </div>

        {/* Approved Comments */}
        {stats.approved > 0 && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-600 dark:text-green-400">
              {stats.approved} freigegeben
            </span>
          </div>
        )}

        {/* Pending Comments */}
        {stats.pending > 0 && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-yellow-600 dark:text-yellow-400">
              {stats.pending} wartend
            </span>
          </div>
        )}

        {/* Issues Badge */}
        {hasIssues && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-600 dark:text-red-400">
              {stats.rejected + stats.flagged + stats.hidden} Probleme
            </span>
          </div>
        )}
      </div>

      {/* Detailed Breakdown (Collapsible) */}
      <details className="mt-2">
        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          Detaillierte Übersicht
        </summary>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Ausstehend:</span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.pending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Freigegeben:</span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats.approved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Abgelehnt:</span>
            <span className="font-medium text-red-600 dark:text-red-400">{stats.rejected}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Markiert:</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">{stats.flagged}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Versteckt:</span>
            <span className="font-medium text-gray-600 dark:text-gray-400">{stats.hidden}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Gesamt:</span>
            <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span>
          </div>
        </div>
      </details>
    </div>
  );
};