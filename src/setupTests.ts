// Import jest-dom (Vitest compatible) for better assertions
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Mock Astro components
vi.mock('astro', () => ({
  __esModule: true,
  default: function MockAstroComponent({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'astro-component' }, children);
  },
}));

// Keep global assignment untyped to avoid module augmentation issues

// Mock Astro global
if (!(globalThis as any).Astro) {
  (globalThis as any).Astro = {
    request: { url: new URL('http://localhost:3000/') },
    params: {},
    props: {},
    redirect: vi.fn().mockImplementation((url: string) => ({
      status: 302,
      headers: new Headers({ Location: url }),
    })) as unknown as (url: string) => Response,
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
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Mock URL.createObjectURL / revokeObjectURL used by image previews
if (!('createObjectURL' in URL)) {
  (URL as any).createObjectURL = vi.fn(() => 'blob:mock');
}
if (!('revokeObjectURL' in URL)) {
  (URL as any).revokeObjectURL = vi.fn();
}

// Polyfill Blob/File.arrayBuffer when missing (some jsdom envs)
try {
  if (typeof Blob !== 'undefined' && !(Blob as any).prototype.arrayBuffer) {
    (Blob as any).prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
      // Return small deterministic buffer without relying on stream()
      return new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    };
  }
  if (typeof File !== 'undefined' && !(File as any).prototype.arrayBuffer) {
    (File as any).prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
      return new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    };
  }
} catch {}

// Ensure React Testing Library cleans up between tests to avoid duplicate nodes
afterEach(() => {
  cleanup();
});
