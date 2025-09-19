 

export interface ModelControlsProps {
  // Scale controls
  supportsScale: boolean;
  allowedScales: ReadonlyArray<2 | 4>;
  selectedScale: 2 | 4;
  onScale: (s: 2 | 4) => void;

  // Face enhance
  supportsFaceEnhance: boolean;
  canUseFaceEnhance: boolean;
  faceEnhance: boolean;
  onToggleFace: (next: boolean) => void;

  // i18n/tooltips labels
  faceEnhanceLabel: string;
  upgradeLabel: string;

  // Feature flag for plan-gating (controls tooltips/disabled states)
  gatingEnabled: boolean;

  // Telemetry callback when a control is blocked by plan
  onBlocked?: (payload: Record<string, unknown>) => void;
}

export function ModelControls(props: ModelControlsProps) {
  const {
    supportsScale,
    allowedScales,
    selectedScale,
    onScale,
    supportsFaceEnhance,
    canUseFaceEnhance,
    faceEnhance,
    onToggleFace,
    faceEnhanceLabel,
    upgradeLabel,
    gatingEnabled,
    onBlocked,
  } = props;

  return (
    <div className="flex items-center gap-3">
      {supportsScale && (
        <div className="flex items-center gap-1" role="group" aria-label="Enhancement scale">
          {/* x2 */}
          <button
            type="button"
            onClick={() => {
              const allowed = allowedScales.includes(2);
              if (!allowed) {
                onBlocked?.({ feature: 'scale', requested: 2 });
                return;
              }
              onScale(2);
            }}
            title={!allowedScales.includes(2) && gatingEnabled ? upgradeLabel : ''}
            className={`px-2 py-1 text-xs rounded-md ring-1 ${
              selectedScale === 2
                ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200'
                : !allowedScales.includes(2) && gatingEnabled
                ? 'opacity-60 cursor-not-allowed bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-500 dark:text-gray-500'
                : 'bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'
            }`}
          >
            x2
          </button>
          {/* x4 */}
          <button
            type="button"
            onClick={() => {
              const allowed = allowedScales.includes(4);
              if (!allowed) {
                onBlocked?.({ feature: 'scale', requested: 4 });
                return;
              }
              onScale(4);
            }}
            title={!allowedScales.includes(4) && gatingEnabled ? upgradeLabel : ''}
            className={`px-2 py-1 text-xs rounded-md ring-1 ${
              selectedScale === 4
                ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200'
                : !allowedScales.includes(4) && gatingEnabled
                ? 'opacity-60 cursor-not-allowed bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-500 dark:text-gray-500'
                : 'bg-white/10 dark:bg-slate-900/40 ring-cyan-400/20 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'
            }`}
          >
            x4
          </button>
        </div>
      )}
      {supportsFaceEnhance && (
        <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={faceEnhance}
            onChange={(e) => {
              const next = e.target.checked;
              if (next && !canUseFaceEnhance) {
                onBlocked?.({ feature: 'face_enhance' });
                return;
              }
              onToggleFace(next);
            }}
            disabled={gatingEnabled && !canUseFaceEnhance}
            className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500"
            aria-label={faceEnhanceLabel}
            title={gatingEnabled && !canUseFaceEnhance ? upgradeLabel : ''}
          />
          <span>{faceEnhanceLabel}</span>
        </label>
      )}
    </div>
  );
}
