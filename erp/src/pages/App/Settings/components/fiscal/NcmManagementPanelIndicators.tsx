import React from 'react';

export function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value?: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${warning ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black ${warning ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}`}
      >
        {value?.toLocaleString('pt-BR') ?? '—'}
      </p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const classes =
    status === 'Vigente'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : status === 'Futuro'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
        : status === 'Não verificado'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${classes}`}>
      {status}
    </span>
  );
}
