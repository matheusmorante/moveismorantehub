import { describe, expect, it } from 'vitest';
import { isNfeProductionEnabled } from '../../../../../../api/nfe/productionGuard';

describe('NF-e production transmission guard', () => {
  it('fails closed unless the server explicitly enables production', () => {
    expect(isNfeProductionEnabled(undefined)).toBe(false);
    expect(isNfeProductionEnabled('')).toBe(false);
    expect(isNfeProductionEnabled('false')).toBe(false);
    expect(isNfeProductionEnabled('true')).toBe(true);
  });
});
