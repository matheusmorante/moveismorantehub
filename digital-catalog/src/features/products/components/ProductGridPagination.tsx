import React from 'react';

interface ProductGridPaginationProps {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  itemsPerPage: number;
  currentCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Componente de paginação para o catálogo digital com cinco páginas segmentadas.
 */
export const ProductGridPagination: React.FC<ProductGridPaginationProps> = ({
  currentPage,
  totalPages,
  totalProducts,
  itemsPerPage,
  currentCount,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(safeTotalPages, Math.max(1, currentPage));
  const visiblePageCount = Math.min(5, safeTotalPages);
  const firstVisiblePage = Math.max(
    1,
    Math.min(safeCurrentPage - 2, safeTotalPages - visiblePageCount + 1)
  );
  const pages = Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;

  return (
    <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-100 pt-8 pb-4">
      <span className="text-center text-xs font-semibold text-muted-foreground">
        Exibindo <span className="font-bold text-gray-900">{startIndex + 1}</span> a{' '}
        <span className="font-bold text-gray-900">
          {Math.min(startIndex + currentCount, totalProducts)}
        </span>{' '}
        de <span className="font-bold text-gray-900">{totalProducts}</span> produtos
      </span>

      <div
        role="group"
        aria-label="Paginação do catálogo de produtos"
        className="grid w-full items-center gap-1 rounded-xl bg-slate-100 p-1"
        style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}
      >
        {pages.map((page) => {
          const isCurrent = page === safeCurrentPage;
          return (
            <button
              key={page}
              type="button"
              aria-label={`Página ${page}${isCurrent ? ', atual' : ''}`}
              aria-current={isCurrent ? 'page' : undefined}
              disabled={isCurrent}
              onClick={() => onPageChange(page)}
              title={isCurrent ? `Página atual: ${page}` : `Ir para a página ${page}`}
              className={`flex h-[42px] min-w-0 items-center justify-center rounded-lg text-sm font-extrabold transition-colors disabled:cursor-default ${
                isCurrent
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-slate-700 hover:bg-white/70'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-slate-500">
        Página{' '}
        <strong className="font-extrabold text-blue-600">{safeCurrentPage}</strong> de{' '}
        {safeTotalPages}
      </span>
    </div>
  );
};
