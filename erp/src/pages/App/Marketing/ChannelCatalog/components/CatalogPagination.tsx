import React from 'react';

export function CatalogPagination({ state, actions }: { state: any, actions: any }) {
    const { page, totalCount, limit, loading } = state;
    const { setPage } = actions;

    const totalPages = Math.ceil(totalCount / limit);
    if (totalCount === 0) return null;

    return (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-4 shadow-premium-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Página {page + 1} de {totalPages || 1} <span className="mx-2">·</span> {totalCount} variações totais
            </span>
            <div className="flex gap-2">
                <button
                    disabled={page === 0 || loading}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                    <i className="bi bi-chevron-left mr-2" />
                    Anterior
                </button>
                <button
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                    Próxima
                    <i className="bi bi-chevron-right ml-2" />
                </button>
            </div>
        </div>
    );
}
