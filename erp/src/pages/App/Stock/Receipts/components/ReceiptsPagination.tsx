import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

export interface ReceiptsPaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly itemsPerPage?: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange?: (pageSize: number) => void;
  readonly loading?: boolean;
  readonly itemName?: string;
  readonly ariaLabel?: string;
  readonly bare?: boolean;
  readonly preferenceKey?: string;
}

export const ReceiptsPagination: React.FC<ReceiptsPaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage = 15,
  onPageChange,
  onPageSizeChange,
  loading = false,
  itemName = 'recebimentos',
  ariaLabel = 'Paginação de recebimentos',
  preferenceKey = 'stock-receipts',
}) => {
  return (
    <ERPListPagination
      ariaLabel={ariaLabel}
      page={currentPage}
      pageSize={itemsPerPage}
      totalItems={totalItems}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      preferenceKey={preferenceKey}
      itemLabel={itemName}
      loading={loading}
      className="my-4"
    />
  );
};
