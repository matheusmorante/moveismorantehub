import React from 'react';
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';

interface QuotaNumberFieldProps {
  id: string;
  label: string;
  hint: string;
  error?: FieldError;
  registerProps: UseFormRegisterReturn;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: number;
  max?: number;
}

export const QuotaNumberField: React.FC<QuotaNumberFieldProps> = ({
  id,
  label,
  hint,
  error,
  registerProps,
  disabled = false,
  prefix,
  suffix,
  step,
  min,
  max,
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          {...registerProps}
          className={`w-full ${prefix ? 'pl-8' : 'px-3'} ${suffix ? 'pr-8' : 'pr-3'} py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
        {suffix && (
          <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500">{error.message}</p>}
      <p className="text-[11px] text-slate-400">{hint}</p>
    </div>
  );
};
