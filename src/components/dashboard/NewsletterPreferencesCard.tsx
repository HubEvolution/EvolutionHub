import { useState } from 'react';
import { toast } from 'sonner';

interface Strings {
  title: string;
  subscribed: string;
  unsubscribed: string;
  unsubscribe: string;
  resubscribe: string;
  processing: string;
  success: string;
  error: string;
}

interface Props {
  email: string;
  initiallySubscribed: boolean;
  strings: Strings;
}

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
};

type ApiResult<T> = ApiSuccess<T> | ApiError;

function assertApiResult<T>(value: unknown): asserts value is ApiResult<T> {
  if (typeof value !== 'object' || value === null || !('success' in value)) {
    throw new Error('Invalid API response structure');
  }

  const successFlag = (value as { success?: unknown }).success;

  if (successFlag === true) {
    return;
  }

  if (successFlag === false) {
    const errorPayload = (value as { error?: unknown }).error;
    if (typeof errorPayload !== 'string' || !errorPayload) {
      throw new Error('API error response missing error message');
    }
    return;
  }

  throw new Error('API response has invalid success flag');
}

export default function NewsletterPreferencesCard({ email, initiallySubscribed, strings }: Props) {
  const [subscribed, setSubscribed] = useState(initiallySubscribed);
  const [loading, setLoading] = useState(false);

  const request = async (endpoint: string, payload: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const payloadResult = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      throw new Error('request_failed');
    }

    if (payloadResult) {
      assertApiResult<unknown>(payloadResult);
      if (payloadResult.success === false) {
        throw new Error(payloadResult.error ?? 'request_failed');
      }
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await request('/api/newsletter/unsubscribe', { email });
        setSubscribed(false);
      } else {
        await request('/api/newsletter/subscribe', {
          email,
          consent: true,
        });
        setSubscribed(true);
      }
      toast.success(strings.success);
    } catch (error) {
      const message = error instanceof Error ? error.message : strings.error;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-fuchsia-950/30 to-pink-950/30 p-5 shadow-xl backdrop-blur-sm transition-all hover:border-purple-400/30 hover:shadow-purple-500/20">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-60"></div>
      <h3 className="text-base font-bold text-purple-200">{strings.title}</h3>
      <div className="mt-3 space-y-3">
        <p className="text-sm leading-relaxed text-slate-300/90">
          {subscribed ? strings.subscribed : strings.unsubscribed}
        </p>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="inline-flex items-center rounded-lg border border-purple-400/30 bg-purple-500/20 px-4 py-2 text-sm font-bold text-purple-200 backdrop-blur-sm transition hover:border-purple-300/50 hover:bg-purple-500/30 disabled:opacity-50"
        >
          {loading ? strings.processing : subscribed ? strings.unsubscribe : strings.resubscribe}
        </button>
      </div>
    </div>
  );
}
