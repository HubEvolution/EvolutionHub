'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useTranscribeStream = useTranscribeStream;
const react_1 = require('react');
function useTranscribeStream(initialJobId) {
  const [state, setState] = (0, react_1.useState)({
    jobId: initialJobId || null,
    connected: false,
    partials: [],
  });
  const esRef = (0, react_1.useRef)(null);
  const pollRef = (0, react_1.useRef)(null);
  const startSSE = (0, react_1.useCallback)(
    async (jobId) => {
      const targetJob = jobId || state.jobId || '';
      const u = new URL('/api/voice/stream', window.location.origin);
      if (targetJob) u.searchParams.set('jobId', targetJob);
      if (esRef.current)
        try {
          esRef.current.close();
        } catch {}
      const es = new EventSource(u.toString());
      esRef.current = es;
      es.addEventListener('connected', (ev) => {
        let j = targetJob;
        try {
          const data = JSON.parse(String(ev.data || '{}'));
          if (data.jobId) j = data.jobId;
        } catch {}
        setState((s) => ({ ...s, jobId: j || null, connected: true }));
      });
      es.addEventListener('partial', (ev) => {
        try {
          const d = JSON.parse(String(ev.data || '""'));
          setState((s) => ({ ...s, partials: [...s.partials, String(d || '')] }));
        } catch {}
      });
      es.addEventListener('final', (ev) => {
        try {
          const d = JSON.parse(String(ev.data || '""'));
          setState((s) => ({ ...s, final: String(d || '') }));
        } catch {}
      });
      es.addEventListener('usage', (ev) => {
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
  const stop = (0, react_1.useCallback)(() => {
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
  const poll = (0, react_1.useCallback)(
    (intervalMs = 1000) => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      pollRef.current = window.setInterval(async () => {
        const j = state.jobId;
        if (!j) return;
        try {
          const res = await fetch(`/api/voice/poll?jobId=${encodeURIComponent(j)}`);
          const json = await res.json();
          const data = json?.data || {};
          setState((s) => ({
            ...s,
            partials: Array.isArray(data.partials) ? data.partials : s.partials,
            final: data.final ?? s.final,
            usage: data.usage ?? s.usage,
          }));
        } catch {}
      }, intervalMs);
    },
    [state.jobId]
  );
  (0, react_1.useEffect)(() => {
    return () => {
      if (esRef.current)
        try {
          esRef.current.close();
        } catch {}
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);
  const ensure = (0, react_1.useCallback)(async () => {
    if (!state.jobId) await startSSE();
    poll(1000);
  }, [startSSE, poll, state.jobId]);
  const api = (0, react_1.useMemo)(
    () => ({
      state,
      start: startSSE,
      stop,
      ensure,
      setJobId: (j) => setState((s) => ({ ...s, jobId: j })),
    }),
    [state, startSSE, stop, ensure]
  );
  return api;
}
