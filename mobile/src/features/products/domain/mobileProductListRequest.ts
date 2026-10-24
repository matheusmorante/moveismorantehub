export const resolveMobileProductListRequestPage = (
  currentPage: number,
  currentFiltersKey: string,
  previousFiltersKey: string,
): number => currentFiltersKey === previousFiltersKey ? currentPage : 1;

export const createMobileProductListRequestGuard = () => {
  let currentRequestId = 0;

  return {
    begin: () => ++currentRequestId,
    isCurrent: (requestId: number) => requestId === currentRequestId,
    invalidate: () => {
      currentRequestId += 1;
    },
  };
};
