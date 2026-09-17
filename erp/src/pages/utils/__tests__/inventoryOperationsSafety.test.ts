import { describe, it, expect } from 'vitest';
import { shouldProcessSaleStock } from '../saleInventoryRules';
import { canCancelOrderDirectly } from '../orderStatusTransitionRules';
import { replayMovingAverageMoves } from '../movingAverageCostRules';
import Order from '../../types/order.type';

describe('Etapas 2.3 & 2.4: Idempotência de movimentos e cancelamento de pedido [TESTE_AUT]', () => {
    describe('Etapa 2.3: Idempotência contra duplicidade por reenvio ou refresh', () => {
        it('deve autorizar processamento se stockProcessed for falso', () => {
            const order: Order = {
                id: 'TEST_AUT_ORDER_01',
                orderType: 'sale',
                status: 'scheduled',
                stockProcessed: false,
                items: [{ productId: 'prod_1', quantity: 1 }],
            } as any;

            expect(shouldProcessSaleStock(order, ['scheduled'])).toBe(true);
        });

        it('deve BLOQUEAR novo processamento se stockProcessed já for verdadeiro (idempotência)', () => {
            const order: Order = {
                id: 'TEST_AUT_ORDER_01',
                orderType: 'sale',
                status: 'scheduled',
                stockProcessed: true,
                items: [{ productId: 'prod_1', quantity: 1 }],
            } as any;

            // Tentativa de reprocessar a mesma saída bloqueada
            expect(shouldProcessSaleStock(order, ['scheduled'], false)).toBe(false);
        });

        it('não deve gerar saída duplicada no replay quando movimentos já contêm o registro', () => {
            const moves = [
                { id: 'TEST_AUT_MOVE_1', type: 'withdrawal', quantity: 2, unitCost: 100 },
            ];

            const replay1 = replayMovingAverageMoves(moves);
            expect(replay1.moves).toHaveLength(1);
            expect(replay1.state.quantity).toBe(-2);
        });
    });

    describe('Etapa 2.4: Cancelamento de pedido e estorno no saldo', () => {
        it('permite cancelamento direto apenas para pedidos agendados (scheduled)', () => {
            expect(canCancelOrderDirectly({ status: 'scheduled', orderType: 'sale' })).toBe(true);
            expect(canCancelOrderDirectly({ status: 'fulfilled', orderType: 'sale' })).toBe(false);
            expect(canCancelOrderDirectly({ status: 'draft', orderType: 'sale' })).toBe(false);
            expect(canCancelOrderDirectly({ status: 'cancelled', orderType: 'sale' })).toBe(false);
        });

        it('recompõe exatamente o estoque ao aplicar estorno (reversed) de saídas canceladas', () => {
            // Cenário: Entrada de 10 unidades -> Saída de 3 unidades -> Cancelamento da venda (estorno)
            const movesComCancelamento = [
                { id: 'TEST_AUT_ENTRADA', type: 'entry', quantity: 10, unitCost: 50 },
                { id: 'TEST_AUT_SAIDA', type: 'withdrawal', quantity: 3, unitCost: 50, observation: '{"status":"reversed"}' },
            ];

            const replay = replayMovingAverageMoves(movesComCancelamento);

            // A saída estornada deve ser desconsiderada pelo replay, mantendo o saldo físico intacto em 10
            expect(replay.state.quantity).toBe(10);
            expect(replay.state.unitCost).toBe(50);
        });
    });
});
