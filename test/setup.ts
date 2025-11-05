// Vitest setup file
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock requestAnimationFrame / cancelAnimationFrame
if (!window.requestAnimationFrame) {
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      return setTimeout(() => {
        callback(performance.now());
      }, 16);
    }),
  });
}

if (!window.cancelAnimationFrame) {
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: vi.fn((handle: number) => clearTimeout(handle)),
  });
}

// Minimal ResizeObserver mock for layout-driven hooks
if (typeof window.ResizeObserver === 'undefined') {
  class ResizeObserver {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element): void {
      this.callback([{ target } as ResizeObserverEntry], this);
    }

    unobserve(): void {
      // noop
    }

    disconnect(): void {
      // noop
    }
  }

  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserver,
  });
}

// Ensure a base URL is available for code that constructs URLs in tests
if (!process.env.BASE_URL) {
  process.env.BASE_URL = 'http://localhost';
}

// Provide a global mock for the security logger to avoid missing export errors in tests
vi.mock('@/lib/security-logger', () => ({
  logApiAccess: vi.fn(),
  logApiError: vi.fn(),
  logAuthFailure: vi.fn(),
  logUserEvent: vi.fn(),
}));

// Run cleanup after each test case
afterEach(() => {
  cleanup();
});
