import React, { useContext, useEffect, useRef, useState } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { ERP_LIST_PAGE_SIZES, erpListPageSizeFormSchema } from '../../../../shared-utils/listingFormSchemas';
import { ERPListPaginationPreferenceContext } from './ERPListPaginationPreferenceContext';
import './ERPListPagination.css';

export interface ERPListPaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange?: (pageSize: number) => void;
  readonly pageSizeOptions?: readonly number[];
  readonly preferenceKey?: string;
  readonly itemLabel?: string;
  readonly ariaLabel: string;
  readonly loading?: boolean;
  readonly className?: string;
}

type PageItem = number | 'ellipsis';

export const getERPListPageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const numbers = new Set([1, totalPages]);
  for (let candidate = page - 2; candidate <= page + 2; candidate += 1) {
    if (candidate > 1 && candidate < totalPages) numbers.add(candidate);
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const result: PageItem[] = [];
  sorted.forEach((number, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && number - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && number - previous > 2) result.push('ellipsis');
    result.push(number);
  });
  return result;
};

export const ERPListPagination: React.FC<ERPListPaginationProps> = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = ERP_LIST_PAGE_SIZES,
  preferenceKey,
  itemLabel = 'registros',
  ariaLabel,
  loading = false,
  className = '',
}) => {
  const userId = useContext(ERPListPaginationPreferenceContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const restoredPreference = useRef<string | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  const [pageSizeError, setPageSizeError] = useState('');
  const pageSizeErrorId = React.useId();
  const { validateValues } = useZodForm(erpListPageSizeFormSchema, { pageSize });

  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 15;
  const safeTotalItems = Number.isFinite(totalItems) ? Math.max(0, Math.floor(totalItems)) : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const safePage = Number.isFinite(page) ? Math.min(totalPages, Math.max(1, Math.floor(page))) : 1;
  const firstItem = safeTotalItems ? (safePage - 1) * safePageSize + 1 : 0;
  const lastItem = Math.min(safePage * safePageSize, safeTotalItems);
  const sizes = pageSizeOptions.includes(safePageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, safePageSize].sort((a, b) => a - b);
  const storageKey = userId && preferenceKey ? `erp-page-size:${userId}:${preferenceKey}` : null;

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (!loading && page !== safePage) onPageChangeRef.current(safePage);
  }, [loading, page, safePage]);

  useEffect(() => {
    if (!storageKey || !onPageSizeChange || loading || typeof window === 'undefined') return;
    try {
      if (restoredPreference.current !== storageKey) {
        restoredPreference.current = storageKey;
        const saved = Number(window.localStorage.getItem(storageKey));
        if (pageSizeOptions.includes(saved) && saved !== safePageSize) {
          onPageSizeChange(saved);
          return;
        }
      }
      window.localStorage.setItem(storageKey, String(safePageSize));
    } catch {
      // A lista continua utilizável quando o navegador bloqueia armazenamento local.
    }
  }, [storageKey, onPageSizeChange, pageSizeOptions, safePageSize, loading]);

  const changePage = (nextPage: number) => {
    if (loading || nextPage === safePage || nextPage < 1 || nextPage > totalPages) return;
    const scrollableParents: HTMLElement[] = [];
    let parent = rootRef.current?.parentElement ?? null;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (/(auto|scroll|overlay)/.test(overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
        scrollableParents.push(parent);
      }
      parent = parent.parentElement;
    }
    const scrollWindow =
      scrollableParents.length === 0 && !rootRef.current?.closest('[role="dialog"]') && window.scrollY > 0;
    onPageChange(nextPage);
    window.requestAnimationFrame?.(() => {
      scrollableParents.forEach((element) => element.scrollTo({ top: 0, behavior: 'smooth' }));
      if (scrollWindow) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const changePageSize = async (value: string) => {
    const parsed = await validateValues({ pageSize: value }, () => setPageSizeError('Selecione uma quantidade válida.'));
    if (!parsed || !pageSizeOptions.includes(parsed.pageSize)) {
      setPageSizeError('Selecione uma quantidade válida.');
      return;
    }
    setPageSizeError('');
    if (parsed.pageSize === safePageSize) return;
    onPageSizeChange?.(parsed.pageSize);
  };

  if (!loading && safeTotalItems === 0) return null;

  return (
    <div ref={rootRef} className={`erp-list-pagination-container ${className}`} aria-busy={loading}>
      <div className="erp-list-pagination-layout rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
        <div className="erp-list-pagination-summary text-xs font-semibold">
          {loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden="true" />}
          <span>{loading ? `Carregando ${itemLabel}…` : `${firstItem}–${lastItem} de ${safeTotalItems} ${itemLabel}`}</span>
        </div>
        <div className="erp-list-pagination-size">
          {onPageSizeChange ? (
            <>
              <select
                aria-label="Registros por página"
                aria-invalid={Boolean(pageSizeError)}
                aria-describedby={pageSizeError ? pageSizeErrorId : undefined}
                value={safePageSize}
                disabled={loading}
                onChange={(event) => void changePageSize(event.target.value)}
                className="h-[34px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {sizes.map((size) => <option key={size} value={size}>{size} por página</option>)}
              </select>
              {pageSizeError && <span id={pageSizeErrorId} role="alert" className="text-xs text-red-600">{pageSizeError}</span>}
            </>
          ) : (
            <span className="text-xs font-semibold">{safePageSize} por página</span>
          )}
        </div>
        <nav className="erp-list-pagination-nav" aria-label={ariaLabel}>
          <button type="button" aria-label="Página anterior" title="Página anterior" disabled={loading || safePage <= 1} onClick={() => changePage(safePage - 1)} className="erp-list-pagination-button text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700">
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="erp-list-pagination-current text-xs font-semibold">Página {safePage} de {totalPages}</span>
          <div className="erp-list-pagination-pages">
            {getERPListPageItems(safePage, totalPages).map((item, index) => item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="erp-list-pagination-ellipsis" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Página ${item}${item === safePage ? ', atual' : ''}`}
                aria-current={item === safePage ? 'page' : undefined}
                disabled={loading || item === safePage}
                onClick={() => changePage(item)}
                className={`erp-list-pagination-button ${item === safePage ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <button type="button" aria-label="Próxima página" title="Próxima página" disabled={loading || safePage >= totalPages} onClick={() => changePage(safePage + 1)} className="erp-list-pagination-button text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700">
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default ERPListPagination;
