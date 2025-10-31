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
  data?: { jobId: string; status: string; charge?: { credits: number; balance: number } };
  error?: { type: string; message: string; details?: unknown };
};

type JobResponse = {
  success: boolean;
  data?: { status: string; output?: { key: string; url: string } };
  error?: { type: string; message: string };
};

export default function VideoEnhancerIsland() {
  const [file, setFile] = useState<File | null>(null);
  const [tier, setTier] = useState<Tier>('720p');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'idle' | 'uploaded' | 'running' | 'done' | 'error'>('idle');
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [charge, setCharge] = useState<{ credits: number; balance: number } | null>(null);
  const pollRef = useRef<number | null>(null);

  const canStart = useMemo(() => !!file && !!tier && !busy, [file, tier, busy]);

  const reset = useCallback(() => {
    setBusy(false);
    setStep('idle');
    setUploadKey(null);
    setJobId(null);
    setOutputUrl(null);
    setError(null);
    setDurationMs(null);
    setCharge(null);
  }, []);

  const upload = useCallback(async () => {
    if (!file) return;
    if (!durationMs) {
      setError('Could not read video duration');
      setStep('error');
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('tier', tier);
    fd.set('durationMs', String(durationMs));
    const csrf = ensureCsrfToken();
    const res = await fetch('/api/ai-video/upload', {
      method: 'POST',
      body: fd,
      headers: { 'X-CSRF-Token': csrf },
      credentials: 'same-origin',
    });
    const data = (await res.json()) as UploadResponse;
    if (!data.success || !data.data) {
      setBusy(false);
      setError(data.error?.message || 'Upload failed');
      setStep('error');
      return;
    }
    setUploadKey(data.data.key);
    setStep('uploaded');
  }, [file, tier]);

  const start = useCallback(async () => {
    if (!uploadKey) return;
    setBusy(true);
    setError(null);
    const csrf = ensureCsrfToken();
    const res = await fetch('/api/ai-video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ key: uploadKey, tier }),
      credentials: 'same-origin',
    });
    const data = (await res.json()) as GenerateResponse;
    if (!data.success || !data.data) {
      setBusy(false);
      setError(data.error?.message || 'Start failed');
      setStep('error');
      return;
    }
    if (data.data.charge) setCharge(data.data.charge);
    setJobId(data.data.jobId);
    setStep('running');
  }, [uploadKey, tier]);

  useEffect(() => {
    const poll = async (id: string) => {
      const res = await fetch(`/api/ai-video/jobs/${id}`);
      const data = (await res.json()) as JobResponse;
      if (!data.success || !data.data) return;
      if (data.data.status === 'succeeded') {
        setOutputUrl(data.data.output?.url || null);
        setBusy(false);
        setStep('done');
        return true;
      }
      if (data.data.status === 'failed' || data.data.status === 'canceled') {
        setBusy(false);
        setError(`Job ${data.data.status}`);
        setStep('error');
        return true;
      }
      return false;
    };
    if (step === 'running' && jobId) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        const finished = await poll(jobId);
        if (finished && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 1200);
    }
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [step, jobId]);

  // Measure video duration when a file is selected
  useEffect(() => {
    if (!file) {
      setDurationMs(null);
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
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      const onError = () => {
        try {
          setDurationMs(null);
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
        {busy && <p className="text-sm text-gray-500">Processing…</p>}
        {charge && (
          <p className="text-sm text-gray-500">Charged {charge.credits} credits. Balance: {charge.balance}</p>
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
