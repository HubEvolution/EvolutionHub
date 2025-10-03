import type { ReactNode, MouseEvent } from 'react';
import { ModelSelect } from './ModelSelect';
import type { ModelOption } from './ModelSelect';
import { ActionsGroup } from './ActionsGroup';

/**
 * Props für die EnhancerActions-Komponente im Image Enhancer Tool.
 *
 * Diese Komponente kombiniert ModelSelect und ActionsGroup für die Haupt-Aktionsleiste.
 * Unterstützt optionale Slots für benutzerdefinierte Controls und Right-Slot (z.B. UsagePill).
 *
 * @interface EnhancerActionsProps
 * @property {string} modelLabel - Label für den Model-Select (z.B. "Model").
 * @property {string} model - Aktueller ausgewählter Model-Slug.
 * @property {ReadonlyArray<ModelOption>} models - Array verfügbarer Model-Optionen.
 * @property {(value: string) => void} onChangeModel - Callback für Model-Änderung.
 * @property {ReactNode} [modelControlsSlot] - Optionaler Slot für benutzerdefinierte Model-Controls (ersetzt default Select).
 * @property {string} enhanceLabel - Label für Enhance-Button.
 * @property {string} processingLabel - Label während Processing.
 * @property {string} resetLabel - Label für Reset.
 * @property {string} downloadLabel - Label für Download.
 * @property {boolean} canSubmit - Ob Submit möglich ist.
 * @property {boolean} quotaExceeded - Quota überschritten.
 * @property {boolean} loading - Ladezustand.
 * @property {boolean} hasResult - Ergebnis vorhanden.
 * @property {string | null} resultUrl - URL des Ergebnisses.
 * @property {() => void} onEnhance - Enhance-Callback.
 * @property {() => void} onReset - Reset-Callback.
 * @property {(e: MouseEvent<HTMLAnchorElement>) => void} onDownload - Download-Callback.
 * @property {ReactNode} [rightSlot] - Optionaler Right-Slot (z.B. UsagePill).
 * @property {string} [startOverLabel] - Optionaler Start-Over-Label.
 * @property {() => void} [onStartOver] - Optionaler Start-Over-Callback.
 * @property {boolean} [showEnhance=true] - Sichtbarkeit von Enhance-Button.
 */
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
  // Optional: control whether Reset is enabled (e.g., when slider already centered)
  canReset?: boolean;
}

/**
 * EnhancerActions-Komponente für das Image Enhancer Tool.
 *
 * Rendert die Haupt-Aktionsleiste mit Model-Auswahl und Button-Gruppe.
 * Unterstützt benutzerdefinierte Slots und bedingte Rendering basierend auf Zuständen.
 *
 * @param props Die Props für die Komponente.
 * @returns Die gerenderte Komponente.
 */
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
  canReset = true,
}: EnhancerActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
      {modelControlsSlot ? (
        modelControlsSlot
      ) : (
        <ModelSelect
          id="model"
          label={modelLabel}
          value={model}
          options={models}
          onChange={onChangeModel}
        />
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
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
          canReset={canReset}
        />
      </div>
    </div>
  );
}
