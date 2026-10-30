import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

export const INBOUND_INVOICES_PAGE_SIZE = 15;

interface InboundInvoicesPaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
  readonly loading?: boolean;
}

export const InboundInvoicesPagination: React.FC<InboundInvoicesPaginationProps> = ({
  currentPage,
  totalItems,
  onPageChange,
  loading = false,
}) => {
  return (
    <ERPListPagination
      ariaLabel="Paginação de notas fiscais de entrada"
      page={currentPage}
      pageSize={INBOUND_INVOICES_PAGE_SIZE}
      totalItems={totalItems}
      onPageChange={onPageChange}
      itemLabel="notas fiscais"
      loading={loading}
      className="my-4"
    />
  );
};

export default InboundInvoicesPagination;
