import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { EnhanceArgs } from './hooks/useEnhance';
import type { EnhancedPromptJson } from './types';
import { useEnhance } from './hooks/useEnhance';
import { useRateLimit } from './hooks/useRateLimit';
import { getI18n } from '@/utils/i18n';
import type { Locale } from '@/lib/i18n';
import {
  ALLOWED_TYPES,
  MAX_FILE_BYTES,
  MAX_FILES,
  TEXT_LENGTH_MAX,
} from '@/config/prompt-enhancer';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import UploadIcon from '@/components/ui/icons/Upload';
import {
  emitPromptEnhancerStarted,
  emitPromptEnhancerSucceeded,
  emitPromptEnhancerFailed,
} from '@/lib/client/telemetry';
import { clientLogger } from '@/lib/client-logger';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
import notify from '@/lib/notify';
import { useUsage } from './hooks/useUsage';

interface EnhancerFormProps {
  locale: Locale;
  initialMode?: 'creative' | 'professional' | 'concise';
}

export interface SafetyReport {
  score: number;
  warnings: string[];
}

const EnhancerForm: React.FC<EnhancerFormProps> = ({ locale, initialMode = 'creative' }) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [safetyReport, setSafetyReport] = useState<SafetyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<'input' | 'files' | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [textPreviews, setTextPreviews] = useState<Record<string, string>>({});
  const [showComparison, setShowComparison] = useState(false);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [enhancedJson, setEnhancedJson] = useState<EnhancedPromptJson | null>(null);
  const [resultView, setResultView] = useState<'text' | 'json'>('text');
  const [inputExpanded, setInputExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);

  const { enhance } = useEnhance();
  const { retryActive, handle429Response } = useRateLimit();
  const { usage, monthlyUsage, creditsBalanceTenths, ownerType, plan } = useUsage();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const t = getI18n(locale);

  const planLabel = useMemo(() => {
    if (ownerType === 'guest' || ownerType === null) {
      return t('pages.tools.prompt-enhancer.plan.guest');
    }
    if (ownerType === 'user') {
      if (plan === 'free' || !plan) return t('pages.tools.prompt-enhancer.plan.starter');
      return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
    return '';
  }, [ownerType, plan, t]);

  const planId = useMemo(
    () =>
      ownerType === 'user' && plan
        ? plan === 'free'
          ? 'starter'
          : (plan as 'pro' | 'premium' | 'enterprise')
        : null,
    [ownerType, plan]
  );

  const monthlyLabel = useMemo(
    () => t('header.menu.monthly_quota'),
    [t]
  );

  const creditsLabel = useMemo(
    () => t('header.menu.credits'),
    [t]
  );

  const presets = useMemo(
    () => [
      {
        id: 'coding_bugfix',
        label: t('pages.tools.prompt-enhancer.presets.codingBugfix.label'),
        description: t('pages.tools.prompt-enhancer.presets.codingBugfix.description'),
        template: t('pages.tools.prompt-enhancer.presets.codingBugfix.template'),
      },
      {
        id: 'data_analysis',
        label: t('pages.tools.prompt-enhancer.presets.dataAnalysis.label'),
        description: t('pages.tools.prompt-enhancer.presets.dataAnalysis.description'),
        template: t('pages.tools.prompt-enhancer.presets.dataAnalysis.template'),
      },
      {
        id: 'content_linkedin',
        label: t('pages.tools.prompt-enhancer.presets.contentLinkedin.label'),
        description: t('pages.tools.prompt-enhancer.presets.contentLinkedin.description'),
        template: t('pages.tools.prompt-enhancer.presets.contentLinkedin.template'),
      },
      {
        id: 'research_audience',
        label: t('pages.tools.prompt-enhancer.presets.researchAudience.label'),
        description: t('pages.tools.prompt-enhancer.presets.researchAudience.description'),
        template: t('pages.tools.prompt-enhancer.presets.researchAudience.template'),
      },
    ],
    [t]
  );

  useEffect(() => {
    setHydrated(true);
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
      if (!ALLOWED_TYPES.includes(f.type)) {
        return t('pages.tools.prompt-enhancer.form.error.file.invalidType');
      }
      if (f.size > MAX_FILE_BYTES) {
        return t('pages.tools.prompt-enhancer.form.error.file.tooLarge', {
          max: formatBytes(MAX_FILE_BYTES),
        });
      }
    }
    return null;
  };

  const fileKey = (f: File) => `${f.name}:${f.size}:${f.type}`;

  const createTextPreview = async (f: File): Promise<string> => {
    try {
      const isText = f.type === 'text/plain' || f.type === 'text/markdown';
      if (!isText) return '';
      const raw = await f.text();
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      return trimmed.slice(0, 160);
    } catch {
      return '';
    }
  };

  const addFiles = async (incoming: File[]) => {
    const err = validateFiles(incoming);
    if (err) {
      setError(err);
      setErrorScope('files');
      notify.error(err);
      return;
    }
    // Generate previews for text files
    const previewEntries: Array<[string, string]> = [];
    for (const f of incoming) {
      const pv = await createTextPreview(f);
      if (pv) previewEntries.push([fileKey(f), pv]);
    }
    setTextPreviews((prev) => {
      const next = { ...prev };
      for (const [k, v] of previewEntries) next[k] = v;
      return next;
    });
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
    setContextExpanded(true);
    setError(null);
    setErrorScope(null);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    void addFiles(list);
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
    void addFiles(incoming);
  };

  const moveFileUp = (idx: number) => {
    if (idx <= 0) return;
    setFiles((prev) => {
      const next = [...prev];
      const tmp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const moveFileDown = (idx: number) => {
    setFiles((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      const tmp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const onImportUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;
    try {
      setUrlLoading(true);
      const res = await fetch(url, { credentials: 'omit', cache: 'no-store' });
      if (!res.ok) throw new Error('fetch_failed');
      const ct = res.headers.get('content-type') || '';
      const isText =
        ct.includes('text/plain') || ct.includes('text/markdown') || ct.includes('text/');
      if (!isText) {
        setError(t('pages.tools.prompt-enhancer.form.error.file.invalidType'));
        setErrorScope('files');
        notify.error(
          t('pages.tools.prompt-enhancer.toasts.urlImportError') ||
            t('pages.tools.prompt-enhancer.form.error.file.invalidType')
        );
        return;
      }
      const raw = await res.text();
      const clamped = raw.slice(0, TEXT_LENGTH_MAX * 3); // allow a few tokens worth; server clamps more
      const u = new URL(url);
      const base = u.pathname.split('/').filter(Boolean).pop() || 'imported.txt';
      const safeName = base.endsWith('.md') || base.endsWith('.txt') ? base : `${base}.txt`;
      const vf = new File([clamped], safeName, { type: 'text/plain' });
      await addFiles([vf]);
      notify.success(t('pages.tools.prompt-enhancer.toasts.urlImportSuccessTitle'), {
        description: t('pages.tools.prompt-enhancer.toasts.urlImportSuccessDescription', {
          filename: safeName,
        }),
      });
      setUrlValue('');
    } catch {
      setError(t('pages.tools.prompt-enhancer.form.error.network'));
      setErrorScope('files');
      notify.error(
        t('pages.tools.prompt-enhancer.toasts.urlImportError') ||
          t('pages.tools.prompt-enhancer.form.error.network')
      );
    } finally {
      setUrlLoading(false);
    }
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

  const handleCopyJson = async () => {
    if (!outputText) return;
    try {
      const payload = enhancedJson ?? { prompt: outputText };
      const json = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(json);
      notify.success(t('pages.tools.prompt-enhancer.toasts.copyJsonSuccessTitle'), {
        description: t('pages.tools.prompt-enhancer.toasts.copyJsonSuccessDescription'),
      });
    } catch {
      notify.error(
        t('pages.tools.prompt-enhancer.toasts.copyJsonError') ||
          t('pages.tools.prompt-enhancer.form.error.network')
      );
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setSafetyReport(null);
    setError(null);
    setImprovements([]);
    inputRef.current?.focus();
  };

  const computeImprovements = (raw: string, enhanced: string): string[] => {
    const list: string[] = [];
    const hasHeadingsEnhanced = /^#\s|^##\s/m.test(enhanced);
    const hasHeadingsRaw = /^#\s|^##\s/m.test(raw);
    if (hasHeadingsEnhanced && !hasHeadingsRaw) {
      list.push('structure');
    }
    if (/constraints/i.test(enhanced)) {
      list.push('constraints');
    }
    if (/^[-*]\s|\d+\.\s/m.test(enhanced)) {
      list.push('steps');
    }
    return list;
  };

  const handleEnhance = async () => {
    clientLogger.info('Prompt enhancer form submitted', {
      component: 'EnhancerForm',
      action: 'enhance_requested',
      mode,
      textLength: inputText.length,
      fileCount: files.length,
    });

    const validationError = validateInput(inputText);
    if (validationError) {
      clientLogger.warn('Prompt enhancer validation failed: invalid input', {
        component: 'EnhancerForm',
        error: 'validation_input',
        textLength: inputText.length,
      });
      setError(validationError);
      setErrorScope('input');
      return;
    }

    // Validate files before sending
    const fileErr = validateFiles([]); // ensures count rule against current state
    if (fileErr) {
      clientLogger.warn('Prompt enhancer validation failed: invalid files', {
        component: 'EnhancerForm',
        error: 'validation_files',
        fileCount: files.length,
      });
      setError(fileErr);
      setErrorScope('files');
      return;
    }

    if (retryActive) {
      clientLogger.warn('Prompt enhancer rate-limited', {
        component: 'EnhancerForm',
        error: 'rate_limit_active',
      });
      setError(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
      setErrorScope('input');
      notify.error(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
      return;
    }

    setIsLoading(true);
    setLastLatencyMs(null);
    setError(null);
    setErrorScope(null);
    setOutputText('');
    setImprovements([]);
    setEnhancedJson(null);
    setResultView('text');

    const args: EnhanceArgs = {
      text: inputText,
      mode,
      files: files.length ? files : undefined,
    };

    const startedAt = Date.now();
    // Telemetry: started
    try {
      await emitPromptEnhancerStarted({
        mode,
        hasFiles: files.length > 0,
        fileTypes: files.map((f) => f.type).slice(0, 5),
      });
    } catch {
      // swallow
    }

    try {
      const result = await enhance(args);
      // Handle fetch Response first
      if (result instanceof Response) {
        if (result.status === 429) {
          clientLogger.warn('Prompt enhancer rate-limited by API', {
            component: 'EnhancerForm',
            error: 'rate_limit_429',
            status: 429,
          });
          await handle429Response(result);
          setError(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
          notify.error(t('pages.tools.prompt-enhancer.form.error.rateLimit'));
          // Telemetry: failed (rate-limited)
          await emitPromptEnhancerFailed({ errorKind: 'rate_limited', httpStatus: 429 });
        } else {
          // Best-effort parse error payload
          const payload: unknown = await result
            .clone()
            .json()
            .catch(() => null);
          const msg =
            payload && typeof (payload as any).error?.message === 'string'
              ? (payload as any).error.message
              : t('pages.tools.prompt-enhancer.form.error.unknown');
          clientLogger.error('Prompt enhancer API error', {
            component: 'EnhancerForm',
            error: 'api_error',
            status: result.status,
            message: msg,
          });
          setError(msg);
          notify.error(msg);
          await emitPromptEnhancerFailed({ errorKind: 'api_error', httpStatus: result.status });
        }
      } else if ('success' in result) {
        if (result.success) {
          const latencyMs = Math.max(0, Date.now() - startedAt);
          clientLogger.info('Prompt enhanced successfully', {
            component: 'EnhancerForm',
            action: 'enhance_success',
            mode,
            latency: latencyMs,
            warningsCount: result.data.safetyReport?.warnings?.length || 0,
          });
          setOutputText(result.data.enhancedPrompt);
          setImprovements(computeImprovements(inputText, result.data.enhancedPrompt));
          setEnhancedJson(result.data.enhancedPromptJson ?? null);
          setSafetyReport(result.data.safetyReport || null);
          setError(null);
          setErrorScope(null);
          setLastLatencyMs(latencyMs);
          // Telemetry: succeeded
          await emitPromptEnhancerSucceeded({
            latencyMs,
            maskedCount: result.data.safetyReport?.warnings?.length,
          });
          notify.success(t('pages.tools.prompt-enhancer.toasts.enhanceSuccessTitle'), {
            description: t('pages.tools.prompt-enhancer.toasts.enhanceSuccessDescription', {
              ms: latencyMs,
            }),
          });
          // keep selected files for context or clear? keep for convenience
        } else {
          // ApiErrorBody
          clientLogger.error('Prompt enhancer returned error', {
            component: 'EnhancerForm',
            error: result.error?.type || 'api_error',
            message: result.error?.message,
          });
          setError(result.error?.message || t('pages.tools.prompt-enhancer.form.error.unknown'));
          setErrorScope('input');
          notify.error(
            result.error?.message || t('pages.tools.prompt-enhancer.form.error.unknown')
          );
          await emitPromptEnhancerFailed({ errorKind: result.error?.type || 'api_error' });
        }
      } else {
        clientLogger.error('Prompt enhancer unknown error', {
          component: 'EnhancerForm',
          error: 'unknown',
        });
        setError(t('pages.tools.prompt-enhancer.form.error.unknown'));
        setErrorScope('input');
        notify.error(t('pages.tools.prompt-enhancer.form.error.unknown'));
        await emitPromptEnhancerFailed({ errorKind: 'unknown' });
      }
    } catch (err) {
      clientLogger.error('Prompt enhancer network error', {
        component: 'EnhancerForm',
        error: 'network',
        message: err instanceof Error ? err.message : String(err),
      });
      setError(t('pages.tools.prompt-enhancer.form.error.network'));
      setErrorScope('input');
      notify.error(t('pages.tools.prompt-enhancer.form.error.network'));
      await emitPromptEnhancerFailed({ errorKind: 'network' });
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
    <div className="max-w-6xl mx-auto">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <form
            className="space-y-6"
            data-testid="enhancer-form"
            data-hydrated={hydrated ? 'true' : 'false'}
          >
            {/* 1. Eingabe-Prompt */}
            <section aria-labelledby="pe-step-1-title">
              <h2
                id="pe-step-1-title"
                className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                {t('pages.tools.prompt-enhancer.form.step1.title')}
              </h2>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {t('pages.tools.prompt-enhancer.form.step1.subtitle')}
              </p>

              <div className="mt-3">
                <label
                  htmlFor="inputText"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t('pages.tools.prompt-enhancer.form.inputLabel')}
                </label>
                <textarea
                  id="inputText"
                  ref={inputRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onFocus={() => setInputExpanded(true)}
                  onBlur={() => setInputExpanded(Boolean(inputText.trim()))}
                  className={`w-full ${
                    inputExpanded ? 'h-32 lg:h-40' : 'h-28 lg:h-24'
                  } p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
                  placeholder={t('pages.tools.prompt-enhancer.form.inputPlaceholder')}
                  aria-describedby="inputError"
                  disabled={isLoading}
                  maxLength={1000}
                  data-testid="input-text"
                />
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {inputText.length}/1000
                </div>
                {error && (errorScope === 'input' || errorScope === null) && (
                  <Alert id="inputError">{error}</Alert>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('pages.tools.prompt-enhancer.form.step1.presetsIntro')}
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isLoading}
                      className="text-xs"
                      onClick={() => {
                        const base = inputText.trim();
                        const next = base ? `${base}\n\n${preset.template}` : preset.template;
                        setInputText(next);
                        inputRef.current?.focus();
                      }}
                      aria-label={preset.description}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                {presets.length > 0 && (
                  <div className="mb-3 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {presets.map((preset) => (
                      <p key={preset.id}>
                        <span className="font-medium">{preset.label}:</span> {preset.description}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </section>

        {/* 2. Kontext (Dateien & URLs) */}
        <section aria-labelledby="pe-step-2-title">
          <h2
            id="pe-step-2-title"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            {t('pages.tools.prompt-enhancer.form.step2.title')}
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {t('pages.tools.prompt-enhancer.form.step2.subtitle')}
          </p>
          <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isLoading || files.length >= MAX_FILES}
                onClick={() => {
                  setContextExpanded(true);
                  fileInputRef.current?.click();
                }}
              >
                {t('pages.tools.prompt-enhancer.form.files.selectButton')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContextExpanded(true);
                  setShowUrlInput((prev) => !prev);
                }}
                disabled={isLoading || urlLoading || files.length >= MAX_FILES}
              >
                {showUrlInput
                  ? t('pages.tools.prompt-enhancer.form.files.urlImportHide')
                  : t('pages.tools.prompt-enhancer.form.files.urlImportToggle')}
              </Button>
              {files.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('pages.tools.prompt-enhancer.form.files.selectedCount', { count: files.length })}
                </p>
              )}
            </div>

            <input
              id="fileInput"
              ref={fileInputRef}
              type="file"
              onChange={onFileInputChange}
              multiple
              accept={['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.md'].join(',')}
              disabled={isLoading}
              className="sr-only"
              aria-label={t('pages.tools.prompt-enhancer.form.files.dropHint')}
            />

            {error && errorScope === 'files' && <Alert className="mt-2">{error}</Alert>}

            {(contextExpanded || files.length > 0 || showUrlInput || dragActive) && (
              <div className="mt-3">
                <div className="mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('pages.tools.prompt-enhancer.form.files.urlImportLabel')}
                  </p>
                  {showUrlInput && (
                    <div className="mt-2 flex gap-2">
                      <input
                        id="urlImport"
                        type="url"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder={t('pages.tools.prompt-enhancer.form.files.urlImportPlaceholder')}
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={isLoading || urlLoading || files.length >= MAX_FILES}
                      />
                      <Button
                        type="button"
                        onClick={onImportUrl}
                        disabled={
                          isLoading || urlLoading || !urlValue.trim() || files.length >= MAX_FILES
                        }
                      >
                        {urlLoading ? t('common.loading') : t('common.import')}
                      </Button>
                    </div>
                  )}
                </div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('pages.tools.prompt-enhancer.form.files.label')}
                </label>
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => {
                    if (!isLoading && files.length < MAX_FILES) {
                      fileInputRef.current?.click();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      if (!isLoading && files.length < MAX_FILES) {
                        fileInputRef.current?.click();
                      }
                    }
                  }}
                  className={`p-3 border-2 border-dashed rounded-md text-sm cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:border-blue-400 dark:hover:bg-blue-900/10'
                  }`}
                  aria-label={t('pages.tools.prompt-enhancer.form.files.dropHint')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-300 dark:bg-blue-500/20">
                      <UploadIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium">
                      {t('pages.tools.prompt-enhancer.form.files.dropHint')}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isLoading || files.length >= MAX_FILES}
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLoading && files.length < MAX_FILES) {
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      {t('pages.tools.prompt-enhancer.form.files.selectButton')}
                    </Button>
                  </div>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('pages.tools.prompt-enhancer.form.files.allowedTypes')}: JPG, PNG, WEBP, PDF,
                    TXT, MD · {t('pages.tools.prompt-enhancer.form.files.maxSize')}:{' '}
                    {formatBytes(MAX_FILE_BYTES)} ·{' '}
                    {t('pages.tools.prompt-enhancer.form.files.maxCount', { count: MAX_FILES })}
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-4 space-y-2 text-left" data-testid="files-list">
                      {files.map((f, idx) => (
                        <li
                          key={idx}
                          className="text-sm border border-gray-200 dark:border-gray-700 rounded-md p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              {f.name} · {f.type || 'unknown'} · {formatBytes(f.size)}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                onClick={() => moveFileUp(idx)}
                                aria-label={`Move up ${f.name}`}
                                disabled={isLoading || idx === 0}
                                variant="ghost"
                                size="sm"
                                className="px-2 py-1 h-auto rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                ↑
                              </Button>
                              <Button
                                type="button"
                                onClick={() => moveFileDown(idx)}
                                aria-label={`Move down ${f.name}`}
                                disabled={isLoading || idx === files.length - 1}
                                variant="ghost"
                                size="sm"
                                className="px-2 py-1 h-auto rounded-md border opacity-100 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                ↓
                              </Button>
                              <Button
                                type="button"
                                onClick={() => onRemoveFile(idx)}
                                disabled={isLoading}
                                variant="ghost"
                                size="sm"
                                className="px-2 py-1 h-auto rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                {t('pages.tools.prompt-enhancer.form.files.remove')}
                              </Button>
                            </div>
                          </div>
                          {(() => {
                            const key = fileKey(f);
                            const pv = textPreviews[key];
                            return pv ? (
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                {pv}
                                {pv.length >= 160 ? '…' : ''}
                              </div>
                            ) : null;
                          })()}
                        </li>
                      ))}
                    </ul>
                  )}

                  {files.length >= MAX_FILES && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('pages.tools.prompt-enhancer.form.files.softLimit', { count: MAX_FILES })}
                    </p>
                  )}
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {t('pages.tools.prompt-enhancer.form.step2.help')}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 3. Stil des optimierten Prompts */}
        <section aria-labelledby="pe-step-3-title">
          <h2
            id="pe-step-3-title"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            {t('pages.tools.prompt-enhancer.form.step3.title')}
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {t('pages.tools.prompt-enhancer.form.step3.subtitle')}
          </p>

          <div className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pages.tools.prompt-enhancer.form.modeLabel')}
          </div>
          <div
            role="group"
            aria-label={t('pages.tools.prompt-enhancer.form.modeLabel')}
            className="inline-flex shadow-sm"
            data-testid="mode-group"
          >
            {modes.map((m, idx) => {
              const selected = mode === (m.value as 'creative' | 'professional' | 'concise');
              const radius =
                idx === 0 ? 'rounded-l-md' : idx === modes.length - 1 ? 'rounded-r-md' : '';
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
                  data-testid={`mode-${m.value}`}
                >
                  {m.label}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {t('pages.tools.prompt-enhancer.form.modeMapping')}
          </p>
        </section>

            <Button
              type="button"
              onClick={handleEnhance}
              disabled={isLoading || retryActive || !inputText.trim()}
              className="w-full"
              aria-label={t('pages.tools.prompt-enhancer.form.enhanceButton')}
              data-testid="enhance-button"
            >
              {isLoading
                ? t('pages.tools.prompt-enhancer.form.enhancing')
                : t('pages.tools.prompt-enhancer.form.enhanceButton')}
            </Button>
          </form>
        </div>

        <aside className="mt-8 lg:mt-0 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4">
            <section
              aria-labelledby="pe-step-4-title"
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-4"
            >
              <h2
                id="pe-step-4-title"
                className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
              >
                {t('pages.tools.prompt-enhancer.form.step4.title')}
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="outputText"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('pages.tools.prompt-enhancer.form.outputLabel')}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setResultView('text')}
                        className={`px-2 py-1 ${resultView === 'text' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                        aria-pressed={resultView === 'text'}
                        disabled={!outputText}
                      >
                        {t('pages.tools.prompt-enhancer.form.viewText')}
                      </button>
                      <button
                        type="button"
                        onClick={() => enhancedJson && setResultView('json')}
                        className={`px-2 py-1 border-l border-gray-300 dark:border-gray-600 ${
                          resultView === 'json'
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        } ${!enhancedJson || !outputText ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-pressed={resultView === 'json'}
                        disabled={!enhancedJson || !outputText}
                      >
                        {t('pages.tools.prompt-enhancer.form.viewJson')}
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowComparison((prev) => !prev)}
                      disabled={!outputText}
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      aria-pressed={showComparison ? 'true' : 'false'}
                    >
                      {showComparison
                        ? t('pages.tools.prompt-enhancer.form.hideComparison')
                        : t('pages.tools.prompt-enhancer.form.showComparison')}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCopy}
                      disabled={!outputText}
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      aria-live="polite"
                    >
                      {copied
                        ? t('pages.tools.prompt-enhancer.form.copied')
                        : t('pages.tools.prompt-enhancer.form.copy')}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCopyJson}
                      disabled={!outputText}
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      {t('pages.tools.prompt-enhancer.form.copyJson')}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleClear}
                      disabled={isLoading}
                      variant="secondary"
                      size="sm"
                      className="px-3 py-1.5 text-sm"
                    >
                      {t('pages.tools.prompt-enhancer.form.clear')}
                    </Button>
                  </div>
                </div>

                {lastLatencyMs != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('pages.tools.prompt-enhancer.form.resultLatency', { ms: lastLatencyMs })}
                  </p>
                )}

                {outputText ? (
                  resultView === 'text' || !enhancedJson ? (
                    <textarea
                      id="outputText"
                      value={outputText}
                      readOnly
                      className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 dark:text-white"
                      aria-label={t('pages.tools.prompt-enhancer.form.outputLabel')}
                      data-testid="output-text"
                    />
                  ) : (
                    <pre
                      className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-50 overflow-auto font-mono whitespace-pre"
                      aria-label={t('pages.tools.prompt-enhancer.form.outputLabel')}
                      data-testid="output-json"
                    >
                      {JSON.stringify(enhancedJson, null, 2)}
                    </pre>
                  )
                ) : (
                  <textarea
                    id="outputText"
                    value=""
                    readOnly
                    disabled
                    className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 dark:text-white opacity-60"
                    aria-label={t('pages.tools.prompt-enhancer.form.outputLabel')}
                    data-testid="output-text"
                  />
                )}

                {showComparison && outputText && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3">
                    <label
                      htmlFor="originalText"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      {t('pages.tools.prompt-enhancer.form.inputLabelOriginal')}
                    </label>
                    <textarea
                      id="originalText"
                      value={inputText}
                      readOnly
                      className="w-full h-24 p-3 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 dark:text-white"
                      aria-label={t('pages.tools.prompt-enhancer.form.inputLabelOriginal')}
                    />
                  </div>
                )}

                {improvements.length > 0 && outputText && (
                  <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                      {t('pages.tools.prompt-enhancer.improvements.title')}
                    </h3>
                    <ul className="text-xs text-blue-800 dark:text-blue-100 list-disc list-inside">
                      {improvements.includes('structure') && (
                        <li>{t('pages.tools.prompt-enhancer.improvements.structure')}</li>
                      )}
                      {improvements.includes('constraints') && (
                        <li>{t('pages.tools.prompt-enhancer.improvements.constraints')}</li>
                      )}
                      {improvements.includes('steps') && (
                        <li>{t('pages.tools.prompt-enhancer.improvements.steps')}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {safetyReport && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  {t('pages.tools.prompt-enhancer.safety.title')}
                </h3>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    {t('pages.tools.prompt-enhancer.safety.score', { score: safetyReport.score })}
                  </p>
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

            {usage && (
              <div className="flex flex-col items-center">
                <ToolUsageBadge
                  label={t('pages.tools.prompt-enhancer.usage.title')}
                  loadingLabel={t('common.loading')}
                  usage={usage}
                  ownerType={ownerType}
                  planId={planId}
                  planLabel={planLabel}
                  layout="card"
                  size="md"
                  align="center"
                  showIcon
                  showResetHint={false}
                  showOwnerHint={false}
                  showPercent
                  detailsTitle={t('pages.tools.prompt-enhancer.usage.title')}
                  resetLabel={t('pages.tools.items.Imag-Enhancer.app.resetLabel')}
                  headerCredits={
                    creditsBalanceTenths != null ? Math.round(creditsBalanceTenths) / 10 : null
                  }
                  detailsItems={[
                    {
                      id: 'daily',
                      label: t('pages.tools.prompt-enhancer.usage.title'),
                      used: usage.used,
                      limit: usage.limit,
                      resetAt: usage.resetAt,
                    },
                    ...(monthlyUsage
                      ? [
                          {
                            id: 'monthly',
                            label: monthlyLabel,
                            used: monthlyUsage.used,
                            limit: monthlyUsage.limit,
                            resetAt: monthlyUsage.resetAt,
                          },
                        ]
                      : []),
                    ...(creditsBalanceTenths != null
                      ? [
                          {
                            id: 'credits',
                            label: creditsLabel,
                            used: Math.round(creditsBalanceTenths) / 10,
                            limit: null,
                            kind: 'credits' as const,
                          },
                        ]
                      : []),
                  ]}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('pages.tools.prompt-enhancer.usage.freeMessage')}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EnhancerForm;
