import { normalizePageNumber } from '../../../../../shared-utils/fixedPagination';

export const resolveMobileProductListRequestPage = (
  currentPage: number,
  currentFiltersKey: string,
  previousFiltersKey: string,
): number => currentFiltersKey === previousFiltersKey ? currentPage : 1;

export const resolveMobileProductListRequestIndicators = (pull: boolean) => ({
  loading: !pull,
  refreshing: pull,
});

export const MOBILE_PRODUCT_LIST_RETRY_DELAY_MS = 1_000;

/** Repeats a failed list read once, matching the ERP query client's retry policy. */
export const retryMobileProductListReadOnce = async <T,>(
  read: () => Promise<T>,
  isCurrent: () => boolean,
  waitBeforeRetry: () => Promise<void> = () =>
    new Promise((resolve) => setTimeout(resolve, MOBILE_PRODUCT_LIST_RETRY_DELAY_MS)),
): Promise<T> => {
  try {
    return await read();
  } catch (error) {
    if (!isCurrent()) throw error;
    await waitBeforeRetry();
    if (!isCurrent()) throw error;
    return read();
  }
};

export const resolveMobileProductListPageAfterResult = (
  currentPage: number,
  totalPages: number,
  hasSuccessfulCurrentPageSnapshot: boolean,
): number => hasSuccessfulCurrentPageSnapshot
  ? normalizePageNumber(currentPage, totalPages)
  : currentPage;

export const shouldClearMobileProductListSnapshot = (
  lastSuccessfulSnapshotKey: string | null,
  requestedSnapshotKey: string,
): boolean => lastSuccessfulSnapshotKey !== requestedSnapshotKey;

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
