import http from 'http';
import { WebSocketServer } from 'ws';
import { initializeLogger, log } from './utils/logger';
import { logAuthSuccess, logApiError, logPermissionDenied } from '../lib/security-logger';

// Assume createWebSocketServer is correctly imported and functional
// Let's assume logServer.ts exports a function like this:
// export const createWebSocketServer = (port: number): WebSocketServer => { ... };
// We will use the actual import path as given in the instructions.
import { createWebSocketServer } from './websocket/logServer';


// Define the port for the WebSocket server
// Using centralized configuration from astro.config.mjs
const WEBSOCKET_PORT = 8081; // Synchronized with DebugPanel.tsx

// Start the WebSocket server
console.log(`Starting WebSocket server on port ${WEBSOCKET_PORT}...`);
const wss = createWebSocketServer(WEBSOCKET_PORT);

// Initialize the logger with the WebSocket server instance
// This connects the logging functions to the WebSocket broadcast mechanism.
initializeLogger(wss);

// --- Example Usage ---
// Simulate some application activity to demonstrate logging.

console.log('--- Demonstrating logging ---');
console.log('Executing test log statement...');
log('info', 'Test message from server'); // Added test log

// General logs
log('info', 'Server started and WebSocket server is listening.');
log('debug', 'Processing incoming request...');
log('warn', 'High CPU usage detected.', { cpuLoad: 85, threshold: 80 });
log('error', 'Failed to establish database connection.', { dbError: 'Connection refused', retries: 3 });

// Security logs using the refactored functions
// Assuming these functions are correctly implemented in ../lib/security-logger
logAuthSuccess('user-123', '192.168.1.100', { method: 'POST', endpoint: '/api/login' });
logApiError('/api/users/profile', { statusCode: 404, message: 'User not found' }, { userId: 'user-456', ipAddress: '10.0.0.5' });
logPermissionDenied('user-789', '/admin/dashboard', { reason: 'Insufficient privileges' });

console.log('--- End of logging demonstration ---');

// In a real application, you would keep the server running.
// For this example, we'll just log that it's set up.
// The 'createWebSocketServer' function already handles the server listening.

// Note: In a full Node.js application, you might need to handle graceful shutdown.
// For this demonstration, we assume the process remains active to keep the server running.