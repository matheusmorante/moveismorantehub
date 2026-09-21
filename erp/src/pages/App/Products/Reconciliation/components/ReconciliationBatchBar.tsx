import React from 'react';

interface Props {
    selectedCount: number;
    totalFilteredCount: number;
    isAllFilteredSelected: boolean;
    onOpenSupplierModal: () => void;
    onOpenCategoryModal: () => void;
    onOpenNcmModal: () => void;
    onOpenAttributeModal?: () => void;
    isAttributeBatchCompatible?: boolean;
    onClearSelection: () => void;
}

export const ReconciliationBatchBar: React.FC<Props> = ({
    selectedCount,
    totalFilteredCount,
    isAllFilteredSelected,
    onOpenSupplierModal,
    onOpenCategoryModal,
    onOpenNcmModal,
    onOpenAttributeModal,
    isAttributeBatchCompatible = false,
    onClearSelection
}) => {
    if (selectedCount === 0) return null;

    const countToDisplay = isAllFilteredSelected ? totalFilteredCount : selectedCount;

    return (
        <div className="sticky top-4 z-40 mb-6 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-6 py-3.5 rounded-3xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
            <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-purple-500/30 text-purple-300 flex items-center justify-center font-black text-xs">
                    {countToDisplay}
                </span>
                <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-100">
                        {countToDisplay} {countToDisplay === 1 ? 'produto selecionado' : 'produtos selecionados'}
                    </p>
                    {isAllFilteredSelected && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-md">
                            Todos do filtro
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-400 tracking-wider transition-colors ml-2"
                >
                    Desmarcar
                </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={onOpenSupplierModal}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                    <i className="bi bi-truck text-xs"></i>
                    Fornecedor
                </button>

                <button
                    type="button"
                    onClick={onOpenCategoryModal}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
                >
                    <i className="bi bi-tag text-xs"></i>
                    Categoria
                </button>

                <button
                    type="button"
                    onClick={onOpenNcmModal}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
                >
                    <i className="bi bi-file-earmark-text text-xs"></i>
                    NCM
                </button>

                {onOpenAttributeModal && (
                    <button
                        type="button"
                        onClick={onOpenAttributeModal}
                        disabled={!isAttributeBatchCompatible}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                            isAttributeBatchCompatible
                                ? 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/50 active:scale-95'
                                : 'bg-slate-800/40 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed'
                        }`}
                        title={
                            isAttributeBatchCompatible
                                ? 'Definir atributo em lote para produtos compatíveis'
                                : 'Atributos em lote requerem que todos os produtos selecionados pertençam à mesma categoria'
                        }
                    >
                        <i className="bi bi-ui-radios text-xs"></i>
                        Atributo
                    </button>
                )}
            </div>
        </div>
    );
};
