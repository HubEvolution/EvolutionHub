import type React from 'react';
import type { ImagEnhancerMVPStrings, ModelOption, UsageData } from './types';

export interface EnhancerActionsMVPProps {
  strings: ImagEnhancerMVPStrings;
  model: string;
  models: readonly ModelOption[];
  onChangeModel: (model: string) => void;
  canSubmit: boolean;
  loading: boolean;
  onEnhance: () => void;
  usage: UsageData | null;
  quotaExceeded: boolean;
}

/**
 * Simplified action bar for MVP with strict typing.
 */
export function EnhancerActionsMVP(props: EnhancerActionsMVPProps): React.ReactElement {
  const {
    strings,
    model,
    models,
    onChangeModel,
    canSubmit,
    loading,
    onEnhance,
    usage,
    quotaExceeded,
  } = props;

  return (
    <div className="space-y-4">
      {/* Model Selection */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label
          htmlFor="model-select"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit"
        >
          {strings.model}
        </label>
        <select
          id="model-select"
          value={model}
          onChange={(e) => onChangeModel(e.target.value)}
          className="flex-1 sm:w-auto sm:min-w-[200px] rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          {models.map((modelOption) => (
            <option key={modelOption.slug} value={modelOption.slug}>
              {modelOption.label}
            </option>
          ))}
        </select>
      </div>

      {/* Enhance Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onEnhance}
          disabled={!canSubmit || loading || quotaExceeded}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors min-h-[44px]"
        >
          {loading ? strings.processing : strings.enhance}
        </button>
      </div>

      {/* Usage Info */}
      {usage && (
        <div className="text-center text-sm">
          {quotaExceeded ? (
            <span className="text-red-600 dark:text-red-400 font-medium">
              {strings.quotaBanner}
            </span>
          ) : (
            <span className="text-gray-600 dark:text-gray-400">
              {strings.usage}: {usage.used}/{usage.limit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
