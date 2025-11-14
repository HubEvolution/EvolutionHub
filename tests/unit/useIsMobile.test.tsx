import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useIsMobile } from '@/components/comments/CommentMobile';

function TestComponent(props: {
  breakpoint?: number;
  options?: { considerTouch?: boolean; touchOverridesWidth?: boolean };
}) {
  const isMobile = useIsMobile(props.breakpoint, props.options);
  return <div data-testid="mobile-flag">{isMobile ? 'mobile' : 'desktop'}</div>;
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMaxTouchPoints = (navigator as any).maxTouchPoints;

  function setInnerWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
  }

  function setMaxTouchPoints(points: number | undefined) {
    if (points === undefined) {
      delete (navigator as any).maxTouchPoints;
      return;
    }
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      writable: true,
      value: points,
    });
  }

  beforeEach(() => {
    setInnerWidth(originalInnerWidth);
    setMaxTouchPoints(originalMaxTouchPoints);
  });

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
    setMaxTouchPoints(originalMaxTouchPoints);
  });

  it('returns true for widths below the breakpoint by default (width-first)', async () => {
    setInnerWidth(375);

    render(<TestComponent breakpoint={768} />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-flag').textContent).toBe('mobile');
    });
  });

  it('returns false for widths at or above the breakpoint by default', async () => {
    setInnerWidth(1024);

    render(<TestComponent breakpoint={768} />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-flag').textContent).toBe('desktop');
    });
  });

  it('ignores touch when options are not provided (width-only)', async () => {
    setInnerWidth(1024);
    setMaxTouchPoints(5);

    render(<TestComponent breakpoint={768} />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-flag').textContent).toBe('desktop');
    });
  });

  it('can consider touch without overriding width when configured', async () => {
    setInnerWidth(375);
    setMaxTouchPoints(5);

    render(
      <TestComponent
        breakpoint={768}
        options={{ considerTouch: true, touchOverridesWidth: false }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('mobile-flag').textContent).toBe('mobile');
    });

    setInnerWidth(1024);

    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-flag').textContent).toBe('desktop');
    });
  });

  it('can override width with touch when explicitly enabled (initial classification)', async () => {
    setInnerWidth(1024);
    setMaxTouchPoints(5);

    render(
      <TestComponent
        breakpoint={768}
        options={{ considerTouch: true, touchOverridesWidth: true }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('mobile-flag').textContent).toBe('mobile');
    });
  });
});
