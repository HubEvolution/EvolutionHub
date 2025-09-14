import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef, useState } from 'react';
import { HelpModal, type HelpModalLabels } from '@/components/tools/imag-enhancer/HelpModal';

function Wrapper() {
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const labels: HelpModalLabels = {
    title: 'How to use',
    close: 'Close',
    sections: { upload: 'Upload', models: 'Models', compare: 'Compare', quota: 'Quota' },
  };
  return (
    <div>
      <button ref={openerRef} onClick={() => setOpen(true)}>Open Help</button>
      <HelpModal
        open={open}
        onClose={() => setOpen(false)}
        labels={labels}
        allowedTypesText={'Allowed types: PNG, JPG, WEBP'}
        maxMb={10}
        modelLabels={['Real-ESRGAN', 'GFPGAN']}
        keyboardHint={'Arrows move; 0 centers; +/- zoom; 1 resets; L toggles; hold Space shows Before.'}
        usage={{ used: 0, limit: 10 }}
        returnFocusRef={openerRef}
      />
    </div>
  );
}

describe('HelpModal focus trap', () => {
  it('traps focus within the modal and returns focus to the opener on close', async () => {
    render(<Wrapper />);

    const openBtn = screen.getByRole('button', { name: /Open Help/i });
    openBtn.focus();
    fireEvent.click(openBtn);

    // Close button should be focused on open
    const closeBtn = await screen.findByRole('button', { name: /Close/i });
    expect(closeBtn).toHaveFocus();

    // Press Tab; focus should remain within modal (still on close as it is the only focusable)
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();

    // Press Shift+Tab; should remain trapped
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(closeBtn).toHaveFocus();

    // Close with Escape, focus should return to opener
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(openBtn).toHaveFocus();
  });
});
