import React, { memo } from 'react';

interface TimelineDatePillProps {
  label: string;
}

export const TimelineDatePill: React.FC<TimelineDatePillProps> = memo(({ label }) => (
  <div className="flex justify-center my-3 sticky top-2 z-10 select-none">
    <span className="px-3 py-1 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 text-[11px] font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
      {label}
    </span>
  </div>
));

TimelineDatePill.displayName = 'TimelineDatePill';
