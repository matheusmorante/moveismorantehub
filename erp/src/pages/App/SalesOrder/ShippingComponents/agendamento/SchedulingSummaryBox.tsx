import React from 'react';

interface SchedulingSummaryBoxProps {
  summaryDateText: string;
  summaryTimeText: string;
}

export const SchedulingSummaryBox: React.FC<SchedulingSummaryBoxProps> = ({
  summaryDateText,
  summaryTimeText,
}) => (
  <div
    data-testid="scheduling-summary"
    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40"
  >
    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
      Resumo da programação
    </span>
    <div className="flex flex-col gap-1 text-[13px] sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-slate-500 dark:text-slate-400">Data:</span>
        <span
          data-testid="scheduling-summary-date"
          className={`font-bold ${
            summaryDateText === 'Não definido'
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          {summaryDateText}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-slate-500 dark:text-slate-400">Horário:</span>
        <span
          data-testid="scheduling-summary-time"
          className={`font-bold ${
            summaryTimeText === 'Não definido'
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          {summaryTimeText}
        </span>
      </div>
    </div>
  </div>
);
