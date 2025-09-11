declare module 'ws' {
  export class WebSocket {
    static readonly OPEN: number;
    readyState: number;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  }
  export class WebSocketServer {
    clients: Set<WebSocket>;
  }
}
