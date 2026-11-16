import React from 'react';

type ScheduleMode = 'fixed' | 'period';

interface ScheduleModeToggleProps {
  mode: ScheduleMode;
  specificLabel: string;
  ariaLabel: string;
  disabled?: boolean;
  onChange: (mode: ScheduleMode) => void;
}

export const ScheduleModeToggle: React.FC<ScheduleModeToggleProps> = ({
  mode,
  specificLabel,
  ariaLabel,
  disabled = false,
  onChange,
}) => (
  <div
    className="flex shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
    role="group"
    aria-label={ariaLabel}
  >
    {(['fixed', 'period'] as const).map((option) => {
      const isSelected = mode === option;
      return (
        <button
          key={option}
          type="button"
          aria-pressed={isSelected}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs ${
            isSelected
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {option === 'fixed' ? specificLabel : 'Período'}
        </button>
      );
    })}
  </div>
);
