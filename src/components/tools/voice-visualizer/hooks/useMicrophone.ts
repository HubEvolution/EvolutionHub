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

  const stop = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {}
    try {
      stream?.getTracks().forEach((t) => t.stop());
    } catch {}
    recorderRef.current = null;
    setStream(null);
    setIsRecording(false);
  }, [stream]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const constraints: MediaStreamConstraints = { audio: true, video: false };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);

      const mimeCandidates = [
        options.mimeType,
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/ogg',
      ].filter(Boolean) as string[];
      const chosen = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(s, chosen ? { mimeType: chosen } : undefined);
      recorderRef.current = recorder;

      recorder.start(timesliceMs);
      setIsRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setIsRecording(false);
    }
  }, [options.mimeType, timesliceMs]);

  useEffect(() => () => stop(), [stop]);

  const onData = useCallback((cb: (blob: Blob) => void) => {
    const rec = recorderRef.current;
    if (rec) {
      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) cb(e.data);
      };
    }
  }, []);

  return { start, stop, isRecording, stream, recorder: recorderRef.current, error, onData };
}
