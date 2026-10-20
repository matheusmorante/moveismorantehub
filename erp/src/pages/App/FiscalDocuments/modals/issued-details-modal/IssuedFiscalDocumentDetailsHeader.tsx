import React from 'react';
import { FiscalDocumentStatusBadge } from '../../components/FiscalDocumentStatusBadge';
import type { FiscalOperationDraftSummary, NfeDocumentRecord } from '../../types/fiscalDocuments.types';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

interface IssuedFiscalDocumentDetailsHeaderProps {
  title: string;
  isEstorno: boolean;
  isDevolucao: boolean;
  environment: number;
  operationDraft?: FiscalOperationDraftSummary;
  isEstornada: boolean;
  status: string;
  documentNumberLabel: string;
  visibleDocument?: NfeDocumentRecord;
  visibleDocumentNumber?: number | null;
  emissionResult?: NfeEmissionResult;
  orderNumber?: number | string | null;
  onClose: () => void;
}

export const IssuedFiscalDocumentDetailsHeader: React.FC<IssuedFiscalDocumentDetailsHeaderProps> = ({
  title,
  isEstorno,
  isDevolucao,
  environment,
  operationDraft,
  isEstornada,
  status,
  documentNumberLabel,
  visibleDocument,
  visibleDocumentNumber,
  emissionResult,
  orderNumber,
  onClose,
}) => {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="issued-fiscal-details-title"
            className="text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg"
          >
            {isEstorno
              ? 'Detalhes da nota fiscal de estorno fiscal'
              : isDevolucao
              ? 'Detalhes da nota fiscal de devolução fiscal'
              : 'Detalhes da nota fiscal'}
          </h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              environment === 2
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            }`}
          >
            {environment === 2 ? 'Homologação' : 'Produção'}
          </span>
          {operationDraft && ['draft', 'ready'].includes(operationDraft.status) ? (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Rascunho em revisão</span>
          ) : isEstornada ? (
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Estornada
            </span>
          ) : (
            <FiscalDocumentStatusBadge status={status} />
          )}
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {title} {documentNumberLabel}
          {!operationDraft || visibleDocumentNumber
            ? ` · Série ${visibleDocument?.serie || emissionResult?.series || '1'}`
            : ''}
          {orderNumber ? ` · Pedido #${orderNumber}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <i className="bi bi-x-lg" />
      </button>
    </header>
  );
};
