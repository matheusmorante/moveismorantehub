export const dropdownClass =
  'absolute top-[calc(100%-8px)] left-0 w-[280px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-premium-lg p-2 flex flex-col gap-0.5 animate-reveal z-[99999]';

export const navLinkClass =
  'flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm rounded-2xl transition-all duration-300 font-bold text-[11px] whitespace-nowrap active:scale-95';

export const menuBtnClass = (isActive: boolean, isBeta?: boolean): string =>
  `flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 font-bold text-[11px] whitespace-nowrap active:scale-95 ${
    isActive
      ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-premium-sm'
      : isBeta
        ? 'text-slate-300 dark:text-slate-600 grayscale hover:text-slate-400 opacity-60'
        : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm'
  }`;

export const chevronClass = (isActive: boolean): string =>
  `bi bi-chevron-down transition-transform text-[10px] ${isActive ? 'rotate-180' : ''}`;
