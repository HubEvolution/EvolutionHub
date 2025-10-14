import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VOICE_MIN_CHUNK_BYTES } from '@/config/voice';
import Card from '@/components/ui/Card';
import { useMicrophone } from './hooks/useMicrophone';
import VisualizerCanvas from './VisualizerCanvas';
import { getVoiceUsage, postTranscribeChunk, type VoiceUsageInfo } from './api';
import { useTranscribeStream } from './hooks/useTranscribeStream';

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
    timesliceMs: 3000,
  });
  const [usage, setUsage] = useState<VoiceUsageInfo | null>(null);
  const [ownerType, setOwnerType] = useState<'user' | 'guest' | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const queueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const backoffUntilRef = useRef<number>(0);
  const streamCtl = useTranscribeStream();

  const usagePercent = useMemo(() => {
    if (!usage) return 0;
    return Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100);
  }, [usage]);

  const liveText = useMemo(() => {
    const parts = streamCtl.state.partials?.length ? streamCtl.state.partials.join('\n') : '';
    const final = streamCtl.state.final || '';
    const streamOut = final || parts;
    if (streamOut && transcript) return `${transcript}\n${streamOut}`;
    return streamOut || transcript;
  }, [streamCtl.state.partials, streamCtl.state.final, transcript]);

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
        const res = await postTranscribeChunk(
          blob,
          sessionId,
          langHint,
          streamCtl.state.jobId || undefined
        );
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
    try {
      await streamCtl.ensure();
    } catch {}
    await start();
  }, [refreshUsage, start]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleTestSpeech = useCallback(async () => {
    setErr(null);
    try {
      try {
        await streamCtl.ensure();
      } catch {}
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(media, { mimeType: mime });
      await new Promise<void>((resolve) => {
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size) chunks.push(e.data);
        };
        rec.onstop = () => resolve();
        rec.start(100);
        setTimeout(() => {
          try {
            rec.stop();
          } catch {}
        }, 1400);
      });
      const blob = new Blob(chunks, { type: mime });
      setBusy(true);
      const res = await postTranscribeChunk(
        blob,
        sessionId,
        langHint,
        streamCtl.state.jobId || undefined,
        true
      );
      if (!res.success) {
        const msg = res.error?.message || strings.error;
        setErr(msg);
        if (res.retryAfter && Number.isFinite(res.retryAfter)) {
          backoffUntilRef.current = Date.now() + res.retryAfter * 1000;
        }
      } else if (res.data) {
        setUsage(res.data.usage);
        setTranscript((t) => (t ? `${t}\n${res.data!.text}` : res.data!.text));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || strings.error);
    } finally {
      setBusy(false);
    }
  }, [langHint, sessionId, streamCtl.state.jobId, streamCtl.ensure, strings.error]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    onData((blob) => {
      // Skip if currently in explicit backoff window
      if (Date.now() < backoffUntilRef.current) return;
      // Ignore tiny chunks (<VOICE_MIN_CHUNK_BYTES) which providers may reject as invalid
      if (!blob || blob.size < VOICE_MIN_CHUNK_BYTES) return;
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
          {import.meta.env.MODE !== 'production' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestSpeech}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500`}
                disabled={busy}
              >
                Record 1s Speech (Test)
              </button>
            </div>
          )}
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
          {liveText || '…'}
        </div>
      </Card>
    </div>
  );
}
