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
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  const safeCurrentPage = normalizePageNumber(currentPage, safeTotalPages);
  const pages = getFixedPageSlots(safeCurrentPage, safeTotalPages);
  const onPageChangeRef = useRef(onPageChange);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) onPageChangeRef.current(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    if (page === safeCurrentPage || loading) return;
    const root = containerRef.current;
    const scrollableParents: HTMLElement[] = [];
    let parent = root?.parentElement ?? null;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (/(auto|scroll|overlay)/.test(overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
        scrollableParents.push(parent);
      }
      parent = parent.parentElement;
    }
    const shouldScrollWindow =
      scrollableParents.length === 0 && !root?.closest('[role="dialog"]') && window.scrollY > 0;

    onPageChange(page);
    if (typeof window.requestAnimationFrame !== 'function') return;

    window.requestAnimationFrame(() => {
      scrollableParents.forEach((scrollableParent) => {
        if (scrollableParent.scrollTop > 0) {
          scrollableParent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      if (shouldScrollWindow) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  return (
    <div
      ref={containerRef}
      className={`flex w-full flex-col items-center gap-1 ${className}`}
    >
      <div
        role="group"
        aria-label={ariaLabel}
        style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}
        className="grid w-full items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      >
        {pages.map((page) => {
          const isCurrent = page === safeCurrentPage;

          return (
            <button
              key={page}
              type="button"
              aria-label={`Página ${page}${isCurrent ? ', atual' : ''}`}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={() => handlePageChange(page)}
              disabled={isCurrent || loading}
              className={`flex h-[42px] min-w-0 items-center justify-center rounded-lg text-sm font-extrabold transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                isCurrent
                  ? 'cursor-default bg-blue-600 text-white'
                  : 'bg-transparent text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isCurrent ? `Página atual: ${page}` : `Ir para a página ${page}`}
            >
              {page}
            </button>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Página{' '}
        <strong className="font-extrabold text-blue-600 dark:text-blue-400">
          {safeCurrentPage}
        </strong>{' '}
        de {safeTotalPages}
      </span>
    </div>
  );
};
