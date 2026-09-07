import Order from '../../types/order.type';

const REVENUE_STATUSES = new Set(['scheduled', 'fulfilled']);

const normalizedStatus = (order: Order): string => String(order.status || '').trim().toLowerCase();

/** Venda comercial válida para os indicadores do dashboard. */
export const isDashboardSaleOrder = (order: Order | null | undefined): order is Order => {
    if (!order || order.deleted || !REVENUE_STATUSES.has(normalizedStatus(order))) return false;
    const orderType = order.orderType || 'sale';
    return orderType === 'sale' || orderType === 'showroom';
};

/** Devolução já efetivada; devolução apenas agendada ainda não reduz faturamento. */
export const isFulfilledReturnOrder = (order: Order | null | undefined): order is Order =>
    Boolean(order && !order.deleted && order.orderType === 'return' && normalizedStatus(order) === 'fulfilled');

/** +1 para venda, -1 para devolução efetivada e 0 para qualquer fato sem faturamento. */
export const dashboardRevenueFactor = (order: Order | null | undefined): -1 | 0 | 1 => {
    if (isDashboardSaleOrder(order)) return 1;
    if (isFulfilledReturnOrder(order)) return -1;
    return 0;
};

/**
 * Lê o total definitivo salvo no pedido. O fallback atende somente documentos
 * legados que ainda não possuíam paymentsSummary.totalOrderValue.
 */
export const getDefinitiveOrderValue = (order: Order): number => {
    const savedTotal = order.paymentsSummary?.totalOrderValue;
    if (savedTotal !== null && savedTotal !== undefined && Number.isFinite(Number(savedTotal))) {
        return Number(savedTotal);
    }

    const legacyItemsSummary = order.itemsSummary as any;
    const itemsTotal = Number(legacyItemsSummary?.itemsTotalValue ?? legacyItemsSummary?.totalValue ?? 0);
    const shipping = Number(order.shipping?.value ?? 0);
    return (Number.isFinite(itemsTotal) ? itemsTotal : 0) + (Number.isFinite(shipping) ? shipping : 0);
};

export const getDashboardRevenueImpact = (order: Order): number =>
    dashboardRevenueFactor(order) * getDefinitiveOrderValue(order);
