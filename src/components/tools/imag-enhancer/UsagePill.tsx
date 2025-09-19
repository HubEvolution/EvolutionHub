import type { UsageInfo } from './types';

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
 * @param props Die Props für die Komponente.
 * @returns Die gerenderte Komponente.
 */
export function UsagePill({ label, loadingLabel, usage, ownerType, percent, critical }: UsagePillProps) {
  // Build a concise tooltip string without adding new props
  const tooltip = (() => {
    if (!usage) return loadingLabel;
    const parts: string[] = [];
    parts.push(`${label}: ${usage.used}/${usage.limit}`);
    if (typeof usage.resetAt === 'number' && Number.isFinite(usage.resetAt)) {
      try {
        const d = new Date(usage.resetAt);
        // Prefer locale-aware formatting where available, fallback to stable ISO-like
        let ts = '';
        try {
          const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';
          ts = d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch {
          // ignore, will fallback below
        }
        if (!ts) {
          ts = `${d.getFullYear()}-${(d.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${d
            .getDate()
            .toString()
            .padStart(2, '0')} ${d
            .getHours()
            .toString()
            .padStart(2, '0')}:${d
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
        }
        parts.push(`reset: ${ts}`);
      } catch {
        // ignore formatting errors
      }
    }
    if (ownerType) parts.push(`owner: ${ownerType}`);
    return parts.join(' · ');
  })();
  return (
    <div className={`inline-flex flex-col items-start ${usage ? '' : 'opacity-70'}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ring-1 ${
          critical
            ? 'bg-red-500/15 ring-red-400/30 text-red-600 dark:text-red-300'
            : 'bg-white/10 ring-cyan-400/10 text-gray-700 dark:text-gray-200'
        }`}
        title={tooltip}
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