import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

const STORAGE_KEY = 'debugPanel.logs';
const MAX_STORED_LOGS = 500;

const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // Load logs from LocalStorage on mount
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [windowSize, setWindowSize] = useState(200);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const pausedBufferRef = useRef<LogEntry[]>([]);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [groupRepeats, setGroupRepeats] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('debugPanel.groupRepeats') === 'true';
    } catch {
      return false;
    }
  });
  const [levelFilter, setLevelFilter] = useState<string[]>([
    'error',
    'warn',
    'info',
    'debug',
    'log',
  ]);
  const [sourceFilters, setSourceFilters] = useState<Record<'server'|'client'|'console'|'network', boolean>>(() => {
    if (typeof window === 'undefined') return { server: true, client: true, console: true, network: true };
    try {
      const stored = localStorage.getItem('debugPanel.sourceFilters');
      return stored ? JSON.parse(stored) : { server: true, client: true, console: true, network: true };
    } catch {
      return { server: true, client: true, console: true, network: true };
    }
  });
  const [mutePatterns, setMutePatterns] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('debugPanel.mutePatterns') || '';
    } catch {
      return '';
    }
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/debug/logs-stream');

    eventSource.onopen = () => {
      setStatus('connected');
      addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Connected to log stream',
      });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'keep-alive' || data.type === 'environment-info') return;
        if (data.type === 'log' && data.timestamp && data.level && typeof data.message === 'string') {
          const entry: LogEntry = { timestamp: data.timestamp, level: String(data.level), message: data.message, source: data.source };
          if (!pausedRef.current) {
            addLog(entry);
          } else {
            // buffer while paused (cap to 500)
            const buf = pausedBufferRef.current;
            buf.push(entry);
            if (buf.length > 500) buf.shift();
            setSuppressedCount(buf.length);
          }
          return;
        }
      } catch {
        // ignore malformed JSON
      }
      // Unknown payloads: ignore to keep list clean
    };

    eventSource.onerror = () => {
      setStatus('error');
      addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Connection error - retrying...',
      });
    };

    return () => eventSource.close();
  }, []);

  // Persist groupRepeats
  useEffect(() => {
    try {
      localStorage.setItem('debugPanel.groupRepeats', String(groupRepeats));
    } catch {
      /* noop */
    }
  }, [groupRepeats]);

  // Persist sourceFilters & mutePatterns
  useEffect(() => {
    try {
      localStorage.setItem('debugPanel.sourceFilters', JSON.stringify(sourceFilters));
    } catch {/* noop */}
  }, [sourceFilters]);
  useEffect(() => {
    try {
      localStorage.setItem('debugPanel.mutePatterns', mutePatterns);
    } catch {/* noop */}
  }, [mutePatterns]);

  const addLog = useCallback((log: LogEntry) => {
    setLogs((prev) => {
      const newLogs = [...prev, log].slice(-MAX_STORED_LOGS);
      // Persist to LocalStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
      } catch (e) {
        console.warn('Failed to save logs to LocalStorage:', e);
      }
      return newLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear logs from LocalStorage:', e);
    }
  }, []);

  // exportLogs is defined after displayLogs to avoid TDZ issues

  const toggleLevelFilter = useCallback((level: string) => {
    setLevelFilter((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'debug':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const resolveSource = (log: LogEntry): 'server'|'client'|'console'|'network' => {
    const msg = log.message || '';
    if (msg.includes('[NETWORK]')) return 'network';
    if (msg.includes('[CONSOLE]')) return 'console';
    if (msg.includes('[CLIENT]')) return 'client';
    return 'server';
  };

  const muteList = useMemo(() =>
    mutePatterns
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase()),
    [mutePatterns]
  );

  const filteredLogs = logs.filter((log) => {
    if (!levelFilter.includes(log.level.toLowerCase())) return false;
    const src = resolveSource(log);
    if (!sourceFilters[src]) return false;
    if (muteList.length) {
      const hay = `${log.level} ${log.message}`.toLowerCase();
      if (muteList.some((needle) => hay.includes(needle))) return false;
    }
    return true;
  });

  type DisplayLog = LogEntry & { count?: number };

  const displayLogs: DisplayLog[] = useMemo(() => {
    // Render order is newest-first; group on that order
    const inRenderOrder = filteredLogs.slice().reverse();
    if (!groupRepeats) return inRenderOrder;
    const grouped: DisplayLog[] = [];
    for (const log of inRenderOrder) {
      const prev = grouped[grouped.length - 1];
      const key = `${log.level.toLowerCase()}|${log.message}`;
      const prevKey = prev ? `${prev.level.toLowerCase()}|${prev.message}` : null;
      if (prev && prevKey === key) {
        prev.count = (prev.count ?? 1) + 1;
        // Optionally update timestamp to latest occurrence
        prev.timestamp = log.timestamp;
      } else {
        grouped.push({ ...log, count: 1 });
      }
    }
    return grouped;
  }, [filteredLogs, groupRepeats]);

  const exportLogs = useCallback(() => {
    const items = (showAll ? displayLogs : displayLogs.slice(-Math.min(windowSize, displayLogs.length)));
    const payload = {
      exportedAt: new Date().toISOString(),
      status,
      filters: {
        levels: levelFilter,
        sources: sourceFilters,
        mutes: mutePatterns,
      },
      count: items.length,
      items,
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  }, [displayLogs, showAll, windowSize, status, levelFilter, sourceFilters, mutePatterns]);

  const exportNdjson = useCallback(() => {
    const items = (showAll ? displayLogs : displayLogs.slice(-Math.min(windowSize, displayLogs.length)));
    try {
      const nd = items.map((it) => JSON.stringify(it)).join('\n');
      const blob = new Blob([nd], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export NDJSON failed', e);
    }
  }, [displayLogs, showAll, windowSize]);

  const copyJson = useCallback(async () => {
    const items = (showAll ? displayLogs : displayLogs.slice(-Math.min(windowSize, displayLogs.length)));
    try {
      await navigator.clipboard.writeText(JSON.stringify(items, null, 2));
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, [displayLogs, showAll, windowSize]);

  const catchUp = useCallback(() => {
    const buf = pausedBufferRef.current;
    if (!buf.length) return;
    setLogs((prev) => {
      const merged = [...prev, ...buf].slice(-MAX_STORED_LOGS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    });
    pausedBufferRef.current = [];
    setSuppressedCount(0);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Debug Logs</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {Math.min(filteredLogs.length, showAll ? filteredLogs.length : Math.min(windowSize, filteredLogs.length))}
              {' '}of {filteredLogs.length} (total {logs.length})
            </span>
            <button
              onClick={clearLogs}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              title="Clear all logs"
            >
              Clear
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${paused ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-800'}`}
              aria-pressed={paused}
              title="Pause/resume capturing new logs"
            >
              {paused ? `Resume${suppressedCount ? ` (${suppressedCount})` : ''}` : 'Pause'}
            </button>
            {paused && suppressedCount > 0 && (
              <button
                onClick={catchUp}
                className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors"
                title="Append buffered logs and reset counter"
              >
                Catch up
              </button>
            )}
            <button
              onClick={exportLogs}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              title="Export current view as JSON"
            >
              Export JSON
            </button>
            <button
              onClick={exportNdjson}
              className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
              title="Export current view as NDJSON"
            >
              Export NDJSON
            </button>
            <button
              onClick={copyJson}
              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
              title="Copy current view as JSON to clipboard"
            >
              Copy JSON
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="rounded"
              />
              Show all
            </label>
            {!showAll && (
              <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                <span>Window</span>
                <input
                  type="number"
                  min={50}
                  max={1000}
                  step={50}
                  value={windowSize}
                  onChange={(e) => setWindowSize(Math.max(50, Math.min(1000, Number(e.target.value) || 200)))}
                  className="w-16 px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            )}
            <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={groupRepeats}
                onChange={(e) => setGroupRepeats(e.target.checked)}
                className="rounded"
              />
              Group repeats
            </label>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                status === 'connected'
                  ? 'bg-green-600 text-white'
                  : status === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-yellow-600 text-white'
              }`}
            >
              {status.toUpperCase()}
            </span>
            {status === 'connected' && (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
        </div>
        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {['error', 'warn', 'info', 'debug', 'log'].map((level) => (
            <button
              key={level}
              onClick={() => toggleLevelFilter(level)}
              aria-pressed={levelFilter.includes(level)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                levelFilter.includes(level)
                  ? getLevelColor(level)
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-50'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
          {/* Source Filters */}
          {(
            [
              ['server','SERVER'],
              ['client','CLIENT'],
              ['console','CONSOLE'],
              ['network','NETWORK'],
            ] as const
          ).map(([key,label]) => (
            <button
              key={key}
              onClick={() => setSourceFilters((p) => ({ ...p, [key]: !p[key] }))}
              aria-pressed={sourceFilters[key]}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                sourceFilters[key]
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-50'
              }`}
              title={`Toggle ${label}`}
            >
              {label}
            </button>
          ))}
          {/* Mute patterns input */}
          <div className="flex items-center gap-1 ml-auto">
            <input
              value={mutePatterns}
              onChange={(e) => setMutePatterns(e.target.value)}
              placeholder="mute patterns (comma-separated)"
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              style={{ minWidth: 220 }}
            />
            {mutePatterns && (
              <button
                onClick={() => setMutePatterns('')}
                className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded"
                title="Clear mute patterns"
              >
                Clear mutes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs - windowed rendering for performance */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900 min-h-0">
        {displayLogs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {logs.length === 0 ? 'Waiting for logs...' : 'No logs match current filter'}
          </p>
        ) : (
          (showAll ? displayLogs : displayLogs.slice(-Math.min(windowSize, displayLogs.length))).map((log, idx) => (
            <div
              key={idx}
              className="flex items-start text-sm border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0"
            >
              <span className="flex-shrink-0 w-24 text-xs text-gray-500 dark:text-gray-400 mr-3 font-mono">
                {log.timestamp.split('T')[1]?.split('.')[0] || log.timestamp}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold mr-2 flex-shrink-0 ${getLevelColor(log.level)}`}
              >
                {log.level.toUpperCase()}
              </span>
              <div className="flex-1 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 font-mono text-xs leading-relaxed">
                {log.message}
              </div>
              {log.count && log.count > 1 && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-semibold">
                  × {log.count}
                </span>
              )}
            </div>
          ))
        )}
        {/* Auto-scroll anchor */}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default DebugPanel;
