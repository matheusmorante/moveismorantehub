import React from 'react';
import { FISCAL_DOCUMENTS_PAGE_SIZE } from '../types/fiscalDocuments.types';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

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
  return (
    <ERPListPagination
      ariaLabel="Paginação de notas fiscais de saída"
      page={pageIndex + 1}
      pageSize={FISCAL_DOCUMENTS_PAGE_SIZE}
      totalItems={documentCount}
      onPageChange={(page) => onPageChange(page - 1)}
      itemLabel="notas fiscais"
      loading={loading}
      className="my-2"
    />
  );
};
