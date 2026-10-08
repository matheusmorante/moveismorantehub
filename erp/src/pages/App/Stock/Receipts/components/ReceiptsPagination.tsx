import React from 'react';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

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
  itemName = 'recebimentos',
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(safeTotalPages, Math.max(1, currentPage));
  const startIndex = totalItems > 0 ? Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  return (
    <nav
      role="navigation"
      aria-label="Paginação de recebimentos"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm mt-4 mb-2"
    >
      {/* Informações de contagem */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        {loading && (
          <span
            className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
        <span>
          Exibindo{' '}
          <span className="text-slate-800 dark:text-slate-200 font-extrabold">
            {startIndex}-{endIndex}
          </span>{' '}
          de <span className="text-slate-800 dark:text-slate-200 font-extrabold">{totalItems}</span>{' '}
          {itemName}
        </span>
        <span
          className="hidden md:inline-block text-slate-300 dark:text-slate-700"
          aria-hidden="true"
        >
          •
        </span>
        <span className="hidden md:inline-block text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
          ({itemsPerPage} por página)
        </span>
      </div>

      {/* Controles de Navegação */}
      <FixedPageSlots
        ariaLabel="Paginação de recebimentos"
        currentPage={currentPage}
        totalPages={safeTotalPages}
        onPageChange={onPageChange}
        loading={loading}
      />
    </nav>
  );
};
