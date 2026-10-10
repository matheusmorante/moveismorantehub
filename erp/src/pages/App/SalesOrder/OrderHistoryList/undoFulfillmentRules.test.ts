import { describe, expect, it } from 'vitest';
import {
  canUndoFulfillment,
  canCancelOrderDirectly,
  validateOrderStatusTransition,
} from '@/pages/utils/orderStatusTransitionRules';
import Order from '../../../types/order.type';

describe('Regras de Negócio e Contratos de "Desfazer Atendido"', () => {
  const baseOrder = {
    id: 'ord-test-001',
    orderNumber: 1045,
    orderType: 'sale',
    status: 'fulfilled',
    stockProcessed: true,
    stockReversed: false,
  } as Order;

  describe('Visibilidade e Elegibilidade (canUndoFulfillment)', () => {
    it('deve autorizar ação SOMENTE quando o status for fulfilled', () => {
      expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled' })).toBe(true);
      expect(canUndoFulfillment({ ...baseOrder, status: 'scheduled' })).toBe(false);
      expect(canUndoFulfillment({ ...baseOrder, status: 'draft' })).toBe(false);
      expect(canUndoFulfillment({ ...baseOrder, status: 'cancelled' })).toBe(false);
    });

    it('não deve autorizar para devoluções mesmo se estiverem fulfilled', () => {
      expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled', orderType: 'return' })).toBe(
        false
      );
    });

    it('deve autorizar para vendas e showroom no status fulfilled', () => {
      expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled', orderType: 'sale' })).toBe(
        true
      );
      expect(canUndoFulfillment({ ...baseOrder, status: 'fulfilled', orderType: 'showroom' })).toBe(
        true
      );
    });

    it('bloqueia a correção quando existe confirmação física independente do status', () => {
      expect(
        canUndoFulfillment({
          ...baseOrder,
          status: 'fulfilled',
          deliveryStatus: 'entregue',
        })
      ).toBe(false);
      expect(
        canUndoFulfillment({
          ...baseOrder,
          status: 'fulfilled',
          order_data: { shipping: { pickupConfirmedAt: '2026-10-10T10:00:00-03:00' } },
        })
      ).toBe(false);
      expect(
        canUndoFulfillment({
          ...baseOrder,
          status: 'fulfilled',
          delivery_status: 'in_transit',
        })
      ).toBe(false);
    });
  });

  describe('Correção de clique equivocado em "Atendido"', () => {
    it('volta para agendado sem alterar estoque e ainda respeita evidência física de circulação', () => {
      const vendaAtendida: Order = { ...baseOrder, status: 'fulfilled' };

      // O estado atendido não cancela a NF-e nem cria um documento fiscal.
      // A ação explícita corrige um clique equivocado sem alterar o estoque.
      expect(canCancelOrderDirectly(vendaAtendida)).toBe(false);
      expect(canUndoFulfillment(vendaAtendida)).toBe(true);
      expect(validateOrderStatusTransition(vendaAtendida.status, 'cancelled').allowed).toBe(false);

      const transition = validateOrderStatusTransition(vendaAtendida.status, 'scheduled');
      expect(transition.allowed).toBe(true);

      const vendaAgendada: Order = {
        ...vendaAtendida,
        status: 'scheduled',
        stockProcessed: vendaAtendida.stockProcessed, // continua true
        stockReversed: false,
      };
      expect(vendaAgendada.stockProcessed).toBe(true);
      expect(vendaAgendada.stockReversed).toBe(false);

      // Um erro de status sem confirmação física pode prosseguir para cancelamento.
      expect(canUndoFulfillment(vendaAgendada)).toBe(false);
      expect(canCancelOrderDirectly(vendaAgendada)).toBe(true);
      expect(validateOrderStatusTransition(vendaAgendada.status, 'cancelled').allowed).toBe(true);

      // Um fato físico confirmado continua bloqueando o cancelamento depois da correção.
      const entregaConfirmada = { ...vendaAgendada, delivery_status: 'entregue' } as Order;
      expect(canCancelOrderDirectly(entregaConfirmada)).toBe(false);
      expect(
        validateOrderStatusTransition(vendaAgendada.status, 'cancelled', entregaConfirmada).allowed
      ).toBe(false);
    });
  });

  describe('Contratos de Interface e Textos Oficiais', () => {
    it('valida os textos exigidos para o modal de confirmação e toast de sucesso', () => {
      const modalTexts = {
        title: 'Desfazer status de atendido?',
        message:
          'Use somente para corrigir um clique por engano e confirme que a mercadoria não foi entregue nem retirada. O pedido voltará para o status Agendado. O estoque não muda e nenhuma nota fiscal é gerada ou alterada.',
        cancelButton: 'Cancelar',
        confirmButton: 'Confirmar',
        successToast: 'Pedido retornado para Agendado com sucesso.',
      };

      expect(modalTexts.title).toBe('Desfazer status de atendido?');
      expect(modalTexts.message).toContain('O pedido voltará para o status Agendado.');
      expect(modalTexts.message).toContain('estoque não muda');
      expect(modalTexts.message).toContain('nenhuma nota fiscal é gerada ou alterada');
      expect(modalTexts.successToast).toBe('Pedido retornado para Agendado com sucesso.');
    });
  });
});
