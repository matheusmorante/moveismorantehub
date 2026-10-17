import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGridPaginationProps {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  itemsPerPage: number;
  currentCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Componente de paginação para o catálogo digital com botões numéricos compactados e setas.
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

  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-gray-100 mt-8">
      <span className="text-xs font-semibold text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
        Mostrando <span className="font-bold text-gray-900">{startIndex + 1}</span> a{' '}
        <span className="font-bold text-gray-900">
          {Math.min(startIndex + currentCount, totalProducts)}
        </span>{' '}
        de <span className="font-bold text-gray-900">{totalProducts}</span> produtos
      </span>

      <div className="flex items-center justify-center gap-1.5 md:gap-2.5 order-1 sm:order-2 select-none">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'h-10 px-3.5 md:px-4 rounded-full flex items-center justify-center transition-all text-xs font-bold gap-1',
            currentPage === 1
              ? 'bg-gray-200/80 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer shadow-xs active:scale-95'
          )}
          title="Página Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .reduce((acc: (number | string)[], pageNum, index, array) => {
            if (index > 0 && pageNum - (array[index - 1] as number) > 1) {
              acc.push('...');
            }
            acc.push(pageNum);
            return acc;
          }, [])
          .map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full font-black text-sm flex items-center justify-center transition-all cursor-pointer',
                  isCurrent
                    ? 'bg-[#004687] text-white shadow-md scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary font-bold'
                )}
              >
                {p}
              </button>
            );
          })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'h-10 px-3.5 md:px-4 rounded-full flex items-center justify-center transition-all text-xs font-bold gap-1',
            currentPage === totalPages
              ? 'bg-gray-200/80 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer shadow-xs active:scale-95'
          )}
          title="Próxima Página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
