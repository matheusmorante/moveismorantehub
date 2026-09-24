import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
}));

vi.mock('@/pages/utils/settingsService', () => ({
    getSettings: vi.fn(() => ({
        inventoryAutomation: { autoWithdrawalOnStatus: ['scheduled', 'fulfilled'] },
    })),
}));

import { ensureCustomerInCrm } from '../orderCrmSyncService';
import { saveOrder, updateOrder } from '../../orderMutationService';

describe('Módulos de Mutação de Pedidos (orderMutation)', () => {
    describe('orderCrmSyncService', () => {
        it('preserva ID existente se o cliente já for cadastrado', async () => {
            const result = await ensureCustomerInCrm({ id: 'cust-123', fullName: 'Cliente Cadastrado' });
            expect(result).toBe('cust-123');
        });

        it('ignora cadastro no CRM se o cliente for Consumidor Final', async () => {
            const result = await ensureCustomerInCrm({ fullName: 'Consumidor Final' });
            expect(result).toBeUndefined();
        });

        it('retorna undefined sem erro se customerData for vazio', async () => {
            const result = await ensureCustomerInCrm(undefined);
            expect(result).toBeUndefined();
        });
    });

    describe('Fachada orderMutationService', () => {
        it('exporta as funções principais saveOrder e updateOrder', () => {
            expect(typeof saveOrder).toBe('function');
            expect(typeof updateOrder).toBe('function');
        });
    });
});
