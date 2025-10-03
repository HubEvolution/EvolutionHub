import React, { useEffect, useState, useCallback, useRef } from 'react';

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
  const [levelFilter, setLevelFilter] = useState<string[]>([
    'error',
    'warn',
    'info',
    'debug',
    'log',
  ]);
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

  const filteredLogs = logs.filter((log) => levelFilter.includes(log.level.toLowerCase()));

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
        <div className="flex gap-2 mt-2">
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
        </div>
      </div>

      {/* Logs - mit explizitem overflow-y-auto und min-h-0 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900 min-h-0">
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {logs.length === 0 ? 'Waiting for logs...' : 'No logs match current filter'}
          </p>
        ) : (
          filteredLogs
            .slice()
            .reverse()
            .map((log, idx) => (
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
