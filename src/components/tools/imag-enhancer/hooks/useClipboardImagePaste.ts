import { useEffect } from 'react';

export function useClipboardImagePaste(onSelectFile: (file: File) => void) {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;
      const items = dt.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file') {
          const file = it.getAsFile();
          if (file && file.type.startsWith('image/')) {
            e.preventDefault();
            onSelectFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste as unknown as EventListener);
    return () => window.removeEventListener('paste', onPaste as unknown as EventListener);
  }, [onSelectFile]);
}
