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

// Extend the global type for Astro
interface AstroGlobal {
  request: {
    url: URL;
  };
  params: Record<string, string>;
  props: Record<string, unknown>;
  redirect: (url: string) => Response;
  response: {
    headers: Headers;
    status: number;
    statusText: string;
  };
}

declare global {
   
  var Astro: AstroGlobal;
}

// Mock Astro global
if (!globalThis.Astro) {
  globalThis.Astro = {
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
