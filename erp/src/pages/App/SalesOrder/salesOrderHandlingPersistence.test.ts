// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSalesOrderForm } from './useSalesOrderForm';
import Order from '../../types/order.type';

// Mock Supabase to avoid test config error
vi.mock('@/pages/utils/supabaseConfig', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: null, error: null }),
                    order: () => ({ limit: async () => ({ data: [], error: null }) }),
                }),
                order: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
            insert: async () => ({ data: null, error: null }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }),
    },
    ecommerceSupabase: {},
}));

vi.mock('../../utils/supabaseConfig', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: null, error: null }),
                    order: () => ({ limit: async () => ({ data: [], error: null }) }),
                }),
                order: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
            insert: async () => ({ data: null, error: null }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }),
    },
    ecommerceSupabase: {},
}));

// Mock dependencies that require Supabase or external APIs
vi.mock('../../utils/orderCode', () => ({
    getOrderIndex: vi.fn((order) => order?.orderIndex || 2000),
    getNextOrderIndex: vi.fn(async () => 2001),
}));

const mockSettings = {
    requiredFields: {
        customer: { cpfCnpj: false },
        shipping: {}
    },
    deliveryHandlingOptions: [],
    pickupHandlingOptions: []
};

vi.mock('../../utils/settingsService', () => ({
    getSettings: vi.fn(() => mockSettings),
    fetchSettings: vi.fn(async () => mockSettings),
}));

vi.mock('@/pages/utils/settingsService', () => ({
    getSettings: vi.fn(() => mockSettings),
    fetchSettings: vi.fn(async () => mockSettings),
}));

describe('Persistência de Manuseios em Pedidos de Venda', () => {
    it('deve preservar o manuseio dos itens intacto ao carregar pedido para edição, sem forçar montagem no local', () => {
        const mockOrder: Order = {
            id: 'order-123',
            orderIndex: 2000,
            status: 'draft',
            orderType: 'sale',
            shipping: {
                deliveryMethod: 'delivery',
                orderType: 'Na caixa > Montagem no local da entrega',
                value: 50,
                autoCalculateValue: false,
                useCustomerAddress: true,
                scheduling: { date: '2026-09-15', dateType: 'fixed', type: 'fixed', notInformed: false, time: '', startTime: '', endTime: '', endDate: '' }
            },
            items: [
                {
                    productId: 'prod-1',
                    code: 'SKU1',
                    description: 'Sofá 3 Lugares',
                    unitPrice: 1500,
                    quantity: 1,
                    handlingType: 'Item não necessita de montagem'
                },
                {
                    productId: 'prod-2',
                    code: 'SKU2',
                    description: 'Mesa de Centro',
                    unitPrice: 400,
                    quantity: 1,
                    handlingType: 'De mostruário montado > Entregue montado'
                }
            ],
            payments: [
                { method: 'pix', amount: 1950, status: 'paid' }
            ],
            customerData: {
                fullName: 'Cliente Teste',
                phone: '41999999999'
            },
            seller: 'Vendedor Teste'
        };

        const { result } = renderHook(() => useSalesOrderForm());

        act(() => {
            result.current.actions.loadOrderForEditing(mockOrder);
        });

        // Verificar que os itens NÃO foram sobrescritos com "Na caixa > Montagem no local da entrega"
        expect(result.current.state.items[0].handlingType).toBe('Item não necessita de montagem');
        expect(result.current.state.items[1].handlingType).toBe('De mostruário montado > Entregue montado');

        // currentOrder deve retornar os itens com seus manuseios originais
        expect(result.current.state.currentOrder.items[0].handlingType).toBe('Item não necessita de montagem');
        expect(result.current.state.currentOrder.items[1].handlingType).toBe('De mostruário montado > Entregue montado');
    });

    it('deve persistir o novo manuseio selecionado pelo usuário sem reverter para montagem no local', () => {
        const mockOrder: Order = {
            id: 'order-456',
            orderIndex: 2001,
            status: 'draft',
            orderType: 'sale',
            shipping: {
                deliveryMethod: 'delivery',
                orderType: 'Na caixa > Montagem no local da entrega',
                value: 0,
                autoCalculateValue: false,
                useCustomerAddress: true,
                scheduling: { date: '2026-09-15', dateType: 'fixed', type: 'fixed', notInformed: false, time: '', startTime: '', endTime: '', endDate: '' }
            },
            items: [
                {
                    productId: 'prod-1',
                    code: 'SKU1',
                    description: 'Guarda Roupa Casal',
                    unitPrice: 2000,
                    quantity: 1,
                    handlingType: 'Na caixa > Montagem no local da entrega'
                }
            ],
            payments: [
                { method: 'pix', amount: 2000, status: 'paid' }
            ],
            customerData: {
                fullName: 'Cliente Teste 2',
                phone: '41999999999'
            },
            seller: 'Vendedor Teste'
        };

        const { result } = renderHook(() => useSalesOrderForm());

        act(() => {
            result.current.actions.loadOrderForEditing(mockOrder);
        });

        // Usuário troca o manuseio na linha do item para "Na caixa > Montagem por conta do cliente"
        act(() => {
            result.current.actions.handleItemChange(0, 'handlingType', 'Na caixa > Montagem por conta do cliente');
        });

        // O manuseio do item DEVE ser o novo manuseio selecionado
        expect(result.current.state.items[0].handlingType).toBe('Na caixa > Montagem por conta do cliente');

        // currentOrder também deve refletir a nova seleção
        expect(result.current.state.currentOrder.items[0].handlingType).toBe('Na caixa > Montagem por conta do cliente');
        expect(result.current.state.currentOrder.shipping.orderType).toBe('Na caixa > Montagem por conta do cliente');
    });
});
