import { describe, it, expect } from 'vitest';
import { extractScheduleSlot } from './scheduleSlots';

describe('scheduleSlots - Etapa 3.1: Semântica de agendamento', () => {
  it('deve identificar período da manhã sem cadeado', () => {
    const order = {
      order_data: {
        shipping: {
          scheduling: {
            type: 'morning',
            startTime: '08:00',
            endTime: '12:00'
          }
        }
      }
    };

    const result = extractScheduleSlot(order);
    expect(result.type).toBe('morning');
    expect(result.isFixedTime).toBe(false);
    expect(result.sublabel).toBe('08:00–12:00');
    expect(result.displayBadge).not.toContain('🔒');
    expect(result.displayBadge).not.toContain('#');
  });

  it('deve identificar período da tarde sem cadeado', () => {
    const order = {
      order_data: {
        shipping: {
          scheduling: {
            type: 'tarde',
            startTime: '13:00',
            endTime: '18:00'
          }
        }
      }
    };

    const result = extractScheduleSlot(order);
    expect(result.type).toBe('afternoon');
    expect(result.isFixedTime).toBe(false);
    expect(result.sublabel).toBe('13:00–18:00');
    expect(result.displayBadge).not.toContain('🔒');
  });

  it('deve identificar horário fixo com cadeado (🔒)', () => {
    const order = {
      order_data: {
        shipping: {
          scheduling: {
            type: 'fixed',
            startTime: '15:30'
          }
        }
      }
    };

    const result = extractScheduleSlot(order);
    expect(result.type).toBe('fixed');
    expect(result.isFixedTime).toBe(true);
    expect(result.sublabel).toBe('🔒 15:30');
    expect(result.displayBadge).toBe('🔒 15:30');
  });

  it('deve retornar não informado para agendamento vazio', () => {
    const order = {};
    const result = extractScheduleSlot(order);
    expect(result.type).toBe('not_informed');
    expect(result.isFixedTime).toBe(false);
    expect(result.sublabel).toBe('Horário Livre');
  });

  it('deve identificar horário comercial como período', () => {
    const order = {
      order_data: {
        shipping: {
          scheduling: {
            type: 'commercial'
          }
        }
      }
    };

    const result = extractScheduleSlot(order);
    expect(result.type).toBe('commercial');
    expect(result.isFixedTime).toBe(false);
    expect(result.sublabel).toBe('08:00–18:00');
    expect(result.displayBadge).not.toContain('🔒');
  });

  it('deve identificar período combinado', () => {
    const order = {
      order_data: {
        shipping: {
          scheduling: {
            startTime: '10:00',
            endTime: '14:00'
          }
        }
      }
    };

    const result = extractScheduleSlot(order);
    expect(result.type).toBe('commercial'); // fallback para PERÍODO COMBINADO no type commercial
    expect(result.label).toBe('PERÍODO COMBINADO');
    expect(result.isFixedTime).toBe(false);
    expect(result.sublabel).toBe('10:00–14:00');
    expect(result.displayBadge).not.toContain('🔒');
  });
});
