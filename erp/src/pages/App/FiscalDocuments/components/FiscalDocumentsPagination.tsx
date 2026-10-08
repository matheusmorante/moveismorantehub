import React from 'react';
import { FISCAL_DOCUMENTS_PAGE_SIZE } from '../types/fiscalDocuments.types';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

interface FiscalDocumentsPaginationProps {
  documentCount: number;
  pageIndex: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
}

export const FiscalDocumentsPagination: React.FC<FiscalDocumentsPaginationProps> = ({
  documentCount,
  pageIndex,
  onPageChange,
  loading = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(documentCount / FISCAL_DOCUMENTS_PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, pageIndex + 1));
  const startIndex = documentCount
    ? Math.min((currentPage - 1) * FISCAL_DOCUMENTS_PAGE_SIZE + 1, documentCount)
    : 0;
  const endIndex = Math.min(currentPage * FISCAL_DOCUMENTS_PAGE_SIZE, documentCount);

  return (
    <div className="mt-4 mb-2 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-5 text-slate-500 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 sm:flex-row sm:px-6">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        {loading && (
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        )}
        <span>
          Exibindo{' '}
          <span className="font-extrabold text-slate-800 dark:text-slate-200">
            {startIndex}-{endIndex}
          </span>{' '}
          de{' '}
          <span className="font-extrabold text-slate-800 dark:text-slate-200">
            {documentCount}
          </span>{' '}
          notas fiscais
        </span>
        <span className="hidden text-slate-300 dark:text-slate-700 md:inline-block">•</span>
        <span className="hidden text-[11px] font-semibold text-slate-400 dark:text-slate-500 md:inline-block">
          ({FISCAL_DOCUMENTS_PAGE_SIZE} por página)
        </span>
      </div>

      <FixedPageSlots
        ariaLabel="Paginação de notas fiscais de saída"
        currentPage={pageIndex + 1}
        totalPages={totalPages}
        loading={loading}
        onPageChange={(page) => onPageChange(page - 1)}
      />
    </div>
  );
};
