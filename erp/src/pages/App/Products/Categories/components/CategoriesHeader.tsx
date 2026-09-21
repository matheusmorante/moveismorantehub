import React from 'react';
import { ActiveViewType } from '../types/categoryEnvironment.types';

interface CategoriesHeaderProps {
    readonly onNewEnvironment: () => void;
    readonly onNewCategory: () => void;
    readonly activeView: ActiveViewType;
    readonly onViewChange: (view: ActiveViewType) => void;
    readonly totalOrphans: number;
    readonly onViewOrphans?: () => void;
    readonly searchTerm: string;
    readonly onSearchChange: (val: string) => void;
}

export const CategoriesHeader: React.FC<CategoriesHeaderProps> = ({
    onNewEnvironment,
    onNewCategory,
    activeView,
    onViewChange,
    totalOrphans,
    onViewOrphans,
    searchTerm,
    onSearchChange
}) => {
    const searchPlaceholder = activeView === 'ambiente' ? 'Buscar ambiente...' : 'Buscar categoria...';

    return (
        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            {/* Topo: Título e Botões de Ação */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                        <i className="bi bi-tag-fill text-blue-600 text-lg sm:text-xl" />
                        Ambientes e Categorias
                    </h1>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Organize onde cada categoria de produto é utilizada.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={onNewEnvironment}
                        data-testid="btn-new-environment"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                        <i className="bi bi-plus-lg text-xs" />
                        Novo ambiente
                    </button>
                    <button
                        type="button"
                        onClick={onNewCategory}
                        data-testid="btn-new-category"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                        <i className="bi bi-plus-lg text-xs" />
                        Nova categoria
                    </button>
                </div>
            </div>

            {/* Alerta compacto exclusivo para pendências (só aparece se houver órfãs) */}
            {totalOrphans > 0 && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill text-amber-500 shrink-0 text-xs" />
                        <span>
                            <strong>{totalOrphans}</strong> {totalOrphans === 1 ? 'categoria sem ambiente vinculado' : 'categorias sem ambiente vinculado'}.
                        </span>
                    </div>
                    {onViewOrphans && (
                        <button
                            type="button"
                            onClick={onViewOrphans}
                            className="font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 text-xs cursor-pointer bg-transparent border-0 p-0 shrink-0"
                        >
                            Ver categorias &rarr;
                        </button>
                    )}
                </div>
            )}

            {/* Linha de Controle: Abas à esquerda e Busca à direita no mesmo nível */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-fit border border-slate-200/60 dark:border-slate-700/60">
                    <button
                        type="button"
                        onClick={() => onViewChange('ambiente')}
                        data-testid="tab-view-ambiente"
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            activeView === 'ambiente'
                                ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <i className="bi bi-grid-fill text-xs" />
                        Por ambiente
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange('categoria')}
                        data-testid="tab-view-categoria"
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            activeView === 'categoria'
                                ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <i className="bi bi-list-ul text-xs" />
                        Categorias
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <i className="bi bi-search absolute left-3 top-2 text-xs text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                </div>
            </div>
        </div>
    );
};
