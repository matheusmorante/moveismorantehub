import { describe, expect, it } from 'vitest';
import Order from '../../types/order.type';
import {
    dashboardRevenueFactor,
    getDashboardRevenueImpact,
    getDefinitiveOrderValue,
    isDashboardSaleOrder,
} from './dashboardRevenue';

const order = (overrides: Partial<Order> = {}): Order => ({
    id: 'order-1',
    orderType: 'sale',
    status: 'scheduled',
    items: [],
    itemsSummary: { itemsTotalValue: 900 } as any,
    shipping: { value: 100 } as any,
    seller: 'Vendedor',
    payments: [],
    paymentsSummary: { totalOrderValue: 1000 } as any,
    customerData: {} as any,
    observation: '',
    date: '2026-09-06T12:00:00.000Z',
    ...overrides,
});

describe('faturamento definitivo do dashboard', () => {
    it.each(['scheduled', 'fulfilled'])('inclui venda %s', status => {
        const sale = order({ status });
        expect(isDashboardSaleOrder(sale)).toBe(true);
        expect(getDashboardRevenueImpact(sale)).toBe(1000);
    });

    it.each([
        { status: 'draft' },
        { status: 'cancelled' },
        { status: 'returned' },
        { status: 'scheduled', deleted: true },
        { status: 'scheduled', orderType: 'budget' as const },
        { status: 'scheduled', orderType: 'assistance' as const },
    ])('não inclui rascunho, cancelado, excluído ou documento não comercial: %j', overrides => {
        expect(dashboardRevenueFactor(order(overrides))).toBe(0);
    });

    it('deduz somente devolução atendida, sem deduzir devolução ainda agendada', () => {
        expect(getDashboardRevenueImpact(order({ orderType: 'return', status: 'scheduled' }))).toBe(0);
        expect(getDashboardRevenueImpact(order({ orderType: 'return', status: 'fulfilled' }))).toBe(-1000);
    });

    it('usa o total definitivo salvo mesmo quando ele é zero', () => {
        expect(getDefinitiveOrderValue(order({ paymentsSummary: { totalOrderValue: 0 } as any }))).toBe(0);
    });

    it('mantém fallback para pedidos históricos sem total definitivo', () => {
        expect(getDefinitiveOrderValue(order({ paymentsSummary: {} as any }))).toBe(1000);
    });
});
