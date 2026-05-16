import { useState, useEffect, useCallback } from "react";
import Order from "../../types/order.type";
import { subscribeToOrders, updateOrder } from "../../utils/orderHistoryService";
import { DropResult } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { getLocalISODate } from "../../utils/formatters";
import { getSettings, subscribeToSettings } from "@/pages/utils/settingsService";
import { supabase } from "@/pages/utils/supabaseConfig";

export type ScheduleFilter = 'custom' | 'default' | 'week' | 'month' | 'year' | 'all';
export type OrderTypeFilter = 'delivery' | 'pickup' | 'assistance' | 'assembly';
export type ScheduleType = 'delivery' | 'assembly';

/**
 * Utility to group and sort orders by date and time with range filtering
 */
const processOrders = (
    orders: Order[], 
    filter: ScheduleFilter, 
    typeFilter: OrderTypeFilter[], 
    scheduleType: ScheduleType,
    settings: any,
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

    const tasks: any[] = [];
    orders.forEach((o) => {
        const isAssistance = o.orderType === 'assistance';
        const isShowroom = o.orderType === 'showroom';
        const isBudget = o.orderType === 'budget';
        if (isBudget) return;

        if (!isAssistance && !isShowroom) {
            if (o.status !== 'scheduled' && o.status !== 'fulfilled' && o.status !== 'draft') return;
        } else if (o.deleted) return;

        const rawDateStr = isAssistance
            ? (o as any).scheduledDate || o.shipping?.scheduling?.date
            : o.shipping?.scheduling?.date;

        const isPending = !!o.shipping?.scheduling?.pendingScheduling;

        if (!rawDateStr && !isPending) return;
        const orderDateStr = rawDateStr ? toISO(rawDateStr) : "";

        // Apply period filter (only for scheduled orders)
        if (!isPending) {
            if (filter === 'default' && orderDateStr < yesterdayStr) return;
            if (filter === 'week' && (orderDateStr < getLocalISODate(startOfWeek) || orderDateStr > getLocalISODate(endOfWeek))) return;
            if (filter === 'month' && !orderDateStr.startsWith(todayStr.substring(0, 7))) return;
            if (filter === 'year' && !orderDateStr.startsWith(todayStr.substring(0, 4))) return;
            if (filter === 'custom' && customRange && (orderDateStr < customRange.start || orderDateStr > customRange.end)) return;
        }

        const isPickup = o.shipping?.deliveryMethod === 'pickup';
        const isDelivery = !isPickup && !isAssistance && !isShowroom;
        
        const allHandlingOptions = [
            ...(settings.deliveryHandlingOptions || []),
            ...(settings.pickupHandlingOptions || [])
        ];
        
        const checkItems = (itemsList: any[]) => itemsList?.some(item => {
            const hLabel = (item.handlingType || "").trim().toLowerCase();
            if (!hLabel) return false;
            const foundOpt = allHandlingOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
            return foundOpt?.includeInAssemblySchedule === true;
        });

        const hasAssembly = isShowroom || checkItems(o.items) || checkItems((o as any).assistanceItems || []);

        // Create tasks based on typeFilter and hasAssembly
        const hasDelivery = typeFilter.includes('delivery') && (o.shipping?.deliveryMethod === 'delivery' || !o.shipping?.deliveryMethod);
        const hasPickup = typeFilter.includes('pickup') && o.shipping?.deliveryMethod === 'pickup';
        const hasAssistance = typeFilter.includes('assistance') && o.orderType === 'assistance';
        const hasAssemblyFilter = typeFilter.includes('assembly');

        const shouldShowAssembly = hasAssemblyFilter && hasAssembly;
        const shouldShowOriginal = (hasDelivery || hasPickup || hasAssistance) && !isAssistance && !isShowroom;
        const shouldShowAssistanceFilter = hasAssistance && isAssistance;
        const shouldShowShowroom = hasAssemblyFilter && isShowroom;

        // Process Original Task (Delivery/Pickup/Assistance)
        if (shouldShowOriginal || shouldShowAssistanceFilter) {
            const deliveryTask = { 
                ...o, 
                taskType: isAssistance ? 'assistance' : (isPickup ? 'pickup' : (isDelivery ? 'delivery' : 'showroom')), 
                _taskKey: `${o.id}_orig`, 
                hasLinkedAssembly: hasAssembly || isShowroom
            };

            // Attach assembly items for the Hammer Button
            if (hasAssembly || isShowroom) {
                (deliveryTask as any).assemblyItems = [...(o.items || []), ...((o as any).assistanceItems || [])].filter(item => {
                    if (isShowroom) return true;
                    const hLabel = (item.handlingType || "").trim().toLowerCase();
                    const foundOpt = allHandlingOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
                    return foundOpt?.includeInAssemblySchedule === true;
                });
            }

            tasks.push(deliveryTask);
        }
        
        // Show Assembly as a separate task ONLY if the original task is NOT being shown
        if (shouldShowAssembly || shouldShowShowroom) {
            const isOriginalShown = shouldShowOriginal || shouldShowAssistanceFilter;
            if (!isOriginalShown) {
                tasks.push({ 
                    ...o, 
                    taskType: 'assembly', 
                    _taskKey: `${o.id}_assembly`, 
                    hasLinkedDelivery: isDelivery || isPickup || isAssistance
                });
            }
        }
    });

    const grouped: Record<string, any[]> = {};
    tasks.forEach((t) => {
        if (t.shipping?.scheduling?.pendingScheduling) return; // Will be returned in 'pending' list

        const isAssistance = t.orderType === 'assistance';
        const dateStr = isAssistance
            ? (t as any).scheduledDate || t.shipping?.scheduling?.date
            : t.shipping.scheduling.date;
        if (!dateStr) return;
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(t);
    });

    Object.keys(grouped).forEach((date) => {
        grouped[date].sort((a, b) => {
            const timeA = (a.orderType === 'assistance' ? (a as any).scheduledTime : null) || a.shipping?.scheduling?.startTime || a.shipping?.scheduling?.time || "23:59";
            const timeB = (b.orderType === 'assistance' ? (b as any).scheduledTime : null) || b.shipping?.scheduling?.startTime || b.shipping?.scheduling?.time || "23:59";
            
            if (timeA === timeB) {
                // Assembly ALWAYS before other types for same order time
                if (a.taskType === 'assembly' && b.taskType !== 'assembly') return -1;
                if (a.taskType !== 'assembly' && b.taskType === 'assembly') return 1;
            }
            
            return timeA.localeCompare(timeB);
        });
    });

    const sortedGroups: Record<string, any[]> = {};
    Object.keys(grouped)
        .sort()
        .forEach((date) => {
            sortedGroups[date] = grouped[date];
        });

    return { 
        scheduled: sortedGroups,
        pending: tasks.filter(t => t.shipping?.scheduling?.pendingScheduling)
    };
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
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"card" | "table" | "timeline">("timeline");
    const [filter, setFilter] = useState<ScheduleFilter>('default');
    const [typeFilter, setTypeFilter] = useState<OrderTypeFilter[]>(['delivery', 'pickup', 'assistance']);
    const [startDate, setStartDate] = useState(getLocalISODate(new Date()));
    const [endDate, setEndDate] = useState(getLocalISODate(new Date()));
    const [scheduleType, setScheduleType] = useState<ScheduleType>('delivery');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [settings, setSettings] = useState(getSettings());

    // Subscribe to settings for real-time reactivity (important for public/anon users)
    useEffect(() => {
        const unsubscribe = subscribeToSettings((newSettings) => {
            setSettings(newSettings);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((orders) => {
            setAllOrders(orders);
            const showroomOrders = showroomAssemblies.map(mapShowroomToOrder) as Order[];
            const { scheduled, pending } = processOrders([...orders, ...showroomOrders], filter, typeFilter, scheduleType, settings, { start: startDate, end: endDate });
            setSchedule(scheduled);
            setPendingOrders(pending);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter, typeFilter, scheduleType, showroomAssemblies, startDate, endDate, settings]);

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
            const { scheduled, pending } = processOrders([...allOrders, ...showroomOrders], filter, typeFilter, scheduleType, settings, { start: startDate, end: endDate });
            setSchedule(scheduled);
            setPendingOrders(pending);
        }
    }, [filter, typeFilter, scheduleType, startDate, endDate, allOrders, showroomAssemblies, loading, settings]);

    const handleShare = () => {
        const PRODUCTION_URL = "https://moveismorantehub.vercel.app";
        const scheduleUrl = `${PRODUCTION_URL}/schedule`;
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
        pendingOrders,
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
