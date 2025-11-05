import { useEffect, useState } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { WebscraperForm } from './WebscraperForm';
import { WebscraperResults } from './WebscraperResults';
import {
  containerCls,
  usageBarBgCls,
  usageBarFillCls,
} from '@/components/tools/shared/islandStyles';
import type { ScrapingResult, UsageInfo } from '@/types/webscraper';

interface WebscraperStrings {
  title: string;
  description: string;
  urlPlaceholder: string;
  submitButton: string;
  processing: string;
  result: string;
  usage: string;
  download?: string;
  downloadJson?: string;
  toasts: {
    quotaReached: string;
    invalidUrl: string;
    robotsBlocked: string;
    fetchError: string;
    parseError: string;
    success: string;
    error: string;
  };
}

interface WebscraperIslandProps {
  strings: WebscraperStrings;
  showHeader?: boolean;
}

export default function WebscraperIsland({ strings, showHeader = false }: WebscraperIslandProps) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API response helpers
  type ApiError = { success: false; error: { type: string; message: string; details?: unknown } };
  type ApiSuccess<T> = { success: true; data: T };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/webscraper/usage');
        const data = (await resp.json()) as
          | ApiSuccess<{ ownerType: string; usage: UsageInfo }>
          | ApiError;
        if (!cancelled && resp.ok && 'success' in data && data.success) {
          setUsage((data as ApiSuccess<{ ownerType: string; usage: UsageInfo }>).data.usage);
        }
      } catch {
        // swallow usage errors; UI can still function without initial usage
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClear = () => {
    setUrl('');
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      toast.error(strings.toasts.invalidUrl);
      setError(strings.toasts.invalidUrl);
      return;
    }

    if (usage && usage.used >= usage.limit) {
      toast.error(strings.toasts.quotaReached);
      setError(strings.toasts.quotaReached);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      await ensureCsrfToken();

      const response = await fetch('/api/webscraper/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token':
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrf_token='))
              ?.split('=')[1] || '',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = (await response.json()) as
        | ApiSuccess<{ result: ScrapingResult; usage: UsageInfo }>
        | ApiError;

      if (!response.ok || !('success' in data && data.success)) {
        const errorMessage =
          'error' in data && data.error?.message ? data.error.message : strings.toasts.error;

        if (errorMessage.includes('quota exceeded')) {
          toast.error(strings.toasts.quotaReached);
          setError(strings.toasts.quotaReached);
        } else if (errorMessage.includes('robots.txt')) {
          toast.error(strings.toasts.robotsBlocked);
          setError(strings.toasts.robotsBlocked);
        } else if (errorMessage.includes('Fetch failed')) {
          toast.error(strings.toasts.fetchError);
          setError(strings.toasts.fetchError);
        } else if (errorMessage.includes('Parse failed')) {
          toast.error(strings.toasts.parseError);
          setError(strings.toasts.parseError);
        } else if (errorMessage.includes('Invalid URL')) {
          toast.error(strings.toasts.invalidUrl);
          setError(strings.toasts.invalidUrl);
        } else {
          toast.error(errorMessage);
          setError(errorMessage);
        }
        return;
      }

      setResult((data as ApiSuccess<{ result: ScrapingResult; usage: UsageInfo }>).data.result);
      setUsage((data as ApiSuccess<{ result: ScrapingResult; usage: UsageInfo }>).data.usage);
      toast.success(strings.toasts.success);
    } catch (error) {
      console.error('Scraping error:', error);
      const errorMsg = strings.toasts.error;
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={containerCls}>
      {/* Optional Header (disabled by default; page provides header) */}
      {showHeader && (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{strings.title}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">{strings.description}</p>
        </div>
      )}

      {/* Main Form Container (flat) */}
      <div>
        <WebscraperForm
          url={url}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
          onClear={handleClear}
          loading={loading}
          error={error}
          strings={{
            urlPlaceholder: strings.urlPlaceholder,
            submitButton: strings.submitButton,
            processing: strings.processing,
          }}
        />

        {/* Usage Info */}
        {usage && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {strings.usage}:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {usage.used}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      / {usage.limit}
                    </span>
                  </div>
                </div>
              </div>
              {usage.resetAt && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Reset: {new Date(usage.resetAt).toLocaleTimeString()}
                </div>
              )}
            </div>
            {/* Progress Bar */}
            {(() => {
              const percent = Math.min((usage.used / usage.limit) * 100, 100);
              return (
                <div className={`mt-3 ${usageBarBgCls}`}>
                  <div className={usageBarFillCls(percent)} style={{ width: `${percent}%` }} />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade-in">
          <WebscraperResults
            result={result}
            strings={{
              resultTitle: strings.result,
              download: strings.download ?? 'Download',
              downloadJson: strings.downloadJson ?? 'Download JSON',
            }}
          />
        </div>
      )}
    </div>
  );
}
