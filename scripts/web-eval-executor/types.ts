export type WebEvalTask = {
  id: string;
  url: string;
  task: string;
  headless?: boolean;
  timeoutMs?: number;
  idleWaitMs?: number;
  sameOriginConsoleFatal?: boolean;
  screenshotOnFailure?: boolean;
  traceOnFailure?: boolean;
};

export type ClaimNextResponse =
  | {
      success: true;
      data: { task: WebEvalTask | null };
    }
  | {
      success: false;
      error: { type: string; message: string };
    };

export type CompletionPayload = {
  status: 'completed' | 'failed';
  report: {
    taskId: string;
    url: string;
    taskDescription: string;
    success: boolean;
    steps: Array<{
      action: string;
      timestamp: string;
      selectorUsed?: string;
      screenshotKey?: string;
    }>;
    consoleLogs: Array<{
      level: 'log' | 'error' | 'warn' | 'info' | 'debug';
      message: string;
      timestamp: string;
    }>;
    networkRequests: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
      url: string;
      status: number;
      durationMs?: number;
    }>;
    errors: string[];
    durationMs: number;
    startedAt: string;
    finishedAt: string;
  };
  error?: string;
};
