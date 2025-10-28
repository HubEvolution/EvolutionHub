import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditsPanel } from '@/components/tools/imag-enhancer/CreditsPanel';

describe('CreditsPanel', () => {
  it('calls createCreditsCheckout with correct packs', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);

    render(<CreditsPanel buying={false} createCreditsCheckout={create} />);

    await user.click(screen.getByRole('button', { name: /Buy 100 credits/i }));
    await user.click(screen.getByRole('button', { name: /Buy 1500 credits/i }));

    expect(create).toHaveBeenCalledWith(100);
    expect(create).toHaveBeenCalledWith(1500);
  });

  it('disables correct button based on buying state', () => {
    const create = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(<CreditsPanel buying={100} createCreditsCheckout={create} />);
    const [btn100_first, btn500_first, btn1500_first] = screen.getAllByRole('button');
    expect(btn100_first).toBeDisabled();
    expect(btn500_first).not.toBeDisabled();
    expect(btn1500_first).not.toBeDisabled();
    expect(btn1500_first).toHaveTextContent(/Buy 1500 credits/i);

    rerender(<CreditsPanel buying={1500} createCreditsCheckout={create} />);
    const [btn100_second, btn500_second, btn1500_second] = screen.getAllByRole('button');
    expect(btn1500_second).toBeDisabled();
    expect(btn100_second).not.toBeDisabled();
    expect(btn500_second).not.toBeDisabled();
    expect(btn100_second).toHaveTextContent(/Buy 100 credits/i);
  });
});
