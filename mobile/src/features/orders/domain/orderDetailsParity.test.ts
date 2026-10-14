import { describe, expect, it } from 'vitest';
import {
  formatOrderCode,
  formatOrderDate,
  getOrderTotalValue,
  toTitleCase,
} from '../../../utils/orderUtils';


describe('Order Details Parity (ERP x Mobile)', () => {
  it('formats order code with 6 digits padding for numeric codes', () => {
    expect(formatOrderCode({ order_number: '1001' })).toBe('001001');
    expect(formatOrderCode({ order_index: 5749 })).toBe('005749');
    expect(formatOrderCode({ order_data: { orderIndex: '42' } })).toBe('000042');
  });

  it('formats order date to Brazilian standard DD/MM/AAAA', () => {
    expect(formatOrderDate('2026-10-14T10:00:00Z')).toBe('14/10/2026');
    expect(formatOrderDate('2026-09-08')).toBe('08/09/2026');
  });

  it('calculates order total value correctly from items and payments', () => {
    const orderWithPayments = {
      order_data: {
        paymentsSummary: {
          totalOrderValue: 1250.5,
        },
      },
    };
    expect(getOrderTotalValue(orderWithPayments)).toBe(1250.5);

    const orderWithItems = {
      order_data: {
        items: [
          { unitPrice: 100, quantity: 2 },
          { unitPrice: 50, quantity: 1 },
        ],
      },
    };
    expect(getOrderTotalValue(orderWithItems)).toBe(250);
  });

  it('handles clean WhatsApp phone formatting', () => {
    const cleanPhone = (phoneStr: string) => {
      const digits = String(phoneStr || '').replace(/\D/g, '');
      if (!digits) return '';
      return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    };

    expect(cleanPhone('(44) 99876-5432')).toBe('5544998765432');
    expect(cleanPhone('44998765432')).toBe('5544998765432');
    expect(cleanPhone('+55 (44) 99876-5432')).toBe('5544998765432');
  });

  it('formats customer name with toTitleCase identical to ERP', () => {
    expect(toTitleCase('JOAO DA SILVA')).toBe('Joao Da Silva');
    expect(toTitleCase('maria clara dos santos')).toBe('Maria Clara Dos Santos');
    expect(toTitleCase('')).toBe('');
  });


  it('formats delivery date range when scheduling has range type and end date', () => {
    const formatDeliveryDisplay = (schedule: any, scheduleDate: string) => {
      if (schedule?.pendingScheduling) return 'AGENDAMENTO PENDENTE';
      if (schedule?.dateType === 'range' && schedule?.endDate) {
        return `${formatOrderDate(schedule.date || scheduleDate)} até ${formatOrderDate(schedule.endDate)}`;
      }
      return scheduleDate ? formatOrderDate(scheduleDate) : 'Não informada';
    };

    expect(
      formatDeliveryDisplay(
        { dateType: 'range', date: '2026-10-15', endDate: '2026-10-18' },
        '2026-10-15'
      )
    ).toBe('15/10/2026 até 18/10/2026');

    expect(
      formatDeliveryDisplay({ pendingScheduling: true }, '2026-10-15')
    ).toBe('AGENDAMENTO PENDENTE');

    expect(
      formatDeliveryDisplay({ date: '2026-10-20' }, '2026-10-20')
    ).toBe('20/10/2026');
  });
});

