import React from 'react';
import Shipping from '../../../../types/Shipping.type';
import { summarizeOptionText } from './AlternativesAccordion';

interface SchedulingSummaryBoxProps {
  scheduleMode: 'defined' | 'alternatives';
  scheduling: Shipping['scheduling'];
  summaryDateText: string;
  summaryTimeText: string;
  alternatives: NonNullable<Shipping['scheduling']['alternatives']>;
}

export const SchedulingSummaryBox: React.FC<SchedulingSummaryBoxProps> = ({
  scheduleMode,
  scheduling,
  summaryDateText,
  summaryTimeText,
  alternatives,
}) => {
  const allOptions = [
    { option: scheduling, primary: true },
    ...alternatives.map((opt) => ({ option: opt, primary: false })),
  ];

  if (scheduleMode === 'defined') {
    return (
      <div
        data-testid="scheduling-summary"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3.5 flex flex-col gap-2"
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Resumo da programação
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-xs">
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

        {alternatives.length > 0 && (
          <div className="mt-1 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-1 text-[11px]">
            <span className="font-bold text-slate-500 dark:text-slate-400">
              Datas alternativas definidas ({alternatives.length}):
            </span>
            {alternatives.map((alt, idx) => (
              <div key={alt.id || idx} className="text-slate-700 dark:text-slate-300 font-semibold pl-2">
                • {idx + 1}ª alternativa: {summarizeOptionText(alt)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ order: (alternatives.length + 1) * 2 + 1 }}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/40"
    >
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Resumo da programação (Opções Informativas)
      </span>
      <div className="mt-2 flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
        {allOptions.map(({ option, primary }, index) => (
          <div key={index}>
            {index + 1}ª opção — {primary ? 'Principal' : 'Alternativa'}: {summarizeOptionText(option)}
          </div>
        ))}
      </div>
    </div>
  );
};
