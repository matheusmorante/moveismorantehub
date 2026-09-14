import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {}, isTestEnvironment: false }));

import { applyProductFiltersAndSort } from './productFilterBuilder';

describe('productFilterBuilder', () => {
    it('aplica filtro de fornecedor quando supplierId é fornecido', async () => {
        const mockQuery: any = {
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null })),
        };

        await applyProductFiltersAndSort(mockQuery, { supplierId: 'forn-123' });

        expect(mockQuery.or).toHaveBeenCalledWith(
            'supplier_id.eq.forn-123,main_supplier_id.eq.forn-123,supplier_ids.cs.{"forn-123"}'
        );
    });

    it('não adiciona filtro de fornecedor quando supplierId não é fornecido', async () => {
        const mockQuery: any = {
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null })),
        };

        await applyProductFiltersAndSort(mockQuery, {});

        expect(mockQuery.or).not.toHaveBeenCalledWith(
            expect.stringContaining('supplier_id.eq.')
        );
    });
});
