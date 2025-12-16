import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock('../../../src/components/tools/prompt-enhancer/api', () => ({
  postEnhance: vi.fn(),
}));

const { postEnhance } = await import('../../../src/components/tools/prompt-enhancer/api');
const { useEnhance } = await import('../../../src/components/tools/prompt-enhancer/hooks/useEnhance');

function Harness() {
  const { enhance } = useEnhance();
  // expose
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__enhance = enhance;
  return <div />;
}

describe("useEnhance (prompt)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs?.();
  });

  it("rejects when feature flag disabled", async () => {
    vi.stubEnv("PUBLIC_PROMPT_ENHANCER_V1", "false");
    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhance = (window as any).__enhance as ReturnType<
      typeof useEnhance
    >["enhance"];
    await expect(enhance({ text: "Hi", mode: "creative" })).rejects.toThrow(
      "Feature not enabled"
    );
  });

  it("maps mode to service options and calls postEnhance with CSRF", async () => {
    vi.stubEnv("PUBLIC_PROMPT_ENHANCER_V1", "true");
    (postEnhance as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        enhancedPrompt: "OK",
        usage: { used: 1, limit: 5, resetAt: null },
        limits: { user: 20, guest: 5 },
      },
    });

    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhance = (window as any).__enhance as ReturnType<
      typeof useEnhance
    >["enhance"];

    await enhance({ text: "A", mode: "concise" });
    expect(postEnhance).toHaveBeenCalledWith(
      "A",
      "concise",
      expect.any(String),
      undefined,
      undefined
    );

    await enhance({ text: "B", mode: "creative" });
    expect(postEnhance).toHaveBeenCalledWith(
      "B",
      "agent",
      expect.any(String),
      undefined,
      undefined
    );

    await enhance({ text: "C", mode: "professional" });
    expect(postEnhance).toHaveBeenCalledWith(
      "C",
      "agent",
      expect.any(String),
      undefined,
      undefined
    );
  });

  it("passes through files and signal", async () => {
    vi.stubEnv("PUBLIC_PROMPT_ENHANCER_V1", "true");
    (postEnhance as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        enhancedPrompt: "OK",
        usage: { used: 1, limit: 5, resetAt: null },
        limits: { user: 20, guest: 5 },
      },
    });

    render(<Harness />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhance = (window as any).__enhance as ReturnType<
      typeof useEnhance
    >["enhance"];

    const ctrl = new AbortController();
    const file = new File([new Uint8Array([1, 2, 3])], "a.txt", {
      type: "text/plain",
    });
    await enhance({
      text: "T",
      mode: "concise",
      signal: ctrl.signal,
      files: [file],
    });
    expect(postEnhance).toHaveBeenCalledWith(
      "T",
      "concise",
      expect.any(String),
      ctrl.signal,
      [file]
    );
  });
});
