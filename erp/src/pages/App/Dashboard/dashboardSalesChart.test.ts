import { describe, expect, it, vi } from 'vitest';
import { isSameDay, subDays, subMonths } from 'date-fns';
import type Order from '../../types/order.type';
import { dashboardRevenueFactor, getDashboardRevenueImpact, getDefinitiveOrderValue, isDashboardSaleOrder } from './dashboardRevenue';

vi.mock('./hooks/useDashboardQueries', () => ({ useDashboardQueries: vi.fn() }));
import { buildDashboardSalesChart, calcOrderCmv, parsePTBRDatePublic, type Period } from './useDashboardData';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Referência da implementação anterior: percorre os pedidos para cada ponto do gráfico.
function previousChart(orders: Order[], interval: { start: Date; end: Date }, period: Period) {
  const hourly = period === 'today' || period === 'yesterday';
  const monthly = period === 'year' || period === 'last_semester';
  const dates: Date[] = [];
  let cursor = new Date(interval.start);
  if (hourly) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(interval.start);
      date.setHours(hour, 0, 0, 0);
      dates.push(date);
    }
  } else {
    while (cursor <= interval.end) {
      dates.push(new Date(cursor));
      cursor = monthly ? subMonths(cursor, -1) : subDays(cursor, -1);
    }
  }
  return dates.map((date) => {
    const group = orders.filter((order) => {
      const orderDate = parsePTBRDatePublic(order.date);
      if (!orderDate) return false;
      if (hourly) return orderDate.getHours() === date.getHours() && isSameDay(orderDate, date);
      if (monthly) return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
      return isSameDay(orderDate, date);
    }).filter((order) => dashboardRevenueFactor(order) !== 0);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const name = hourly ? `${date.getHours()}h` : monthly ? `${months[date.getMonth()]}/${year}`
      : period === 'custom' ? `${day}/${month}/${year}` : `${day}/${month}`;
    return {
      name,
      valor: group.reduce((sum, order) => sum + getDashboardRevenueImpact(order), 0),
      lucro: group.reduce((sum, order) => sum + dashboardRevenueFactor(order) * (getDefinitiveOrderValue(order) - calcOrderCmv(order).cmv), 0),
      orders: group.filter(isDashboardSaleOrder).length,
    };
  });
}

const order = (date: string, overrides: Partial<Order> = {}): Order => ({
  id: 'synthetic-order', status: 'scheduled', orderType: 'sale', date,
  items: [{ productId: 'p1', quantity: 2, costPrice: 15 }] as Order['items'],
  itemsSummary: { itemsTotalValue: 100 } as Order['itemsSummary'],
  paymentsSummary: { totalOrderValue: 100 } as Order['paymentsSummary'],
  shipping: {} as Order['shipping'], customerData: {} as Order['customerData'],
  payments: [], seller: '', observation: '', ...overrides,
});

describe('agregação do gráfico do dashboard', () => {
  const orders = [
    order(new Date(2026, 10, 1, 9, 30).toISOString()),
    order(new Date(2026, 10, 1, 9, 45).toISOString(), { status: 'fulfilled', orderType: 'return', paymentsSummary: { totalOrderValue: 20 } as Order['paymentsSummary'] }),
    order(new Date(2026, 10, 1, 22).toISOString(), { status: 'cancelled' }),
    order(new Date(2026, 9, 31, 12).toISOString(), { status: 'fulfilled', orderType: 'showroom' }),
    order(new Date(2026, 5, 15, 12).toISOString(), { status: 'draft' }),
    order('data inválida'),
  ];

  it.each([
    ['today', new Date(2026, 10, 1), new Date(2026, 10, 1, 23, 59, 59)],
    ['custom', new Date(2026, 9, 30), new Date(2026, 10, 2, 23, 59, 59)],
    ['year', new Date(2026, 0, 1), new Date(2026, 10, 2, 23, 59, 59)],
    ['last_semester', new Date(2026, 4, 2), new Date(2026, 10, 2, 23, 59, 59)],
  ] as const)('preserva os pontos e valores para %s', (period, start, end) => {
    expect(buildDashboardSalesChart(orders, { start, end }, period)).toEqual(previousChart(orders, { start, end }, period));
  });

  it('atualiza a contribuição quando valor, data, status ou tipo muda', () => {
    const interval = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 2, 23, 59, 59) };
    const initial = order(new Date(2026, 10, 1, 10).toISOString());
    const edited = order(new Date(2026, 10, 2, 10).toISOString(), { paymentsSummary: { totalOrderValue: 140 } as Order['paymentsSummary'] });
    expect(buildDashboardSalesChart([initial], interval, 'custom').map((point) => point.valor)).toEqual([100, 0]);
    expect(buildDashboardSalesChart([edited], interval, 'custom').map((point) => point.valor)).toEqual([0, 140]);
    expect(buildDashboardSalesChart([{ ...edited, status: 'cancelled' }], interval, 'custom').map((point) => point.valor)).toEqual([0, 0]);
    expect(buildDashboardSalesChart([{ ...edited, status: 'fulfilled', orderType: 'return' }], interval, 'custom').map((point) => point.valor)).toEqual([0, -140]);
    expect(buildDashboardSalesChart([], interval, 'custom').map((point) => point.orders)).toEqual([0, 0]);
  });

  it('interpreta data comercial sem fuso como data local, sem deslocar para o dia anterior', () => {
    const parsed = parsePTBRDatePublic('2026-11-02');
    expect(parsed && [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()]).toEqual([2026, 11, 2]);
  });

  it('monta o gráfico agregado sem pedidos detalhados e preenche intervalos vazios', () => {
    const interval = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 3, 23, 59, 59) };
    expect(buildDashboardSalesChart([], interval, 'custom', [
      { bucket: '2026-11-02T00:00:00', valor: -20, lucro: -5, orders: 0 },
    ])).toEqual([
      { name: '01/11/26', valor: 0, lucro: 0, orders: 0 },
      { name: '02/11/26', valor: -20, lucro: -5, orders: 0 },
      { name: '03/11/26', valor: 0, lucro: 0, orders: 0 },
    ]);
  });

  it('mantém a equivalência em volume e registra o custo dos dois cálculos', () => {
    const interval = { start: new Date(2026, 0, 1), end: new Date(2026, 5, 29, 23, 59, 59) };
    const sample = Array.from({ length: 3000 }, (_, index) =>
      order(new Date(2026, 0, 1 + (index % 180), index % 24).toISOString(), {
        status: index % 13 === 0 ? 'cancelled' : 'fulfilled',
        orderType: index % 17 === 0 ? 'return' : 'sale',
      })
    );
    const startOld = performance.now();
    const expected = previousChart(sample, interval, 'custom');
    const oldMs = performance.now() - startOld;
    const startNew = performance.now();
    const actual = buildDashboardSalesChart(sample, interval, 'custom');
    const newMs = performance.now() - startNew;
    expect(actual).toEqual(expected);
    console.info(`[dashboard] gráfico sintético: anterior ${oldMs.toFixed(1)} ms; atual ${newMs.toFixed(1)} ms`);
  });
});
