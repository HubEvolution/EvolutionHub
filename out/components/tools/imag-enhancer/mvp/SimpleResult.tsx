import React, { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import type { ImagEnhancerMVPStrings, UsageData } from './types';
import { clientLogger } from '@/lib/client-logger';

export interface SimpleResultProps {
  previewUrl: string;
  resultUrl: string;
  strings: ImagEnhancerMVPStrings;
  usage: UsageData | null;
  onDownload: () => void;
  onStartOver: () => void;
  loading: boolean;
  processingLabel: string;
}

/**
 * Simplified result display component for MVP.
 * Shows before/after images with basic controls.
 */
export function SimpleResult(props: SimpleResultProps): React.ReactElement {
  const {
    previewUrl,
    resultUrl,
    strings,
    usage,
    onDownload,
    onStartOver,
    loading,
    processingLabel,
  } = props;

  const cacheBustedUrl = useMemo(() => {
    try {
      const isAbsolute = /^https?:\/\//i.test(resultUrl);
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://local';
      const u = new URL(resultUrl, base);
      u.searchParams.set('v', Date.now().toString());
      return isAbsolute ? u.toString() : u.pathname + u.search;
    } catch {
      return resultUrl;
    }
  }, [resultUrl]);

  const onImgError = useCallback(() => {
    clientLogger.error('Result image failed to load', { component: 'SimpleResult', resultUrl });
    toast.error(strings.toasts.processingFailed);
  }, [resultUrl, strings.toasts.processingFailed]);

  return (
    <div className="space-y-4">
      {/* Result Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {strings.original}
          </h3>
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={previewUrl}
              alt={strings.original}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Enhanced */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{strings.result}</h3>
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{processingLabel}</p>
                </div>
              </div>
            ) : (
              <img
                src={cacheBustedUrl}
                alt={strings.result}
                className="w-full h-auto object-cover"
                loading="lazy"
                onError={onImgError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button type="button" onClick={onDownload} disabled={loading} className="px-6">
          {strings.download}
        </Button>

        <Button
          type="button"
          onClick={onStartOver}
          disabled={loading}
          variant="secondary"
          className="px-6"
        >
          {strings.ui?.startOver || 'Start Over'}
        </Button>
      </div>

      {/* Usage Info */}
      {usage && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {strings.usage}: {usage.used}/{usage.limit}
        </div>
      )}
    </div>
  );
}
