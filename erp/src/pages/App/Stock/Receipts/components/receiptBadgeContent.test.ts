import { describe, expect, it } from 'vitest';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { PurchaseItem } from '@/pages/types/purchase.type';
import { getReceiptBadgeContent, getReceiptItemsMovementList } from './receiptBadgeContent';

describe('receiptBadgeContent', () => {
    const itemCadastrado: PurchaseItem = {
        productId: 'prod-123',
        description: 'Mesa de Jantar 6 Lugares',
        quantity: 2,
        unitCost: 500,
        totalCost: 1000,
    };

    const itemSemCadastro: PurchaseItem = {
        productId: '',
        description: 'Item Teste Avulso',
        quantity: 1,
        unitCost: 100,
        totalCost: 100,
    };

    it('retorna badge de movimentação efetivada para recebimento concluído', () => {
        const receipt: GoodsReceipt = {
            id: 'rec-1',
            status: 'received',
            isDraft: false,
            supplierName: 'Fornecedor A',
            receivedAt: '2026-09-14',
            totalValue: 1000,
            items: [itemCadastrado],
        };

        const content = getReceiptBadgeContent(receipt);
        expect(content.statusLabel).toBe('Entrada Efetivada');
        expect(content.badgeColorClass).toContain('border-emerald-700 bg-emerald-600');
        expect(content.title).toBe('Entrada de estoque registrada pelo recebimento');

        const items = getReceiptItemsMovementList(receipt);
        expect(items).toHaveLength(1);
        expect(items[0].status).toBe('effective');
        expect(items[0].statusLabel).toBe('Efetivada');
    });

    it('retorna badge de movimentação estornada quando recebimento é estornado', () => {
        const receipt: GoodsReceipt = {
            id: 'rec-2',
            status: 'estornado',
            isDraft: false,
            supplierName: 'Fornecedor B',
            receivedAt: '2026-09-14',
            totalValue: 1000,
            items: [itemCadastrado],
        };

        const content = getReceiptBadgeContent(receipt);
        expect(content.statusLabel).toBe('Entrada Estornada');
        expect(content.badgeColorClass).toContain('border-red-700 bg-red-600');
        expect(content.title).toBe('Entrada de estoque estornada');

        const items = getReceiptItemsMovementList(receipt);
        expect(items[0].status).toBe('reversed');
        expect(items[0].statusLabel).toBe('Estornada');
    });

    it('retorna badge de sem movimentação quando recebimento é rascunho', () => {
        const receipt: GoodsReceipt = {
            id: 'rec-3',
            status: 'draft',
            isDraft: true,
            supplierName: 'Fornecedor C',
            receivedAt: '2026-09-14',
            totalValue: 1000,
            items: [itemCadastrado],
        };

        const content = getReceiptBadgeContent(receipt);
        expect(content.statusLabel).toBe('Sem Movimentação');
        expect(content.badgeColorClass).toContain('border-slate-500 bg-slate-400');
        expect(content.title).toBe('Entrada de estoque ainda não registrada');

        const items = getReceiptItemsMovementList(receipt);
        expect(items[0].status).toBe('not_effective');
        expect(items[0].statusLabel).toBe('Não efetivada');
    });

    it('marca item sem productId como Sem Cadastro', () => {
        const receipt: GoodsReceipt = {
            id: 'rec-4',
            status: 'received',
            isDraft: false,
            supplierName: 'Fornecedor D',
            receivedAt: '2026-09-14',
            totalValue: 1100,
            items: [itemCadastrado, itemSemCadastro],
        };

        const items = getReceiptItemsMovementList(receipt);
        expect(items).toHaveLength(2);
        expect(items[0].status).toBe('effective');
        expect(items[1].status).toBe('unregistered');
        expect(items[1].statusLabel).toBe('Sem Cadastro');
    });
});
