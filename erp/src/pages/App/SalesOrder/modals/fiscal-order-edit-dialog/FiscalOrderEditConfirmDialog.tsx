import React from 'react';
import type { FiscalOrderEditConfirmDialogProps } from './types';
import { FiscalOrderEditPolicyAlert } from './FiscalOrderEditPolicyAlert';
import { FiscalOrderEditDocumentsList } from './FiscalOrderEditDocumentsList';
import { FiscalOrderEditFieldDiff } from './FiscalOrderEditFieldDiff';
import type { FiscalOrderEditChange } from '@/pages/utils/nfe/orderEditFiscalService';

export const FiscalOrderEditConfirmDialog: React.FC<FiscalOrderEditConfirmDialogProps> = ({
  audit,
  isConfirmingFiscalEdit,
  onCancel,
  onConfirm,
  onNavigateToReturns,
}) => {
  const isBlocked = audit.status === 'blocked';
  const isProduction = audit.documents.some((document) => document.environment === 1);

  // Agrupa as alterações fiscais
  const changesToDisplay: FiscalOrderEditChange[] =
    audit.changes.length > 0 ? audit.changes : audit.documents.flatMap((doc) => doc.changes);

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fiscal-order-edit-title"
    >
      <section className="flex flex-col max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Cabeçalho e Política Zero CC-e */}
        <FiscalOrderEditPolicyAlert
          isBlocked={isBlocked}
          isProduction={isProduction}
          error={audit.error}
        />

        {/* Corpo do Modal com Rolagem */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Documentos fiscais vinculados e procedimentos legais */}
          <FiscalOrderEditDocumentsList
            documents={audit.documents}
            generalError={audit.error}
          />

          {/* Comparativo detalhado dos campos fiscais alterados */}
          <FiscalOrderEditFieldDiff changes={changesToDisplay} />

          {/* Nota de Rastreabilidade e Regras SEFAZ-PR */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 space-y-1.5">
            <p className="flex items-start gap-1.5">
              <i className="bi bi-journal-check text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Rastreabilidade garantida:</strong> A nota original permanecerá registrada de forma imutável com seu XML, protocolo de autorização e histórico, vinculada ao cancelamento/estorno e à eventual nova nota.
              </span>
            </p>
            <p className="flex items-start gap-1.5">
              <i className="bi bi-exclamation-circle text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Aviso mandatório SEFAZ-PR:</strong> Cancelar ou estornar uma NF-e não significa automaticamente que será permitido emitir outra. O procedimento depende da circulação da mercadoria, do prazo legal, do modelo fiscal (55 ou 65) e das regras da SEFAZ do Paraná.
              </span>
            </p>
          </div>
        </div>

        {/* Rodapé com Ações Permitidas */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            disabled={isConfirmingFiscalEdit}
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          >
            {isBlocked ? 'Voltar à edição (manter dados originais)' : 'Voltar à edição'}
          </button>

          {isBlocked && onNavigateToReturns && (
            <button
              type="button"
              onClick={onNavigateToReturns}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700"
            >
              Ir para Devoluções
            </button>
          )}

          {!isBlocked && (
            <button
              type="button"
              disabled={isConfirmingFiscalEdit}
              onClick={onConfirm}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60 flex items-center gap-2"
            >
              {isConfirmingFiscalEdit && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isConfirmingFiscalEdit
                ? 'Confirmando substituição fiscal…'
                : 'Confirmar substituição fiscal'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
