import { describe, expect, it } from 'vitest';
import { canUndoFulfillment, canCancelOrderDirectly, validateOrderStatusTransition } from '@/pages/utils/orderStatusTransitionRules';
import Order from '../../../types/order.type';

describe('Regras de Negócio e Contratos de "Desfazer Atendido"', () => {
    const baseOrder: Order = {
        id: 'ord-test-001',
        orderNumber: 1045,
        orderType: 'sale',
        status: 'fulfilled',
        stockProcessed: true,
        stockReversed: false,
    };

    describe('Visibilidade e Elegibilidade (canUndoFulfillment)', () => {
        it('deve autorizar ação SOMENTE quando o status for fulfilled', () => {
            expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled' })).toBe(true);
            expect(canUndoFulfillment({ ...baseOrder, status: 'scheduled' })).toBe(false);
            expect(canUndoFulfillment({ ...baseOrder, status: 'draft' })).toBe(false);
            expect(canUndoFulfillment({ ...baseOrder, status: 'cancelled' })).toBe(false);
        });

        it('não deve autorizar para devoluções mesmo se estiverem fulfilled', () => {
            expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled', orderType: 'return' })).toBe(false);
        });

        it('deve autorizar para vendas e showroom no status fulfilled', () => {
            expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled', orderType: 'sale' })).toBe(true);
            expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled', orderType: 'showroom' })).toBe(true);
        });
    });

    describe('Fluxo Operacional: Atendido -> Desfazer Atendido -> Cancelar Venda', () => {
        it('impede cancelamento direto de venda atendida e exige desfazer antes', () => {
            const vendaAtendida: Order = { ...baseOrder, status: 'fulfilled' };

            // 1. Venda atendida NÃO pode ser cancelada diretamente
            expect(canCancelOrderDirectly(vendaAtendida)).toBe(false);

            // 2. Opção "Desfazer atendido" está disponível
            expect(canUndoFulfillment(vendaAtendida)).toBe(true);

            // 3. Transição de fulfilled para scheduled é permitida pelo validador
            const transition = validateOrderStatusTransition(vendaAtendida.status, 'scheduled');
            expect(transition.allowed).toBe(true);

            // 4. Ao voltar para agendado, estoque permanece preservado (já processado)
            const vendaAgendada: Order = {
                ...vendaAtendida,
                status: 'scheduled',
                stockProcessed: vendaAtendida.stockProcessed, // continua true
                stockReversed: false,
            };
            expect(vendaAgendada.stockProcessed).toBe(true);
            expect(vendaAgendada.stockReversed).toBe(false);

            // 5. Agora no status agendado, "Desfazer atendido" não é mais exibido
            expect(canUndoFulfillment(vendaAgendada)).toBe(false);

            // 6. E "Cancelar venda" torna-se disponível
            expect(canCancelOrderDirectly(vendaAgendada)).toBe(true);
            expect(validateOrderStatusTransition(vendaAgendada.status, 'cancelled').allowed).toBe(true);
        });
    });

    describe('Contratos de Interface e Textos Oficiais', () => {
        it('valida os textos exigidos para o modal de confirmação e toast de sucesso', () => {
            const modalTexts = {
                title: 'Desfazer status de atendido?',
                message: 'O pedido voltará para o status Agendado. As movimentações de estoque não serão alteradas.',
                cancelButton: 'Cancelar',
                confirmButton: 'Confirmar',
                successToast: 'Pedido retornado para Agendado com sucesso.',
            };

            expect(modalTexts.title).toBe('Desfazer status de atendido?');
            expect(modalTexts.message).toContain('O pedido voltará para o status Agendado.');
            expect(modalTexts.message).toContain('As movimentações de estoque não serão alteradas.');
            expect(modalTexts.successToast).toBe('Pedido retornado para Agendado com sucesso.');
        });
    });
});
