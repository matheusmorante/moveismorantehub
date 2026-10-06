import React from 'react';
import { getFiscalDocumentStatusLabel } from '@/pages/utils/nfe/fiscalIssuePresentation';

interface FiscalDocumentStatusBadgeProps {
  status: string;
}

export const FiscalDocumentStatusBadge: React.FC<FiscalDocumentStatusBadgeProps> = ({
  status,
}) => {
  const badgeClass = 'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold';

  switch (status) {
    case 'autorizada':
      return (
        <span
          className={`${badgeClass} border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}
        >
          Autorizada
        </span>
      );
    case 'cancelada':
      return (
        <span
          className={`${badgeClass} border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300`}
        >
          Cancelada
        </span>
      );
    case 'rejeitada':
      return (
        <span
          className={`${badgeClass} border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300`}
        >
          Rejeitada
        </span>
      );
    case 'abandoned':
      return (
        <span
          className={`${badgeClass} border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300`}
        >
          Tentativa encerrada
        </span>
      );
    default:
      return (
        <span
          className={`${badgeClass} border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400`}
        >
          {getFiscalDocumentStatusLabel(status)}
        </span>
      );
  }
};
