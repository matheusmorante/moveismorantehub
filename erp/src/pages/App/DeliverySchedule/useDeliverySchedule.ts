import { useState, useEffect, useCallback } from "react";
import Order from "../../types/order.type";
import { subscribeToOrders, updateOrder } from "../../utils/orderHistoryService";
import { DropResult } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { getLocalISODate } from "../../utils/formatters";
import { getSettings } from "@/pages/utils/settingsService";
import { supabase } from "@/pages/utils/supabaseConfig";

export type ScheduleFilter = 'custom' | 'default' | 'week' | 'month' | 'year' | 'all';
export type OrderTypeFilter = 'all' | 'delivery' | 'pickup' | 'assistance';
export type ScheduleType = 'delivery' | 'assembly';

/**
 * Utility to group and sort orders by date and time with range filtering
 */
const processOrders = (
    orders: Order[], 
    filter: ScheduleFilter, 
    typeFilter: OrderTypeFilter, 
    scheduleType: ScheduleType,
    customRange?: { start: string, end: string }
) => {
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
        const settings = getSettings();
        const isAssistance = o.orderType === 'assistance';

        if (!isAssistance) {
            // Regular orders: need scheduled, fulfilled or draft status
            if (o.status !== 'scheduled' && o.status !== 'fulfilled' && o.status !== 'draft') return false;
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

        // Apply schedule type filter (Assembly vs Delivery)
        if (scheduleType === 'assembly') {
            const allHandlingOptions = [
                ...(settings.deliveryHandlingOptions || []),
                ...(settings.pickupHandlingOptions || [])
            ];
            
            const checkItems = (itemsList: any[]) => itemsList?.some(item => {
                const hLabel = (item.handlingType || "").trim().toLowerCase();
                if (!hLabel) return false;
                // Use a different name for the option to avoid shadowing the order 'o'
                const foundOpt = allHandlingOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
                return foundOpt?.includeInAssemblySchedule === true;
            });

            const hasAssembly = o.orderType === 'showroom' || checkItems(o.items) || checkItems((o as any).assistanceItems || []);
            if (!hasAssembly) return false;
        }

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
            const timeA = (a.orderType === 'assistance' ? (a as any).scheduledTime : null) || a.shipping?.scheduling?.startTime || a.shipping?.scheduling?.time || "23:59";
            const timeB = (b.orderType === 'assistance' ? (b as any).scheduledTime : null) || b.shipping?.scheduling?.startTime || b.shipping?.scheduling?.time || "23:59";
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

// Map showroom assemblies to order-like objects for display
const mapShowroomToOrder = (as: any): Partial<Order> => ({
    id: `showroom_${as.id}`,
    customerData: { fullName: "🔹 MOSTRUÁRIO" } as any,
    shipping: {
        scheduling: { date: as.date, time: as.time },
        orderType: "MOSTRUÁRIO",
        deliveryMethod: 'delivery' // Default to show in delivery lists if needed
    } as any,
    orderType: 'showroom' as any,
    items: [{ description: as.item, quantity: 1 }] as any,
    status: 'scheduled'
});

export const useDeliverySchedule = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [showroomAssemblies, setShowroomAssemblies] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<Record<string, Order[]>>({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [filter, setFilter] = useState<ScheduleFilter>('default');
    const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
    const [startDate, setStartDate] = useState(getLocalISODate(new Date()));
    const [endDate, setEndDate] = useState(getLocalISODate(new Date()));
    const [scheduleType, setScheduleType] = useState<ScheduleType>('delivery');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((orders) => {
            setAllOrders(orders);
            const showroomOrders = showroomAssemblies.map(mapShowroomToOrder) as Order[];
            const processed = processOrders([...orders, ...showroomOrders], filter, typeFilter, scheduleType, { start: startDate, end: endDate });
            setSchedule(processed);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter, typeFilter, scheduleType, showroomAssemblies, startDate, endDate]);

    // Fetch Showroom Assemblies
    useEffect(() => {
        const fetchShowroom = async () => {
            const { data } = await supabase.from('showroom_assemblies').select('*');
            if (data) setShowroomAssemblies(data);
        };
        fetchShowroom();

        // Optional: subscribe to changes
        const channel = supabase.channel('showroom_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'showroom_assemblies' }, fetchShowroom)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Re-process when filter changes locally
    useEffect(() => {
        if (!loading) {
            const showroomOrders = showroomAssemblies.map(mapShowroomToOrder) as Order[];
            setSchedule(processOrders([...allOrders, ...showroomOrders], filter, typeFilter, scheduleType, { start: startDate, end: endDate }));
        }
    }, [filter, typeFilter, scheduleType, startDate, endDate, allOrders, showroomAssemblies, loading]);

    const handleShare = () => {
        const scheduleUrl = `${window.location.origin}/schedule`;
        const shareText = encodeURIComponent(
            `📦 Cronograma Logístico (${viewMode === "card" ? "Lista" : "Grade"})\n` +
            `🔗 Acesse online agora: ${scheduleUrl}`
        );

        window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
    };



    const openOrderDetails = (order: Order) => setSelectedOrder(order);
    const closeOrderDetails = () => setSelectedOrder(null);

    return {
        schedule,
        loading,
        viewMode,
        setViewMode,
        filter,
        setFilter,
        scheduleType,
        setScheduleType,
        typeFilter,
        setTypeFilter,
        selectedOrder,
        openOrderDetails,
        closeOrderDetails,
        handleShare,

        startDate,
        setStartDate,
        endDate,
        setEndDate,
    };
};
