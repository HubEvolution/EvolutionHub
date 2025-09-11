import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Icon from './Icon';

// TypeScript interfaces for better type safety
interface LogLevelBadgeProps {
  level: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

// Panel status types for state machine
type PanelStatus = 
  | { type: 'initializing' }
  | { type: 'connecting'; mode: string }
  | { type: 'connected'; mode: string; hasLogs: boolean }
  | { type: 'error'; error: string }
  | { type: 'waiting'; mode: string };

const LogLevelBadge: React.FC<LogLevelBadgeProps> = React.memo(({ level }) => {
  const baseStyle = "px-2 py-1 rounded text-xs font-semibold mr-2";
  switch (level.toLowerCase()) {
    case 'info':
      return <span className={`${baseStyle} bg-blue-100 text-blue-800`}>Info</span>;
    case 'warn':
      return <span className={`${baseStyle} bg-yellow-100 text-yellow-800`}>Warn</span>;
    case 'error':
      return <span className={`${baseStyle} bg-red-100 text-red-800`}>Error</span>;
    case 'debug':
      return <span className={`${baseStyle} bg-purple-100 text-purple-800`}>Debug</span>;
    case 'log':
    default:
      return <span className={`${baseStyle} bg-gray-100 text-gray-800`}>Log</span>;
  }
});

const DebugPanel: React.FC = () => {
  // Hybrid connection state management
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'sse' | 'polling' | null>(null);
  
  // Tab system state
  const [activeTab, setActiveTab] = useState<'logs' | 'help' | 'settings'>('logs');
  
  // Stable references to prevent useEffect dependencies issues
  const stateRef = useRef({ logs, websocket, eventSource, isConnecting, error, connectionMode });
  
  // Update ref after each render
  useEffect(() => {
    stateRef.current = { logs, websocket, eventSource, isConnecting, error, connectionMode };
  });

  // Computed panel status (single source of truth for conditional rendering)
  const computePanelStatus = useCallback((): PanelStatus => {
    if (error) return { type: 'error', error };
    if (isConnecting) return { type: 'connecting', mode: connectionMode || 'hybrid' };
    if (!connectionMode) return { type: 'initializing' };
    if (logs.length === 0) return { type: 'waiting', mode: connectionMode };
    return { type: 'connected', mode: connectionMode, hasLogs: true };
  }, [error, isConnecting, connectionMode, logs.length]);
  
  const panelStatus = useMemo(() => computePanelStatus(), [computePanelStatus]);
  
  // Performance-optimized components for tab content
  const LogItem = React.memo<{ log: LogEntry; index: number }>(({ log, index }) => (
    <li key={`${log.timestamp}-${index}`} className="flex items-start text-sm border-b border-gray-700 pb-2 last:border-b-0 last:pb-0">
      <span className="flex-shrink-0 w-24 text-xs text-gray-400 mr-3">
        {log.timestamp.split('T')[1]?.split('.')[0] || log.timestamp}
      </span>
      <LogLevelBadge level={log.level} />
      <div className="flex-1 whitespace-pre-wrap break-words">
        {log.message}
      </div>
    </li>
  ));
  
  const LogsList = React.memo<{ logs: LogEntry[] }>(({ logs }) => {
    const reversedLogs = useMemo(() => logs.slice().reverse(), [logs]);
    
    return (
      <ul className="space-y-2">
        {reversedLogs.map((log, index) => (
          <LogItem key={`${log.timestamp}-${index}`} log={log} index={index} />
        ))}
      </ul>
    );
  });
  
  const StatusMessage = React.memo<{ status: PanelStatus }>(({ status }) => {
    switch (status.type) {
      case 'initializing':
        return <p className="text-yellow-400 mb-2">Initializing connection...</p>;
      case 'connecting':
        return <p className="text-blue-400 mb-2">Connecting via {status.mode}...</p>;
      case 'connected':
        return null;
      case 'error':
        return <p className="text-red-500 mb-2">Error: {status.error}</p>;
      case 'waiting':
        return <p className="text-gray-400 mb-2">Connected. Waiting for logs...</p>;
      default:
        return null;
    }
  });

  const TabNavigation = React.memo<{
    activeTab: 'logs' | 'help' | 'settings';
    setActiveTab: (tab: 'logs' | 'help' | 'settings') => void;
  }>(({ activeTab, setActiveTab }) => (
    <nav className="flex-shrink-0 border-b border-gray-700">
      <div className="flex">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="clipboard" className="w-4 h-4" ariaLabel="Logs" />
            Logs
          </span>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'help'
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('help')}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="chat" className="w-4 h-4" ariaLabel="Help" />
            Help
          </span>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="tool" className="w-4 h-4" ariaLabel="Settings" />
            Settings
          </span>
        </button>
      </div>
    </nav>
  ));
  
  // Settings persistence hook
  const useSettingsPersistence = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
    const [value, setValue] = useState<T>(() => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    });
  
    const setPersistentValue = useCallback((newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.warn(`Failed to persist setting ${key}:`, error);
      }
    }, [key]);
  
    return [value, setPersistentValue];
  };
  
  const HelpContent = React.memo<{
    connectionMode: string | null;
    logsCount: number;
    panelStatus: PanelStatus;
  }>(({ connectionMode, logsCount, panelStatus }) => {
    const connectionInfo = useMemo(() => ({
      current: connectionMode || 'Not connected',
      status: panelStatus.type,
      logCount: logsCount
    }), [connectionMode, panelStatus.type, logsCount]);
  
    return (
      <div className="text-sm space-y-4">
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="plug" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="URLs" />
              URLs:
            </span>
          </h3>
          <p className="text-gray-300">Astro: localhost:4322/debug</p>
          <p className="text-gray-300">Wrangler: localhost:8787/debug</p>
        </div>
        
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="target" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Current Status" />
              Current Status:
            </span>
          </h3>
          <p className="text-gray-300">Mode: {connectionInfo.current}</p>
          <p className="text-gray-300">Status: {connectionInfo.status}</p>
          <p className="text-gray-300">Logs: {connectionInfo.logCount}</p>
        </div>
        
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="target" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Connection Types" />
              Connection Types:
            </span>
          </h3>
          <p className="text-gray-300">
            <span className="inline-flex items-center gap-2">
              <Icon name="statusDot" className="w-3 h-3 text-green-400 inline-block" ariaLabel="Websocket" />
              WEBSOCKET: Real-time (&lt;10ms)
            </span>
          </p>
          <p className="text-gray-300">
            <span className="inline-flex items-center gap-2">
              <Icon name="statusDot" className="w-3 h-3 text-blue-400 inline-block" ariaLabel="SSE" />
              SSE: Near real-time (100-500ms)
            </span>
          </p>
          <p className="text-gray-300">
            <span className="inline-flex items-center gap-2">
              <Icon name="statusDot" className="w-3 h-3 text-orange-400 inline-block" ariaLabel="Polling" />
              POLLING: Fallback (1-5s)
            </span>
          </p>
        </div>
        
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="chart" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Log Levels" />
              Log Levels:
            </span>
          </h3>
          <p className="text-gray-300">[DEBUG] Development details</p>
          <p className="text-gray-300">[INFO] Normal operations</p>
          <p className="text-gray-300">[WARN] Potential issues</p>
          <p className="text-gray-300">[ERROR] Critical problems</p>
        </div>
        
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="tool" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Quick Actions" />
              Quick Actions:
            </span>
          </h3>
          <p className="text-gray-300">Auto-scroll: Scroll to bottom</p>
          <p className="text-gray-300">Clear logs: Refresh page</p>
          <p className="text-gray-300">Connection issues: Restart dev server</p>
        </div>
      </div>
    );
  });
  
  const SettingsContent = React.memo(() => {
    const [autoScroll, setAutoScroll] = useSettingsPersistence('debugPanel.autoScroll', true);
    const [maxLogEntries, setMaxLogEntries] = useSettingsPersistence('debugPanel.maxLogEntries', 500);
  
    return (
      <div className="text-sm space-y-4">
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="tool" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Display Settings" />
              Display Settings:
            </span>
          </h3>
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-300">Auto-scroll to new logs</span>
          </label>
        </div>
        
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="preset" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Performance" />
              Performance:
            </span>
          </h3>
          <label className="block text-gray-300 mb-1">Max Log Entries:</label>
          <input 
            type="range" 
            min="100" 
            max="1000" 
            step="50"
            value={maxLogEntries}
            onChange={(e) => setMaxLogEntries(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-gray-400 text-xs">{maxLogEntries} entries</span>
        </div>
        
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="lightbulb" className="w-4 h-4 text-blue-400 inline-block" ariaLabel="Info" />
              Information:
            </span>
          </h3>
          <p className="text-gray-300 text-xs">Settings are automatically saved to localStorage</p>
          <p className="text-gray-300 text-xs">Changes take effect immediately</p>
        </div>
      </div>
    );
  });
  
  // Scroll position persistence
  const scrollPositions = useRef<Record<string, number>>({
    logs: 0,
    help: 0,
    settings: 0
  });
  
  const useScrollPersistence = (tabId: string, containerRef: React.RefObject<HTMLDivElement>) => {
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
  
      // Restore scroll position when tab becomes active
      container.scrollTop = scrollPositions.current[tabId] || 0;
  
      const handleScroll = () => {
        scrollPositions.current[tabId] = container.scrollTop;
      };
  
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }, [tabId]);
  };
  
  const TabContent = React.memo<{
    activeTab: 'logs' | 'help' | 'settings';
    logs: LogEntry[];
    connectionMode: string | null;
    panelStatus: PanelStatus;
  }>(({ activeTab, logs, connectionMode, panelStatus }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useScrollPersistence(activeTab, scrollRef);
  
    return (
      <div ref={scrollRef} className="h-full overflow-y-auto">
        {activeTab === 'logs' && <LogsList logs={logs} />}
        {activeTab === 'help' && (
          <HelpContent 
            connectionMode={connectionMode}
            logsCount={logs.length}
            panelStatus={panelStatus}
          />
        )}
        {activeTab === 'settings' && <SettingsContent />}
      </div>
    );
  });
  
  // Environment-based connection URLs
  const WEBSOCKET_URL = "ws://localhost:8081";
  const SSE_URL = "/api/debug/logs-stream";
  // Removed unused POLLING_URL

  const addLog = (newLog: LogEntry) => {
    setLogs((prevLogs) => [...prevLogs, newLog].slice(-500)); // Keep only the last 500 logs
  };
  
  // Environment detection
  const detectEnvironment = async () => {
    try {
      // Try to detect environment via API
      const response = await fetch(SSE_URL, { method: 'GET' });
      const data = await response.json();
      
      if (data.websocketUrl) {
        return 'astro-dev'; // Should use WebSocket
      } else {
        return 'wrangler'; // Should use SSE
      }
    } catch {
      // Fallback: assume we're in standard dev if WebSocket works
      return 'astro-dev';
    }
  };
  
  // SSE Connection
  const connectSSE = (url: string) => {
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
      console.log('DebugPanel: SSE already connected.');
      return;
    }
    if (isConnecting) {
      console.log('DebugPanel: SSE connection already in progress.');
      return;
    }
  
    setIsConnecting(true);
    setError(null);
    setConnectionMode('sse');
    console.log(`DebugPanel: Attempting to connect via SSE: ${url}`);
  
    try {
      const es = new EventSource(url);
  
      es.onopen = () => {
        console.log('DebugPanel: SSE connected successfully.');
        setEventSource(es);
        setIsConnecting(false);
        setError(null);
        addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Connected to log stream via SSE.' });
      };
  
      es.onmessage = (event) => {
        try {
          // Try to parse as JSON first (for structured messages)
          let logData;
          try {
            logData = JSON.parse(event.data);
            if (logData.type === 'keep-alive' || logData.type === 'environment-info') {
              return; // Skip system messages
            }
          } catch {
            // Not JSON, treat as log string
            logData = event.data;
          }
  
          const logText = typeof logData === 'string' ? logData : JSON.stringify(logData);
          
          // Parse the log entry string with the same logic as WebSocket
          const logParts = logText.match(/^\[(.*?)\] \[(.*?)\] (.*)/s);
          if (logParts && logParts[1] && logParts[2] && logParts[3]) {
            addLog({
              timestamp: logParts[1],
              level: logParts[2],
              message: logParts[3],
            });
          } else {
            // Fallback if parsing fails
            addLog({ timestamp: new Date().toISOString(), level: 'log', message: logText });
          }
        } catch (e) {
          console.error('DebugPanel: Failed to parse SSE message:', e);
          addLog({ timestamp: new Date().toISOString(), level: 'error', message: 'Failed to parse SSE message.' });
        }
      };
  
      es.onerror = (event) => {
        console.error('DebugPanel: SSE error:', event);
        setError('SSE connection error.');
        setIsConnecting(false);
        setEventSource(null);
        addLog({ timestamp: new Date().toISOString(), level: 'error', message: 'SSE error: Could not connect or maintain connection.' });
      };
  
    } catch (err: unknown) {
      console.error('DebugPanel: Error creating SSE connection:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect via SSE: ${message}`);
      setIsConnecting(false);
      addLog({ timestamp: new Date().toISOString(), level: 'error', message: `Failed to create SSE connection: ${message}` });
    }
  };
  
  const connectWebSocket = (url: string) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('DebugPanel: WebSocket already connected.');
      return;
    }
    if (isConnecting) {
      console.log('DebugPanel: WebSocket connection already in progress.');
      return;
    }
  
    setIsConnecting(true);
    setError(null);
    setConnectionMode('websocket');
    console.log(`DebugPanel: Attempting to connect to WebSocket: ${url}`);
  
    try {
      const client = new WebSocket(url);
  
      client.onopen = () => {
        console.log('DebugPanel: WebSocket connected successfully.');
        setWebsocket(client);
        setIsConnecting(false);
        setError(null);
        addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Connected to WebSocket server.' });
      };
  
      client.onmessage = (event) => {
        try {
          const logText = event.data;
          // Parse the log entry string with the same logic as LogContext
          // Expected format from logger.ts: "[TIMESTAMP] [LEVEL] MESSAGE"
          const logParts = logText.match(/^\[(.*?)\] \[(.*?)\] (.*)/s);
          if (logParts && logParts[1] && logParts[2] && logParts[3]) {
            addLog({
              timestamp: logParts[1],
              level: logParts[2],
              message: logParts[3],
            });
          } else {
            // Fallback if parsing fails, display raw message
            addLog({ timestamp: new Date().toISOString(), level: 'log', message: logText });
          }
        } catch (e) {
          console.error('DebugPanel: Failed to parse WebSocket message:', e);
          addLog({ timestamp: new Date().toISOString(), level: 'error', message: 'Failed to parse WebSocket message.' });
        }
      };
  
      client.onerror = (event) => {
        console.error('DebugPanel: WebSocket error:', event);
        setError('WebSocket connection error.');
        setIsConnecting(false);
        setWebsocket(null);
        addLog({ timestamp: new Date().toISOString(), level: 'error', message: 'WebSocket error: Could not connect or maintain connection.' });
      };
  
      client.onclose = () => {
        console.log('DebugPanel: WebSocket disconnected.');
        setWebsocket(null);
        setIsConnecting(false);
        addLog({ timestamp: new Date().toISOString(), level: 'warn', message: 'Disconnected from WebSocket server.' });
      };
  
    } catch (err: unknown) {
      console.error('DebugPanel: Error creating WebSocket connection:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect: ${message}`);
      setIsConnecting(false);
      addLog({ timestamp: new Date().toISOString(), level: 'error', message: `Failed to create WebSocket connection: ${message}` });
    }
  };
  
  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
      setIsConnecting(false);
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Disconnected WebSocket manually.' });
    }
  };
  
  const disconnectSSE = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnecting(false);
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Disconnected SSE manually.' });
    }
  };
  
  const disconnectAll = () => {
    disconnectWebSocket();
    disconnectSSE();
    setConnectionMode(null);
  };
  
  // Hybrid connection logic - automatically chooses best method
  const connectHybrid = async () => {
    addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Detecting environment and connecting...' });
    
    try {
      const environment = await detectEnvironment();
      
      if (environment === 'astro-dev') {
        // Try WebSocket first for Astro dev environment
        try {
          connectWebSocket(WEBSOCKET_URL);
        } catch {
          addLog({ timestamp: new Date().toISOString(), level: 'warn', message: 'WebSocket failed, falling back to SSE...' });
          connectSSE(SSE_URL);
        }
      } else {
        // Use SSE for Wrangler/Cloudflare environment
        connectSSE(SSE_URL);
      }
    } catch {
      // Fallback: try WebSocket first, then SSE
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Environment detection failed, trying WebSocket first...' });
      try {
        connectWebSocket(WEBSOCKET_URL);
        // Set a timeout to fall back to SSE if WebSocket doesn't connect
        setTimeout(() => {
          if (!websocket || websocket.readyState !== WebSocket.OPEN) {
            addLog({ timestamp: new Date().toISOString(), level: 'warn', message: 'WebSocket timeout, falling back to SSE...' });
            connectSSE(SSE_URL);
          }
        }, 3000);
      } catch {
        addLog({ timestamp: new Date().toISOString(), level: 'warn', message: 'WebSocket failed, trying SSE...' });
        connectSSE(SSE_URL);
      }
    }
  };
  
  // Stable hybrid connection function
  const connectHybridStable = useCallback(async () => {
    const current = stateRef.current;
    if (!current.websocket && !current.eventSource && !current.isConnecting) {
      console.log("DebugPanel: Initiating hybrid connection...");
      await connectHybrid();
    }
  }, []);
  
  // Auto-connect using stable hybrid logic for live logging
  useEffect(() => {
    connectHybridStable();
    // Cleanup on unmount
    return () => {
      disconnectAll();
    };
  }, [connectHybridStable]);
  
  // Create memory for the implementation to save context
  useEffect(() => {
    console.log('DebugPanel with Sidebar-Tab-System initialized successfully');
  }, []);
  

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg flex flex-col h-[600px]">
      {/* HEADER - FIXED HEIGHT */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Debugging Panel</h2>
          {connectionMode && (
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                connectionMode === 'websocket' ? 'bg-green-600 text-white' :
                connectionMode === 'sse' ? 'bg-blue-600 text-white' : 
                'bg-orange-600 text-white'
              }`}>
                {connectionMode.toUpperCase()}
              </span>
              {(websocket?.readyState === WebSocket.OPEN || eventSource?.readyState === EventSource.OPEN) && (
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* TAB NAVIGATION - FIXED HEIGHT */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* STATUS MESSAGES - DYNAMIC HEIGHT */}
      <div className="flex-shrink-0 px-4 py-2">
        <StatusMessage status={panelStatus} />
      </div>

      {/* TAB CONTENT - FLEXIBLE HEIGHT */}
      <main className="flex-1 min-h-0 px-4 pb-4">
        <TabContent 
          activeTab={activeTab}
          logs={logs}
          connectionMode={connectionMode}
          panelStatus={panelStatus}
        />
      </main>
    </div>
  );
};

export default DebugPanel;