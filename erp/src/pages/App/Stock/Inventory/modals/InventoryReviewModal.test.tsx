// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn(() => { throw new Error('A rede não deve ser consultada offline'); }) } }));

import { InventoryReviewModal } from './InventoryReviewModal';

afterEach(cleanup);

describe('revisão de inventário offline', () => {
    it('permite congelar todas as contagens usando a estimativa local', async () => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
        const onConfirm = vi.fn();
        render(<InventoryReviewModal startDate="2026-09-25T10:00:00Z" onCancel={vi.fn()} onConfirm={onConfirm}
            items={[{ id: 'item-1', key: 'p1-v1', productId: 'p1', variationId: 'v1', name: 'Produto',
                supplierNames: '', assignedSupplier: '', systemStock: 4, physicalCount: 4,
                countedAt: '2026-09-25T10:01:00Z', unit: 'UN' }]} />);
        await waitFor(() => expect(screen.getByText(/estimativas locais/i)).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /Concluir Inventário/i }));
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onConfirm.mock.calls[0][0]).toEqual([expect.objectContaining({ variationId: 'v1',
            physicalCount: 4, countedAt: '2026-09-25T10:01:00Z', difference: 0 })]);
    });
});
