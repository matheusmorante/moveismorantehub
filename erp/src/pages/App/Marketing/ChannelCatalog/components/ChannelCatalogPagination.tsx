import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

interface ChannelCatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const ChannelCatalogPagination: React.FC<ChannelCatalogPaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  loading,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <ERPListPagination
      ariaLabel="Paginação do catálogo de canais"
      page={currentPage}
      pageSize={itemsPerPage}
      totalItems={totalItems}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      preferenceKey="channel-catalog"
      itemLabel="itens"
      loading={loading}
      className="mt-4"
    />
  );
};
