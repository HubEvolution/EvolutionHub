import { useState } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { WebscraperForm } from './WebscraperForm';
import { WebscraperResults } from './WebscraperResults';
import type { ScrapingResult, UsageInfo } from '@/types/webscraper';

interface WebscraperStrings {
  title: string;
  description: string;
  urlPlaceholder: string;
  submitButton: string;
  processing: string;
  result: string;
  usage: string;
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
}

export default function WebscraperIsland({ strings }: WebscraperIslandProps) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      toast.error(strings.toasts.invalidUrl);
      return;
    }

    setLoading(true);
    setResult(null);

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

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || strings.toasts.error;

        if (errorMessage.includes('quota exceeded')) {
          toast.error(strings.toasts.quotaReached);
        } else if (errorMessage.includes('robots.txt')) {
          toast.error(strings.toasts.robotsBlocked);
        } else if (errorMessage.includes('Fetch failed')) {
          toast.error(strings.toasts.fetchError);
        } else if (errorMessage.includes('Parse failed')) {
          toast.error(strings.toasts.parseError);
        } else if (errorMessage.includes('Invalid URL')) {
          toast.error(strings.toasts.invalidUrl);
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      setResult(data.data.result);
      setUsage(data.data.usage);
      toast.success(strings.toasts.success);
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error(strings.toasts.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{strings.title}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{strings.description}</p>
      </div>

      <WebscraperForm
        url={url}
        onUrlChange={setUrl}
        onSubmit={handleSubmit}
        loading={loading}
        strings={{
          urlPlaceholder: strings.urlPlaceholder,
          submitButton: strings.submitButton,
          processing: strings.processing,
        }}
      />

      {usage && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {strings.usage}: {usage.used} / {usage.limit}
            {usage.resetAt && (
              <span className="ml-2 text-gray-500">
                (Reset: {new Date(usage.resetAt).toLocaleString()})
              </span>
            )}
          </p>
        </div>
      )}

      {result && <WebscraperResults result={result} strings={{ resultTitle: strings.result }} />}
    </div>
  );
}
