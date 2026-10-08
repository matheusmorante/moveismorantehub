import React, { useEffect, useRef } from 'react';
import { getFixedPageSlots, normalizePageNumber } from '../../../../shared-utils/fixedPagination';

interface FixedPageSlotsProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly loading?: boolean;
  readonly ariaLabel: string;
  readonly className?: string;
}

export const FixedPageSlots: React.FC<FixedPageSlotsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  ariaLabel,
  className = '',
}) => {
  const safeCurrentPage = normalizePageNumber(currentPage, totalPages);
  const pages = getFixedPageSlots(safeCurrentPage, totalPages);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) onPageChangeRef.current(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  return (
    <div role="group" aria-label={ariaLabel} className={`flex items-center justify-center gap-2 ${className}`}>
      {pages.map((page, index) => {
        const isCurrent = index === 2;

        return (
          <div
            key={`page-slot-${index}`}
            data-page-slot={index + 1}
            aria-hidden={page === null ? true : undefined}
            className="fixed-page-slot flex h-10 w-10 shrink-0 items-center justify-center"
          >
            {page !== null && (
              <button
                type="button"
                aria-label={`Página ${page}${isCurrent ? ', atual' : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={isCurrent ? undefined : () => onPageChange(page)}
                disabled={!isCurrent && loading}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold transition-colors ${
                  isCurrent
                    ? 'cursor-default bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
                title={isCurrent ? `Página atual: ${page}` : `Ir para a página ${page}`}
              >
                {page}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
