import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

interface InboundInvoicesPaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly itemsPerPage?: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange?: (pageSize: number) => void;
  readonly loading?: boolean;
}

export const InboundInvoicesPagination: React.FC<InboundInvoicesPaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage = 15,
  onPageChange,
  onPageSizeChange,
  loading = false,
}) => {
  return (
    <ERPListPagination
      ariaLabel="Paginação de notas fiscais de entrada"
      page={currentPage}
      pageSize={itemsPerPage}
      totalItems={totalItems}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      preferenceKey="stock-inbound-invoices"
      itemLabel="notas fiscais"
      loading={loading}
      className="my-4"
    />
  );
};

export default InboundInvoicesPagination;
