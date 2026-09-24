import { describe, expect, it } from 'vitest';
import {
  validateOrderStatusTransition,
  canCancelOrderDirectly,
  canUndoFulfillment,
} from '../orderStatusTransitionRules';
import { resolveCompletedOrderStatus } from '../orderSchedulingStatus';
import Order from '../../types/order.type';

describe('[MÓDULO 1 - Etapa 1.2] Ciclo de vida e transições de status do pedido', () => {
  describe('validateOrderStatusTransition', () => {
    it('permite manter o mesmo status sem erro', () => {
      expect(validateOrderStatusTransition('draft', 'draft')).toEqual({ allowed: true });
      expect(validateOrderStatusTransition('scheduled', 'scheduled')).toEqual({ allowed: true });
      expect(validateOrderStatusTransition('fulfilled', 'fulfilled')).toEqual({ allowed: true });
      expect(validateOrderStatusTransition('cancelled', 'cancelled')).toEqual({ allowed: true });
    });

    it('permite transição de draft para scheduled ou fulfilled', () => {
      expect(validateOrderStatusTransition('draft', 'scheduled')).toEqual({ allowed: true });
      expect(validateOrderStatusTransition('draft', 'fulfilled')).toEqual({ allowed: true });
    });

    it('impede retorno de pedido já cadastrado para draft', () => {
      const fromScheduled = validateOrderStatusTransition('scheduled', 'draft');
      expect(fromScheduled.allowed).toBe(false);
      expect(fromScheduled.reason).toContain('não pode voltar para rascunho');

      const fromFulfilled = validateOrderStatusTransition('fulfilled', 'draft');
      expect(fromFulfilled.allowed).toBe(false);
      expect(fromFulfilled.reason).toContain('não pode voltar para rascunho');

      const fromCancelled = validateOrderStatusTransition('cancelled', 'draft');
      expect(fromCancelled.allowed).toBe(false);
    });

    it('impede alteração de pedido cancelado para qualquer outro status (status terminal)', () => {
      const toScheduled = validateOrderStatusTransition('cancelled', 'scheduled');
      expect(toScheduled.allowed).toBe(false);
      expect(toScheduled.reason).toContain('pedido cancelado não pode ter o status alterado');

      const toFulfilled = validateOrderStatusTransition('cancelled', 'fulfilled');
      expect(toFulfilled.allowed).toBe(false);
      expect(toFulfilled.reason).toContain('pedido cancelado não pode ter o status alterado');
    });

    it('permite transição de scheduled para fulfilled (entrega concluída) ou cancelled (cancelamento)', () => {
      expect(validateOrderStatusTransition('scheduled', 'fulfilled')).toEqual({ allowed: true });
      expect(validateOrderStatusTransition('scheduled', 'cancelled')).toEqual({ allowed: true });
    });

    it('permite desfazer atendimento (fulfilled -> scheduled)', () => {
      expect(validateOrderStatusTransition('fulfilled', 'scheduled')).toEqual({ allowed: true });
    });
  });

  describe('resolveCompletedOrderStatus (Conclusão do Formulário de Venda)', () => {
    it('retorna "draft" quando o tipo de pedido é orçamento (budget)', () => {
      const status = resolveCompletedOrderStatus({
        orderType: 'budget',
        shipping: { deliveryMethod: 'pickup' } as any,
      });
      expect(status).toBe('draft');
    });

    it('retorna "scheduled" para entrega padrão (deliveryMethod = delivery)', () => {
      const status = resolveCompletedOrderStatus({
        orderType: 'sale',
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: '2026-09-20', type: 'fixed', time: '14:00' },
        } as any,
      });
      expect(status).toBe('scheduled');
    });

    it('retorna "scheduled" para retirada com agendamento pendente', () => {
      const status = resolveCompletedOrderStatus({
        orderType: 'sale',
        shipping: {
          deliveryMethod: 'pickup',
          scheduling: { pendingScheduling: true },
        } as any,
      });
      expect(status).toBe('scheduled');
    });

    it('retorna "fulfilled" para retirada imediata sem data futura', () => {
      const status = resolveCompletedOrderStatus({
        orderType: 'sale',
        shipping: {
          deliveryMethod: 'pickup',
          scheduling: {},
        } as any,
      });
      expect(status).toBe('fulfilled');
    });

    it('retorna "fulfilled" para retirada com data igual ou anterior a hoje', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const status = resolveCompletedOrderStatus({
        orderType: 'sale',
        shipping: {
          deliveryMethod: 'pickup',
          scheduling: { date: todayStr },
        } as any,
      });
      expect(status).toBe('fulfilled');
    });

    it('retorna "scheduled" para retirada com data futura agendada', () => {
      const status = resolveCompletedOrderStatus({
        orderType: 'sale',
        shipping: {
          deliveryMethod: 'pickup',
          scheduling: { date: '2099-12-31' },
        } as any,
      });
      expect(status).toBe('scheduled');
    });
  });

  describe('canCancelOrderDirectly & canUndoFulfillment', () => {
    it('autoriza cancelamento apenas para pedidos scheduled', () => {
      expect(canCancelOrderDirectly({ status: 'scheduled', orderType: 'sale' })).toBe(true);
      expect(canCancelOrderDirectly({ status: 'fulfilled', orderType: 'sale' })).toBe(false);
      expect(canCancelOrderDirectly({ status: 'draft', orderType: 'sale' })).toBe(false);
      expect(canCancelOrderDirectly({ status: 'cancelled', orderType: 'sale' })).toBe(false);
    });

    it('autoriza desfazer atendimento apenas para pedidos fulfilled que não sejam devolução', () => {
      expect(canUndoFulfillment({ status: 'fulfilled', orderType: 'sale' })).toBe(true);
      expect(canUndoFulfillment({ status: 'fulfilled', orderType: 'showroom' })).toBe(true);
      expect(canUndoFulfillment({ status: 'fulfilled' })).toBe(true);
      expect(canUndoFulfillment({ status: 'fulfilled', orderType: 'return' })).toBe(false);
      expect(canUndoFulfillment({ status: 'scheduled', orderType: 'sale' })).toBe(false);
      expect(canUndoFulfillment({ status: 'draft', orderType: 'sale' })).toBe(false);
      expect(canUndoFulfillment({ status: 'cancelled', orderType: 'sale' })).toBe(false);
    });

    it('fluxo completo: pedido atendido deve primeiro desfazer atendimento antes de poder ser cancelado', () => {
      const orderAtendido = { status: 'fulfilled' as Order['status'], orderType: 'sale' };
      // 1. Não pode cancelar diretamente enquanto estiver atendido
      expect(canCancelOrderDirectly(orderAtendido)).toBe(false);
      // 2. Pode desfazer atendimento
      expect(canUndoFulfillment(orderAtendido)).toBe(true);
      expect(validateOrderStatusTransition(orderAtendido.status, 'scheduled')).toEqual({ allowed: true });

      // 3. Após desfazer e voltar para scheduled
      const orderAgendado = { status: 'scheduled' as Order['status'], orderType: 'sale' };
      // 4. Agora sim pode cancelar diretamente
      expect(canCancelOrderDirectly(orderAgendado)).toBe(true);
      expect(canUndoFulfillment(orderAgendado)).toBe(false);
      expect(validateOrderStatusTransition(orderAgendado.status, 'cancelled')).toEqual({ allowed: true });
    });
  });
});
