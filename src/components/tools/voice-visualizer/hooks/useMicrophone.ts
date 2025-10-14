import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMicrophoneOptions {
  timesliceMs?: number; // default 2000
  mimeType?: string; // 'audio/webm;codecs=opus' or 'audio/ogg;codecs=opus'
}

export interface UseMicrophoneResult {
  start: () => Promise<void>;
  stop: () => void;
  isRecording: boolean;
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  error: string | null;
  onData: (cb: (blob: Blob) => void) => void;
}

export function useMicrophone(options: UseMicrophoneOptions = {}): UseMicrophoneResult {
  const timesliceMs = options.timesliceMs ?? 2000;
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const dataCbRef = useRef<((blob: Blob) => void) | null>(null);
  const tickRef = useRef<number | null>(null); // legacy cleanup (no active interval)
  const streamRef = useRef<MediaStream | null>(null);
  const segTimerRef = useRef<number | null>(null);
  const activeRef = useRef<boolean>(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    try {
      const rec = recorderRef.current;
      if (rec) {
        try {
          // Flush the last chunk before stopping
          if (rec.state === 'recording') rec.requestData();
        } catch {}
        rec.stop();
      }
    } catch {}
    try {
      const s = streamRef.current;
      s?.getTracks().forEach((t) => t.stop());
    } catch {}
    recorderRef.current = null;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (segTimerRef.current) {
      window.clearTimeout(segTimerRef.current);
      segTimerRef.current = null;
    }
    streamRef.current = null;
    setStream(null);
    setIsRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const constraints: MediaStreamConstraints = { audio: true, video: false };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);

      const mimeCandidates = [
        options.mimeType,
        // Prefer WebM Opus first (most reliable chunking with MediaRecorder)
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        // MP4 last-resort fallback
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ].filter(Boolean) as string[];
      const chosen = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t));
      const startNewSegment = () => {
        if (!activeRef.current) return;
        const rec = new MediaRecorder(
          streamRef.current as MediaStream,
          chosen ? { mimeType: chosen } : undefined
        );
        rec.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            const cb = dataCbRef.current;
            if (cb) cb(e.data);
          }
        };
        rec.onstop = () => {
          if (!activeRef.current) return;
          // Start next segment
          startNewSegment();
        };
        recorderRef.current = rec;
        rec.start();
        if (segTimerRef.current) window.clearTimeout(segTimerRef.current);
        segTimerRef.current = window.setTimeout(() => {
          try {
            if (rec.state === 'recording') rec.stop();
          } catch {}
        }, timesliceMs);
      };
      activeRef.current = true;
      startNewSegment();
      setIsRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setIsRecording(false);
    }
  }, [options.mimeType, timesliceMs]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      try {
        const rec = recorderRef.current;
        if (rec && rec.state === 'recording') {
          try {
            rec.requestData();
          } catch {}
          try {
            rec.stop();
          } catch {}
        }
      } catch {}
      try {
        const s = streamRef.current;
        s?.getTracks().forEach((t) => t.stop());
      } catch {}
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (segTimerRef.current) {
        window.clearTimeout(segTimerRef.current);
        segTimerRef.current = null;
      }
    };
  }, []);

  const onData = useCallback((cb: (blob: Blob) => void) => {
    dataCbRef.current = cb;
    const rec = recorderRef.current;
    if (rec) {
      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) cb(e.data);
      };
    }
  }, []);

  return { start, stop, isRecording, stream, recorder: recorderRef.current, error, onData };
}
