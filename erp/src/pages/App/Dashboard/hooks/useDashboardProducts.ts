import { useMemo, useState } from 'react';
import Order from '../../../types/order.type';

export interface ProductStat {
    productId: string;
    variationId?: string;
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
    margin: number;
}

export type StalledPeriod = 30 | 60 | 90;

export interface ProductsData {
    topByQuantity: ProductStat[];
    topByRevenue: ProductStat[];
    topByProfit: ProductStat[];
    stalled: ProductStat[];
    stalledPeriod: StalledPeriod;
    setStalledPeriod: (p: StalledPeriod) => void;
}

export const useDashboardProducts = (
    filteredOrders: Order[],
    allActiveOrders: Order[]
): ProductsData => {
    const [stalledPeriod, setStalledPeriod] = useState<StalledPeriod>(60);

    const productMap = useMemo(() => {
        const map = new Map<string, ProductStat>();

        for (const order of filteredOrders) {
            if (!['scheduled', 'fulfilled'].includes(order.status || '') || order.orderType === 'return') continue;
            for (const item of (order.items || [])) {
                if (!item.productId || item.isTemporaryProduct) continue;
                const key = item.variationId ? item.variationId : item.productId;
                const existing = map.get(key) || {
                    productId: item.productId,
                    variationId: item.variationId,
                    name: item.description,
                    quantity: 0,
                    revenue: 0,
                    profit: 0,
                    margin: 0,
                };
                const revenue = (item.unitPrice - item.unitDiscount) * item.quantity;
                const unitCost = item.unitCost ?? item.costPrice ?? 0;
                const cost = unitCost * item.quantity;
                existing.quantity += item.quantity;
                existing.revenue += revenue;
                existing.profit += revenue - cost;
                map.set(key, existing);
            }
        }

        const result = Array.from(map.values()).map(p => ({
            ...p,
            margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
        }));
        return result;
    }, [filteredOrders]);

    const stalledProductIds = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - stalledPeriod);

        const activeInPeriod = new Set<string>();
        for (const order of allActiveOrders) {
            const orderDate = order.date ? new Date(order.date) : null;
            if (!orderDate || orderDate < cutoff) continue;
            if (!['scheduled', 'fulfilled'].includes(order.status || '') || order.orderType === 'return') continue;
            for (const item of (order.items || [])) {
                if (item.productId) activeInPeriod.add(item.variationId || item.productId);
            }
        }

        return productMap.filter(p => !activeInPeriod.has(p.variationId || p.productId));
    }, [productMap, allActiveOrders, stalledPeriod]);

    const top5 = (arr: ProductStat[], key: 'quantity' | 'revenue' | 'profit'): ProductStat[] =>
        [...arr].sort((a, b) => b[key] - a[key]).slice(0, 5);

    return {
        topByQuantity: top5(productMap, 'quantity'),
        topByRevenue: top5(productMap, 'revenue'),
        topByProfit: top5(productMap, 'profit'),
        stalled: stalledProductIds.slice(0, 10),
        stalledPeriod,
        setStalledPeriod,
    };
};
