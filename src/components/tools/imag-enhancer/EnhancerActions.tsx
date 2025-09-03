import type { ReactNode, MouseEvent } from 'react';
import { ModelSelect } from './ModelSelect';
import type { ModelOption } from './ModelSelect';
import { ActionsGroup } from './ActionsGroup';

interface EnhancerActionsProps {
  modelLabel: string;
  model: string;
  models: ReadonlyArray<ModelOption>;
  onChangeModel: (value: string) => void;
  // Optional custom left-side UI (e.g., pill or composite controls). If provided, replaces the default ModelSelect.
  modelControlsSlot?: ReactNode;

  enhanceLabel: string;
  processingLabel: string;
  resetLabel: string;
  downloadLabel: string;

  canSubmit: boolean;
  quotaExceeded: boolean;
  loading: boolean;

  hasResult: boolean;
  resultUrl?: string | null;

  onEnhance: () => void;
  onReset: () => void;
  onDownload: (e: MouseEvent<HTMLAnchorElement>) => void;

  rightSlot?: ReactNode; // e.g. UsagePill
  // Optional: forward Start Over to ActionsGroup in compare phase
  startOverLabel?: string;
  onStartOver?: () => void;
  // Optional: control visibility of Enhance button (e.g., only show when settings changed)
  showEnhance?: boolean;
}

export function EnhancerActions({
  modelLabel,
  model,
  models,
  onChangeModel,
  modelControlsSlot,
  enhanceLabel,
  processingLabel,
  resetLabel,
  downloadLabel,
  canSubmit,
  quotaExceeded,
  loading,
  hasResult,
  resultUrl,
  onEnhance,
  onReset,
  onDownload,
  rightSlot,
  startOverLabel,
  onStartOver,
  showEnhance = true,
}: EnhancerActionsProps) {
  return (
    <div className="mt-4 flex items-center gap-3">
      {modelControlsSlot ? (
        modelControlsSlot
      ) : (
        <ModelSelect id="model" label={modelLabel} value={model} options={models} onChange={onChangeModel} />
      )}

      <div className="ml-auto flex items-center gap-3">
        {rightSlot}
        <ActionsGroup
          enhanceLabel={enhanceLabel}
          processingLabel={processingLabel}
          resetLabel={resetLabel}
          downloadLabel={downloadLabel}
          canSubmit={canSubmit}
          quotaExceeded={quotaExceeded}
          loading={loading}
          hasResult={hasResult}
          resultUrl={resultUrl}
          onEnhance={onEnhance}
          onReset={onReset}
          onDownload={onDownload}
          startOverLabel={startOverLabel}
          onStartOver={onStartOver}
          showEnhance={showEnhance}
        />
      </div>
    </div>
  );
}
