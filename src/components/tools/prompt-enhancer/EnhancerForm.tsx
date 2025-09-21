import React, { useState, useRef, useEffect } from 'react';
import type { EnhanceArgs } from './hooks/useEnhance';
import { useEnhance } from './hooks/useEnhance';
import { useRateLimit } from './hooks/useRateLimit';
import { getI18n } from '@/utils/i18n';
import { getLocale } from '@/lib/i18n';
import { ALLOWED_TYPES, MAX_FILE_BYTES, MAX_FILES } from '@/config/prompt-enhancer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import UploadIcon from '@/components/ui/icons/Upload';

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
  const [errorScope, setErrorScope] = useState<'input' | 'files' | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const { enhance } = useEnhance();
  const { retryActive, handle429Response } = useRateLimit();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const locale = getLocale(typeof window !== 'undefined' ? window.location.pathname : '/');
  const t = getI18n(locale);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const validateInput = (text: string): string | null => {
    if (!text.trim()) return t('pages.tools.prompt-enhancer.form.error.required');
    if (text.length > 1000) return t('pages.tools.prompt-enhancer.form.error.length');
    return null;
  };

  const formatBytes = (bytes: number): string => {
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + ' B';
    const units = ['KB', 'MB', 'GB'];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
  };

  const validateFiles = (incoming: File[]): string | null => {
    if (incoming.length + files.length > MAX_FILES) {
      return t('pages.tools.prompt-enhancer.form.error.files.tooMany', { count: MAX_FILES });
    }
    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type as any)) {
        return t('pages.tools.prompt-enhancer.form.error.file.invalidType');
      }
      if (f.size > MAX_FILE_BYTES) {
        return t('pages.tools.prompt-enhancer.form.error.file.tooLarge', { max: formatBytes(MAX_FILE_BYTES) });
      }
    }
    return null;
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const err = validateFiles(list);
    if (err) {
      setError(err);
      setErrorScope('files');
      return;
    }
    setFiles((prev) => [...prev, ...list].slice(0, MAX_FILES));
    setError(null);
    setErrorScope(null);
    e.target.value = '';
  };

  const onRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const incoming = Array.from(e.dataTransfer.files || []);
    const err = validateFiles(incoming);
    if (err) {
      setError(err);
      setErrorScope('files');
      return;
    }
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
    setError(null);
    setErrorScope(null);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setSafetyReport(null);
    setError(null);
    inputRef.current?.focus();
  };

  const handleEnhance = async () => {
    const validationError = validateInput(inputText);
    if (validationError) {
      setError(validationError);
      setErrorScope('input');
      return;
    }

    // Validate files before sending
    const fileErr = validateFiles([]); // ensures count rule against current state
    if (fileErr) {
      setError(fileErr);
      setErrorScope('files');
      return;
    }

    if (retryActive) {
      setError(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
      setErrorScope('input');
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorScope(null);
    setOutputText('');

    const args: EnhanceArgs = {
      text: inputText,
      mode,
      files: files.length ? files : undefined,
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
          setErrorScope(null);
          // keep selected files for context or clear? keep for convenience
        } else {
          // ApiErrorBody
          setError(result.error?.message || t('pages.tools.prompt-enhancer.form.error.unknown'));
          setErrorScope('input');
        }
      } else {
        setError(t('pages.tools.prompt-enhancer.form.error.unknown'));
        setErrorScope('input');
      }
    } catch (err) {
      setError(t('pages.tools.prompt-enhancer.form.error.network'));
      setErrorScope('input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (error) {
      setError(null);
      setErrorScope(null);
    }
  };

  const modes = [
    { value: 'creative', label: t('pages.tools.prompt-enhancer.form.mode.creative') },
    { value: 'professional', label: t('pages.tools.prompt-enhancer.form.mode.professional') },
    { value: 'concise', label: t('pages.tools.prompt-enhancer.form.mode.concise') },
  ];

  return (
    <Card className="max-w-4xl mx-auto p-6">
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
          {error && (errorScope === 'input' || errorScope === null) && (
            <Alert id="inputError">{error}</Alert>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pages.tools.prompt-enhancer.form.files.label')}
          </label>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`p-4 border-2 border-dashed rounded-md text-sm ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'} `}
            aria-label={t('pages.tools.prompt-enhancer.form.files.dropHint')}
          >
            <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <UploadIcon className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
              <p>{t('pages.tools.prompt-enhancer.form.files.dropHint')}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="fileInput"
                type="file"
                onChange={onFileInputChange}
                multiple
                accept={['.jpg','.jpeg','.png','.webp','.pdf','.txt','.md'].join(',')}
                disabled={isLoading}
                className="block text-sm text-gray-700 dark:text-gray-200"
              />
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('pages.tools.prompt-enhancer.form.files.allowedTypes')}: JPG, PNG, WEBP, PDF, TXT, MD · {t('pages.tools.prompt-enhancer.form.files.maxSize')}: {formatBytes(MAX_FILE_BYTES)} · {t('pages.tools.prompt-enhancer.form.files.maxCount', { count: MAX_FILES })}
            </div>
            {error && errorScope === 'files' && (
              <Alert className="mt-2">{error}</Alert>
            )}
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm">
                    <span className="truncate">{f.name} · {formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(idx)}
                      className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      disabled={isLoading}
                    >
                      {t('pages.tools.prompt-enhancer.form.files.remove')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pages.tools.prompt-enhancer.form.modeLabel')}
          </div>
          <div role="group" aria-label={t('pages.tools.prompt-enhancer.form.modeLabel')} className="inline-flex shadow-sm">
            {modes.map((m, idx) => {
              const selected = mode === (m.value as 'creative' | 'professional' | 'concise');
              const radius = idx === 0 ? 'rounded-l-md' : idx === modes.length - 1 ? 'rounded-r-md' : '';
              const spacing = idx > 0 ? '-ml-px' : '';
              return (
                <Button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value as 'creative' | 'professional' | 'concise')}
                  aria-pressed={selected}
                  disabled={isLoading}
                  variant={selected ? 'primary' : 'secondary'}
                  className={`rounded-none ${radius} ${spacing}`}
                  size="sm"
                >
                  {m.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleEnhance}
          disabled={isLoading || retryActive || !inputText.trim()}
          className="w-full"
          aria-label={t('pages.tools.prompt-enhancer.form.enhanceButton')}
        >
          {isLoading ? t('pages.tools.prompt-enhancer.form.enhancing') : t('pages.tools.prompt-enhancer.form.enhanceButton')}
        </Button>
      </form>


      {outputText && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="outputText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('pages.tools.prompt-enhancer.form.outputLabel')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={!outputText}
                aria-live="polite"
              >
                {copied ? t('pages.tools.prompt-enhancer.form.copied') : t('pages.tools.prompt-enhancer.form.copy')}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm rounded-md border border-transparent text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isLoading}
              >
                {t('pages.tools.prompt-enhancer.form.clear')}
              </button>
            </div>
          </div>
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
    </Card>
  );
};

export default EnhancerForm;