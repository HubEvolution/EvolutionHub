import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { UploadSection } from '@/components/tools/imag-enhancer/UploadSection';

function makeRefs() {
  return {
    containerRef: createRef<HTMLDivElement>(),
    inputRef: createRef<HTMLInputElement>(),
  } as const;
}

describe('UploadSection', () => {
  const common = () => ({
    boxSize: { w: 320, h: 240 } as const,
    previewUrl: null as string | null,
    originalLabel: 'Original',
    dropText: 'Drop or click to upload',
    acceptAttr: 'image/png,image/jpeg',
    onDrop: vi.fn(),
    onSelectFile: vi.fn(),
    onPreviewImageLoad: vi.fn(),
    onPreviewError: vi.fn(),
  });

  it('renders Dropzone label when no preview', () => {
    const { containerRef, inputRef } = makeRefs();
    render(
      <UploadSection
        containerRef={containerRef}
        boxSize={common().boxSize}
        previewUrl={null}
        originalLabel={common().originalLabel}
        dropText={common().dropText}
        acceptAttr={common().acceptAttr}
        inputRef={inputRef}
        onDrop={common().onDrop}
        onSelectFile={common().onSelectFile}
        onPreviewImageLoad={common().onPreviewImageLoad}
        onPreviewError={common().onPreviewError}
        isPreviewLoading={false}
      />
    );
    expect(screen.getByText('Drop or click to upload')).toBeInTheDocument();
  });

  it('shows loading overlay when isPreviewLoading is true', () => {
    const { containerRef, inputRef } = makeRefs();
    render(
      <UploadSection
        containerRef={containerRef}
        boxSize={common().boxSize}
        previewUrl={null}
        originalLabel={common().originalLabel}
        dropText={common().dropText}
        acceptAttr={common().acceptAttr}
        inputRef={inputRef}
        onDrop={common().onDrop}
        onSelectFile={common().onSelectFile}
        onPreviewImageLoad={common().onPreviewImageLoad}
        onPreviewError={common().onPreviewError}
        isPreviewLoading={true}
      />
    );
    // Spinner is aria-hidden, assert overlay container exists via role/structure
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });
});
