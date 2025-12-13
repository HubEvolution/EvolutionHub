import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModelControls, type ModelControlsProps } from '../ModelControls';

function renderControls(override: Partial<ModelControlsProps> = {}) {
  const onScale = vi.fn();
  const onToggleFace = vi.fn();
  const onBlocked = vi.fn();

  const props: ModelControlsProps = {
    // Scale
    supportsScale: true,
    allowedScales: [2, 4],
    selectedScale: 4,
    onScale,
    // Face
    supportsFaceEnhance: true,
    canUseFaceEnhance: true,
    faceEnhance: false,
    onToggleFace,
    // Labels
    faceEnhanceLabel: 'Face enhance',
    upgradeLabel: 'Upgrade',
    // Flag
    gatingEnabled: true,
    onBlocked,
    ...override,
  };
  const utils = render(<ModelControls {...props} />);
  return { ...utils, onScale, onToggleFace, onBlocked };
}

describe('ModelControls', () => {
  it('renders scale buttons and calls onScale for allowed scales', () => {
    const { onScale } = renderControls({ allowedScales: [2, 4], selectedScale: 2 });
    const btn2 = screen.getByRole('button', { name: /^x2$/ });
    const btn4 = screen.getByRole('button', { name: /^x4$/ });
    expect(btn2).toBeInTheDocument();
    expect(btn4).toBeInTheDocument();

    fireEvent.click(btn4);
    expect(onScale).toHaveBeenCalledWith(4);

    fireEvent.click(btn2);
    expect(onScale).toHaveBeenCalledWith(2);
  });

  it('blocks selection of disallowed scale and emits onBlocked with tooltip when gating enabled', () => {
    const { onScale, onBlocked } = renderControls({
      allowedScales: [2],
      selectedScale: 2,
      gatingEnabled: true,
    });
    const btn4 = screen.getByRole('button', { name: /^x4$/ });
    // Tooltip should be present to hint upgrade
    expect(btn4).toHaveAttribute('title', 'Upgrade');

    fireEvent.click(btn4);
    expect(onScale).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'scale', requested: 4 })
    );
  });

  it('disables face enhance and emits onBlocked when plan forbids it', () => {
    const { onToggleFace, onBlocked } = renderControls({
      canUseFaceEnhance: false,
      gatingEnabled: true,
    });
    const checkbox = screen.getByLabelText(/Face enhance/i) as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.disabled).toBe(true);
    expect(checkbox).toHaveAttribute('title', 'Upgrade');

    fireEvent.click(checkbox);
    expect(onToggleFace).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith(expect.objectContaining({ feature: 'face_enhance' }));
  });

  it('toggles face enhance when allowed', () => {
    const { onToggleFace } = renderControls({ canUseFaceEnhance: true, gatingEnabled: true });
    const checkbox = screen.getByLabelText(/Face enhance/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onToggleFace).toHaveBeenCalledWith(true);
  });
});
