import React from 'react';

const fieldValue = (value?: string | number | null) =>
  value === undefined || value === null || String(value).trim() === '' ? '—' : String(value);

export interface ReadOnlyFieldProps {
  label: string;
  value?: string | number | null;
  className?: string;
  helperText?: string;
}

export function ReadOnlyField({
  label,
  value,
  className = '',
  helperText,
}: ReadOnlyFieldProps) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {fieldValue(value)}
      </div>
      {helperText && (
        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </div>
      )}
    </div>
  );
}
