export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_BASE = [
  'inline-flex items-center justify-center font-medium rounded-lg',
  'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
  'cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-gradient-to-br from-primary-500 via-primary-400 to-primary-300 hover:from-primary-400 hover:via-primary-300 hover:to-primary-200 active:brightness-95 focus:ring-primary-200/70 shadow-[0_12px_30px_-15px_rgba(6,182,212,0.8)] dark:from-primary-400 dark:via-primary-500 dark:to-primary-600 dark:hover:via-primary-400 dark:focus:ring-primary-500/60',
  secondary:
    'text-white bg-gradient-to-br from-secondary-500 via-secondary-400 to-primary-400 hover:from-secondary-400 hover:via-secondary-300 hover:to-primary-300 active:brightness-95 focus:ring-secondary-200/70 shadow-[0_12px_28px_-16px_rgba(16,185,129,0.75)] dark:from-secondary-500 dark:via-secondary-400 dark:to-primary-500 dark:hover:via-secondary-300 dark:focus:ring-secondary-400/60',
  outline:
    'border border-transparent text-transparent bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 bg-clip-text shadow-[0_0_0_1px_rgba(15,118,110,0.35)] hover:shadow-[0_0_0_1px_rgba(13,148,136,0.55)] focus:ring-primary-200/60 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.35)] dark:hover:shadow-[0_0_0_1px_rgba(45,212,191,0.55)] dark:text-transparent',
  ghost:
    'text-primary-700 bg-gradient-to-br from-primary-500/15 via-primary-500/10 to-secondary-500/15 hover:from-primary-500/25 hover:via-primary-500/15 hover:to-secondary-500/25 active:bg-transparent focus:ring-primary-200/50 dark:text-primary-100 dark:from-primary-400/20 dark:via-primary-400/15 dark:to-secondary-500/20 dark:hover:from-primary-400/30 dark:hover:to-secondary-500/30 dark:focus:ring-primary-400/50',
  link: 'bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent underline-offset-4 hover:from-primary-300 hover:to-secondary-300 hover:underline focus:ring-0 dark:from-primary-300 dark:to-secondary-300 dark:hover:from-primary-200 dark:hover:to-secondary-200',
  accent:
    'text-white bg-gradient-to-br from-secondary-500 via-primary-500 to-primary-400 hover:brightness-[1.08] active:brightness-95 focus:ring-primary-200/70 shadow-[0_14px_35px_-18px_rgba(45,212,191,0.65)] dark:focus:ring-primary-400/70',
};
