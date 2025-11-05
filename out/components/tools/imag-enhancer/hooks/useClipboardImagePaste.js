"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useClipboardImagePaste = useClipboardImagePaste;
const react_1 = require("react");
function useClipboardImagePaste(onSelectFile) {
    (0, react_1.useEffect)(() => {
        const onPaste = (e) => {
            const dt = e.clipboardData;
            if (!dt)
                return;
            const items = dt.items;
            if (!items)
                return;
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
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [onSelectFile]);
}
