import React from 'react';

export interface ProductFormFooterProps {
    readonly isDraftProduct: boolean;
    readonly canSaveDraft: boolean;
    readonly isSavingDraft: boolean;
    readonly loading: boolean;
    readonly isAiProcessing: boolean;
    readonly isLastStep: boolean;
    readonly onSaveDraft: () => void;
    readonly onClose: () => void;
    readonly onNextStep: () => void;
    readonly onSubmit: () => void;
}

/**
 * Rodapé com controles de ação do modal de cadastro/edição de produtos.
 */
export const ProductFormFooter: React.FC<ProductFormFooterProps> = ({
    isDraftProduct,
    canSaveDraft,
    isSavingDraft,
    loading,
    isAiProcessing,
    isLastStep,
    onSaveDraft,
    onClose,
    onNextStep,
    onSubmit
}) => {
    const isBusy = loading || isAiProcessing;

    return (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 w-full md:w-auto">
                {isDraftProduct && (
                    <button
                        type="button"
                        onClick={onSaveDraft}
                        disabled={!canSaveDraft || loading || isSavingDraft}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
                        title={!canSaveDraft ? "Informe o nome do produto para permitir salvar o rascunho" : "Salvar rascunho para continuar o cadastro posteriormente"}
                    >
                        {isSavingDraft ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <i className="bi bi-bookmark-fill text-slate-500 dark:text-slate-400" />
                        )}
                        <span>Salvar rascunho</span>
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 flex-1 md:flex-initial text-center cursor-pointer"
                >
                    {!isDraftProduct ? "Descartar alterações" : "Cancelar"}
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
                        {isBusy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        <i className="bi bi-check-circle-fill" />
                        <span>
                            {isAiProcessing
                                ? "IA Processando..."
                                : isDraftProduct
                                ? "Cadastrar produto"
                                : "Salvar alterações"}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};
