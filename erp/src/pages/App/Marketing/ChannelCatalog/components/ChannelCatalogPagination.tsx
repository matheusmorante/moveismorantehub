import React from 'react';

interface ChannelCatalogPaginationProps {
    currentPage: number;
    totalPages: number;
    loading: boolean;
    onPageChange: (page: number) => void;
}

export const ChannelCatalogPagination: React.FC<ChannelCatalogPaginationProps> = ({
    currentPage,
    totalPages,
    loading,
    onPageChange,
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-4 mt-6">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="w-12 h-12 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                title="Página Anterior"
            >
                <i className="bi bi-chevron-left" />
            </button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Página <span className="text-blue-600 font-bold">{currentPage}</span> de {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="w-12 h-12 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                title="Próxima Página"
            >
                <i className="bi bi-chevron-right" />
            </button>
        </div>
    );
};
