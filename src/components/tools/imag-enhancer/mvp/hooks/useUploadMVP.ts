import { useState, useCallback, type DragEvent } from 'react';
import { toast } from 'sonner';
import type { ImagEnhancerMVPStrings } from '../types';

export interface UseUploadMVPProps {
  strings: ImagEnhancerMVPStrings;
  onFileSelect: (file: File | null) => void;
}

export interface UseUploadMVPReturn {
  acceptAttr: string;
  maxMb: number;
  isDragOver: boolean;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onSelectFile: (file: File | null) => void;
  validateFile: (file: File) => string | null;
}

/**
 * File upload handling for MVP with strict typing.
 */
export function useUploadMVP({ strings, onFileSelect }: UseUploadMVPProps): UseUploadMVPReturn {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const maxMb = 10;
  const acceptAttr = 'image/jpeg,image/png,image/webp';

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!file) return null;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return strings.toasts.unsupportedType;
      }

      const maxSizeBytes = maxMb * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `${strings.toasts.fileTooLargePrefix} ${maxMb}MB`;
      }

      return null;
    },
    [strings, maxMb]
  );

  const onSelectFile = useCallback(
    (file: File | null) => {
      if (file) {
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          onFileSelect(null);
          return;
        }
      }
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        onSelectFile(file);
      }
    },
    [onSelectFile]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
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
