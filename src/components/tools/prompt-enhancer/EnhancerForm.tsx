import React, { useState, useRef } from 'react';
import type { EnhanceArgs } from './hooks/useEnhance';
import { useEnhance } from './hooks/useEnhance';
import { useRateLimit } from './hooks/useRateLimit';
import { useUsage } from './hooks/useUsage';
import { getI18n } from '@/utils/i18n';
import { getLocale } from '@/lib/i18n';

interface EnhancerFormProps {
  initialMode?: 'creative' | 'professional' | 'concise';
}

export interface SafetyReport {
  score: number;
  warnings: string[];
}

const EnhancerForm: React.FC<EnhancerFormProps> = ({ initialMode = 'creative' }) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [safetyReport, setSafetyReport] = useState<SafetyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { enhance } = useEnhance();
  const { retryActive, retryRemainingSec, handle429Response } = useRateLimit();
  const { usage, loading: usageLoading } = useUsage();

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const locale = getLocale(typeof window !== 'undefined' ? window.location.pathname : '/');
  const t = getI18n(locale);

  const validateInput = (text: string): string | null => {
    if (!text.trim()) return t('pages.tools.prompt-enhancer.form.error.required');
    if (text.length > 1000) return t('pages.tools.prompt-enhancer.form.error.length');
    return null;
  };

  const handleEnhance = async () => {
    const validationError = validateInput(inputText);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (retryActive) {
      setError(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutputText('');

    const args: EnhanceArgs = {
      text: inputText,
      mode,
    };

    try {
      const result = await enhance(args);
      // Handle fetch Response first
      if (result instanceof Response) {
        if (result.status === 429) {
          await handle429Response(result);
          setError(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
        } else {
          // Best-effort parse error payload
          const payload: unknown = await result.clone().json().catch(() => null);
          const msg = payload && typeof (payload as any).error?.message === 'string'
            ? (payload as any).error.message
            : t('pages.tools.prompt-enhancer.form.error.unknown');
          setError(msg);
        }
      } else if ('success' in result) {
        if (result.success) {
          setOutputText(result.data.enhancedPrompt);
          setSafetyReport(result.data.safetyReport || null);
          setError(null);
        } else {
          // ApiErrorBody
          setError(result.error?.message || t('pages.tools.prompt-enhancer.form.error.unknown'));
        }
      } else {
        setError(t('pages.tools.prompt-enhancer.form.error.unknown'));
      }
    } catch (err) {
      setError(t('pages.tools.prompt-enhancer.form.error.network'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (error) setError(null);
  };

  const modes = [
    { value: 'creative', label: t('pages.tools.prompt-enhancer.form.mode.creative') },
    { value: 'professional', label: t('pages.tools.prompt-enhancer.form.mode.professional') },
    { value: 'concise', label: t('pages.tools.prompt-enhancer.form.mode.concise') },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <form className="space-y-6">
        <div>
          <label htmlFor="inputText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pages.tools.prompt-enhancer.form.inputLabel')}
          </label>
          <textarea
            id="inputText"
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('pages.tools.prompt-enhancer.form.inputPlaceholder')}
            aria-describedby="inputError"
            disabled={isLoading}
            maxLength={1000}
          />
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {inputText.length}/1000
          </div>
          {error && (
            <p id="inputError" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pages.tools.prompt-enhancer.form.modeLabel')}
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'creative' | 'professional' | 'concise')}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isLoading}
          >
            {modes.map((m) => (
              <option value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleEnhance}
          disabled={isLoading || retryActive || usageLoading || !inputText.trim()}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('pages.tools.prompt-enhancer.form.enhanceButton')}
        >
          {isLoading ? t('pages.tools.prompt-enhancer.form.enhancing') : t('pages.tools.prompt-enhancer.form.enhanceButton')}
        </button>
      </form>

      {usage && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('pages.tools.prompt-enhancer.usage.title')}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {t('pages.tools.prompt-enhancer.usage.used', { used: usage.used, limit: usage.limit })}
          </div>
        </div>
      )}

      {outputText && (
        <div className="mt-6">
          <label htmlFor="outputText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pages.tools.prompt-enhancer.form.outputLabel')}
          </label>
          <textarea
            id="outputText"
            value={outputText}
            readOnly
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 dark:text-white"
            aria-label={t('pages.tools.prompt-enhancer.form.outputLabel')}
          />
        </div>
      )}

      {safetyReport && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            {t('pages.tools.prompt-enhancer.safety.title')}
          </h3>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <p>Score: {safetyReport.score}/10</p>
            {safetyReport.warnings.length > 0 && (
              <ul className="list-disc list-inside mt-2">
                {safetyReport.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancerForm;