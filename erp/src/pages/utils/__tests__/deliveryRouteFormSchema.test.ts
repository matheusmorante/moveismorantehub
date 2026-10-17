import { describe, it, expect } from 'vitest';
import {
  deliveryResponsibleSchema,
  deliveryRouteFormSchema,
} from '../../../../../shared-utils/operationsFormSchemas';
import { mapOrderFromDatabase } from '../orderMapper/mapOrderFromDatabase';
import { buildOrderPersistencePayload } from '../orderPersistencePayload';
import type Order from '../../types/order.type';

describe('deliveryRouteFormSchema e Persistência de Responsáveis pela Entrega', () => {
  describe('deliveryResponsibleSchema', () => {
    it('deve aceitar um responsável válido com id, name e role', () => {
      const valid = { id: 'usr-1', name: 'João Carlos', role: 'Entregador' };
      const parsed = deliveryResponsibleSchema.parse(valid);
      expect(parsed).toEqual(valid);
    });

    it('deve aceitar apenas name válido', () => {
      const valid = { name: 'Maria Silva' };
      const parsed = deliveryResponsibleSchema.parse(valid);
      expect(parsed.name).toBe('Maria Silva');
    });

    it('deve rejeitar nome em branco', () => {
      const invalid = { name: '   ' };
      expect(() => deliveryResponsibleSchema.parse(invalid)).toThrow(
        'Informe o nome do responsável.'
      );
    });
  });

  describe('deliveryRouteFormSchema', () => {
    it('deve validar formulário de rota com múltiplos responsáveis', () => {
      const form = {
        orderId: 'order-123',
        checklist: [{ id: 'chk-1', checked: true }],
        responsibles: [
          { id: 'usr-1', name: 'Carlos Entregador', role: 'entregador' },
          { id: 'usr-2', name: 'Lucas Ajudante', role: 'estoquista' },
        ],
      };
      const result = deliveryRouteFormSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.responsibles).toHaveLength(2);
        expect(result.data.responsibles?.[0].name).toBe('Carlos Entregador');
      }
    });

    it('deve rejeitar lista vazia de responsáveis quando informada', () => {
      const form = {
        orderId: 'order-123',
        checklist: [],
        responsibles: [],
      };
      const result = deliveryRouteFormSchema.safeParse(form);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Adicione pelo menos um responsável pela entrega.');
      }
    });

    it('deve rejeitar se orderId não for fornecido', () => {
      const form = {
        orderId: '',
        checklist: [],
        responsibles: [{ name: 'Carlos' }],
      };
      const result = deliveryRouteFormSchema.safeParse(form);
      expect(result.success).toBe(false);
    });
  });

  describe('Mapeamento e Persistência no Banco', () => {
    it('mapOrderFromDatabase deve extrair múltiplos responsáveis e nomes consolidados do JSONB', () => {
      const dbRow = {
        id: 'ped-999',
        order_number: 1001,
        seller_id: 'sel-1',
        status: 'in_transit',
        created_at: '2026-10-17T12:00:00Z',
        order_data: {
          deliveryResponsibleId: 'usr-1',
          deliveryResponsibleName: 'Carlos Entregador, Lucas Ajudante',
          deliveryResponsibles: [
            { id: 'usr-1', name: 'Carlos Entregador', role: 'entregador' },
            { id: 'usr-2', name: 'Lucas Ajudante', role: 'estoquista' },
          ],
        },
      };

      const mapped = mapOrderFromDatabase(dbRow);
      expect(mapped.deliveryResponsibleId).toBe('usr-1');
      expect(mapped.deliveryResponsibleName).toBe('Carlos Entregador, Lucas Ajudante');
      expect(mapped.deliveryResponsibles).toHaveLength(2);
      expect(mapped.deliveryResponsibles?.[1].name).toBe('Lucas Ajudante');
    });

    it('buildOrderPersistencePayload deve preservar deliveryResponsibles em order_data', () => {
      const order: Partial<Order> = {
        id: 'ped-999',
        status: 'in_transit',
        deliveryResponsibleId: 'usr-1',
        deliveryResponsibleName: 'Carlos Entregador',
        deliveryResponsibles: [{ id: 'usr-1', name: 'Carlos Entregador', role: 'entregador' }],
      };

      const payload = buildOrderPersistencePayload(order as Order);
      expect(payload.order_data).toBeDefined();
      expect(payload.order_data.deliveryResponsibleId).toBe('usr-1');
      expect(payload.order_data.deliveryResponsibleName).toBe('Carlos Entregador');
      expect(payload.order_data.deliveryResponsibles).toHaveLength(1);
    });
  });
});
