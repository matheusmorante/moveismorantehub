import { describe, expect, it, vi, beforeEach } from 'vitest';
import { 
    GoodsReceipt,
    reverseGoodsReceipt,
    unreverseGoodsReceipt
} from '@/pages/utils/goodsReceiptService';
import { getReceiptBadgeContent, getReceiptItemsMovementList } from '../components/receiptBadgeContent';

vi.mock('@/pages/utils/movingAverageCostService', () => ({
    reprocessMovingAverageCosts: vi.fn(() => Promise.resolve()),
}));

// Mock de localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock Supabase
vi.mock('@/pages/utils/supabaseConfig', () => ({
    supabase: {
        rpc: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                    ilike: () => Promise.resolve({ data: [], error: null }),
                    limit: () => Promise.resolve({ data: [], error: null })
                }),
                or: () => Promise.resolve({ data: [], error: null }),
                order: () => Promise.resolve({ data: [], error: null })
            }),
            insert: () => ({
                select: () => Promise.resolve({ data: [{ id: 'mock-move-id-123' }], error: null })
            }),
            update: () => ({
                eq: () => Promise.resolve({ error: null })
            }),
            upsert: () => Promise.resolve({ error: null }),
            delete: () => ({
                eq: () => Promise.resolve({ error: null })
            })
        }),
        channel: () => ({
            on: () => ({
                subscribe: () => ({})
            })
        })
    }
}));

describe('Ciclo de Estorno e Desfazer Estorno de Recebimento de Mercadorias', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve estornar um recebimento atendido e depois desfazer o estorno voltando para recebido (atendido) e entrada efetivada', async () => {
        const initialReceipt: GoodsReceipt = {
            id: 'TEST_AUT_RCPT_001',
            receiptIndex: 42,
            status: 'received',
            isDraft: false,
            supplierName: 'Madeireira Paraná',
            receivedAt: '2026-09-14T10:00:00Z',
            invoiceNumber: '009871',
            totalValue: 1500,
            items: [
                {
                    productId: 'prod-tabua-cedro',
                    description: 'Tábua de Cedro 3m',
                    quantity: 10,
                    unitCost: 150,
                    totalCost: 1500,
                    inventoryMoveId: 'move-cedro-001'
                }
            ]
        };

        // Salvar recebimento inicial no mock storage
        localStorage.setItem('morantehub_goods_receipts_v1', JSON.stringify([initialReceipt]));

        // 1. Estornar recebimento
        const reversedReceipt = await reverseGoodsReceipt(initialReceipt.id);
        expect(reversedReceipt.status).toBe('estornado');
        expect(reversedReceipt.isDraft).toBe(false);

        // Validar badges durante estorno
        const reversedBadge = getReceiptBadgeContent(reversedReceipt);
        expect(reversedBadge.statusLabel).toBe('Entrada Estornada');
        const reversedItems = getReceiptItemsMovementList(reversedReceipt);
        expect(reversedItems[0].status).toBe('reversed');
        expect(reversedItems[0].statusLabel).toBe('Estornada');

        // 2. Desfazer o estorno
        const reactivatedReceipt = await unreverseGoodsReceipt(initialReceipt.id);
        expect(reactivatedReceipt.status).toBe('received');
        expect(reactivatedReceipt.isDraft).toBe(false);

        // Validar badges após desfazer o estorno (volta a ser efetivada)
        const reactivatedBadge = getReceiptBadgeContent(reactivatedReceipt);
        expect(reactivatedBadge.statusLabel).toBe('Entrada Efetivada');
        expect(reactivatedBadge.badgeColorClass).toContain('bg-emerald-600');

        const reactivatedItems = getReceiptItemsMovementList(reactivatedReceipt);
        expect(reactivatedItems[0].status).toBe('effective');
        expect(reactivatedItems[0].statusLabel).toBe('Efetivada');
    });

    it('não deve alterar recebimento que não esteja estornado ao chamar unreverseGoodsReceipt', async () => {
        const receivedReceipt: GoodsReceipt = {
            id: 'TEST_AUT_RCPT_002',
            receiptIndex: 43,
            status: 'received',
            isDraft: false,
            supplierName: 'Compensados Sul',
            receivedAt: '2026-09-14T11:00:00Z',
            totalValue: 800,
            items: []
        };

        localStorage.setItem('morantehub_goods_receipts_v1', JSON.stringify([receivedReceipt]));

        const result = await unreverseGoodsReceipt(receivedReceipt.id);
        expect(result.status).toBe('received');
    });
});
