import { useMemo, useEffect, useState } from 'react';
import Order from '../../../types/order.type';

export interface OperationalData {
    openOrders: Order[];
    scheduledOrders: Order[];
    deliveriesToday: Order[];
    lateDeliveries: Order[];
    pendingAssemblies: Order[];
    pendingReceiptsCount: number;
}

const parseScheduleDate = (order: Order): Date | null => {
    const dateStr = order.shipping?.scheduling?.date;
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
};

const isToday = (d: Date): boolean => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
};

const isPastDate = (d: Date): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d < today;
};

export const useDashboardOperational = (allActiveOrders: Order[]): OperationalData => {
    const [pendingReceiptsCount, setPendingReceiptsCount] = useState<number>(0);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('morantehub_goods_receipts_v1');
            if (stored) {
                const receipts = JSON.parse(stored);
                const drafts = receipts.filter((r: any) => r.status === 'draft' || r.isDraft);
                setPendingReceiptsCount(drafts.length);
            }
        } catch { setPendingReceiptsCount(0); }
    }, []);

    const operational = useMemo((): OperationalData => {
        const nonDeleted = allActiveOrders.filter((o: Order) => !o.deleted);
        const openOrders = nonDeleted.filter((o: Order) =>
            o.status === 'scheduled' && o.orderType !== 'return' && o.orderType !== 'assistance'
        );
        const scheduledOrders = openOrders.filter((o: Order) => !!o.shipping?.scheduling?.date);
        const deliveriesToday = scheduledOrders.filter((o: Order) => {
            const d = parseScheduleDate(o); return d ? isToday(d) : false;
        });
        const lateDeliveries = scheduledOrders.filter((o: Order) => {
            const d = parseScheduleDate(o); return d ? isPastDate(d) : false;
        });
        const pendingAssemblies = nonDeleted.filter((o: Order) =>
            o.status === 'scheduled' && (o.items || []).some((item: any) => item.handlingType === 'montagem')
        );
        return { openOrders, scheduledOrders, deliveriesToday, lateDeliveries, pendingAssemblies, pendingReceiptsCount };
    }, [allActiveOrders, pendingReceiptsCount]);

    return operational;
};
