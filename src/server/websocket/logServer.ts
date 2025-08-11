import WebSocket, { WebSocketServer } from 'ws';

/**
 * Creates and manages a WebSocket server that broadcasts messages to all connected clients.
 * @param port The port on which the WebSocket server should listen.
 * @returns The WebSocket server instance.
 */
export function createWebSocketServer(port: number): WebSocketServer {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws: WebSocket) => {
        console.log('WebSocket Client connected');

        // Handle incoming messages from clients (optional for this task, but good practice)
        ws.on('message', (message: string) => {
            console.log(`Received message from client: ${message}`);
            // Example: Broadcast back to all clients including sender
            // wss.clients.forEach((client) => {
            //     if (client.readyState === WebSocket.OPEN) {
            //         client.send(`Server echoed: ${message}`);
            //     }
            // });
        });

        ws.on('close', () => {
            console.log('WebSocket Client disconnected');
        });

        ws.on('error', (error: Error) => {
            console.error('WebSocket client error:', error);
        });

        // Send a welcome message to the newly connected client
        ws.send('Welcome to the WebSocket server!');
    });

    wss.on('listening', () => {
        console.log(`WebSocket server started successfully on port ${wss.options.port}`);
    });

    wss.on('error', (error: Error) => {
        console.error('WebSocket server error:', error);
    });

    return wss;
}

/**
 * Broadcasts a message to all connected WebSocket clients.
 * @param wss The WebSocket server instance.
 * @param message The message to broadcast.
 */
export function broadcastMessage(wss: WebSocketServer, message: string): void {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}