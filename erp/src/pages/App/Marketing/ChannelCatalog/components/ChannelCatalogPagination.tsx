import React from 'react';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

interface ChannelCatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export const ChannelCatalogPagination: React.FC<ChannelCatalogPaginationProps> = ({
  currentPage,
  totalPages,
  loading,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(safeTotalPages, Math.max(1, currentPage));

  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-2">
      <FixedPageSlots
        ariaLabel="Paginação do catálogo de canais"
        currentPage={currentPage}
        totalPages={safeTotalPages}
        onPageChange={onPageChange}
        loading={loading}
      />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Página <span className="text-blue-600 font-bold">{safeCurrentPage}</span> de {safeTotalPages}
      </span>
    </div>
  );
};
