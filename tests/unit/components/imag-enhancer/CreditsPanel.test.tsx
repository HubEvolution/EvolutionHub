import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditsPanel } from '@/components/tools/imag-enhancer/CreditsPanel';

describe('CreditsPanel', () => {
  it('calls createCreditsCheckout with correct packs', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);

    render(<CreditsPanel buying={false} createCreditsCheckout={create} />);

    await user.click(screen.getByRole('button', { name: /Buy 200 credits/i }));
    await user.click(screen.getByRole('button', { name: /Buy 1000 credits/i }));

    expect(create).toHaveBeenCalledWith(200);
    expect(create).toHaveBeenCalledWith(1000);
  });

  it('disables correct button based on buying state', () => {
    const create = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(<CreditsPanel buying={200} createCreditsCheckout={create} />);
    const [btn200_first, btn1000_first] = screen.getAllByRole('button');
    expect(btn200_first).toBeDisabled();
    expect(btn1000_first).not.toBeDisabled();
    expect(btn1000_first).toHaveTextContent(/Buy 1000 credits/i);

    rerender(<CreditsPanel buying={1000} createCreditsCheckout={create} />);
    const [btn200_second, btn1000_second] = screen.getAllByRole('button');
    expect(btn1000_second).toBeDisabled();
    expect(btn200_second).not.toBeDisabled();
    expect(btn200_second).toHaveTextContent(/Buy 200 credits/i);
  });
});
