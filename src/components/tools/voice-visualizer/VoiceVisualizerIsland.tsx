import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VOICE_MIN_CHUNK_BYTES } from '@/config/voice';
import {
  containerCls,
  usageBarBgCls,
  usageBarFillCls,
  sectionTitleCls,
} from '@/components/tools/shared/islandStyles';
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
  showHeader?: boolean;
}

export default function VoiceVisualizerIsland({ strings, langHint, showHeader = false }: Props) {
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

  // removed unused liveText computation for lint cleanliness

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const inBackoff = Date.now() < backoffUntilRef.current;
    if (!inBackoff) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [tick]);

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
    <div className={containerCls}>
      {showHeader && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{strings.title}</h1>
          <p className="text-gray-600 dark:text-gray-300">{strings.description}</p>
        </div>
      )}

      <div className="space-y-4 rounded-xl p-4 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm ring-1 ring-black/10 dark:ring-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={isRecording ? handleStop : handleStart}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
              disabled={busy && !isRecording}
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
              <div className={usageBarBgCls}>
                <div
                  className={usageBarFillCls(usagePercent)}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {ownerType && (
                <span className="text-xs text-gray-500 dark:text-gray-400">({ownerType})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded ${
                streamCtl.state.connected
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {streamCtl.state.connected ? 'Connected' : 'Disconnected'}
            </span>
            {Date.now() < backoffUntilRef.current && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                Backoff {Math.max(0, Math.ceil((backoffUntilRef.current - Date.now()) / 1000))}s
              </span>
            )}
            {streamCtl.state.jobId && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                Job {streamCtl.state.jobId.slice(0, 8)}
              </span>
            )}
            {import.meta.env.MODE !== 'production' && (
              <button
                onClick={handleTestSpeech}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500`}
                disabled={busy}
              >
                Record 1s Speech (Test)
              </button>
            )}
          </div>
        </div>

        <VisualizerCanvas
          stream={stream}
          className="w-full rounded-md bg-white/80 dark:bg-black/30"
        />

        {micError && <div className="text-sm text-red-600 dark:text-red-300">{micError}</div>}
        {err && (
          <div className="text-sm text-red-600 dark:text-red-300">
            {Date.now() < backoffUntilRef.current
              ? strings.rateLimited(Math.ceil((backoffUntilRef.current - Date.now()) / 1000))
              : err}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm ring-1 ring-black/10 dark:ring-white/10">
        <h2 className={sectionTitleCls}>{strings.transcript}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Final</div>
            <div className="min-h-[100px] whitespace-pre-wrap text-gray-900 dark:text-gray-100 rounded-md p-3 bg-white/80 dark:bg-black/30">
              {streamCtl.state.final || transcript || '…'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Live</div>
            <div className="min-h-[100px] whitespace-pre-wrap text-gray-900 dark:text-gray-100 rounded-md p-3 bg-white/80 dark:bg-black/30">
              {streamCtl.state.partials?.length ? streamCtl.state.partials.join('\n') : '…'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
