import React from 'react';

export interface ReceiptsPaginationProps {
    readonly currentPage: number;
    readonly totalPages: number;
    readonly totalItems: number;
    readonly itemsPerPage?: number;
    readonly onPageChange: (page: number) => void;
    readonly loading?: boolean;
    readonly itemName?: string;
}

export const ReceiptsPagination: React.FC<ReceiptsPaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 15,
    onPageChange,
    loading = false,
    itemName = 'recebimentos'
}) => {
    if (totalItems === 0) return null;

    const startIndex = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <nav
            role="navigation"
            aria-label="Paginação de recebimentos"
            className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm mt-4 mb-2"
        >
            {/* Informações de contagem */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                {loading && (
                    <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
                )}
                <span>
                    Exibindo <span className="text-slate-800 dark:text-slate-200 font-extrabold">{startIndex}-{endIndex}</span> de <span className="text-slate-800 dark:text-slate-200 font-extrabold">{totalItems}</span> {itemName}
                </span>
                <span className="hidden md:inline-block text-slate-300 dark:text-slate-700" aria-hidden="true">•</span>
                <span className="hidden md:inline-block text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                    ({itemsPerPage} por página)
                </span>
            </div>

            {/* Controles de Navegação */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Botão Anterior */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="Página Anterior"
                >
                    <i className="bi bi-chevron-left text-[11px]" />
                    <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de Página */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, idx) => {
                        if (pageNum === '...') {
                            return (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400 select-none"
                                >
                                    ...
                                </span>
                            );
                        }

                        const isCurrent = pageNum === currentPage;
                        return (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => onPageChange(Number(pageNum))}
                                disabled={loading}
                                aria-current={isCurrent ? 'page' : undefined}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    isCurrent
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Botão Próximo */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="Próxima Página"
                >
                    <span className="hidden sm:inline">Próximo</span>
                    <i className="bi bi-chevron-right text-[11px]" />
                </button>
            </div>
        </nav>
    );
};
