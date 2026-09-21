import React from 'react';
import { ReconciliationSummary, ReconciliationFilterState, PendencyType } from '../types/reconciliation.types';

interface Props {
    summary: ReconciliationSummary;
    currentFilter: ReconciliationFilterState;
    onSelectChip: (type: PendencyType | 'all' | 'attributes') => void;
    onToggleCriticalOnly?: () => void;
}

export const ReconciliationSummaryHeader: React.FC<Props> = ({
    summary,
    currentFilter,
    onSelectChip,
    onToggleCriticalOnly
}) => {
    const activeChip = currentFilter.pendencyType || 'all';

    const chips: Array<{ id: PendencyType | 'all' | 'attributes'; label: string; count: number; icon: string }> = [
        { id: 'all', label: 'Todos', count: summary.chipCounts.all, icon: 'bi-grid-fill' },
        { id: 'supplier', label: 'Fornecedor', count: summary.chipCounts.supplier, icon: 'bi-truck' },
        { id: 'category', label: 'Categoria', count: summary.chipCounts.category, icon: 'bi-tag-fill' },
        { id: 'ncm', label: 'NCM', count: summary.chipCounts.ncm, icon: 'bi-file-earmark-text' },
        { id: 'attributes', label: 'Atributos', count: summary.chipCounts.attributes, icon: 'bi-ui-radios' },
        { id: 'price', label: 'Preço', count: summary.chipCounts.price, icon: 'bi-currency-dollar' }
    ];

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Topo: Título & Subtítulo + Cards Resumo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <i className="bi bi-shield-check text-base"></i>
                        </span>
                        Conciliação de Produtos
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        Corrija campos obrigatórios e inconsistências do cadastro.
                    </p>
                </div>

                {/* Métricas Compactas */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {summary.totalPendingProducts}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            produtos
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {summary.totalPendencies}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            pendências
                        </span>
                    </div>

                    {summary.totalCritical > 0 && (
                        <button
                            type="button"
                            onClick={onToggleCriticalOnly}
                            className={`border px-3.5 py-2 rounded-2xl flex items-center gap-2 transition-all shadow-sm ${
                                currentFilter.onlyCritical
                                    ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-500/20'
                                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:bg-rose-100'
                            }`}
                            title="Filtrar apenas pendências críticas"
                        >
                            <i className="bi bi-exclamation-triangle-fill text-xs"></i>
                            <span className="text-xs font-black">{summary.totalCritical}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider">críticos</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Chips Rápidos de Filtro */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {chips.map(chip => {
                    const isActive = activeChip === chip.id;
                    return (
                        <button
                            key={chip.id}
                            type="button"
                            onClick={() => onSelectChip(chip.id)}
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 ${
                                isActive
                                    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <i className={`bi ${chip.icon} text-xs`}></i>
                            <span>{chip.label}</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                {chip.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
