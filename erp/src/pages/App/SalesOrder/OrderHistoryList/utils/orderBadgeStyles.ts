export const binaryOrderBadgeClass = (active: boolean): string =>
  active
    ? 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'
    : 'border-slate-500 bg-slate-400 text-white hover:bg-slate-500 dark:border-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500';

export const orderBadgeIndicatorClass =
  'absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900';

export const orderBadgeIndicatorIconClass = 'text-[9px] leading-none';

export const orderBadgeIndicatorColorClass = (icon: string, fallback: string): string =>
  icon === 'bi-check'
    ? 'bg-emerald-700 text-white'
    : icon === 'bi-x'
      ? 'bg-red-700 text-white'
      : fallback;
