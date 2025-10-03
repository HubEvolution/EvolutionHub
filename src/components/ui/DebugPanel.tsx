import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
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
        // Try to parse as JSON first
        const data = JSON.parse(event.data);
        if (data.type === 'keep-alive' || data.type === 'environment-info') {
          return; // Skip system messages
        }
      } catch {
        // Not JSON, treat as log entry
      }

      // Parse log format: "[TIMESTAMP] [LEVEL] MESSAGE"
      const logMatch = event.data.match(/^\[(.*?)\] \[(.*?)\] (.*)/s);
      if (logMatch) {
        addLog({
          timestamp: logMatch[1],
          level: logMatch[2],
          message: logMatch[3],
        });
      } else {
        // Fallback for unparseable logs
        addLog({
          timestamp: new Date().toISOString(),
          level: 'log',
          message: event.data,
        });
      }
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Debug Logs</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {filteredLogs.length} / {logs.length} logs
            </span>
            <button
              onClick={clearLogs}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              title="Clear all logs"
            >
              Clear
            </button>
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
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
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
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
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

      {/* Logs - mit explizitem overflow-y-auto und min-h-0 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900 min-h-0">
        {displayLogs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {logs.length === 0 ? 'Waiting for logs...' : 'No logs match current filter'}
          </p>
        ) : (
          displayLogs.map((log, idx) => (
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
