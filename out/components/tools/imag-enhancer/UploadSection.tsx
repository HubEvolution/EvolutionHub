import React, { type DragEvent } from 'react';
import { Dropzone } from './Dropzone';

interface Props {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  boxSize: { w: number; h: number } | null;
  previewUrl: string | null;
  originalLabel: string;
  dropText: string;
  acceptAttr: string;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onSelectFile: (f: File | null) => void;
  onPreviewImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onPreviewError: () => void;
  isPreviewLoading: boolean;
}

export function UploadSection(props: Props) {
  return (
    <div className="relative">
      <Dropzone
        containerRef={props.containerRef}
        boxSize={props.boxSize}
        previewUrl={props.previewUrl}
        originalLabel={props.originalLabel}
        dropText={props.dropText}
        acceptAttr={props.acceptAttr}
        inputRef={props.inputRef}
        onDrop={props.onDrop}
        onSelectFile={props.onSelectFile}
        onPreviewImageLoad={props.onPreviewImageLoad}
        onPreviewError={props.onPreviewError}
      />
      {props.isPreviewLoading && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm">
          <div
            className="h-8 w-8 rounded-full border-2 border-cyan-400/60 border-t-transparent animate-spin"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
