import { describe, expect, it } from 'vitest';
import { parseDashboardOrderDate } from './dashboardOrderDate';

describe('data comercial do pedido', () => {
  it('mantém no calendário local a data ISO sem horário', () => {
    const date = parseDashboardOrderDate('2026-11-02');
    expect(date && [date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2026, 11, 2]);
  });

  it('preserva o instante de uma data ISO com fuso', () => {
    expect(parseDashboardOrderDate('2026-11-02T02:30:00Z')?.toISOString()).toBe('2026-11-02T02:30:00.000Z');
  });

  it('interpreta data legada brasileira e rejeita datas inválidas', () => {
    const date = parseDashboardOrderDate('02/11/2026, 08:15:00');
    expect(date && [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()]).toEqual([2026, 11, 2, 8]);
    expect(parseDashboardOrderDate('31/02/2026')).toBeNull();
    expect(parseDashboardOrderDate('2026-02-31T12:00:00Z')).toBeNull();
    expect(parseDashboardOrderDate('not-a-date')).toBeNull();
  });
});
