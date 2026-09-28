import { describe, expect, it } from 'vitest';
import { DEFAULT_NFE_ENVIRONMENT, NFE_ENVIRONMENTS } from '../nfeEnvironment';

describe('outbound invoice environment default', () => {
  it('starts in homologation and requires an explicit switch to production', () => {
    expect(DEFAULT_NFE_ENVIRONMENT).toBe(2);
    expect(NFE_ENVIRONMENTS.map((environment) => environment.value)).toEqual([2, 1]);
  });
});
