import { render, screen, fireEvent } from '@testing-library/react';
import { vi, expect, test, describe } from 'vitest';
import { ModelControls } from '@/components/tools/imag-enhancer/ModelControls';

function setup(props?: Partial<React.ComponentProps<typeof ModelControls>>) {
  const onScale = vi.fn();
  const onToggleFace = vi.fn();
  const onBlocked = vi.fn();
  const defaultProps: React.ComponentProps<typeof ModelControls> = {
    supportsScale: true,
    allowedScales: [2, 4],
    selectedScale: 4,
    onScale,
    supportsFaceEnhance: true,
    canUseFaceEnhance: true,
    faceEnhance: false,
    onToggleFace,
    faceEnhanceLabel: 'Face enhance',
    upgradeLabel: 'Upgrade',
    gatingEnabled: true,
    onBlocked,
  };
  render(<ModelControls {...defaultProps} {...props} />);
  return { onScale, onToggleFace, onBlocked };
}

describe('ModelControls', () => {
  test('clicking x2/x4 calls onScale when allowed', () => {
    const { onScale } = setup({ allowedScales: [2, 4], selectedScale: 2 });
    fireEvent.click(screen.getByText('x4'));
    expect(onScale).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByText('x2'));
    expect(onScale).toHaveBeenCalledWith(2);
  });

  test('blocked scale triggers onBlocked and does not call onScale', () => {
    const { onScale, onBlocked } = setup({ allowedScales: [2], selectedScale: 2 });
    fireEvent.click(screen.getByText('x4'));
    expect(onScale).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith({ feature: 'scale', requested: 4 });
  });

  test('face enhance toggles when allowed', () => {
    const { onToggleFace } = setup({ canUseFaceEnhance: true, faceEnhance: false });
    const checkbox = screen.getByLabelText('Face enhance') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onToggleFace).toHaveBeenCalledWith(true);
  });

  test('face enhance blocked triggers onBlocked and does not toggle', () => {
    const { onToggleFace, onBlocked } = setup({ canUseFaceEnhance: false, faceEnhance: false });
    const checkbox = screen.getByLabelText('Face enhance') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onToggleFace).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith({ feature: 'face_enhance' });
  });
});
