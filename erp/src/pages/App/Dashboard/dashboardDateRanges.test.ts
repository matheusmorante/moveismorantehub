import { describe, expect, it } from 'vitest';
import { buildDashboardIntervals, toLocalDateInputValue } from './dashboardDateRanges';

const date = (value: string) => new Date(`${value}T12:00:00`);
const day = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

describe('intervalos do Dashboard', () => {
  it('compara o mês atual até o mesmo dia do mês anterior', () => {
    const { current, prev } = buildDashboardIntervals('month', date('2026-11-15'));
    expect(day(current.start)).toBe('2026-11-01');
    expect(day(current.end)).toBe('2026-11-15');
    expect(day(prev.start)).toBe('2026-10-01');
    expect(day(prev.end)).toBe('2026-10-15');
  });

  it('limita comparação do ano ao mesmo dia do ano anterior', () => {
    const { prev } = buildDashboardIntervals('year', date('2026-11-02'));
    expect(day(prev.start)).toBe('2025-01-01');
    expect(day(prev.end)).toBe('2025-11-02');
  });

  it('compara mês específico com o mesmo intervalo do mês anterior, limitado ao mês', () => {
    const { current, prev } = buildDashboardIntervals('specific_month', date('2026-11-02'), undefined, undefined, '2026-03');
    expect(day(current.start)).toBe('2026-03-01');
    expect(day(current.end)).toBe('2026-03-31');
    expect(day(prev.start)).toBe('2026-02-01');
    expect(day(prev.end)).toBe('2026-02-28');
  });

  it('normaliza datas personalizadas invertidas e cria uma janela anterior equivalente', () => {
    const { current, prev } = buildDashboardIntervals('custom', date('2026-11-02'), '2026-11-10', '2026-11-08');
    expect(day(current.start)).toBe('2026-11-08');
    expect(day(current.end)).toBe('2026-11-10');
    expect(day(prev.start)).toBe('2026-11-05');
    expect(day(prev.end)).toBe('2026-11-07');
  });

  it('substitui datas personalizadas inválidas por limites locais seguros', () => {
    const { current } = buildDashboardIntervals('custom', date('2026-11-02'), '2026-02-31', 'invalid');
    expect(day(current.start)).toBe('2026-10-26');
    expect(day(current.end)).toBe('2026-11-02');
  });

  it('formata o valor do input date usando o calendário local', () => {
    expect(toLocalDateInputValue(date('2026-11-02'))).toBe('2026-11-02');
  });
});
