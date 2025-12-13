import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';

export type AdminComment = {
  id: string;
  content: string;
  author: {
    id?: string;
    email?: string;
    name?: string;
  };
  entityType: string;
  entityId: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
  createdAt?: string;
  updatedAt?: string;
  reports?: {
    total: number;
    pending: number;
  };
};

type AdminCommentsStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  hidden: number;
};

type AdminCommentsPagination = {
  limit: number;
  offset: number;
  count: number;
};

type AdminCommentsApiResponse = {
  success?: boolean;
  data?: {
    comments?: AdminComment[];
    stats?: AdminCommentsStats;
    pagination?: AdminCommentsPagination;
  };
  error?: {
    type?: string;
    message?: string;
  };
};

function buildCommentsUrl(): string {
  const base = new URL('/api/admin/comments', window.location.origin);
  const search = new URLSearchParams(window.location.search);

  const status = search.get('status');
  const entityType = search.get('entityType');
  const entityId = search.get('entityId');
  const authorId = search.get('authorId');
  const q = search.get('q');
  const limit = search.get('limit') || '50';
  const offset = search.get('offset') || '0';

  if (status) base.searchParams.set('status', status);
  if (entityType) base.searchParams.set('entityType', entityType);
  if (entityId) base.searchParams.set('entityId', entityId);
  if (authorId) base.searchParams.set('authorId', authorId);
  if (q) base.searchParams.set('q', q);

  base.searchParams.set('includeReports', 'true');
  base.searchParams.set('limit', limit);
  base.searchParams.set('offset', offset);

  return base.toString();
}

function getInitialOffsetAndLimit(): { offset: number; limit: number } {
  const search = new URLSearchParams(window.location.search);
  const limit = Number(search.get('limit') || '50') || 50;
  const offset = Number(search.get('offset') || '0') || 0;
  return { offset, limit };
}

export default function AdminCommentsTableIsland() {
  const [{ offset, limit }, setPageInfo] = useState<{ offset: number; limit: number }>(() => {
    return { offset: 0, limit: 50 };
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [stats, setStats] = useState<AdminCommentsStats | null>(null);
  const [pagination, setPagination] = useState<AdminCommentsPagination | null>(null);

  useEffect(() => {
    let cancelled = false;

    function syncFromLocation() {
      const { offset: initialOffset, limit: initialLimit } = getInitialOffsetAndLimit();
      setPageInfo({ offset: initialOffset, limit: initialLimit });
    }

    syncFromLocation();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const url = buildCommentsUrl();
        const res = await fetch(url, {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (cancelled) return;

        setStatusCode(res.status);

        if (!res.ok) {
          setError('request_failed');
          setComments([]);
          setStats(null);
          setPagination(null);
          setLoading(false);
          return;
        }

        const json = (await res.json()) as AdminCommentsApiResponse;
        if (!json || !json.success || !json.data) {
          setError('invalid_response');
          setComments([]);
          setStats(null);
          setPagination(null);
          setLoading(false);
          return;
        }

        const data = json.data;
        const list = Array.isArray(data.comments) ? data.comments : [];

        setComments(list);
        setStats(
          data.stats ?? {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            flagged: 0,
            hidden: 0,
          }
        );
        setPagination(
          data.pagination ?? {
            limit,
            offset,
            count: list.length,
          }
        );
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError('network_error');
        setComments([]);
        setStats(null);
        setPagination(null);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [limit, offset]);

  const total = stats?.total ?? 0;
  const currentLimit = pagination?.limit ?? limit;
  const currentOffset = pagination?.offset ?? offset;
  const count = pagination?.count ?? comments.length;
  const hasPrev = currentOffset > 0;
  const hasMore = currentOffset + count < total;

  function goToPage(newOffset: number) {
    const safeOffset = newOffset < 0 ? 0 : newOffset;
    const url = new URL(window.location.href);
    url.searchParams.set('offset', String(safeOffset));
    url.searchParams.set('limit', String(currentLimit));
    window.location.href = url.toString();
  }

  const showErrorBox = !!error || (!loading && statusCode !== null && statusCode !== 200);

  return (
    <div className="space-y-8">
      {showErrorBox ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            {statusCode === 401
              ? 'Bitte zuerst einloggen. Danach diese Seite neu laden.'
              : statusCode === 403
                ? 'Keine Berechtigung für die Kommentar-Moderation.'
                : 'Kommentare konnten nicht geladen werden.'}
          </p>
        </div>
      ) : (
        <>
          <Card as="section" className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Übersicht</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '…' : total}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Gesamt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {loading ? '…' : (stats?.pending ?? 0)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Ausstehend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '…' : (stats?.approved ?? 0)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Freigegeben</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {loading ? '…' : (stats?.rejected ?? 0)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Abgelehnt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? '…' : (stats?.flagged ?? 0)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Markiert</div>
              </div>
            </div>
          </Card>

          <Card as="section" className="">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Kommentare</h2>
            </div>

            {loading ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">Lade Kommentare…</p>
              </div>
            ) : comments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3">
                        <input
                          id="select-all"
                          type="checkbox"
                          className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Kommentar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Autor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Entity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {comments.map((comment) => {
                      const totalReports = comment.reports?.total ?? 0;
                      return (
                        <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="comment-select h-4 w-4 text-emerald-600 border-gray-300 rounded"
                              data-comment-id={comment.id}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p
                                className="text-sm text-gray-900 dark:text-white truncate"
                                title={comment.content}
                              >
                                {comment.content}
                              </p>
                              {totalReports > 0 && (
                                <div className="mt-1 flex items-center text-xs text-red-600">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {totalReports} Meldung
                                  {totalReports !== 1 ? 'en' : ''}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {comment.author.name || comment.author.email}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {comment.author.id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                comment.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : comment.status === 'approved'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : comment.status === 'rejected'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              }`}
                            >
                              {comment.status === 'pending'
                                ? 'Ausstehend'
                                : comment.status === 'approved'
                                  ? 'Freigegeben'
                                  : comment.status === 'rejected'
                                    ? 'Abgelehnt'
                                    : 'Markiert'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {comment.entityType}
                            </div>
                            <div
                              className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-24"
                              title={comment.entityId}
                            >
                              {comment.entityId}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {comment.createdAt
                              ? new Date(comment.createdAt).toLocaleDateString('de-DE')
                              : ''}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex space-x-2">
                              {comment.status === 'pending' && (
                                <>
                                  <button
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                    onClick={() =>
                                      (
                                        window as typeof window & {
                                          moderateComment?: (
                                            id: string,
                                            action:
                                              | 'approve'
                                              | 'reject'
                                              | 'flag'
                                              | 'hide'
                                              | 'unhide'
                                          ) => void;
                                        }
                                      ).moderateComment?.(comment.id, 'approve')
                                    }
                                    type="button"
                                    title="Freigeben"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                    onClick={() =>
                                      (
                                        window as typeof window & {
                                          moderateComment?: (
                                            id: string,
                                            action:
                                              | 'approve'
                                              | 'reject'
                                              | 'flag'
                                              | 'hide'
                                              | 'unhide'
                                          ) => void;
                                        }
                                      ).moderateComment?.(comment.id, 'reject')
                                    }
                                    type="button"
                                    title="Ablehnen"
                                  >
                                    ✗
                                  </button>
                                </>
                              )}
                              <button
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                onClick={() =>
                                  (
                                    window as typeof window & {
                                      viewCommentDetails?: (id: string) => void;
                                    }
                                  ).viewCommentDetails?.(comment.id)
                                }
                                type="button"
                                title="Details"
                              >
                                👁
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">Keine Kommentare gefunden</p>
              </div>
            )}
          </Card>

          <section className="mt-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <div>Gesamt: {total}</div>
            <div className="flex gap-2">
              {hasPrev && (
                <button
                  type="button"
                  onClick={() => goToPage(currentOffset - currentLimit)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Vorherige
                </button>
              )}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => goToPage(currentOffset + currentLimit)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Nächste
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
