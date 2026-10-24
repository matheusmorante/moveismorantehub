import { describe, expect, it } from 'vitest';
import {
  createMobileProductListRequestGuard,
  resolveMobileProductListRequestPage,
} from './mobileProductListRequest';

describe('resolveMobileProductListRequestPage', () => {
  it('uses page one immediately when filters change from a later page', () => {
    expect(resolveMobileProductListRequestPage(3, 'category-b', 'category-a')).toBe(1);
  });

  it('preserves the selected page while the query filters stay the same', () => {
    expect(resolveMobileProductListRequestPage(3, 'category-a', 'category-a')).toBe(3);
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
