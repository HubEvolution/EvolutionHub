// Import jest-dom (Vitest compatible) for better assertions
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

type AstroGlobal = {
  request: { url: URL };
  params: Record<string, string>;
  props: Record<string, unknown>;
  redirect: (url: string) => Response;
  response: { headers: Headers; status: number; statusText: string };
};

// Mock Astro components
vi.mock('astro', () => ({
  __esModule: true,
  default: function MockAstroComponent({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'astro-component' }, children);
  },
}));

// Keep global assignment untyped to avoid module augmentation issues

// Mock Astro global
const g = globalThis as unknown as {
  Astro?: AstroGlobal;
  ResizeObserver?: typeof globalThis.ResizeObserver;
};
if (!g.Astro) {
  g.Astro = {
    request: { url: new URL('http://localhost:3000/') },
    params: {},
    props: {},
    redirect: vi.fn().mockImplementation(
      (url: string): Response =>
        ({
          status: 302,
          headers: new Headers({ Location: url }),
        }) as unknown as Response
    ),
    response: {
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    },
  };
}

// Add window.matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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

// Mock ResizeObserver for components using it
if (!g.ResizeObserver) {
  class MockResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  g.ResizeObserver = MockResizeObserver as unknown as typeof globalThis.ResizeObserver;
}

// Mock URL.createObjectURL / revokeObjectURL used by image previews
if (!('createObjectURL' in URL)) {
  (URL as unknown as { createObjectURL: (obj: Blob | MediaSource) => string }).createObjectURL =
    vi.fn(() => 'blob:mock') as unknown as (obj: Blob | MediaSource) => string;
}
if (!('revokeObjectURL' in URL)) {
  (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL =
    vi.fn() as unknown as (url: string) => void;
}

// Polyfill Blob/File.arrayBuffer when missing (some jsdom envs)
try {
  if (typeof Blob !== 'undefined' && !('arrayBuffer' in Blob.prototype)) {
    Object.defineProperty(Blob.prototype, 'arrayBuffer', {
      value: async function (): Promise<ArrayBuffer> {
        // Return small deterministic buffer without relying on stream()
        return new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
      },
      configurable: true,
      writable: true,
    });
  }
  if (typeof File !== 'undefined' && !('arrayBuffer' in File.prototype)) {
    Object.defineProperty(File.prototype, 'arrayBuffer', {
      value: async function (): Promise<ArrayBuffer> {
        return new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
      },
      configurable: true,
      writable: true,
    });
  }
} catch {
  // Ignore polyfill setup failures
}

// Ensure React Testing Library cleans up between tests and mocks reset
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});
