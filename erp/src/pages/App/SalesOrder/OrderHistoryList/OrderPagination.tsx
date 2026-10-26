import React from 'react';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  ariaLabel?: string;
  className?: string;
}

const OrderPagination: React.FC<OrderPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 15,
  onPageChange,
  loading = false,
  ariaLabel = 'Paginação do histórico de pedidos',
  className = 'mt-4 mb-2',
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(safeTotalPages, Math.max(1, currentPage));
  const startIndex = totalItems > 0 ? Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  return (
    <div
      className={`mx-auto flex w-full flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40
        sm:gap-4 sm:px-4 sm:py-4 md:max-w-4xl lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:flex-row 2xl:max-w-7xl ${className}`}
    >
      <div
        className="flex w-full flex-wrap items-center justify-center gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 xl:w-auto xl:flex-none xl:justify-start xl:text-left"
      >
        {loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden="true" />}
        <span>
          Exibindo <span className="font-extrabold text-slate-800 dark:text-slate-200">{startIndex}-{endIndex}</span> de{' '}
          <span className="font-extrabold text-slate-800 dark:text-slate-200">{totalItems}</span> pedidos
        </span>
        <span className="hidden text-slate-300 dark:text-slate-700 md:inline-block" aria-hidden="true">•</span>
        <span className="hidden text-[11px] font-semibold text-slate-400 dark:text-slate-500 md:inline-block">({itemsPerPage} por página)</span>
      </div>
      <FixedPageSlots
        ariaLabel={ariaLabel}
        currentPage={currentPage}
        totalPages={safeTotalPages}
        onPageChange={onPageChange}
        loading={loading}
        className="min-w-0 xl:flex-1"
      />
    </div>
  );
};

export default OrderPagination;
