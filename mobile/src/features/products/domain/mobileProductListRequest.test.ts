import { describe, expect, it, vi } from 'vitest';
import {
  createMobileProductListRequestGuard,
  MOBILE_PRODUCT_LIST_RETRY_DELAY_MS,
  resolveMobileProductListPageAfterResult,
  resolveMobileProductListRequestIndicators,
  resolveMobileProductListRequestPage,
  retryMobileProductListReadOnce,
  shouldClearMobileProductListSnapshot,
} from './mobileProductListRequest';

describe('retryMobileProductListReadOnce', () => {
  it('retries a transient list read failure once', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('temporário')).mockResolvedValueOnce('ok');
    const waitBeforeRetry = vi.fn().mockResolvedValue(undefined);

    await expect(
      retryMobileProductListReadOnce(read, () => true, waitBeforeRetry)
    ).resolves.toBe('ok');

    expect(read).toHaveBeenCalledTimes(2);
    expect(waitBeforeRetry).toHaveBeenCalledOnce();
    expect(MOBILE_PRODUCT_LIST_RETRY_DELAY_MS).toBe(1_000);
  });

  it('propagates the second failure without starting a retry loop', async () => {
    const finalError = new Error('indisponível');
    const read = vi.fn().mockRejectedValueOnce(new Error('temporário')).mockRejectedValueOnce(finalError);
    const waitBeforeRetry = vi.fn().mockResolvedValue(undefined);

    await expect(
      retryMobileProductListReadOnce(read, () => true, waitBeforeRetry)
    ).rejects.toBe(finalError);

    expect(read).toHaveBeenCalledTimes(2);
    expect(waitBeforeRetry).toHaveBeenCalledOnce();
  });

  it('does not retry a request that was superseded during backoff', async () => {
    let isCurrent = true;
    const read = vi.fn().mockRejectedValue(new Error('temporário'));
    const waitBeforeRetry = vi.fn(async () => {
      isCurrent = false;
    });

    await expect(
      retryMobileProductListReadOnce(read, () => isCurrent, waitBeforeRetry)
    ).rejects.toThrow('temporário');

    expect(read).toHaveBeenCalledOnce();
    expect(waitBeforeRetry).toHaveBeenCalledOnce();
  });
});

describe('resolveMobileProductListRequestIndicators', () => {
  it('clears pull-to-refresh feedback when another query starts', () => {
    expect(resolveMobileProductListRequestIndicators(false)).toEqual({
      loading: true,
      refreshing: false,
    });
  });

  it('marks a pull-to-refresh without forcing the full-page loader', () => {
    expect(resolveMobileProductListRequestIndicators(true)).toEqual({
      loading: false,
      refreshing: true,
    });
  });
});

describe('resolveMobileProductListRequestPage', () => {
  it('uses page one immediately when filters change from a later page', () => {
    expect(resolveMobileProductListRequestPage(3, 'category-b', 'category-a')).toBe(1);
  });

  it('preserves the selected page while the query filters stay the same', () => {
    expect(resolveMobileProductListRequestPage(3, 'category-a', 'category-a')).toBe(3);
  });

  it('resets the composition list to page one when ERP or catalog status changes', () => {
    const previousFilters = JSON.stringify({
      itemType: 'composition',
      statusFilter: 'all',
      catalogStatus: 'all',
    });

    expect(
      resolveMobileProductListRequestPage(
        4,
        JSON.stringify({ itemType: 'composition', statusFilter: 'disabled', catalogStatus: 'all' }),
        previousFilters
      )
    ).toBe(1);
    expect(
      resolveMobileProductListRequestPage(
        4,
        JSON.stringify({ itemType: 'composition', statusFilter: 'all', catalogStatus: 'hidden' }),
        previousFilters
      )
    ).toBe(1);
    expect(
      resolveMobileProductListRequestPage(
        4,
        JSON.stringify({ itemType: 'composition', statusFilter: 'all', catalogStatus: 'all' }),
        previousFilters
      )
    ).toBe(4);
  });

  it('resets the composition list to page one when search changes under status and catalog filters', () => {
    const previousFilters = JSON.stringify({
      itemType: 'composition',
      search: '',
      statusFilter: 'active',
      catalogStatus: 'hidden',
    });
    const currentFilters = JSON.stringify({
      itemType: 'composition',
      search: 'KTX',
      statusFilter: 'active',
      catalogStatus: 'hidden',
    });

    expect(resolveMobileProductListRequestPage(4, currentFilters, previousFilters)).toBe(1);
  });
});

describe('resolveMobileProductListPageAfterResult', () => {
  it('moves back to the last available page after a successful result shrinks', () => {
    expect(resolveMobileProductListPageAfterResult(3, 2, true)).toBe(2);
    expect(resolveMobileProductListPageAfterResult(2, 1, true)).toBe(1);
  });

  it('keeps the requested page when its result is not confirmed yet', () => {
    expect(resolveMobileProductListPageAfterResult(2, 1, false)).toBe(2);
  });
});

describe('shouldClearMobileProductListSnapshot', () => {
  it('keeps products when a refresh fails for the same successful query and page', () => {
    expect(shouldClearMobileProductListSnapshot('filters-a:page-2', 'filters-a:page-2')).toBe(false);
  });

  it('clears products when there is no successful snapshot for the requested query', () => {
    expect(shouldClearMobileProductListSnapshot(null, 'filters-a:page-1')).toBe(true);
    expect(shouldClearMobileProductListSnapshot('filters-a:page-2', 'filters-b:page-1')).toBe(true);
  });
});

describe('createMobileProductListRequestGuard', () => {
  it('keeps only the newest overlapping list request current', () => {
    const requests = createMobileProductListRequestGuard();
    const oldRequest = requests.begin();
    const currentRequest = requests.begin();

    expect(requests.isCurrent(oldRequest)).toBe(false);
    expect(requests.isCurrent(currentRequest)).toBe(true);
  });

  it('invalidates outstanding work when the list is disabled or unmounted', () => {
    const requests = createMobileProductListRequestGuard();
    const request = requests.begin();

    requests.invalidate();

    expect(requests.isCurrent(request)).toBe(false);
  });
});
