export const containerCls = 'mx-auto max-w-4xl space-y-6';
export const cardVariant = 'holo' as const;
export const cardBodyCls = 'p-6';
export const sectionTitleCls = 'text-lg font-semibold mb-3';
export const mutedTextCls = 'text-gray-600 dark:text-gray-300';
export const smallMutedTextCls = 'text-sm text-gray-500 dark:text-gray-400';
export const usageBarBgCls = 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2';

export const usageBarFillCls = (percent: number): string => {
  const p = Math.max(0, Math.min(100, Math.floor(percent)));
  const color = p > 80 ? 'bg-red-500' : p > 50 ? 'bg-yellow-500' : 'bg-blue-500';
  return `h-2 rounded-full transition-all duration-300 ${color}`;
};
