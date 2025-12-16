import { useEffect, useState } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { WebscraperForm } from './WebscraperForm';
import { WebscraperResults } from './WebscraperResults';
import { containerCls } from '@/components/tools/shared/islandStyles';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
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
  const [ownerType, setOwnerType] = useState<'user' | 'guest' | null>(null);

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
          const payload = (
            data as ApiSuccess<{
              ownerType: string;
              usage: UsageInfo;
            }>
          ).data;
          setUsage(payload.usage);
          setOwnerType(
            payload.ownerType === 'user' || payload.ownerType === 'guest' ? payload.ownerType : null
          );
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
      ensureCsrfToken();

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
          <div className="mt-6 flex justify-start">
            <ToolUsageBadge
              label={strings.usage}
              loadingLabel={strings.processing}
              usage={usage}
              ownerType={ownerType}
              planId={null}
              layout="card"
              size="sm"
              align="left"
              showIcon
              showResetHint={false}
              showOwnerHint={false}
              showPercent
              detailsTitle={strings.usage}
              detailsItems={[
                {
                  id: 'daily',
                  label: strings.usage,
                  used: usage.used,
                  limit: usage.limit,
                  resetAt: usage.resetAt,
                },
              ]}
            />
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
