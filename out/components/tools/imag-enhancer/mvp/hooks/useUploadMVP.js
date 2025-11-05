"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUploadMVP = useUploadMVP;
const react_1 = require("react");
const sonner_1 = require("sonner");
/**
 * File upload handling for MVP with strict typing.
 */
function useUploadMVP({ strings, onFileSelect }) {
    const [isDragOver, setIsDragOver] = (0, react_1.useState)(false);
    const maxMb = 10;
    const acceptAttr = 'image/jpeg,image/png,image/webp';
    const validateFile = (0, react_1.useCallback)((file) => {
        if (!file)
            return null;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return strings.toasts.unsupportedType;
        }
        const maxSizeBytes = maxMb * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return `${strings.toasts.fileTooLargePrefix} ${maxMb}MB`;
        }
        return null;
    }, [strings, maxMb]);
    const onSelectFile = (0, react_1.useCallback)((file) => {
        if (file) {
            const error = validateFile(file);
            if (error) {
                sonner_1.toast.error(error);
                onFileSelect(null);
                return;
            }
        }
        onFileSelect(file);
    }, [validateFile, onFileSelect]);
    const onDrop = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            onSelectFile(file);
        }
    }, [onSelectFile]);
    const onDragOver = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);
    const onDragLeave = (0, react_1.useCallback)(() => {
        setIsDragOver(false);
    }, []);
    return {
        acceptAttr,
        maxMb,
        isDragOver,
        onDrop,
        onDragOver,
        onDragLeave,
        onSelectFile,
        validateFile,
    };
}
