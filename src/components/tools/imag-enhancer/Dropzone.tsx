import type React from 'react';
import { useId } from 'react';
import type { Size } from './hooks/useImageBoxSize';

export interface DropzoneProps {
  containerRef: React.RefObject<HTMLDivElement>;
  boxSize: Size | null;
  previewUrl: string | null;
  originalLabel: string;
  dropText: string;
  acceptAttr: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectFile: (file: File | null) => void;
  onPreviewImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onPreviewError: () => void;
}

export function Dropzone(props: DropzoneProps) {
  const {
    containerRef,
    boxSize,
    previewUrl,
    originalLabel,
    dropText,
    acceptAttr,
    inputRef,
    onDrop,
    onSelectFile,
    onPreviewImageLoad,
    onPreviewError,
  } = props;

  // Stable id to associate the visible label with the hidden file input
  const inputId = useId();

  return (
    <div
      ref={containerRef}
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={() => {
        // Make entire area clickable when no preview image is present
        if (!previewUrl) {
          inputRef.current?.click();
        }
      }}
      onKeyDown={(e) => {
        if (!previewUrl && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className="relative grid place-items-center w-full max-w-full overflow-hidden rounded-md bg-white/10 dark:bg-slate-900/40 text-center px-4 mx-auto"
      style={boxSize ? { width: `${boxSize.w}px`, height: `${boxSize.h}px`, minHeight: 240 } : { minHeight: 240 }}
      aria-label="Image upload dropzone"
      role={!previewUrl ? 'button' : undefined}
      tabIndex={!previewUrl ? 0 : -1}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={originalLabel}
          className="max-h-full max-w-full object-contain"
          onLoad={onPreviewImageLoad}
          onError={onPreviewError}
        />
      ) : (
        <label
          htmlFor={inputId}
          className="text-sm text-gray-600 dark:text-gray-300 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
          aria-label={dropText}
          onClick={(e) => {
            // Prevent triggering container's onClick twice
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            // Prevent bubbling to container which would trigger another click
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
              e.stopPropagation();
            }
          }}
        >
          {dropText}
        </label>
      )}
      <input
        ref={inputRef}
        type="file"
        id={inputId}
        accept={acceptAttr}
        className="sr-only"
        onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
