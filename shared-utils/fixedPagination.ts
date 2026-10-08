export const FIXED_PAGE_OFFSETS = [-2, -1, 0, 1, 2] as const;

export const normalizePageNumber = (currentPage: number, totalPages: number): number => {
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  const safeCurrentPage = Number.isFinite(currentPage) ? Math.floor(currentPage) : 1;

  return Math.min(safeTotalPages, Math.max(1, safeCurrentPage));
};

export const getFixedPageSlots = (currentPage: number, totalPages: number): (number | null)[] => {
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  const safeCurrentPage = normalizePageNumber(currentPage, safeTotalPages);

  return FIXED_PAGE_OFFSETS.map((offset) => {
    const page = safeCurrentPage + offset;
    return page >= 1 && page <= safeTotalPages ? page : null;
  });
};
