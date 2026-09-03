import { useState, useEffect, useMemo } from 'react';
import { subscribeToOrders } from '../../utils/orderHistoryService';
import Order from '../../types/order.type';
import { isSameDay, subDays, differenceInCalendarDays, startOfDay, endOfDay, subMonths, isWithinInterval } from 'date-fns';

export type Period = 'custom' | 'today' | 'yesterday' | 'week' | 'month' | 'last_30_days' | 'last_month' | 'last_semester' | 'year';

export interface SalesHistory {
    date: string;
    valor: number;
    lucro: number;
    orders: number;
}

export interface DashboardStats {
    totalSales: number;
    saleCount: number;
    totalOrdersCount: number;
    /** Lucro bruto usando unitCost real (CMV por CMPM) */
    totalProfit: number;
    /** Margem bruta em % */
    grossMargin: number;
    /** CMV total do período */
    totalCmv: number;
    /** true se algum item não teve unitCost calculável */
    cmvPartial: boolean;
    /** Qtd de itens sem custo calculável */
    itemsWithoutCost: number;
    avgTicket: number;
    pendingOrders: number;
    activeSchedules: number;
    totalKmDriven: number;
    paidTrafficSalesValue: number;
}

const parsePTBRDate = (dateStr: any): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    try {
        if (dateStr.includes('-')) {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        }
        const dayPartMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dayPartMatch) return null;
        const [_, day, month, year] = dayPartMatch;
        const [__, timePart] = dateStr.split(', ');
        let hour = 0, minute = 0, second = 0;
        if (timePart) {
            const [h, min, s] = timePart.split(':');
            hour = parseInt(h) || 0;
            minute = parseInt(min) || 0;
            second = parseInt(s) || 0;
        }
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, minute, second);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    } catch {
        return null;
    }
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendado',
    fulfilled: 'Atendido',
    cancelled: 'Cancelado'
};

const startOfLocalDay = (dateStr: string) => new Date(dateStr + "T00:00:00");
const endOfLocalDay = (dateStr: string) => new Date(dateStr + "T23:59:59");

/** Calcula o CMV real de um pedido usando unitCost dos itens (CMPM histórico) */
export const calcOrderCmv = (order: Order): { cmv: number; partial: boolean; itemsWithout: number } => {
    let cmv = 0;
    let itemsWithout = 0;
    for (const item of (order.items || [])) {
        if (item.isTemporaryProduct || !item.productId) continue;
        const qty = item.quantity || 0;
        const unitCost = item.unitCost ?? item.costPrice ?? null;
        if (unitCost === null || unitCost === undefined) {
            itemsWithout++;
        } else {
            cmv += qty * unitCost;
        }
    }
    return { cmv, partial: itemsWithout > 0, itemsWithout };
};

export const parsePTBRDatePublic = parsePTBRDate;

export const useDashboardData = (period: Period, customStartDate?: string, customEndDate?: string) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((fetchedOrders: Order[]) => {
            setOrders(fetchedOrders);
            setLoading(false);
        });
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    const intervals = useMemo(() => {
        const now = new Date();
        let currentInterval: { start: Date, end: Date };
        let prevInterval: { start: Date, end: Date };

        switch (period) {
            case 'today':
                currentInterval = { start: startOfDay(now), end: endOfDay(now) };
                prevInterval = { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
                break;
            case 'yesterday':
                currentInterval = { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
                prevInterval = { start: startOfDay(subDays(now, 2)), end: endOfDay(subDays(now, 2)) };
                break;
            case 'week':
                currentInterval = { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
                prevInterval = { start: startOfDay(subDays(now, 13)), end: endOfDay(subDays(now, 7)) };
                break;
            case 'month':
                currentInterval = { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
                prevInterval = { start: startOfDay(subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1)), end: endOfDay(subDays(new Date(now.getFullYear(), now.getMonth(), 1), 1)) };
                break;
            case 'last_30_days':
                currentInterval = { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
                prevInterval = { start: startOfDay(subDays(now, 59)), end: endOfDay(subDays(now, 30)) };
                break;
            case 'last_month': {
                const firstOfLastMonth = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1);
                const lastOfLastMonth = subDays(new Date(now.getFullYear(), now.getMonth(), 1), 1);
                currentInterval = { start: startOfDay(firstOfLastMonth), end: endOfDay(lastOfLastMonth) };
                prevInterval = { start: startOfDay(subMonths(firstOfLastMonth, 1)), end: endOfDay(subDays(firstOfLastMonth, 1)) };
                break;
            }
            case 'last_semester':
                currentInterval = { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
                prevInterval = { start: startOfDay(subMonths(now, 12)), end: endOfDay(subMonths(now, 6)) };
                break;
            case 'year':
                currentInterval = { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
                prevInterval = { start: startOfDay(new Date(now.getFullYear() - 1, 0, 1)), end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)) };
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    const s = startOfLocalDay(customStartDate);
                    const e = endOfLocalDay(customEndDate);
                    const diff = Math.abs(differenceInCalendarDays(e, s)) + 1;
                    currentInterval = { start: s, end: e };
                    prevInterval = { start: startOfDay(subDays(s, diff)), end: endOfDay(subDays(s, 1)) };
                } else {
                    currentInterval = { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
                    prevInterval = { start: startOfDay(subDays(now, 14)), end: endOfDay(subDays(now, 8)) };
                }
                break;
            default:
                currentInterval = { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
                prevInterval = { start: startOfDay(subDays(now, 14)), end: endOfDay(subDays(now, 8)) };
        }

        return { current: currentInterval, prev: prevInterval };
    }, [period, customStartDate, customEndDate]);

    const calculateStats = (filteredOrdersList: Order[]): DashboardStats => {
        const recognizedStatuses = ['scheduled', 'fulfilled'];
        const saleOrders = filteredOrdersList.filter(o =>
            o && recognizedStatuses.includes(o.status || '') && o.orderType !== 'return'
        );

        const totalSales = saleOrders.reduce((acc, curr) => acc + (curr?.paymentsSummary?.totalOrderValue || 0), 0);
        const saleCount = saleOrders.length;
        const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
        const totalOrdersCount = filteredOrdersList.length;

        let totalCmv = 0;
        let cmvPartial = false;
        let itemsWithoutCost = 0;

        for (const order of saleOrders) {
            const { cmv, partial, itemsWithout } = calcOrderCmv(order);
            totalCmv += cmv;
            if (partial) cmvPartial = true;
            itemsWithoutCost += itemsWithout;
        }

        const totalProfit = totalSales - totalCmv;
        const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

        const pendingOrders = filteredOrdersList.filter(o => {
            const status = o?.status;
            return status === 'scheduled' || status === 'draft';
        }).length;

        const activeSchedules = filteredOrdersList.filter(o =>
            o && o.status === 'scheduled' && o.shipping?.scheduling?.date
        ).length;

        const totalKmDriven = saleOrders.reduce((acc, curr) => {
            const rawDist = curr?.shipping?.distance;
            const dist = typeof rawDist === 'number' ? rawDist : (parseFloat(String(rawDist || 0).replace(',', '.')) || 0);
            return acc + dist;
        }, 0);

        const isPaidTraffic = (o: Order) => {
            const origins = [o?.marketingOrigin, (o?.customerData as any)?.marketingOrigin];
            for (const origin of origins) {
                if (origin && typeof origin === 'string') {
                    const mo = origin.toLowerCase().trim();
                    if (mo === 'paid' || mo.includes('trafego') || mo.includes('tráfego') || mo.includes('ads') || mo.includes('facebook') || mo.includes('instagram') || mo.includes('google')) return true;
                }
            }
            return false;
        };
        const paidTrafficSalesValue = saleOrders.filter(isPaidTraffic).reduce((acc, curr) => acc + (curr?.paymentsSummary?.totalOrderValue || 0), 0);

        return { totalSales, saleCount, totalOrdersCount, totalProfit, grossMargin, totalCmv, cmvPartial, itemsWithoutCost, avgTicket, pendingOrders, activeSchedules, totalKmDriven, paidTrafficSalesValue };
    };

    const { filteredOrders, prevFilteredOrders } = useMemo(() => {
        const active = orders.filter(o => !o.deleted);
        const { current, prev } = intervals;
        const currentList: Order[] = [];
        const prevList: Order[] = [];
        active.forEach(o => {
            const oDate = parsePTBRDate(o.date);
            if (!oDate) return;
            if (isWithinInterval(oDate, { start: current.start, end: current.end })) currentList.push(o);
            else if (isWithinInterval(oDate, { start: prev.start, end: prev.end })) prevList.push(o);
        });
        return { filteredOrders: currentList, prevFilteredOrders: prevList };
    }, [orders, intervals]);

    const stats = useMemo(() => calculateStats(filteredOrders), [filteredOrders]);
    const prevStats = useMemo(() => calculateStats(prevFilteredOrders), [prevFilteredOrders]);

    const salesOverTime = useMemo(() => {
        const { current } = intervals;
        const isMonthlyChart = period === 'year' || period === 'last_semester';
        const isHourlyChart = period === 'today' || period === 'yesterday';

        const dateRange: Date[] = [];
        let cursor = new Date(current.start);

        if (isHourlyChart) {
            for (let h = 0; h < 24; h++) {
                const d = new Date(current.start);
                d.setHours(h, 0, 0, 0);
                dateRange.push(d);
            }
        } else if (isMonthlyChart) {
            while (cursor <= current.end) { dateRange.push(new Date(cursor)); cursor = subMonths(cursor, -1); }
        } else {
            while (cursor <= current.end) { dateRange.push(new Date(cursor)); cursor = subDays(cursor, -1); }
        }

        return dateRange.map(d => {
            const dayOrders = filteredOrders.filter(o => {
                const oDate = parsePTBRDate(o.date);
                if (!oDate) return false;
                if (isHourlyChart) return oDate.getHours() === d.getHours() && isSameDay(oDate, d);
                if (isMonthlyChart) return oDate.getMonth() === d.getMonth() && oDate.getFullYear() === d.getFullYear();
                return isSameDay(oDate, d);
            }).filter(o => ['scheduled', 'fulfilled'].includes(o.status || '') && o.orderType !== 'return');

            const total = dayOrders.reduce((acc, curr) => acc + (curr?.paymentsSummary?.totalOrderValue || 0), 0);
            const lucro = dayOrders.reduce((acc, o) => {
                const { cmv } = calcOrderCmv(o);
                return acc + ((o?.paymentsSummary?.totalOrderValue || 0) - cmv);
            }, 0);

            let label = '';
            const dd = d.getDate().toString().padStart(2, '0');
            const mm = (d.getMonth() + 1).toString().padStart(2, '0');
            const aa = d.getFullYear().toString().slice(-2);

            if (isHourlyChart) label = `${d.getHours()}h`;
            else if (period === 'year' || period === 'last_semester') label = `${months[d.getMonth()]}/${aa}`;
            else if (period === 'custom') label = `${dd}/${mm}/${aa}`;
            else label = `${dd}/${mm}`;

            return { name: label, valor: total, lucro, orders: dayOrders.length };
        });
    }, [filteredOrders, intervals, period]);

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(o => {
            if (!o) return;
            const rawStatus = o.status || 'draft';
            const label = STATUS_LABELS[rawStatus] || rawStatus;
            counts[label] = (counts[label] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    const allActiveOrders = useMemo(() => orders.filter(o => !o.deleted), [orders]);

    return { loading, stats, prevStats, salesOverTime, statusData, filteredOrders, allActiveOrders, intervals };
};
