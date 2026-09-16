import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings, subscribeToSettings, AppSettings } from '@/pages/utils/settingsService';
import { subscribeToOrders } from '@/pages/utils/orderHistoryService';
import { getShowcaseAssemblies } from '@/pages/utils/showcaseAssemblyService';
import { formatOrderCode } from "@/pages/utils/orderCode";
import { toast } from 'react-toastify';

export function useAssemblyListQuery() {
    const [assemblies, setAssemblies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [orderTasks, setOrderTasks] = useState<any[]>([]);
    const orderTasksRef = useRef<any[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToSettings((newSettings) => {
            setSettings(newSettings);
            setSettingsLoaded(true);
        });
        return () => unsubscribe();
    }, []);

    const fetchAllAssemblies = async (currentOrderTasks?: any[]) => {
        setLoading(true);
        try {
            const showcaseData = await getShowcaseAssemblies();
            const showcaseTasks = showcaseData.map(as => ({
                id: as.id || "",
                origin: 'showcase' as const,
                title: as.description,
                subtitle: as.observation || "MOSTRUÁRIO",
                date: as.date,
                items: [{ description: as.description, quantity: as.quantity }],
                status: as.status === 'completed' ? 'fulfilled' : 'scheduled',
                observation: as.observation || "",
                fullData: as
            }));

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const unified = [...(currentOrderTasks || orderTasksRef.current), ...showcaseTasks]
                .filter(item => !item.date || item.date >= yesterdayStr)
                .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.id || "").localeCompare(b.id || "");
                });

            setAssemblies(unified);
        } catch (error) {
            console.error('Erro ao buscar montagens:', error);
            toast.error("Erro ao carregar mostruários.");
        } finally {
            setLoading(false);
        }
    };

    const updateUnifiedList = (newOrderTasks: any[]) => {
        orderTasksRef.current = newOrderTasks;
        setOrderTasks(newOrderTasks);
        fetchAllAssemblies(newOrderTasks);
    };

    useEffect(() => {
        if (settingsLoaded) {
            fetchAllAssemblies();
        }
    }, [settingsLoaded]);

    useEffect(() => {
        if (!settingsLoaded) return;

        const unsubscribe = subscribeToOrders((allOrders) => {
            const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const newOrderTasks = allOrders.filter(order => {
                if (order.deleted || order.status === 'cancelled') return false;
                const isPickup = order.shipping?.deliveryMethod === 'pickup';
                const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);

                return order.items?.some(i => {
                    const hLabel = normalize(i.handlingType);
                    const opt = modalityOptions.find(o => normalize(o.label) === hLabel);
                    return opt?.includeInAssemblySchedule && !opt?.isAssemblyOutside;
                });
            }).map(order => ({
                id: order.id,
                origin: 'order' as const,
                title: order.customerData.fullName,
                subtitle: `PEDIDO #${formatOrderCode(order)}`,
                orderIndex: order.orderIndex,
                date: order.shipping?.scheduling?.date || "",
                timeInfo: order.shipping?.scheduling ? {
                    type: order.shipping.scheduling?.type,
                    startTime: order.shipping.scheduling?.startTime,
                    endTime: order.shipping.scheduling?.endTime,
                    time: order.shipping.scheduling?.time,
                    dateType: order.shipping.scheduling?.dateType,
                    endDate: order.shipping.scheduling?.endDate
                } : null,
                items: order.items.filter(i => {
                    const isPickup = order.shipping?.deliveryMethod === 'pickup';
                    const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);
                    const hLabel = normalize(i.handlingType);
                    const opt = modalityOptions.find(o => normalize(o.label) === hLabel);
                    return opt?.includeInAssemblySchedule && !opt?.isAssemblyOutside;
                }).map(i => ({ description: i.description, quantity: i.quantity })),
                status: order.status,
                deliveryMethod: order.shipping?.deliveryMethod,
                observation: order.shipping?.deliveryAddress?.observation || order.observation || "",
                fullData: order
            }));

            updateUnifiedList(newOrderTasks);
        });

        return () => unsubscribe();
    }, [settingsLoaded, settings]);

    useEffect(() => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const requestFetchAssemblies = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchAllAssemblies();
            }, 3000);
        };

        const channel = supabase
            .channel(`showroom-assemblies-list-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'showroom_assemblies' }, requestFetchAssemblies)
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        assemblies,
        loading,
        refetchAssemblies: fetchAllAssemblies
    };
}
