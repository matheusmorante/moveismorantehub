import { describe, expect, it } from 'vitest';
import { DEFAULT_NFE_ENVIRONMENT, NFE_ENVIRONMENTS } from '../nfeEnvironment';

describe('outbound invoice environment default', () => {
    it('starts in production while keeping homologation as an explicit alternative', () => {
        expect(DEFAULT_NFE_ENVIRONMENT).toBe(1);
        expect(NFE_ENVIRONMENTS.map(environment => environment.value)).toEqual([1, 2]);
    });
});
