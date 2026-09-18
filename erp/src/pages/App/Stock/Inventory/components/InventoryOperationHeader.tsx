import React from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";

interface InventoryOperationHeaderProps {
    readonly inventoryName: string;
    readonly items: readonly AuditItem[];
    readonly mode: 'scanner' | 'manual';
    readonly setMode: (mode: 'scanner' | 'manual') => void;
    readonly onClose?: () => void;
}

export const InventoryOperationHeader: React.FC<InventoryOperationHeaderProps> = ({
    inventoryName,
    items,
    mode,
    setMode,
    onClose,
}) => {
    const countedItems = items.filter((i) => i.physicalCount !== null);
    const progressPercent = items.length > 0 ? Math.round((countedItems.length / items.length) * 100) : 0;

    return (
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="hidden md:flex w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 items-center justify-center shrink-0">
                        <i className="bi bi-clipboard-data text-xl"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 dark:text-slate-100 truncate text-lg">{inventoryName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                <span className="text-emerald-600 dark:text-emerald-400">{countedItems.length}</span> / {items.length} contados
                            </div>
                            <div className="flex-1 max-w-[120px] h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <div className="text-xs font-bold text-slate-400">{progressPercent}%</div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => setMode('manual')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${mode === 'manual' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <i className="bi bi-hand-index-thumb text-lg"></i>
                            Manual
                        </button>
                        <button
                            onClick={() => setMode('scanner')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${mode === 'scanner' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <i className="bi bi-upc-scan text-lg"></i>
                            Scanner
                        </button>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-sm transition-colors py-2.5"
                            title="Sair do inventário"
                        >
                            Voltar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
