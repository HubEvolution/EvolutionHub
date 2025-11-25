import {
  useState,
  useCallback,
  useRef,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';
import { SimpleResult } from './SimpleResult';
import { EnhancerActionsMVP } from './EnhancerActionsMVP';
import { useUploadMVP } from './hooks/useUploadMVP';
import { useEnhanceMVP } from './hooks/useEnhanceMVP';
import { useUsage } from '../hooks/useUsage';
import { ALLOWED_MODELS } from '@/config/ai-image';
import type { ImagEnhancerMVPProps, ApiSuccess, ApiErrorBody, GenerateResponseData } from './types';
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
    const topaz = ALLOWED_MODELS.find((m) => m.slug === 'topazlabs/image-upscale');
    if (topaz) return topaz.slug;
    const gfpgan = ALLOWED_MODELS.find((m) => m.slug.startsWith('tencentarc/gfpgan'));
    return gfpgan?.slug || ALLOWED_MODELS[0]?.slug || '';
  });

  // File selection handler (declare before handlers that reference it)
  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
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
    },
    [previewUrl]
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Refs for abort controller and file input
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Guard against out-of-order responses
  const runIdRef = useRef<number>(0);

  // Custom hooks
  const { enhance } = useEnhanceMVP();
  const {
    usage,
    monthlyUsage,
    ownerType,
    plan,
    creditsBalanceTenths,
    refresh: refreshUsage,
  } = useUsage();

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
    const myRunId = ++runIdRef.current;

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
        toast.error('Rate limit reached. Please retry shortly.');
        return;
      }

      const response = result as ApiSuccess<GenerateResponseData> | ApiErrorBody;

      if ('success' in response && response.success) {
        // Ignore late responses from previous runs
        if (myRunId !== runIdRef.current) return;
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
        toast.error(errorMessage);
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
      toast.error(strings.toasts.processingFailed);
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
    // Abort any in-flight request
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
      abortRef.current = null;
    }
    // Clear file input value to avoid reusing a stale File reference
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = '';
      } catch {}
    }
    // Revoke existing preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    // Reset state
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setLoading(false);
    // Bump run id so late responses are ignored
    runIdRef.current++;
  }, [previewUrl]);

  // MVP: Show only Replicate Topaz Image Upscale and GFPGAN
  const availableModels = useMemo(
    () =>
      ALLOWED_MODELS.filter(
        (m) =>
          m.slug === 'topazlabs/image-upscale' ||
          m.slug.startsWith('tencentarc/gfpgan') ||
          m.slug === '@cf/runwayml/stable-diffusion-v1-5-img2img'
      ),
    []
  );

  const quotaExceeded = Boolean(usage && usage.used >= usage.limit);
  const canSubmit = Boolean(file && model && !loading && !quotaExceeded);

  const planLabel = useMemo(() => {
    if (ownerType === 'guest' || ownerType === null) return 'Guest';
    if (ownerType === 'user') {
      if (plan === 'free' || !plan) return 'Starter';
      return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
    return '';
  }, [ownerType, plan]);

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
                {strings.allowedTypes}: {uploadHandlers.acceptAttr} · {strings.max}{' '}
                {uploadHandlers.maxMb}MB
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {strings.dropText}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {strings.allowedTypes}: {uploadHandlers.acceptAttr} · {strings.max}{' '}
                {uploadHandlers.maxMb}MB
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
          usage={usage}
          quotaExceeded={quotaExceeded}
          ownerType={ownerType}
          plan={plan ?? null}
          planLabel={planLabel}
          monthlyUsage={monthlyUsage}
          creditsBalanceTenths={creditsBalanceTenths}
        />
      )}

      {/* Result */}
      {resultUrl && previewUrl && (
        <SimpleResult
          previewUrl={previewUrl}
          resultUrl={resultUrl}
          strings={strings}
          usage={usage}
          ownerType={ownerType}
          plan={plan ?? null}
          planLabel={planLabel}
          monthlyUsage={monthlyUsage}
          creditsBalanceTenths={creditsBalanceTenths}
          onDownload={handleDownload}
          onStartOver={handleStartOver}
          loading={loading}
          processingLabel={strings.processing}
        />
      )}
    </div>
  );
}
