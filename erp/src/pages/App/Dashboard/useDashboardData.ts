import { useState, useEffect, useMemo } from 'react';
import { subscribeToOrders } from '../../utils/orderHistoryService';
import Order from '../../types/order.type';
import { isSameDay, subDays, differenceInCalendarDays, startOfDay, endOfDay, subMonths, isWithinInterval } from 'date-fns';

export type Period = 'custom' | 'today' | 'week' | 'month' | 'last_30_days' | 'last_month' | 'last_semester' | 'year';

export interface SalesHistory {
    date: string;
    valor: number;
    orders: number;
}

export interface DashboardStats {
    totalSales: number;
    saleCount: number;
    totalOrdersCount: number;
    totalProfit: number;
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

export const useDashboardData = (period: Period, customStartDate?: string, customEndDate?: string) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((fetchedOrders: Order[]) => {
            setOrders(fetchedOrders);
            setLoading(false);
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
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
            case 'last_month':
                const firstOfLastMonth = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1);
                const lastOfLastMonth = subDays(new Date(now.getFullYear(), now.getMonth(), 1), 1);
                currentInterval = { start: startOfDay(firstOfLastMonth), end: endOfDay(lastOfLastMonth) };
                prevInterval = { start: startOfDay(subMonths(firstOfLastMonth, 1)), end: endOfDay(subDays(firstOfLastMonth, 1)) };
                break;
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
        const saleOrders = filteredOrdersList.filter(o => o && recognizedStatuses.includes(o.status || ''));
        
        const totalSales = saleOrders.reduce((acc, curr) => acc + (curr?.paymentsSummary?.totalOrderValue || 0), 0);
        const saleCount = saleOrders.length;
        const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
        const totalOrdersCount = filteredOrdersList.length;
        
        const totalProfit = saleOrders.reduce((acc, o) => {
            const totalValue = o?.paymentsSummary?.totalOrderValue ?? 0;
            const totalCost = o?.itemsSummary?.totalItemsCost ?? 0;
            return acc + (totalValue - totalCost);
        }, 0);

        const pendingOrders = filteredOrdersList.filter(o => {
            const status = o?.status;
            return status === 'scheduled' || status === 'draft';
        }).length;
        
        const activeSchedules = filteredOrdersList.filter(o => 
            o && o.status === 'scheduled' && o.shipping?.scheduling?.date
        ).length;

        const totalKmDriven = saleOrders.reduce((acc, curr) => {
            const dist = Number(curr?.shipping?.distance) || 0;
            return acc + dist;
        }, 0);
        
        const isPaidTraffic = (o: Order) => {
            if (!o.marketingOrigin || typeof o.marketingOrigin !== 'string') return false;
            const mo = o.marketingOrigin.toLowerCase();
            return mo === 'paid' || mo.includes('trafego') || mo.includes('ads') || mo.includes('facebook') || mo.includes('instagram') || mo.includes('google');
        };
        const paidTrafficSalesValue = saleOrders.filter(isPaidTraffic).reduce((acc, curr) => acc + (curr?.paymentsSummary?.totalOrderValue || 0), 0);

        return {
            totalSales,
            saleCount,
            totalOrdersCount,
            totalProfit,
            avgTicket,
            pendingOrders,
            activeSchedules,
            totalKmDriven,
            paidTrafficSalesValue,
        };
    };

    const { filteredOrders, prevFilteredOrders } = useMemo(() => {
        const active = orders.filter(o => !o.deleted);
        const { current, prev } = intervals;

        const currentList: Order[] = [];
        const prevList: Order[] = [];

        active.forEach(o => {
            const oDate = parsePTBRDate(o.date);
            if (!oDate) return;

            if (isWithinInterval(oDate, { start: current.start, end: current.end })) {
                currentList.push(o);
            } else if (isWithinInterval(oDate, { start: prev.start, end: prev.end })) {
                prevList.push(o);
            }
        });

        return { filteredOrders: currentList, prevFilteredOrders: prevList };
    }, [orders, intervals]);

    const stats = useMemo(() => calculateStats(filteredOrders), [filteredOrders]);
    const prevStats = useMemo(() => calculateStats(prevFilteredOrders), [prevFilteredOrders]);

    const salesOverTime = useMemo(() => {
        const { current } = intervals;
        const isMonthlyChart = period === 'year' || period === 'last_semester';
        
        const dataPoints: { name: string, valor: number, orders: number }[] = [];
        const dateRange: Date[] = [];
        let cursor = new Date(current.start);

        if (isMonthlyChart) {
            while (cursor <= current.end) {
                dateRange.push(new Date(cursor));
                cursor = subMonths(cursor, -1);
            }
        } else {
            while (cursor <= current.end) {
                dateRange.push(new Date(cursor));
                cursor = subDays(cursor, -1);
            }
        }

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const shortNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        return dateRange.map(d => {
            const dayOrders = filteredOrders.filter(o => {
                const oDate = parsePTBRDate(o.date);
                if (!oDate) return false;
                if (isMonthlyChart) {
                    return oDate.getMonth() === d.getMonth() && oDate.getFullYear() === d.getFullYear();
                }
                return isSameDay(oDate, d);
            }).filter(o => ['scheduled', 'fulfilled'].includes(o.status || ''));

            const total = dayOrders.reduce((acc, curr) => acc + (curr?.paymentsSummary?.totalOrderValue || 0), 0);
            
            let label = "";
            const dd = d.getDate().toString().padStart(2, '0');
            const mm = (d.getMonth() + 1).toString().padStart(2, '0');
            const aa = d.getFullYear().toString().slice(-2);

            if (period === 'year' || period === 'last_semester') {
                // Mostra primeiro dia do mês/ano
                label = `01/${mm}/${aa}`;
            } else if (period === 'custom') {
                label = `${dd}/${mm}/${aa}`;
            } else if (['week', 'month', 'last_30_days'].includes(period)) {
                label = `${dd}/${mm}`;
            } else {
                label = shortNames[d.getDay()];
            }

            return { name: label, valor: total, orders: dayOrders.length };
        });
    }, [filteredOrders, intervals, period]);

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(o => {
            if (!o) return;
            const rawStatus = o.status || 'draft';
            const label = STATUS_LABELS[rawStatus] || rawStatus;
            counts[label] = (counts[label] || 0) + 1;
        });

        return Object.entries(counts).map(([name, value]) => ({
            name,
            value
        }));
    }, [filteredOrders]);

    return { loading, stats, prevStats, salesOverTime, statusData, filteredOrders };
};
