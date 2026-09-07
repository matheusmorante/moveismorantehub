import React from 'react';
import { buildDraftAnalysisChips, DraftAnalysisChip } from '../../pages/utils/draftAnalysisChips';
import type { ParsedFinancialIntent } from '../../../../mobile/src/services/financial/financialTypes';

interface Props {
  draft?: ParsedFinancialIntent | null;
  className?: string;
}

export const RealtimeDraftChips: React.FC<Props> = ({ draft, className = '' }) => {
  const chips = buildDraftAnalysisChips(draft);

  if (chips.length === 0) return null;

  return (
    <div className={`mt-2 mb-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`}>
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold tracking-wider uppercase text-purple-600 dark:text-purple-400">
        <span>✦</span>
        <span>Análise em Tempo Real</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const style = getChipStyle(chip.type);
          return (
            <span
              key={chip.id}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors ${style}`}
            >
              {chip.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const getChipStyle = (type: DraftAnalysisChip['type']): string => {
  switch (type) {
    case 'expense':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
    case 'income':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    case 'loan':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-300 border-dashed dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
  }
};
