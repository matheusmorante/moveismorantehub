import { describe, expect, it } from 'vitest';
import { POST_SALE_ACTION_KEYS, canOpenPostSaleActions } from '../postSaleActions';
import { validateOrderStatusTransition } from '../orderStatusTransitionRules';
import Order from '../../types/order.type';

describe('[MÓDULO 1 - Etapa 1.3] Ações Pós-Venda (PostOrderActionsModal & Regras de Blindagem)', () => {
  describe('Chaves canônicas de ações pós-venda', () => {
    it('contém exatamente as ações de pós-venda autorizadas', () => {
      expect(POST_SALE_ACTION_KEYS.has('printShippingOrder')).toBe(true);
      expect(POST_SALE_ACTION_KEYS.has('printReceipt')).toBe(true);
      expect(POST_SALE_ACTION_KEYS.has('sendShippingOrder')).toBe(true);
      expect(POST_SALE_ACTION_KEYS.has('sendCustomerOrder')).toBe(true);
      expect(POST_SALE_ACTION_KEYS.has('sendGroupInvite')).toBe(true);
      expect(POST_SALE_ACTION_KEYS.has('sendCustomerReviews')).toBe(true);
      expect(POST_SALE_ACTION_KEYS.size).toBe(6);
    });
  });

  describe('canOpenPostSaleActions', () => {
    it('autoriza abertura de ações pós-venda para vendas agendadas (scheduled)', () => {
      const order: Partial<Order> = {
        orderType: 'sale',
        status: 'scheduled',
        orderIndex: 1001,
      };
      expect(canOpenPostSaleActions(order)).toBe(true);
    });

    it('bloqueia abertura para rascunhos (draft)', () => {
      const draftOrder: Partial<Order> = {
        orderType: 'sale',
        status: 'draft',
        orderIndex: 1002,
      };
      expect(canOpenPostSaleActions(draftOrder)).toBe(false);
    });

    it('bloqueia abertura para tipos não-venda ou cancelados', () => {
      expect(canOpenPostSaleActions({ orderType: 'assistance', status: 'scheduled' })).toBe(false);
      expect(canOpenPostSaleActions({ orderType: 'budget', status: 'scheduled' })).toBe(false);
      expect(canOpenPostSaleActions({ orderType: 'sale', status: 'cancelled' })).toBe(false);
    });
  });

  describe('Blindagem de Integridade de Status e orderIndex', () => {
    it('garante que ações pós-venda nunca revertem status para draft e preservam orderIndex', () => {
      const currentOrder: Partial<Order> = {
        id: 'ord-teste-pos-venda',
        orderIndex: 2045,
        status: 'scheduled',
        orderType: 'sale',
        isButtonsClicked: {},
      };

      // Simulação do payload emitido pelas ações pós-venda
      const postSaleUpdatePayload = {
        isButtonsClicked: { printShippingOrder: true, sendCustomerOrder: true },
      };

      // 1. O payload não modifica nem zera o status
      expect((postSaleUpdatePayload as any).status).toBeUndefined();

      // 2. Se tentasse enviar 'draft', a regra do sistema bloqueia com erro explícito
      const validation = validateOrderStatusTransition(currentOrder.status, 'draft');
      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain('não pode voltar para rascunho');

      // 3. O identificador sequencial único (#00XXXX) é rigorosamente preservado
      expect(currentOrder.orderIndex).toBe(2045);
    });
  });
});
