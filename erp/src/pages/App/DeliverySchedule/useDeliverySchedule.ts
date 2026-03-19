import { useState, useEffect, useCallback } from "react";
import Order from "../../types/order.type";
import { subscribeToOrders, updateOrder } from "../../utils/orderHistoryService";
import { DropResult } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { getLocalISODate } from "../../utils/formatters";

export type ScheduleFilter = 'custom' | 'default' | 'week' | 'month' | 'year' | 'all';
export type OrderTypeFilter = 'all' | 'delivery' | 'pickup' | 'assistance';

/**
 * Utility to group and sort orders by date and time with range filtering
 */
const processOrders = (orders: Order[], filter: ScheduleFilter, typeFilter: OrderTypeFilter, customRange?: { start: string, end: string }) => {
    const now = new Date();
    const todayStr = getLocalISODate(now);

    // Yesterday for 'default' view
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = getLocalISODate(yesterday);

    // Week boundaries (Sun-Sat)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const toISO = (dStr: string) => {
        if (!dStr) return "";
        if (dStr.includes('-')) return dStr.split('T')[0];
        const [d, m, y] = dStr.split('/');
        if (!d || !m || !y) return dStr;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    };

    const scheduledOrders = orders.filter((o) => {
        const isAssistance = o.orderType === 'assistance';

        if (!isAssistance) {
            // Regular orders: need scheduled/fulfilled status
            if (o.status !== 'scheduled' && o.status !== 'fulfilled') return false;
        } else {
            // Assistance orders: show any non-deleted status if they have a scheduled date
            if (o.deleted) return false;
        }

        // For assistance: check scheduledDate (top-level field) or shipping.scheduling.date
        const rawDateStr = isAssistance
            ? (o as any).scheduledDate || o.shipping?.scheduling?.date
            : o.shipping?.scheduling?.date;

        if (!rawDateStr) return false;
        const orderDateStr = toISO(rawDateStr);

        // For assistance, time is optional; for regular orders require a time
        if (!isAssistance) {
            const hasTime = o.shipping?.scheduling?.time || o.shipping?.scheduling?.startTime;
            if (!hasTime) return false;
        }

        // Apply order type filter
        const isPickup = o.shipping?.deliveryMethod === 'pickup';
        const isDelivery = !isPickup && !isAssistance;

        if (typeFilter === 'pickup' && !isPickup) return false;
        if (typeFilter === 'assistance' && !isAssistance) return false;
        if (typeFilter === 'delivery' && !isDelivery) return false;

        if (filter === 'all') return true;

        if (filter === 'default') {
            return orderDateStr >= yesterdayStr;
        }

        if (filter === 'week') {
            return orderDateStr >= getLocalISODate(startOfWeek) &&
                orderDateStr <= getLocalISODate(endOfWeek);
        }

        if (filter === 'month') {
            return orderDateStr.startsWith(todayStr.substring(0, 7)); // YYYY-MM
        }

        if (filter === 'year') {
            return orderDateStr.startsWith(todayStr.substring(0, 4)); // YYYY
        }

        if (filter === 'custom' && customRange) {
            return orderDateStr >= customRange.start && orderDateStr <= customRange.end;
        }

        return true;
    });

    const grouped: Record<string, Order[]> = {};
    scheduledOrders.forEach((o) => {
        const isAssistance = o.orderType === 'assistance';
        // Get the correct date field
        const dateStr = isAssistance
            ? (o as any).scheduledDate || o.shipping?.scheduling?.date
            : o.shipping.scheduling.date;
        if (!dateStr) return;
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(o);

    });

    Object.keys(grouped).forEach((date) => {
        grouped[date].sort((a, b) => {
            const aDate = a.orderType === 'assistance' ? (a as any).scheduledDate : a.shipping?.scheduling?.date;
            const bDate = b.orderType === 'assistance' ? (b as any).scheduledDate : b.shipping?.scheduling?.date;
            if (a.orderIndex !== undefined && b.orderIndex !== undefined && aDate === bDate) {
                return a.orderIndex - b.orderIndex;
            }
            const timeA = (a.orderType === 'assistance' ? (a as any).scheduledTime : null) || a.shipping?.scheduling?.startTime || a.shipping?.scheduling?.time || "";
            const timeB = (b.orderType === 'assistance' ? (b as any).scheduledTime : null) || b.shipping?.scheduling?.startTime || b.shipping?.scheduling?.time || "";
            return timeA.localeCompare(timeB);
        });
    });

    const sortedGroups: Record<string, Order[]> = {};
    Object.keys(grouped)
        .sort()
        .forEach((date) => {
            sortedGroups[date] = grouped[date];
        });

    return sortedGroups;
};

export const useDeliverySchedule = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [schedule, setSchedule] = useState<Record<string, Order[]>>({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [filter, setFilter] = useState<ScheduleFilter>('default');
    const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
    const [startDate, setStartDate] = useState(getLocalISODate(new Date()));
    const [endDate, setEndDate] = useState(getLocalISODate(new Date()));
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((orders) => {
            setAllOrders(orders);
            const processed = processOrders(orders, filter, typeFilter, { start: startDate, end: endDate });
            setSchedule(processed);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter, typeFilter]);

    // Re-process when filter changes locally
    useEffect(() => {
        if (!loading) {
            setSchedule(processOrders(allOrders, filter, typeFilter, { start: startDate, end: endDate }));
        }
    }, [filter, typeFilter, startDate, endDate, allOrders, loading]);

    const handleShare = () => {
        const scheduleUrl = `${window.location.origin}/schedule`;
        const shareText = encodeURIComponent(
            `📦 Cronograma Logístico (${viewMode === "card" ? "Lista" : "Grade"})\n` +
            `🔗 Acesse online agora: ${scheduleUrl}`
        );

        window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
    };

    const handleDragEnd = useCallback(async (result: DropResult) => {
        if (!result.destination || viewMode === "table") return;

        const sourceDate = result.source.droppableId;
        const destDate = result.destination.droppableId;

        if (sourceDate !== destDate) return;

        const dateOrders = Array.from(schedule[sourceDate] || []);
        const [reorderedItem] = dateOrders.splice(result.source.index, 1);
        dateOrders.splice(result.destination.index, 0, reorderedItem);

        setSchedule((prev) => ({
            ...prev,
            [sourceDate]: dateOrders,
        }));

        try {
            const updatePromises = dateOrders.map((order, index) => {
                return updateOrder(order.id!, { ...order, orderIndex: index });
            });
            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Erro ao reordenar pedidos no Firebase", error);
            toast.error("Erro ao salvar ordem no servidor.");
        }
    }, [schedule, viewMode]);

    const openOrderDetails = (order: Order) => setSelectedOrder(order);
    const closeOrderDetails = () => setSelectedOrder(null);

    return {
        schedule,
        loading,
        viewMode,
        setViewMode,
        filter,
        setFilter,
        typeFilter,
        setTypeFilter,
        selectedOrder,
        openOrderDetails,
        closeOrderDetails,
        handleShare,
        handleDragEnd,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
    };
};
