/**
 * Informationen zum Quota-Verbrauch für die UsagePill-Komponente.
 * 
 * @interface UsageInfo
 * @property {number} used - Verbrauchte Anfragen.
 * @property {number} limit - Gesamt-Limit.
 * @property {number | null} resetAt - Zeitpunkt des Resets (timestamp oder null).
 */
interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

/**
 * Props für die UsagePill-Komponente.
 * 
 * @interface UsagePillProps
 * @property {string} label - Hauptlabel (z.B. i18n.usage).
 * @property {string} loadingLabel - Label während Laden (z.B. i18n.loading).
 * @property {UsageInfo | null} usage - Quota-Info oder null während Laden.
 * @property {'user' | 'guest' | null} ownerType - Typ des Besitzers.
 * @property {number} percent - Prozentsatz des Verbrauchs (0-100).
 * @property {boolean} critical - True, wenn Quota kritisch (rote Styling).
 */
interface UsagePillProps {
  label: string; // strings.usage
  loadingLabel: string; // strings.loading
  usage: UsageInfo | null;
  ownerType: 'user' | 'guest' | null;
  percent: number; // 0..100
  critical: boolean;
}

/**
 * UsagePill-Komponente für das Image Enhancer Tool.
 * 
 * Zeigt Quota-Verbrauch als Pill mit Progress-Bar an, unterstützt Ladezustand und kritische Warnung.
 * 
 * @param {UsagePillProps} props - Die Props für die Komponente.
 * @returns {JSX.Element} Die gerenderte Komponente.
 */
export function UsagePill({ label, loadingLabel, usage, ownerType, percent, critical }: UsagePillProps) {
  return (
    <div className={`inline-flex flex-col items-start ${usage ? '' : 'opacity-70'}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ring-1 ${
          critical
            ? 'bg-red-500/15 ring-red-400/30 text-red-600 dark:text-red-300'
            : 'bg-white/10 ring-cyan-400/10 text-gray-700 dark:text-gray-200'
        }`}
      >
        {label}: {usage ? `${usage.used}/${usage.limit}` : loadingLabel}
        {ownerType ? <span className="ml-1 opacity-70">({ownerType})</span> : null}
      </span>
      <span className="mt-1 block h-[2px] w-24 bg-white/10 rounded-full overflow-hidden">
        <span
          className={`block h-full ${critical ? 'bg-red-400/70' : 'bg-cyan-400/70'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}