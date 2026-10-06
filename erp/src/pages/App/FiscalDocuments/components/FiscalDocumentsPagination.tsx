import React from 'react';
import { FISCAL_DOCUMENTS_PAGE_SIZE } from '../types/fiscalDocuments.types';

interface FiscalDocumentsPaginationProps {
  documentCount: number;
  pageIndex: number;
  onPageChange: (newPage: number) => void;
}

export const FiscalDocumentsPagination: React.FC<FiscalDocumentsPaginationProps> = ({
  documentCount,
  pageIndex,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(documentCount / FISCAL_DOCUMENTS_PAGE_SIZE));

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
      <span>
        {documentCount.toLocaleString('pt-BR')} documento(s) · Página {pageIndex + 1} de {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0}
          className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={(pageIndex + 1) * FISCAL_DOCUMENTS_PAGE_SIZE >= documentCount}
          className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Próxima
        </button>
      </div>
    </div>
  );
};
