import React from "react";

interface OrderPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

const OrderPagination: React.FC<OrderPaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 30,
    onPageChange,
    loading = false
}) => {
    if (totalItems === 0) return null;

    const generatePageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        }

        pages.push(1);

        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) {
            start = 2;
            end = Math.min(totalPages - 1, 4);
        } else if (currentPage >= totalPages - 2) {
            start = Math.max(2, totalPages - 3);
            end = totalPages - 1;
        }

        if (start > 2) {
            pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);
        return pages;
    };

    const pageNumbers = generatePageNumbers();
    const startIndex = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm mt-4 mb-2">
            {/* Informações de contagem */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                {loading && (
                    <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <span>
                    Exibindo <span className="text-slate-800 dark:text-slate-200 font-extrabold">{startIndex}-{endIndex}</span> de <span className="text-slate-800 dark:text-slate-200 font-extrabold">{totalItems}</span> pedidos
                </span>
                <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">•</span>
                <span className="hidden md:inline-block text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                    (30 por página)
                </span>
            </div>

            {/* Controles de Navegação */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Botão Anterior */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs active:scale-95"
                    title="Página Anterior"
                >
                    <i className="bi bi-chevron-left text-[11px]" />
                    <span className="hidden xs:inline">Anterior</span>
                </button>

                {/* Páginas numéricas */}
                <div className="flex items-center gap-1">
                    {pageNumbers.map((page, idx) => {
                        if (typeof page === 'string') {
                            return (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="w-7 text-center text-slate-400 dark:text-slate-600 font-bold text-xs select-none"
                                >
                                    ...
                                </span>
                            );
                        }

                        const isActive = page === currentPage;

                        return (
                            <button
                                key={`page-${page}`}
                                type="button"
                                onClick={() => onPageChange(page)}
                                disabled={loading}
                                className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105 cursor-default'
                                        : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-95'
                                }`}
                                title={`Página ${page}`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Botão Próxima */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs active:scale-95"
                    title="Próxima Página"
                >
                    <span className="hidden xs:inline">Próxima</span>
                    <i className="bi bi-chevron-right text-[11px]" />
                </button>
            </div>
        </div>
    );
};

export default OrderPagination;
