import { describe, expect, it } from 'vitest';
import Order from '../../../types/order.type';
import Item from '../../../types/items.type';
import { getOrderItemsMovementList } from './inventoryBadgeContent';

describe('getOrderItemsMovementList', () => {
    const itemCadastrado: Item = {
        productId: 'prod-123',
        description: 'Mesa de Jantar 6 Lugares',
        quantity: 1,
        unitPrice: 1500,
        unitDiscount: 0,
        discountType: 'fixed',
        handlingType: '',
    };

    const itemNaoCadastrado: Item = {
        description: 'Cadeira Avulsa Temporária',
        quantity: 2,
        unitPrice: 200,
        unitDiscount: 0,
        discountType: 'fixed',
        handlingType: '',
        isTemporaryProduct: true,
    };

    it('identifica corretamente item não cadastrado com aviso explícito', () => {
        const order: Order = {
            orderType: 'sale',
            status: 'scheduled',
            stockProcessed: true,
            items: [itemNaoCadastrado],
        } as Order;

        const result = getOrderItemsMovementList(order, true, false);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('unregistered');
        expect(result[0].statusLabel).toBe('Item não cadastrado (sem movimentação)');
        expect(result[0].quantity).toBe(2);
    });

    it('identifica item cadastrado com movimentação efetivada', () => {
        const order: Order = {
            orderType: 'sale',
            status: 'scheduled',
            stockProcessed: true,
            items: [itemCadastrado],
        } as Order;

        const result = getOrderItemsMovementList(order, true, false);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('effective');
        expect(result[0].statusLabel).toBe('Efetivada');
        expect(result[0].quantity).toBe(1);
    });

    it('identifica item com movimentação estornada quando o pedido é cancelado', () => {
        const order: Order = {
            orderType: 'sale',
            status: 'cancelled',
            stockProcessed: false,
            stockReversed: true,
            items: [itemCadastrado],
        } as Order;

        const result = getOrderItemsMovementList(order, false, true);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('reversed');
        expect(result[0].statusLabel).toBe('Estornada');
    });

    it('identifica item com movimentação não efetivada quando ainda não foi processado', () => {
        const order: Order = {
            orderType: 'sale',
            status: 'draft',
            stockProcessed: false,
            items: [itemCadastrado],
        } as Order;

        const result = getOrderItemsMovementList(order, false, false);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('not_effective');
        expect(result[0].statusLabel).toBe('Não efetivada');
    });

    it('diferencia itens movimentados e não movimentados quando há movedProductIds', () => {
        const outroItemCadastrado: Item = {
            productId: 'prod-456',
            description: 'Buffet 4 Portas',
            quantity: 1,
            unitPrice: 800,
            unitDiscount: 0,
            discountType: 'fixed',
            handlingType: '',
        };

        const order: Order = {
            orderType: 'sale',
            status: 'scheduled',
            stockProcessed: true,
            movedProductIds: ['prod-123'],
            items: [itemCadastrado, outroItemCadastrado, itemNaoCadastrado],
        } as Order;

        const result = getOrderItemsMovementList(order, true, false);
        expect(result).toHaveLength(3);
        expect(result[0].status).toBe('effective');
        expect(result[0].statusLabel).toBe('Efetivada');
        expect(result[1].status).toBe('not_effective');
        expect(result[1].statusLabel).toBe('Não efetivada');
        expect(result[2].status).toBe('unregistered');
        expect(result[2].statusLabel).toBe('Item não cadastrado (sem movimentação)');
    });
});
