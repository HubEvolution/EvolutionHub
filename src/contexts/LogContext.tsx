import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
 
 // Define the structure of a log entry
 interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
 }
 
 // Define the context type
 interface LogContextType {
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  connectWebSocket: (url: string) => void;
  disconnectWebSocket: () => void;
  isConnecting: boolean;
  error: string | null;
 }
 
 // Default context value
 const defaultLogContextValue: LogContextType = {
  logs: [],
  addLog: () => {},
  connectWebSocket: () => {},
  disconnectWebSocket: () => {},
  isConnecting: false,
  error: null,
 };
 
 const LogContext = createContext<LogContextType>(defaultLogContextValue);
 
 interface LogProviderProps {
  children: ReactNode;
  // The WebSocket URL to connect to, e.g., ws://localhost:8080
  websocketUrl?: string;
 }
 
 export const LogProvider: React.FC<LogProviderProps> = ({ children, websocketUrl }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const addLog = (newLog: LogEntry) => {
   setLogs((prevLogs) => [...prevLogs, newLog].slice(-500)); // Keep only the last 500 logs
  };
 
  const connectWebSocket = (url: string) => {
   if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected.');
    return;
   }
   if (isConnecting) {
    console.log('WebSocket connection already in progress.');
    return;
   }
 
   setIsConnecting(true);
   setError(null);
   console.log(`Attempting to connect to WebSocket: ${url}`);
 
   try {
    // Renamed 'ws' to 'client' to avoid potential redeclaration issues with bundlers.
    const client = new WebSocket(url);
 
    client.onopen = () => {
     console.log('WebSocket connected successfully.');
     setWebsocket(client); // Assign the newly created socket instance to state
     setIsConnecting(false);
     setError(null);
     addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Connected to WebSocket server.' });
    };
 
    client.onmessage = (event) => {
     try {
      const logText = event.data; // This is the string 'logEntry' from logger.ts
 
      // Attempt to parse the log entry string.
      // The expected format from logger.ts is: "[TIMESTAMP] [LEVEL] MESSAGE"
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
      console.error('Failed to parse WebSocket message:', e);
      addLog({ timestamp: new Date().toISOString(), level: 'error', message: 'Failed to parse WebSocket message.' });
     }
    };
 
    client.onerror = (event) => {
     console.error('WebSocket error:', event);
     setError('WebSocket connection error.');
     setIsConnecting(false);
     setWebsocket(null); // Clear the state if the connection errors
     addLog({ timestamp: new Date().toISOString(), level: 'error', message: 'WebSocket error: Could not connect or maintain connection.' });
    };
 
    client.onclose = () => {
     console.log('WebSocket disconnected.');
     setWebsocket(null); // Clear the state on close
     setIsConnecting(false);
     addLog({ timestamp: new Date().toISOString(), level: 'warn', message: 'Disconnected from WebSocket server.' });
    };
 
   } catch (err: any) {
    console.error('Error creating WebSocket connection:', err);
    setError(`Failed to connect: ${err.message}`);
    setIsConnecting(false);
    addLog({ timestamp: new Date().toISOString(), level: 'error', message: `Failed to create WebSocket connection: ${err.message}` });
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
 
  // Automatically connect if websocketUrl is provided on mount
  useEffect(() => {
   if (websocketUrl) {
    connectWebSocket(websocketUrl);
   }
   // Cleanup on unmount
   return () => {
    disconnectWebSocket();
   };
  }, [websocketUrl]); // Re-run effect if websocketUrl changes
 
  const value: LogContextType = {
   logs,
   addLog,
   connectWebSocket,
   disconnectWebSocket,
   isConnecting,
   error,
  };
 
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
 };
 
 // Custom hook to use the LogContext
 export const useLog = () => {
  const context = useContext(LogContext);
  if (context === undefined) {
   throw new Error('useLog must be used within a LogProvider');
  }
  return context;
 };