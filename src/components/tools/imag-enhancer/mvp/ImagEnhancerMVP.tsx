import { useState, useCallback, useRef, useMemo, type ChangeEvent, type KeyboardEvent } from 'react';
import { SimpleResult } from './SimpleResult';
import { EnhancerActionsMVP } from './EnhancerActionsMVP';
import { useUploadMVP } from './hooks/useUploadMVP';
import { useEnhanceMVP } from './hooks/useEnhanceMVP';
import { useUsage } from '../hooks/useUsage';
import { ALLOWED_MODELS } from '@/config/ai-image';
import type { ImagEnhancerMVPProps, ApiSuccess, ApiErrorBody, GenerateResponseData, UsageData } from './types';
import { clientLogger } from '@/lib/client-logger';

/**
 * MVP Image Enhancer component with strict TypeScript typing.
 * Simplified flow: Upload → Select Model → Enhance → Download
 * 
 * @param props Component props with localized strings
 * @returns React element
 */
export default function ImagEnhancerMVP(props: ImagEnhancerMVPProps): React.ReactElement {
  const { strings } = props;
  
  // State management with explicit typing
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [model, setModel] = useState<string>(() => {
    // Default to Topaz Image Upscale if available, else GFPGAN, else first allowed
    const topaz = ALLOWED_MODELS.find(m => m.slug === 'topazlabs/image-upscale');
    if (topaz) return topaz.slug;
    const gfpgan = ALLOWED_MODELS.find(m => m.slug.startsWith('tencentarc/gfpgan'));
    return gfpgan?.slug || ALLOWED_MODELS[0]?.slug || '';
  });

  // File selection handler (declare before handlers that reference it)
  const handleFileSelect = useCallback((selectedFile: File | null) => {
    // Cleanup previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      setResultUrl(null);
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreviewUrl(url);
    setResultUrl(null); // Reset result when new file is selected
  }, [previewUrl]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Refs for abort controller and file input
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom hooks
  const { enhance } = useEnhanceMVP();
  const { usage, refresh: refreshUsage } = useUsage();

  const uploadHandlers = useUploadMVP({
    strings,
    onFileSelect: (selectedFile: File | null) => {
      handleFileSelect(selectedFile);
    },
  });

  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      uploadHandlers.onSelectFile(f);
      e.target.value = '';
    },
    [uploadHandlers]
  );

  const onUploadAreaKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFileDialog();
      }
    },
    [openFileDialog]
  );

  // Map usage type to MVP UsageData (resetAt as ISO string)
  const usageForMVP = useMemo<UsageData | null>(() => {
    if (!usage) return null;
    const reset = typeof usage.resetAt === 'number' && usage.resetAt
      ? new Date(usage.resetAt).toISOString()
      : (usage.resetAt as null);
    return { used: usage.used, limit: usage.limit, resetAt: reset };
  }, [usage]);

  // Enhancement handler
  const handleEnhance = useCallback(async () => {
    if (!file || !model) return;

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const abortController = new AbortController();
    abortRef.current = abortController;
    setLoading(true);

    try {
      clientLogger.info('MVP Image enhancement started', {
        component: 'ImagEnhancerMVP',
        model,
        fileSize: file.size,
        fileType: file.type,
      });

      const result = await enhance({
        file,
        model,
        signal: abortController.signal,
      });

      // Handle rate limit response
      if (result instanceof Response && result.status === 429) {
        clientLogger.warn('MVP Image enhancer rate limited', {
          component: 'ImagEnhancerMVP',
          status: 429,
        });
        // TODO: Handle rate limit with retry logic
        return;
      }

      const response = result as ApiSuccess<GenerateResponseData> | ApiErrorBody;
      
      if ('success' in response && response.success) {
        setResultUrl(response.data.imageUrl);
        // Refresh usage after successful enhancement
        await refreshUsage();
        
        clientLogger.info('MVP Image enhanced successfully', {
          component: 'ImagEnhancerMVP',
          model,
          resultUrl: response.data.imageUrl,
        });
      } else {
        const errorMessage = response.error?.message || strings.toasts.processingFailed;
        clientLogger.error('MVP Image enhancer returned error', {
          component: 'ImagEnhancerMVP',
          error: response.error?.type || 'api_error',
          message: errorMessage,
        });
        // TODO: Show error toast
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        clientLogger.info('MVP Image enhancement aborted', {
          component: 'ImagEnhancerMVP',
        });
        return;
      }

      clientLogger.error('MVP Image enhancer error', {
        component: 'ImagEnhancerMVP',
        error: error instanceof Error ? error.message : String(error),
      });
      // TODO: Show error toast
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [file, model, enhance, refreshUsage, strings.toasts.processingFailed]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `enhanced-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [resultUrl]);

  // Start over handler
  const handleStartOver = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setLoading(false);
  }, [previewUrl]);

  // MVP: Show only Replicate Topaz Image Upscale and GFPGAN
  const availableModels = ALLOWED_MODELS.filter(m =>
    m.slug === 'topazlabs/image-upscale' || m.slug.startsWith('tencentarc/gfpgan')
  ) as typeof ALLOWED_MODELS;

  const quotaExceeded = Boolean(usageForMVP && usageForMVP.used >= usageForMVP.limit);
  const canSubmit = Boolean(file && model && !loading && !quotaExceeded);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Upload Area */}
      {!resultUrl && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            uploadHandlers.isDragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDrop={uploadHandlers.onDrop}
          onDragOver={uploadHandlers.onDragOver}
          onDragLeave={uploadHandlers.onDragLeave}
          role="button"
          tabIndex={0}
          onClick={openFileDialog}
          onKeyDown={onUploadAreaKeyDown}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={uploadHandlers.acceptAttr}
            className="hidden"
            onChange={onFileInputChange}
          />
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-64 mx-auto rounded-lg object-cover"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {strings.allowedTypes}: {uploadHandlers.acceptAttr} · {strings.max} {uploadHandlers.maxMb}MB
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {strings.dropText}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {strings.allowedTypes}: {uploadHandlers.acceptAttr} · {strings.max} {uploadHandlers.maxMb}MB
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!resultUrl && (
        <EnhancerActionsMVP
          strings={strings}
          model={model}
          models={availableModels}
          onChangeModel={setModel}
          canSubmit={canSubmit}
          loading={loading}
          onEnhance={handleEnhance}
          usage={usageForMVP}
          quotaExceeded={quotaExceeded}
        />
      )}

      {/* Result */}
      {resultUrl && previewUrl && (
        <SimpleResult
          previewUrl={previewUrl}
          resultUrl={resultUrl}
          strings={strings}
          usage={usageForMVP}
          onDownload={handleDownload}
          onStartOver={handleStartOver}
          loading={loading}
          processingLabel={strings.processing}
        />
      )}
    </div>
  );
}
