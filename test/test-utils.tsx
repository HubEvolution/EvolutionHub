// Test utilities for React components in Astro
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Custom render function that includes any providers or context needed for testing
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return render(ui, {
    // Add any default options here
    ...options,
  });
};

// Override the render method with our custom one
export { customRender as render };

// Type declarations for custom matchers
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
