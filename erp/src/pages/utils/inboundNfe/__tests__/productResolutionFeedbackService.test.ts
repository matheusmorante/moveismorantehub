import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabaseConfig', () => ({
    supabase: { from: vi.fn() },
}));
import { shouldActivateSupplierPattern, validateProductResolutionFeedback } from '../productResolutionFeedbackService';

describe('product resolution feedback safeguards', () => {
    it('only activates a supplier pattern after three consistent confirmations', () => {
        expect(shouldActivateSupplierPattern(2, 0)).toBe(false);
        expect(shouldActivateSupplierPattern(3, 0)).toBe(true);
        expect(shouldActivateSupplierPattern(8, 1)).toBe(false);
    });

    it('requires a final product except for a rejection', () => {
        expect(() => validateProductResolutionFeedback({ supplierId: 'bechara', nfItemDescription: 'COMODA LUNA', userDecision: 'accepted', relationType: 'existing_variation' })).toThrow('produto final');
        expect(() => validateProductResolutionFeedback({ supplierId: 'bechara', nfItemDescription: 'ROUPEIRO MONZA 6P', userDecision: 'rejected', relationType: 'different_parent_products' })).not.toThrow();
    });
});
