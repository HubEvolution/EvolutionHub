import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureCsrfToken } from '@/lib/security/csrf';

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
    }
  }, [uploadKey, tier, durationMs]);

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
      <div className="space-y-3">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={busy || step === 'running'}
          ref={inputRef}
        />
        <div className="flex gap-3 items-center">
          <label className="text-sm">Tier</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
            disabled={busy || step === 'running'}
            className="border rounded px-2 py-1 bg-white dark:bg-gray-800"
          >
            <option value="720p">720p – Estimated: 5 Credits</option>
            <option value="1080p">1080p – Estimated: 8 Credits</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={upload}
            disabled={!canStart || step === 'uploaded' || step === 'running'}
            className="px-3 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-60"
          >
            Upload
          </button>
          <button
            onClick={start}
            disabled={step !== 'uploaded' || busy}
            className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-60"
          >
            Enhance Video
          </button>
          <button
            onClick={reset}
            disabled={busy}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600"
          >
            Reset
          </button>
        </div>
        {typeof durationMs === 'number' && (
          <p className="text-xs text-gray-500">Duration: {Math.ceil(durationMs / 1000)}s</p>
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
            <a
              href={outputUrl}
              download
              className="inline-flex items-center px-3 py-1.5 rounded bg-emerald-600 text-white"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
