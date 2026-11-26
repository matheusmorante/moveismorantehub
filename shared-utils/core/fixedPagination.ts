export const FIXED_PAGE_SLOT_COUNT = 5;

export const normalizePageNumber = (currentPage: number, totalPages: number): number => {
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  const safeCurrentPage = Number.isFinite(currentPage) ? Math.floor(currentPage) : 1;

  return Math.min(safeTotalPages, Math.max(1, safeCurrentPage));
};

export const getFixedPageSlots = (currentPage: number, totalPages: number): number[] => {
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  const safeCurrentPage = normalizePageNumber(currentPage, safeTotalPages);
  const visiblePageCount = Math.min(FIXED_PAGE_SLOT_COUNT, safeTotalPages);
  const firstVisiblePage = Math.max(
    1,
    Math.min(
      safeCurrentPage - Math.floor(FIXED_PAGE_SLOT_COUNT / 2),
      safeTotalPages - visiblePageCount + 1
    )
  );

  return Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);
};
