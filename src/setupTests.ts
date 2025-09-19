// Import jest-dom for better assertions
import '@testing-library/jest-dom';
import { vi } from 'vitest';
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
