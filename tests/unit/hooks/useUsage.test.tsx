import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useUsage } from '../../../src/components/tools/prompt-enhancer/hooks/useUsage';
import type { ApiErrorBody, ApiSuccess } from '../../../src/components/tools/prompt-enhancer/types';

vi.mock('../../../src/components/tools/prompt-enhancer/api', () => {
  return {
    getUsage: vi.fn(),
  };
});

const { getUsage } = await import('../../../src/components/tools/prompt-enhancer/api');

function Harness() {
  const { usage, ownerType, plan, entitlements, loading, error, refresh } =
    useUsage();
  // Expose via DOM + window for imperative checks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__usageRefresh = refresh;
  return (
    <div
      data-testid="state"
      data-loading={loading ? "1" : "0"}
      data-error={error || ""}
      data-owner={ownerType || ""}
      data-used={usage?.used ?? ""}
      data-limit={usage?.limit ?? ""}
      data-plan={plan || ""}
      data-entitlements={entitlements ? "1" : ""}
    />
  );
}

describe("useUsage (prompt)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // default: success
    (getUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        ownerType: "guest",
        usage: { used: 1, limit: 5, resetAt: null },
        limits: { user: 20, guest: 5 },
        entitlements: { image: { dailyLimit: 5 }, prompt: { dailyLimit: 5 } },
      },
    } satisfies ApiSuccess<any>);
  });

  it("loads usage on mount and exposes values", async () => {
    render(<Harness />);
    const el = await screen.findByTestId("state");
    await waitFor(() => expect(el.getAttribute("data-loading")).toBe("0"));
    expect(el.getAttribute("data-owner")).toBe("guest");
    expect(el.getAttribute("data-used")).toBe("1");
    expect(el.getAttribute("data-limit")).toBe("5");
    expect(el.getAttribute("data-error")).toBe("");
  });

  it("handles API error gracefully", async () => {
    (getUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: { type: "server_error", message: "boom" },
    } satisfies ApiErrorBody);

    render(<Harness />);
    const el = await screen.findByTestId("state");
    await waitFor(() => expect(el.getAttribute("data-loading")).toBe("0"));
    expect(el.getAttribute("data-error")).toContain("boom");
  });

  it("refresh() triggers reload", async () => {
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refresh = (window as any).__usageRefresh as () => Promise<void>;
    await refresh();
    expect(getUsage).toHaveBeenCalled();
  });
});
