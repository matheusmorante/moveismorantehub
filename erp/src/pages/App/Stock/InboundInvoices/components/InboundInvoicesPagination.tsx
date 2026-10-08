import React from 'react';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

interface InboundInvoicesPaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly itemsPerPage?: number;
  readonly onPageChange: (page: number) => void;
  readonly loading?: boolean;
}

export const InboundInvoicesPagination: React.FC<InboundInvoicesPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 15,
  onPageChange,
  loading = false,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(safeTotalPages, Math.max(1, currentPage));
  const startIndex = totalItems > 0 ? Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  return (
    <nav
      aria-label="Paginação de notas fiscais de entrada"
      className="mt-4 mb-2 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 sm:flex-row sm:px-6"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        {loading && (
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden="true" />
        )}
        <span>
          Exibindo <span className="font-extrabold text-slate-800 dark:text-slate-200">{startIndex}-{endIndex}</span> de{' '}
          <span className="font-extrabold text-slate-800 dark:text-slate-200">{totalItems}</span> notas fiscais
        </span>
        <span className="hidden text-slate-300 dark:text-slate-700 md:inline-block" aria-hidden="true">•</span>
        <span className="hidden text-[11px] font-semibold text-slate-400 dark:text-slate-500 md:inline-block">({itemsPerPage} por página)</span>
      </div>
      <FixedPageSlots
        ariaLabel="Navegar pelas notas fiscais de entrada"
        currentPage={currentPage}
        totalPages={safeTotalPages}
        onPageChange={onPageChange}
        loading={loading}
      />
    </nav>
  );
};

export default InboundInvoicesPagination;
