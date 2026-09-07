import React from 'react';

interface ProductBulkActionsToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkTrash: () => void;
    onBulkRestore: () => void;
}

export function ProductBulkActionsToolbar({
    selectedCount,
    onClearSelection,
    onBulkTrash,
    onBulkRestore,
}: ProductBulkActionsToolbarProps) {
    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 flex items-center justify-between shadow-sm animate-slide-up sticky top-2 z-10">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {selectedCount} <span className="hidden sm:inline">selecionado(s)</span>
            </span>
            <div className="flex items-center gap-2 md:gap-3">
                <button onClick={onClearSelection} className="bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[10px] md:text-xs font-bold px-2 md:px-3 py-1.5 rounded-lg transition-colors">
                    Sair
                </button>
                <button onClick={onBulkTrash} className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2">
                    <i className="bi bi-power" />
                    <span className="hidden sm:inline">Desativar Selecionados</span>
                    <span className="sm:hidden">Desativar</span>
                </button>
                <button onClick={onBulkRestore} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold">
                    <i className="bi bi-check-circle-fill" />
                    <span className="hidden sm:inline">Ativar Selecionados</span>
                    <span className="sm:hidden">Ativar</span>
                </button>
            </div>
        </div>
    );
}
