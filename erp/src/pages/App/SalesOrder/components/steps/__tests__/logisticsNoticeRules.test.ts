import { describe, it, expect } from 'vitest';
import {
  hasPendingCardOnDelivery,
  syncDeliveryAndAssemblyNotices,
  CALL_BEFORE_DELIVERY_NOTICE,
  BRING_CARD_MACHINE_NOTICE,
  CALL_ON_ARRIVAL_NOTICE,
  ASSEMBLY_RESPONSIBLE_NOTICES,
} from '../logisticsNoticeRules';

describe('logisticsNoticeRules — Regras de Avisos de Logística e Montagem', () => {
  describe('hasPendingCardOnDelivery', () => {
    it('retorna true para venda com entrega e cartão pendente', () => {
      const isPending = hasPendingCardOnDelivery('sale', 'delivery', [
        { method: 'Cartão de Crédito', status: 'Pendente' },
      ]);
      expect(isPending).toBe(true);
    });

    it('retorna true para cartão de débito pendente', () => {
      const isPending = hasPendingCardOnDelivery('sale', 'delivery', [
        { method: 'Cartão de Débito', status: 'Pendente' },
      ]);
      expect(isPending).toBe(true);
    });

    it('retorna false para retirada no local (pickup)', () => {
      const isPending = hasPendingCardOnDelivery('sale', 'pickup', [
        { method: 'Cartão de Crédito', status: 'Pendente' },
      ]);
      expect(isPending).toBe(false);
    });

    it('retorna false para cartão já pago', () => {
      const isPending = hasPendingCardOnDelivery('sale', 'delivery', [
        { method: 'Cartão de Crédito', status: 'Pago' },
      ]);
      expect(isPending).toBe(false);
    });

    it('retorna false para Pix pendente', () => {
      const isPending = hasPendingCardOnDelivery('sale', 'delivery', [
        { method: 'Pix', status: 'Pendente' },
      ]);
      expect(isPending).toBe(false);
    });
  });

  describe('syncDeliveryAndAssemblyNotices', () => {
    it('adiciona aviso quando a flag de entrega está true e o aviso ainda não existe', () => {
      const result = syncDeliveryAndAssemblyNotices({
        rawObservation: '',
        isSaleDelivery: true,
        shipping: {
          deliveryMethod: 'delivery',
          bringCardMachine: true,
          callBeforeDelivery: true,
        },
        items: [],
      });

      expect(result.changed).toBe(true);
      expect(result.nextObservation).toContain(BRING_CARD_MACHINE_NOTICE);
      expect(result.nextObservation).toContain(CALL_BEFORE_DELIVERY_NOTICE);
    });

    it('remove aviso de entrega quando a flag passa para false', () => {
      const initial = `${BRING_CARD_MACHINE_NOTICE}\n${CALL_BEFORE_DELIVERY_NOTICE}`;
      const result = syncDeliveryAndAssemblyNotices({
        rawObservation: initial,
        isSaleDelivery: true,
        shipping: {
          deliveryMethod: 'delivery',
          bringCardMachine: false,
          callBeforeDelivery: true,
        },
        items: [],
      });

      expect(result.changed).toBe(true);
      expect(result.nextObservation).not.toContain(BRING_CARD_MACHINE_NOTICE);
      expect(result.nextObservation).toContain(CALL_BEFORE_DELIVERY_NOTICE);
    });

    it('adiciona aviso de montagem da nossa equipe para itens que requerem montagem', () => {
      const result = syncDeliveryAndAssemblyNotices({
        rawObservation: '',
        isSaleDelivery: true,
        shipping: { deliveryMethod: 'delivery' },
        items: [
          {
            handlingType: 'Na caixa > Montagem no local da entrega',
            assemblyResponsible: 'Nossa equipe',
          },
        ],
      });

      expect(result.changed).toBe(true);
      expect(result.nextObservation).toContain(ASSEMBLY_RESPONSIBLE_NOTICES['Nossa equipe']);
    });

    it('preserva observações customizadas enquanto sincroniza as tags do sistema', () => {
      const customText = 'Entregar somente após as 14h.';
      const result = syncDeliveryAndAssemblyNotices({
        rawObservation: `${customText}\n${CALL_ON_ARRIVAL_NOTICE}`,
        isSaleDelivery: true,
        shipping: {
          deliveryMethod: 'delivery',
          callOnArrival: true,
          bringCardMachine: true,
        },
        items: [],
      });

      expect(result.changed).toBe(true);
      expect(result.nextObservation).toContain(customText);
      expect(result.nextObservation).toContain(CALL_ON_ARRIVAL_NOTICE);
      expect(result.nextObservation).toContain(BRING_CARD_MACHINE_NOTICE);
    });
  });
});
