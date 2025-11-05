import { useEffect, useState } from 'react';

type RecentCommentItem = {
  id: string;
  excerpt: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
  createdAt: string; // ISO
  entityType: string;
  entityId: string;
  url: string;
};

type Strings = {
  title: string;
  empty: string;
  error: string;
  openBlogCta: string;
};

type Props = {
  strings: Strings;
  limit?: number;
};

function isWrapped<T>(json: unknown): json is { data: T } {
  return !!json && typeof json === 'object' && 'data' in (json as any);
}

export default function RecentCommentsCard({ strings, limit = 5 }: Props) {
  const [items, setItems] = useState<RecentCommentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/comments/recent?limit=${limit}`, {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const data = isWrapped<RecentCommentItem[]>(json) ? json.data : json;
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load');
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [limit]);

  const statusColor = (status: RecentCommentItem['status']) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-400';
      case 'pending':
        return 'text-amber-400';
      case 'rejected':
      case 'hidden':
        return 'text-rose-400';
      case 'flagged':
        return 'text-fuchsia-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300/90">
        {strings.title}
      </h3>

      {!items && !error && (
        <ul className="mt-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="animate-pulse">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="mt-3 text-sm text-rose-300/80">
          {strings.error}
          <div className="mt-2 text-xs opacity-70">{error}</div>
        </div>
      )}

      {items && items.length === 0 && (
        <div className="mt-3 text-sm text-slate-300/80">
          <p>{strings.empty}</p>
          <a
            href="/blog"
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-400/50 hover:bg-emerald-500/15"
          >
            {strings.openBlogCta}
          </a>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <a href={item.url} className="group block">
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-2 text-sm text-slate-100/90 group-hover:text-white">
                    {item.excerpt}
                  </p>
                  <span className={`whitespace-nowrap text-xs ${statusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400/80">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
