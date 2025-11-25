import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { getI18n } from '@/utils/i18n';
import { getLocale } from '@/lib/i18n';
import { useVideoUsage } from './useVideoUsage';

type Tier = '720p' | '1080p';

type UploadResponse = {
  success: boolean;
  data?: { key: string; url: string; size: number; contentType: string };
  error?: { type: string; message: string };
};

type GenerateResponse = {
  success: boolean;
  data?: {
    jobId: string;
    status: string;
    charge?: { credits: number; balance: number } | { credits: 0; quota: true };
  };
  error?: { type: string; message: string; details?: unknown };
};

type JobResponse = {
  success: boolean;
  data?: { status: string; output?: { key: string; url: string } };
  error?: { type: string; message: string };
};

export default function VideoEnhancerIsland() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [tier, setTier] = useState<Tier>('720p');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'idle' | 'uploaded' | 'running' | 'done' | 'error'>('idle');
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [charge, setCharge] = useState<
    ({ credits: number; balance: number } | { credits: 0; quota: true }) | null
  >(null);
  const pollRef = useRef<number | null>(null);
  const [etaStartedAt, setEtaStartedAt] = useState<number | null>(null);
  const [etaTargetMs, setEtaTargetMs] = useState<number | null>(null);
  const [etaPct, setEtaPct] = useState<number>(0);
  const [etaRemainingMs, setEtaRemainingMs] = useState<number | null>(null);
  const etaTimerRef = useRef<number | null>(null);

  const { usage, ownerType, plan, creditsBalanceTenths, refresh: refreshUsage } = useVideoUsage();

  const locale = getLocale(typeof window !== 'undefined' ? window.location.pathname : '/');
  const t = getI18n(locale);

  const planLabel = useMemo(() => {
    if (ownerType === 'guest' || ownerType === null) return 'Guest';
    if (ownerType === 'user') {
      if (!plan || plan === 'free') return 'Starter';
      return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
    return '';
  }, [ownerType, plan]);

  const planId = useMemo(
    () =>
      ownerType === 'user' && plan
        ? plan === 'free'
          ? 'starter'
          : (plan as 'pro' | 'premium' | 'enterprise')
        : null,
    [ownerType, plan]
  );

  const monthlyLabel = useMemo(() => {
    const maybe = t('header.menu.monthly_quota');
    return maybe || 'Monthly quota';
  }, [t]);

  const creditsLabel = useMemo(() => {
    const maybe = t('header.menu.credits');
    return maybe || 'Credits';
  }, [t]);

  const canStart = useMemo(
    () => !!file && !!tier && !busy && typeof durationMs === 'number',
    [file, tier, busy, durationMs]
  );

  const reset = useCallback(() => {
    setBusy(false);
    setStep('idle');
    setUploadKey(null);
    setJobId(null);
    setOutputUrl(null);
    setError(null);
    setDurationMs(null);
    setCharge(null);
    setEtaStartedAt(null);
    setEtaTargetMs(null);
    setEtaPct(0);
    setEtaRemainingMs(null);
    if (etaTimerRef.current) {
      window.clearInterval(etaTimerRef.current);
      etaTimerRef.current = null;
    }
  }, []);

  const upload = useCallback(async () => {
    const f = file ?? inputRef.current?.files?.[0] ?? null;
    if (!f) return;
    // Guard: do nothing until duration has been determined
    if (typeof durationMs !== 'number') {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', f);
      fd.set('tier', tier);
      fd.set('durationMs', String(durationMs));
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/ai-video/upload', {
        method: 'POST',
        body: fd,
        headers: { 'X-CSRF-Token': csrf },
        credentials: 'same-origin',
      });
      let data: UploadResponse | null = null;
      try {
        data = (await res.json()) as UploadResponse;
      } catch {
        data = null;
      }
      if (!res.ok || !data || !data.success || !data.data) {
        setBusy(false);
        setError(data?.error?.message || `Upload failed (${res.status})`);
        setStep('error');
        return;
      }
      setUploadKey(data.data.key);
      setBusy(false);
      setStep('uploaded');
    } catch {
      setBusy(false);
      setError('Upload failed');
      setStep('error');
    }
  }, [file, tier, durationMs]);

  const start = useCallback(async () => {
    if (!uploadKey) return;
    setBusy(true);
    setError(null);
    try {
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/ai-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ key: uploadKey, tier }),
        credentials: 'same-origin',
      });
      let data: GenerateResponse | null = null;
      try {
        data = (await res.json()) as GenerateResponse;
      } catch {
        data = null;
      }
      if (!res.ok || !data || !data.success || !data.data) {
        setBusy(false);
        setError(data?.error?.message || `Start failed (${res.status})`);
        setStep('error');
        return;
      }
      if (data.data.charge) setCharge(data.data.charge);
      void refreshUsage();
      setJobId(data.data.jobId);
      if (typeof durationMs === 'number') {
        const sec = Math.max(0, Math.ceil(durationMs / 1000));
        const base = tier === '1080p' ? 85 : 55;
        const factor = tier === '1080p' ? 16.0 : 12.0;
        const est = (base + factor * sec) * 1000;
        const clamped = Math.min(10 * 60 * 1000, Math.max(60 * 1000, est));
        setEtaStartedAt(Date.now());
        setEtaTargetMs(clamped);
        setEtaPct(0);
        setEtaRemainingMs(clamped);
      } else {
        setEtaStartedAt(null);
        setEtaTargetMs(null);
        setEtaPct(0);
        setEtaRemainingMs(null);
      }
      setStep('running');
    } catch {
      setBusy(false);
      setError('Start failed');
      setStep('error');
      setEtaRemainingMs(null);
    }
  }, [uploadKey, tier, durationMs, refreshUsage]);

  useEffect(() => {
    const run = async (id: string) => {
      let delay = 10000;
      try {
        const res = await fetch(`/api/ai-video/jobs/${id}`);
        if (res.status === 429) {
          const ra = Number(res.headers.get('Retry-After'));
          delay = Number.isFinite(ra) && ra > 0 ? Math.max(ra * 1000, 10000) : 15000;
          const extra = delay;
          setEtaTargetMs((prev) => (typeof prev === 'number' ? prev + extra : prev));
        } else {
          const data = (await res.json()) as JobResponse;
          if (data && data.success && data.data) {
            if (data.data.status === 'succeeded') {
              setOutputUrl(data.data.output?.url || null);
              setBusy(false);
              setStep('done');
              setEtaPct(100);
              setEtaRemainingMs(0);
              return;
            }
            if (data.data.status === 'failed' || data.data.status === 'canceled') {
              setBusy(false);
              setError(`Job ${data.data.status}`);
              setStep('error');
              setEtaRemainingMs(null);
              return;
            }
            if (etaStartedAt && etaTargetMs) {
              const now = Date.now();
              const elapsed = now - etaStartedAt;
              if (elapsed >= etaTargetMs - 1000) {
                setEtaTargetMs((prev) =>
                  typeof prev === 'number' ? prev + Math.max(30000, delay) : prev
                );
              } else if (elapsed / etaTargetMs > 0.85) {
                setEtaTargetMs((prev) => (typeof prev === 'number' ? prev + 10000 : prev));
              }
            }
          } else if (data && data.success === false) {
            setBusy(false);
            setError(data.error?.message || 'Job polling failed');
            setStep('error');
            setEtaRemainingMs(null);
            return;
          } else {
            delay = 12000;
          }
        }
      } catch {
        delay = 15000;
      }
      pollRef.current = window.setTimeout(() => run(id), delay) as unknown as number;
    };
    if (step === 'running' && jobId) {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
      run(jobId);
    }
    return () => {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [step, jobId]);

  useEffect(() => {
    if (step !== 'running' || !etaStartedAt || !etaTargetMs) {
      if (etaTimerRef.current) {
        window.clearInterval(etaTimerRef.current);
        etaTimerRef.current = null;
      }
      return;
    }
    if (etaTimerRef.current) {
      window.clearInterval(etaTimerRef.current);
      etaTimerRef.current = null;
    }
    etaTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - etaStartedAt;
      const pct = Math.min(99, Math.max(0, (elapsed / etaTargetMs) * 100));
      const rem = Math.max(0, etaTargetMs - elapsed);
      setEtaPct(pct);
      setEtaRemainingMs(rem);
    }, 500) as unknown as number;
    return () => {
      if (etaTimerRef.current) {
        window.clearInterval(etaTimerRef.current);
        etaTimerRef.current = null;
      }
    };
  }, [step, etaStartedAt, etaTargetMs]);

  // Measure video duration when a file is selected
  useEffect(() => {
    if (!file) {
      setDurationMs(null);
      setError(null);
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      const onLoaded = () => {
        try {
          const sec = Number.isFinite(video.duration) ? video.duration : 0;
          setDurationMs(Math.max(0, Math.round(sec * 1000)));
          setError(null);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      const onError = () => {
        try {
          setDurationMs(null);
          setError('Could not read video duration');
          setStep('error');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    } catch {
      setDurationMs(null);
    }
  }, [file]);

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Drop-style file panel */}
        <div
          className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors ${
            busy || step === 'running'
              ? 'border-gray-500/70 bg-slate-900/50'
              : 'border-slate-500/70 bg-slate-900/40 hover:border-cyan-400/80 hover:bg-slate-900/70'
          }`}
          onClick={() => {
            if (busy || step === 'running') return;
            inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (busy || step === 'running') return;
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy || step === 'running'}
            className="hidden"
          />
          <div className="space-y-2">
            <p className="text-sm sm:text-base font-medium text-gray-100">
              Drop a video here or click to select
            </p>
            <p className="text-xs text-gray-400">Allowed: MP4, MOV, WEBM</p>
            {file && (
              <p className="mt-2 text-xs text-gray-300">
                Selected: <span className="font-semibold">{file.name}</span>
                {typeof durationMs === 'number' && (
                  <span className="ml-2 text-gray-400">({Math.ceil(durationMs / 1000)}s)</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Tier + actions */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-300">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              disabled={busy || step === 'running'}
              className="border border-slate-600 rounded-md px-3 py-1.5 bg-slate-900/80 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="720p">720p – Estimated: 5 Credits</option>
              <option value="1080p">1080p – Estimated: 8 Credits</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
            <Button
              type="button"
              onClick={upload}
              disabled={!canStart || step === 'uploaded' || step === 'running'}
              size="sm"
              className="px-4"
            >
              Upload
            </Button>
            <Button
              type="button"
              onClick={start}
              disabled={step !== 'uploaded' || busy}
              size="sm"
              className="px-4"
            >
              Enhance Video
            </Button>
            <Button
              type="button"
              onClick={reset}
              disabled={busy}
              variant="ghost"
              size="sm"
              className="px-4 border border-gray-300/70 dark:border-gray-600/80"
            >
              Reset
            </Button>
          </div>
        </div>

        {usage && (
          <div className="pt-1 flex justify-center">
            <ToolUsageBadge
              label={monthlyLabel}
              loadingLabel={t('common.loading') || 'Loading…'}
              usage={usage}
              ownerType={ownerType}
              planId={planId}
              planLabel={planLabel}
              layout="card"
              size="sm"
              align="center"
              showIcon
              showResetHint={false}
              showOwnerHint={false}
              showPercent
              detailsTitle={monthlyLabel}
              headerCredits={
                creditsBalanceTenths != null ? Math.round(creditsBalanceTenths) / 10 : null
              }
              detailsItems={[
                {
                  id: 'monthly',
                  label: monthlyLabel,
                  used: usage.used,
                  limit: usage.limit,
                  resetAt: usage.resetAt,
                },
                ...(creditsBalanceTenths != null
                  ? [
                      {
                        id: 'credits',
                        label: creditsLabel,
                        used: Math.round(creditsBalanceTenths) / 10,
                        limit: null,
                        resetAt: null,
                        kind: 'credits' as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        )}
        {busy && step === 'running' && etaTargetMs && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded">
              <div
                className="h-2 bg-emerald-600 rounded"
                style={{ width: `${Math.floor(etaPct)}%` }}
              />
            </div>
            {typeof etaRemainingMs === 'number' && (
              <p className="text-xs text-gray-500">
                {etaRemainingMs > 0
                  ? `Estimated time: ${Math.floor(etaRemainingMs / 60000)}m ${Math.ceil((etaRemainingMs % 60000) / 1000)}s`
                  : 'Almost done…'}
              </p>
            )}
          </div>
        )}
        {busy && step !== 'running' && <p className="text-sm text-gray-500">Processing…</p>}
        {charge && 'balance' in charge && (
          <p className="text-sm text-gray-500">
            Charged {charge.credits} credits. Balance: {charge.balance}
          </p>
        )}
        {charge && 'quota' in charge && charge.quota === true && (
          <p className="text-sm text-gray-500">Using monthly quota (no credits deducted)</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {outputUrl && (
        <div className="space-y-2">
          <video src={outputUrl} controls className="w-full max-w-2xl rounded" />
          <div>
            <Button as="a" href={outputUrl} download variant="secondary" size="sm" className="px-3">
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
