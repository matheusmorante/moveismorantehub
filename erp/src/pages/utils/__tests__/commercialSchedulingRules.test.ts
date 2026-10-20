import { describe, expect, it } from 'vitest';
import {
  extractRawSchedulingObject,
  hasScheduleOptionPassed,
  resolveEffectiveSchedule,
  resolveScheduleOptionCutoffTime,
} from '../../../../../shared-utils/commercialSchedulingRules';
import { getOperationalScheduleDate } from '../operationalSchedule';
import { getDeliverySchedulePeriod } from '../../../../../mobile/src/features/logistics/utils/deliverySchedulePeriod';

describe('commercialSchedulingRules & operationalSchedule', () => {
  describe('extractRawSchedulingObject', () => {
    it('extrai agendamento de shipping.scheduling', () => {
      const order = {
        shipping: {
          scheduling: {
            date: '2026-10-25',
            period: 'morning',
            time: '09:00',
            alternatives: [{ date: '2026-10-26', period: 'afternoon' }],
          },
        },
      };
      const raw = extractRawSchedulingObject(order);
      expect(raw?.date).toBe('2026-10-25');
      expect(raw?.period).toBe('morning');
      expect(raw?.alternatives).toHaveLength(1);
    });

    it('extrai agendamento de order_data.scheduledDate / scheduling', () => {
      const order = {
        order_data: {
          scheduledDate: '2026-10-25',
          scheduledTime: '14:00',
          scheduling: {
            scheduleMode: 'period',
            period: 'afternoon',
          },
        },
      };
      const raw = extractRawSchedulingObject(order);
      expect(raw?.date).toBe('2026-10-25');
      expect(raw?.time).toBe('14:00');
      expect(raw?.period).toBe('afternoon');
    });
  });

  describe('resolveScheduleOptionCutoffTime & hasScheduleOptionPassed', () => {
    it('define horários limites corretos por período (São Paulo)', () => {
      expect(resolveScheduleOptionCutoffTime({ date: '2026-10-20', period: 'morning' })).toBe('12:00');
      expect(resolveScheduleOptionCutoffTime({ date: '2026-10-20', period: 'afternoon' })).toBe('18:00');
      expect(resolveScheduleOptionCutoffTime({ date: '2026-10-20', period: 'full_day' })).toBe('23:59');
      expect(resolveScheduleOptionCutoffTime({ date: '2026-10-20', time: '10:30' })).toBe('10:30');
    });

    it('identifica que opção no passado já expirou', () => {
      // Data de referência: 2026-10-20 14:00 SP (17:00 UTC)
      const refDate = new Date('2026-10-20T17:00:00Z');

      // Manhã do mesmo dia já passou (limite 12:00)
      expect(hasScheduleOptionPassed({ date: '2026-10-20', period: 'morning' }, refDate)).toBe(true);

      // Tarde do mesmo dia ainda NÃO passou (limite 18:00)
      expect(hasScheduleOptionPassed({ date: '2026-10-20', period: 'afternoon' }, refDate)).toBe(false);

      // Dia seguinte ainda NÃO passou
      expect(hasScheduleOptionPassed({ date: '2026-10-21', period: 'morning' }, refDate)).toBe(false);

      // Dia anterior já passou
      expect(hasScheduleOptionPassed({ date: '2026-10-19', period: 'full_day' }, refDate)).toBe(true);
    });
  });

  describe('resolveEffectiveSchedule (Invariantes de Reposicionamento e Card Único)', () => {
    it('mantém o agendamento definido como efetivo enquanto ele não passou', () => {
      // Referência: 2026-10-20 às 09:00 SP (12:00 UTC)
      const refDate = new Date('2026-10-20T12:00:00Z');

      const order = {
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            time: '10:00',
            alternatives: [
              { date: '2026-10-21', period: 'afternoon' },
              { date: '2026-10-22', period: 'morning' },
            ],
          },
        },
      };

      const resolution = resolveEffectiveSchedule(order, refDate);
      expect(resolution.isRepositioned).toBe(false);
      expect(resolution.effective?.date).toBe('2026-10-20');
      expect(resolution.defined?.date).toBe('2026-10-20');
      expect(resolution.alternatives).toHaveLength(2);
      expect(resolution.hasAlternatives).toBe(true);
    });

    it('reposiciona automaticamente para a 1ª alternativa quando a data/período definidos passam e pedido NÃO foi atendido', () => {
      // Referência: 2026-10-20 às 14:00 SP (17:00 UTC) -> Período da manhã (até 12:00) já passou
      const refDate = new Date('2026-10-20T17:00:00Z');

      const order = {
        status: 'scheduled',
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [
              { date: '2026-10-21', period: 'afternoon', notes: 'Segunda opção preferida' },
              { date: '2026-10-22', period: 'morning' },
            ],
          },
        },
      };

      const resolution = resolveEffectiveSchedule(order, refDate);

      // Deve estar reposicionado com rótulo de alternativo
      expect(resolution.isRepositioned).toBe(true);
      expect(resolution.isUsingAlternative).toBe(true);
      expect(resolution.repositionedFrom?.date).toBe('2026-10-20');

      // A opção efetiva passa a ser a data alternativa mais próxima válida
      expect(resolution.effective?.date).toBe('2026-10-21');
      expect(resolution.effective?.period).toBe('afternoon');
      expect(resolution.effective?.notes).toBe('Segunda opção preferida');

      // A data definida original é preservada para fins informativos no mesmo card
      expect(resolution.defined?.date).toBe('2026-10-20');

      // Todas as alternativas permanecem disponíveis para exibição no card único e recibos
      expect(resolution.alternatives).toHaveLength(2);
    });

    it('avança para a 2ª alternativa quando a 1ª alternativa também já expirou sem o pedido ser atendido', () => {
      // Referência: 2026-10-21 às 19:00 SP (22:00 UTC) -> 20/10 já passou e 21/10 afternoon já passou
      const refDate = new Date('2026-10-21T22:00:00Z');

      const order = {
        status: 'scheduled',
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [
              { date: '2026-10-21', period: 'afternoon' },
              { date: '2026-10-23', period: 'morning', notes: 'Terceira opção' },
            ],
          },
        },
      };

      const resolution = resolveEffectiveSchedule(order, refDate);

      expect(resolution.isRepositioned).toBe(true);
      expect(resolution.isUsingAlternative).toBe(true);
      expect(resolution.effective?.date).toBe('2026-10-23');
      expect(resolution.effective?.period).toBe('morning');
      expect(resolution.effective?.notes).toBe('Terceira opção');
      expect(resolution.defined?.date).toBe('2026-10-20');
    });

    it('quando o pedido está setado como atendido (status = fulfilled), NÃO avança para alternativas mesmo com data vencida', () => {
      // Data de referência: 2026-10-25
      const refDate = new Date('2026-10-25T12:00:00Z');

      const order = {
        status: 'fulfilled',
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [{ date: '2026-10-26', period: 'afternoon' }],
          },
        },
      };

      const resolution = resolveEffectiveSchedule(order, refDate);
      expect(resolution.isRepositioned).toBe(false);
      expect(resolution.isUsingAlternative).toBe(false);
      expect(resolution.effective?.date).toBe('2026-10-20');
    });

    it('quando o pedido NÃO está atendido e todas as alternativas expiraram, mantém na última alternativa com rótulo ALTERNATIVO sem regredir no tempo', () => {
      // Referência: 2026-10-25
      const refDate = new Date('2026-10-25T12:00:00Z');

      const order = {
        status: 'scheduled',
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [{ date: '2026-10-21', period: 'morning' }],
          },
        },
      };

      const resolution = resolveEffectiveSchedule(order, refDate);
      expect(resolution.effective?.date).toBe('2026-10-21');
      expect(resolution.isUsingAlternative).toBe(true);
      expect(resolution.isRepositioned).toBe(true);
      expect(resolution.defined?.date).toBe('2026-10-20');
    });

    it('invariante informativo: não lança erro nem bloqueia qualquer fluxo se não houver agendamento', () => {
      const order = { id: 'order-123', status: 'scheduled' };
      const resolution = resolveEffectiveSchedule(order);
      expect(resolution.effective).toBeNull();
      expect(resolution.defined).toBeNull();
      expect(resolution.alternatives).toEqual([]);
      expect(resolution.isRepositioned).toBe(false);
    });
  });

  describe('getOperationalScheduleDate com Reposicionamento Automático', () => {
    it('retorna a data efetiva alternativa quando a data principal já passou', () => {
      const refDate = new Date('2026-10-20T17:00:00Z'); // 14:00 SP
      const order = {
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [{ date: '2026-10-22', period: 'morning' }],
          },
        },
      };

      const opDate = getOperationalScheduleDate(order, refDate);
      expect(opDate).toBe('2026-10-22');
    });

    it('retorna a data original definida quando ainda não expirou', () => {
      const refDate = new Date('2026-10-20T11:00:00Z'); // 08:00 SP
      const order = {
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [{ date: '2026-10-22', period: 'morning' }],
          },
        },
      };

      const opDate = getOperationalScheduleDate(order, refDate);
      expect(opDate).toBe('2026-10-20');
    });
  });

  describe('getDeliverySchedulePeriod com Reposicionamento Automático', () => {
    it('resolve o período da alternativa efetiva', () => {
      const refDate = new Date('2026-10-20T17:00:00Z'); // 14:00 SP
      const order = {
        shipping: {
          scheduling: {
            date: '2026-10-20',
            period: 'morning',
            alternatives: [{ date: '2026-10-22', period: 'afternoon' }],
          },
        },
      };

      const period = getDeliverySchedulePeriod(order, refDate);
      expect(period.windowStart).toBe('13:00');
      expect(period.windowEnd).toBe('18:00');
      expect(period.label).toContain('13:00 às 18:00');
    });
  });
});
