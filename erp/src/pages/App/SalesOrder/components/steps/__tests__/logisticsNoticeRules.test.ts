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
    it('considera montagem de entrega pelo agendamento e não pelo item legado', () => {
      const result = syncDeliveryAndAssemblyNotices({
        rawObservation: '', isSaleDelivery: true,
        shipping: { deliveryMethod: 'delivery', scheduling: { appointments: [
          { deliveryMethod: 'pickup', itemIds: ['a'], itemHandlings: { a: { handlingType: 'Na caixa > Montagem no local da entrega', assemblyResponsible: 'Nossa equipe' } } },
          { deliveryMethod: 'delivery', itemIds: ['a'], itemHandlings: { a: { handlingType: 'Na caixa > Montagem no local da entrega', assemblyResponsible: 'Montador terceirizado' } } },
        ] } },
        items: [{ orderItemId: 'a', handlingType: '', assemblyResponsible: '' }],
      });
      expect(result.nextObservation).toContain(ASSEMBLY_RESPONSIBLE_NOTICES['Montador terceirizado']);
      expect(result.nextObservation).not.toContain(ASSEMBLY_RESPONSIBLE_NOTICES['Nossa equipe']);
    });
    it('não transforma flags antigas de operação em observações gerais', () => {
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

      expect(result.changed).toBe(false);
      expect(result.nextObservation).toBe('');
    });

    it('remove tags antigas de avisos globais e preserva as observações do usuário', () => {
      const customText = 'Entregar somente após as 14h.';
      const initial = [
        customText,
        CALL_BEFORE_DELIVERY_NOTICE,
        BRING_CARD_MACHINE_NOTICE,
        CALL_ON_ARRIVAL_NOTICE,
      ].join('\n');
      const result = syncDeliveryAndAssemblyNotices({
        rawObservation: initial,
        isSaleDelivery: true,
        shipping: {
          deliveryMethod: 'delivery',
        },
        items: [],
      });

      expect(result.changed).toBe(true);
      expect(result.nextObservation).toContain(customText);
      expect(result.nextObservation).not.toContain(BRING_CARD_MACHINE_NOTICE);
      expect(result.nextObservation).not.toContain(CALL_BEFORE_DELIVERY_NOTICE);
      expect(result.nextObservation).not.toContain(CALL_ON_ARRIVAL_NOTICE);
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

    it('mantém observações customizadas ao remover tags globais antigas', () => {
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
      expect(result.nextObservation).not.toContain(CALL_ON_ARRIVAL_NOTICE);
      expect(result.nextObservation).not.toContain(BRING_CARD_MACHINE_NOTICE);
    });
  });
});
