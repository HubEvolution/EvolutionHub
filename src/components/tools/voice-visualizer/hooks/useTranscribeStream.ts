import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type VoiceStreamState = {
  jobId: string | null;
  connected: boolean;
  partials: string[];
  final?: string;
  usage?: { used: number; limit: number; resetAt: number | null };
  error?: string | null;
};

export function useTranscribeStream(initialJobId?: string) {
  const [state, setState] = useState<VoiceStreamState>({
    jobId: initialJobId || null,
    connected: false,
    partials: [],
  });
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);

  const startSSE = useCallback(
    async (jobId?: string) => {
      const targetJob = jobId || state.jobId || '';
      const u = new URL('/api/voice/stream', window.location.origin);
      if (targetJob) u.searchParams.set('jobId', targetJob);
      if (esRef.current)
        try {
          esRef.current.close();
        } catch {}
      const es = new EventSource(u.toString());
      esRef.current = es;
      es.addEventListener('connected', (ev: MessageEvent) => {
        let j = targetJob;
        try {
          const data = JSON.parse(String(ev.data || '{}'));
          if (data.jobId) j = data.jobId;
        } catch {}
        setState((s) => ({ ...s, jobId: j || null, connected: true }));
      });
      es.addEventListener('partial', (ev: MessageEvent) => {
        try {
          const d = JSON.parse(String(ev.data || '""'));
          setState((s) => ({ ...s, partials: [...s.partials, String(d || '')] }));
        } catch {}
      });
      es.addEventListener('final', (ev: MessageEvent) => {
        try {
          const d = JSON.parse(String(ev.data || '""'));
          setState((s) => ({ ...s, final: String(d || '') }));
        } catch {}
      });
      es.addEventListener('usage', (ev: MessageEvent) => {
        try {
          const d = JSON.parse(String(ev.data || '{}'));
          setState((s) => ({ ...s, usage: d }));
        } catch {}
      });
      es.onerror = () => {
        setState((s) => ({ ...s, connected: false }));
      };
    },
    [state.jobId]
  );

  const stop = useCallback(() => {
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setState((s) => ({ ...s, connected: false }));
  }, []);

  const poll = useCallback(
    (intervalMs: number = 1000) => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      pollRef.current = window.setInterval(async () => {
        const j = state.jobId;
        if (!j) return;
        try {
          const res = await fetch(`/api/voice/poll?jobId=${encodeURIComponent(j)}`);
          const json = (await res.json()) as unknown;
          const data =
            json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)
              ? ((json as { data?: unknown }).data as Record<string, unknown>) || {}
              : {};
          setState((s) => ({
            ...s,
            partials: Array.isArray((data as { partials?: unknown }).partials)
              ? ((data as { partials: string[] }).partials)
              : s.partials,
            final: (data as { final?: string }).final ?? s.final,
            usage: (data as { usage?: { used: number; limit: number; resetAt: number | null } })
              .usage ?? s.usage,
          }));
        } catch {}
      }, intervalMs);
    },
    [state.jobId]
  );

  useEffect(() => {
    return () => {
      if (esRef.current)
        try {
          esRef.current.close();
        } catch {}
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const ensure = useCallback(async () => {
    if (!state.jobId) await startSSE();
    poll(1000);
  }, [startSSE, poll, state.jobId]);

  const api = useMemo(
    () => ({
      state,
      start: startSSE,
      stop,
      ensure,
      setJobId: (j: string | null) => setState((s) => ({ ...s, jobId: j })),
    }),
    [state, startSSE, stop, ensure]
  );

  return api;
}
