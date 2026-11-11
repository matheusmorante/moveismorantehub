import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

export interface ReceiptsPaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
  readonly loading?: boolean;
  readonly itemName?: string;
  readonly ariaLabel?: string;
  readonly bare?: boolean;
}

export const ReceiptsPagination: React.FC<ReceiptsPaginationProps> = ({
  currentPage,
  totalItems,
  onPageChange,
  loading = false,
  itemName = 'recebimentos',
  ariaLabel = 'Paginação de recebimentos',
}) => {
  return (
    <ERPListPagination
      ariaLabel={ariaLabel}
      page={currentPage}
      fixedPageSize={15}
      totalItems={totalItems}
      onPageChange={onPageChange}
      itemLabel={itemName}
      loading={loading}
      className="my-4"
    />
  );
};
