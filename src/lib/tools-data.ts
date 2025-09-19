export type ToolCategory = 'all' | 'ai' | 'development' | 'design' | 'productivity' | 'marketing';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory[];
  iconKey: string;
  color: string;
  url: string;
  isNew?: boolean;
  isPopular?: boolean;
  comingSoon?: boolean;
}

import { getI18n } from '@/utils/i18n';
import type { Locale } from '@/lib/i18n';

export function getAllTools(locale: Locale): Tool[] {
  const t = getI18n(locale);
  return [
    {
      id: 'code-review',
      name: t('pages.tools.items.code-review.name'),
      description: t('pages.tools.items.code-review.description'),
      category: ['ai', 'development'],
      iconKey: 'laptop',
      color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      url: '/tools/code-review',
      isPopular: true,
      comingSoon: true
    },
    {
      id: 'design-system',
      name: t('pages.tools.items.design-system.name'),
      description: t('pages.tools.items.design-system.description'),
      category: ['design', 'productivity'],
      iconKey: 'palette',
      color: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      url: '/tools/design-system',
      isNew: true,
      comingSoon: true
    },
    {
      id: 'seo-analyzer',
      name: t('pages.tools.items.seo-analyzer.name'),
      description: t('pages.tools.items.seo-analyzer.description'),
      category: ['marketing', 'ai'],
      iconKey: 'search',
      color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      url: '/tools/seo-analyzer',
      isPopular: true,
      comingSoon: true
    },
    {
      id: 'api-tester',
      name: t('pages.tools.items.api-tester.name'),
      description: t('pages.tools.items.api-tester.description'),
      category: ['development'],
      iconKey: 'rocket',
      color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      url: '/tools/api-tester',
      comingSoon: true
    },
    {
      id: 'content-generator',
      name: t('pages.tools.items.content-generator.name'),
      description: t('pages.tools.items.content-generator.description'),
      category: ['ai', 'marketing'],
      iconKey: 'edit',
      color: 'bg-pink-100 dark:bg-pink-900 text-pink-800',
      url: '/tools/content-generator',
      isNew: true,
      comingSoon: true
    },
    {
      id: 'performance-monitor',
      name: t('pages.tools.items.performance-monitor.name'),
      description: t('pages.tools.items.performance-monitor.description'),
      category: ['development', 'productivity'],
      iconKey: 'chart',
      color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
      url: '/tools/performance-monitor',
      comingSoon: true
    },
    {
      id: 'Imag-Enhancer',
      name: t('pages.tools.items.Imag-Enhancer.name'),
      description: t('pages.tools.items.Imag-Enhancer.description'),
      category: ['development'],
      iconKey: 'tool',
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      url: '/tools/imag-enhancer/app',
      isNew: true,
      isPopular: false,
      comingSoon: false
{
  id: 'prompt-enhancer',
  name: t('pages.tools.items.prompt-enhancer.name'),
  description: t('pages.tools.items.prompt-enhancer.description'),
  category: ['ai'],
  iconKey: 'edit',
  color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
  url: '/tools/prompt-enhancer',
  isNew: true,
  comingSoon: false
},
    }
  ];
}

export function getToolCategories(locale: Locale): { id: ToolCategory; name: string }[] {
  const t = getI18n(locale);
  return [
    { id: 'all', name: t('pages.tools.categories.all') },
    { id: 'ai', name: t('pages.tools.categories.ai') },
    { id: 'development', name: t('pages.tools.categories.development') },
    { id: 'design', name: t('pages.tools.categories.design') },
    { id: 'productivity', name: t('pages.tools.categories.productivity') },
    { id: 'marketing', name: t('pages.tools.categories.marketing') }
  ];
}
