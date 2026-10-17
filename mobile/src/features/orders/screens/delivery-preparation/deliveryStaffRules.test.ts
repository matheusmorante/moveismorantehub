import { describe, it, expect } from 'vitest';
import {
  resolveInitialDeliveryResponsibles,
  addDeliveryResponsible,
  removeDeliveryResponsible,
  filterUnaddedStaff,
} from './deliveryStaffRules';

describe('deliveryStaffRules', () => {
  describe('resolveInitialDeliveryResponsibles', () => {
    it('deve selecionar automaticamente o operador logado a 0s quando o pedido não tem responsáveis', () => {
      const userProfile = { id: 'usr-1', fullName: 'Carlos Entregador', role: 'entregador' };
      const order = { id: 'ord-100', order_data: {} };

      const responsibles = resolveInitialDeliveryResponsibles(order, userProfile);

      expect(responsibles).toHaveLength(1);
      expect(responsibles[0]).toEqual({
        id: 'usr-1',
        name: 'Carlos Entregador',
        role: 'entregador',
      });
    });

    it('deve preservar responsáveis pré-existentes no pedido', () => {
      const order = {
        id: 'ord-100',
        order_data: {
          deliveryResponsibles: [
            { id: 'usr-9', name: 'Marcos Motorista', role: 'driver' },
            { id: 'usr-8', name: 'Lucas Ajudante', role: 'estoquista' },
          ],
        },
      };

      const responsibles = resolveInitialDeliveryResponsibles(order);

      expect(responsibles).toHaveLength(2);
      expect(responsibles[0].name).toBe('Marcos Motorista');
      expect(responsibles[1].name).toBe('Lucas Ajudante');
    });

    it('deve resolver deliveryResponsibleName textual legado quando existir', () => {
      const order = {
        id: 'ord-100',
        order_data: {
          deliveryResponsibleId: 'usr-7',
          deliveryResponsibleName: 'Roberto Entregador',
        },
      };

      const responsibles = resolveInitialDeliveryResponsibles(order);

      expect(responsibles).toHaveLength(1);
      expect(responsibles[0].name).toBe('Roberto Entregador');
      expect(responsibles[0].id).toBe('usr-7');
    });
  });

  describe('addDeliveryResponsible', () => {
    it('deve permitir adicionar novo responsável e evitar duplicatas case-insensitive', () => {
      const initial = [{ id: 'usr-1', name: 'Carlos', role: 'entregador' }];
      const updated = addDeliveryResponsible(initial, {
        id: 'usr-2',
        name: 'João Ajudante',
        role: 'estoquista',
      });

      expect(updated).toHaveLength(2);
      expect(updated[1].name).toBe('João Ajudante');

      // Tentar adicionar o mesmo nome com letras maiúsculas/minúsculas diferentes
      const duplicateAttempt = addDeliveryResponsible(updated, { name: '  joão ajudante  ' });
      expect(duplicateAttempt).toHaveLength(2);
    });

    it('não deve adicionar se o nome for vazio ou apenas espaços', () => {
      const initial = [{ id: 'usr-1', name: 'Carlos' }];
      const result = addDeliveryResponsible(initial, { name: '   ' });
      expect(result).toHaveLength(1);
    });
  });

  describe('removeDeliveryResponsible', () => {
    it('deve permitir remover responsável pelo índice mas nunca deixar a lista vazia (< 1)', () => {
      const initial = [
        { id: 'usr-1', name: 'Carlos' },
        { id: 'usr-2', name: 'Pedro' },
      ];

      const afterRemoveOne = removeDeliveryResponsible(initial, 1);
      expect(afterRemoveOne).toHaveLength(1);
      expect(afterRemoveOne[0].name).toBe('Carlos');

      // Tenta remover o único restante
      const attemptRemoveLast = removeDeliveryResponsible(afterRemoveOne, 0);
      expect(attemptRemoveLast).toHaveLength(1);
      expect(attemptRemoveLast[0].name).toBe('Carlos');
    });
  });

  describe('filterUnaddedStaff', () => {
    it('deve retornar apenas membros da equipe que ainda não foram adicionados', () => {
      const staffList = [
        { id: 'usr-1', fullName: 'Carlos Entregador', role: 'entregador' },
        { id: 'usr-2', fullName: 'João Estoquista', role: 'estoquista' },
        { id: 'usr-3', fullName: 'Mariana Gerente', role: 'gerente' },
      ];
      const currentResponsibles = [{ id: 'usr-1', name: 'Carlos Entregador' }];

      const unadded = filterUnaddedStaff(staffList, currentResponsibles);
      expect(unadded).toHaveLength(2);
      expect(unadded.map((s) => s.fullName)).toEqual(['João Estoquista', 'Mariana Gerente']);
    });
  });
});
