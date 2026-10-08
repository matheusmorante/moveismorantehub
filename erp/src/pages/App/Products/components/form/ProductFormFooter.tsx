import React from 'react';
import type { ProductDraftAutoSaveStatus } from '../../hooks/form/useProductFormDraft';

export interface ProductFormFooterProps {
  readonly isDraftProduct: boolean;
  readonly autoSaveStatus: ProductDraftAutoSaveStatus;
  readonly loading: boolean;
  readonly isAiProcessing: boolean;
  readonly isLastStep: boolean;
  readonly onClose: () => void;
  readonly onNextStep: () => void;
  readonly onSubmit: () => void;
}

/**
 * Rodapé com controles de ação do modal de cadastro/edição de produtos.
 */
export const ProductFormFooter: React.FC<ProductFormFooterProps> = ({
  isDraftProduct,
  autoSaveStatus,
  loading,
  isAiProcessing,
  isLastStep,
  onClose,
  onNextStep,
  onSubmit,
}) => {
  const isBusy = loading || isAiProcessing;

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0">
      <div className="flex items-center gap-2 w-full md:w-auto">
        {isDraftProduct && (
          <div
            role="status"
            aria-live="polite"
            aria-busy={autoSaveStatus === 'saving'}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 transition-colors ${
              autoSaveStatus === 'saving'
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30'
                : autoSaveStatus === 'saved'
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                  : autoSaveStatus === 'error'
                    ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
            }`}
          >
            <i
              aria-hidden="true"
              className={`bi text-sm ${
                autoSaveStatus === 'saving'
                  ? 'bi-arrow-repeat animate-spin text-amber-600 dark:text-amber-400'
                  : autoSaveStatus === 'saved'
                    ? 'bi-check-circle-fill text-emerald-600 dark:text-emerald-400'
                    : autoSaveStatus === 'error'
                      ? 'bi-exclamation-circle-fill text-rose-600 dark:text-rose-400'
                      : 'bi-cloud-check text-slate-500 dark:text-slate-400'
              }`}
            />
            <span className="text-[10px] font-bold tracking-wide text-slate-600 dark:text-slate-300">
              {autoSaveStatus === 'saving'
                ? 'Salvando rascunho...'
                : autoSaveStatus === 'saved'
                  ? 'Rascunho salvo'
                  : autoSaveStatus === 'error'
                    ? 'Falha ao salvar rascunho'
                    : 'Salvamento automático'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 flex-1 md:flex-initial text-center cursor-pointer"
        >
          {!isDraftProduct ? 'Descartar alterações' : 'Cancelar'}
        </button>

        {!isLastStep ? (
          <button
            type="button"
            onClick={onNextStep}
            className="px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-xl w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none cursor-pointer"
          >
            <span>Próxima etapa</span>
            <i className="bi bi-arrow-right text-sm" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isBusy}
            className="px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl w-full md:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none cursor-pointer"
          >
            {isBusy && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <i className="bi bi-check-circle-fill" />
            <span>
              {isAiProcessing
                ? 'IA Processando...'
                : isDraftProduct
                  ? 'Cadastrar produto'
                  : 'Salvar alterações'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
