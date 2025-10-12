import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import { useMicrophone } from './hooks/useMicrophone';
import VisualizerCanvas from './VisualizerCanvas';
import { getVoiceUsage, postTranscribeChunk, type VoiceUsageInfo } from './api';

interface Strings {
  title: string;
  description: string;
  start: string;
  stop: string;
  usage: string;
  loading: string;
  transcript: string;
  error: string;
  rateLimited: (s: number) => string;
}

interface Props {
  strings: Strings;
  langHint?: string;
}

export default function VoiceVisualizerIsland({ strings, langHint }: Props) {
  const [sessionId] = useState<string>(
    () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string
  );
  const {
    start,
    stop,
    isRecording,
    stream,
    error: micError,
    onData,
  } = useMicrophone({
    timesliceMs: 2000,
  });
  const [usage, setUsage] = useState<VoiceUsageInfo | null>(null);
  const [ownerType, setOwnerType] = useState<'user' | 'guest' | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const queueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const backoffUntilRef = useRef<number>(0);

  const usagePercent = useMemo(() => {
    if (!usage) return 0;
    return Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100);
  }, [usage]);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await getVoiceUsage();
      if (res.success && res.data) {
        setUsage(res.data.usage);
        setOwnerType(res.data.ownerType);
      }
    } catch {}
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        if (Date.now() < backoffUntilRef.current) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        const blob = queueRef.current.shift()!;
        setBusy(true);
        const res = await postTranscribeChunk(blob, sessionId, langHint);
        if (!res.success) {
          const msg = res.error?.message || strings.error;
          setErr(msg);
          if (res.retryAfter && Number.isFinite(res.retryAfter)) {
            backoffUntilRef.current = Date.now() + res.retryAfter * 1000;
          }
          // Stop processing further to respect rate limit/backoff
          break;
        }
        const d = res.data!;
        setTranscript((t) => (t ? `${t}\n${d.text}` : d.text));
        setUsage(d.usage);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || strings.error);
    } finally {
      setBusy(false);
      processingRef.current = false;
    }
  }, [langHint, sessionId, strings.error]);

  const handleStart = useCallback(async () => {
    setErr(null);
    await refreshUsage();
    await start();
  }, [refreshUsage, start]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    onData((blob) => {
      // Skip if currently in explicit backoff window
      if (Date.now() < backoffUntilRef.current) return;
      queueRef.current.push(blob);
      processQueue();
    });
  }, [onData, processQueue]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{strings.title}</h1>
        <p className="text-gray-600 dark:text-gray-300">{strings.description}</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={isRecording ? handleStop : handleStart}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
              disabled={busy}
            >
              {isRecording ? strings.stop : strings.start}
            </button>
            {busy && <span className="text-sm text-gray-500 dark:text-gray-400">Uploading…</span>}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300">{strings.usage}:</span>
            <div className="flex items-center gap-2">
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                {usage ? `${usage.used}/${usage.limit}` : strings.loading}
              </div>
              <div className="w-28 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {ownerType && (
                <span className="text-xs text-gray-500 dark:text-gray-400">({ownerType})</span>
              )}
            </div>
          </div>
        </div>

        <VisualizerCanvas
          stream={stream}
          className="w-full rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        />

        {micError && <div className="text-sm text-red-600 dark:text-red-300">{micError}</div>}
        {err && (
          <div className="text-sm text-red-600 dark:text-red-300">
            {Date.now() < backoffUntilRef.current
              ? strings.rateLimited(Math.ceil((backoffUntilRef.current - Date.now()) / 1000))
              : err}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">{strings.transcript}</h2>
        <div className="min-h-[120px] whitespace-pre-wrap text-gray-800 dark:text-gray-100">
          {transcript || '…'}
        </div>
      </Card>
    </div>
  );
}
