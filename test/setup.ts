// Vitest setup file
import { vi, afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
Object.entries(matchers).forEach(([matcherName, matcher]) => {
  if (matcherName !== 'default' && typeof matcher === 'function') {
    // @ts-expect-error - Extend expect with each matcher
    expect[matcherName] = matcher;
  }
});

// Add custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): T;
      toHaveTextContent(text: string | RegExp): T;
      toHaveClass(...classNames: string[]): T;
      toHaveAttribute(attr: string, value?: any): T;
    }
  }
}

// Mock window.matchMedia
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
