import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
  ariaLabel?: string;
  className?: string;
  preferenceKey?: string;
}

const OrderPagination: React.FC<OrderPaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage = 15,
  onPageChange,
  onPageSizeChange,
  loading = false,
  ariaLabel = 'Paginação do histórico de pedidos',
  className = 'mt-4 mb-2',
  preferenceKey = 'sales-orders',
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
      itemLabel="pedidos"
      loading={loading}
      className={className}
    />
  );
};

export default OrderPagination;
